//! Slimehedron as a CLAP instrument.
//!
//! This file is plumbing only: it answers the host's questions (who are you, what ports do you
//! have) and hands notes to `engine`. Everything musical lives in slimehedron-core and engine.rs.
//! It talks raw CLAP through `clap-sys` rather than a framework, so if the GUI wrapper we pick later
//! (wxp) changes or dies, this layer is untouched.
//!
//! Load path on Windows: build, then copy target\release\slimehedron_plugin.dll to a CLAP folder
//! as Slimehedron.clap (see vst\README.md).

pub mod engine;

use std::ffi::{c_char, c_void, CStr};
use std::ptr;

use clap_sys::entry::clap_plugin_entry;
use clap_sys::events::*;
use clap_sys::ext::audio_ports::*;
use clap_sys::ext::note_ports::*;
use clap_sys::factory::plugin_factory::*;
use clap_sys::host::clap_host;
use clap_sys::id::CLAP_INVALID_ID;
use clap_sys::plugin::*;
use clap_sys::plugin_features::*;
use clap_sys::process::*;
use clap_sys::version::CLAP_VERSION;

use engine::Engine;

// ---- who we are -------------------------------------------------------------------------------

const ID: &CStr = c"com.flahmusic.slimehedron";

struct Features([*const c_char; 4]);
unsafe impl Sync for Features {}
static FEATURES: Features = Features([
    CLAP_PLUGIN_FEATURE_INSTRUMENT.as_ptr(),
    CLAP_PLUGIN_FEATURE_SYNTHESIZER.as_ptr(),
    CLAP_PLUGIN_FEATURE_STEREO.as_ptr(),
    ptr::null(),
]);

static DESCRIPTOR: clap_plugin_descriptor = clap_plugin_descriptor {
    clap_version: CLAP_VERSION,
    id: ID.as_ptr(),
    name: c"Slimehedron".as_ptr(),
    vendor: c"FlahMusic".as_ptr(),
    url: c"https://github.com/FlahMusic/Slimehedron".as_ptr(),
    manual_url: c"".as_ptr(),
    support_url: c"".as_ptr(),
    version: c"0.1.0".as_ptr(),
    description: c"The Slimehedron synth. Milestone 1b: notes in, sound out.".as_ptr(),
    features: &FEATURES.0 as *const _ as *const *const c_char,
};

// ---- one instance -----------------------------------------------------------------------------

struct Instance {
    clap: clap_plugin,
    engine: Option<Engine>, // built in activate (it allocates), dropped in deactivate
    mono: Vec<f32>,         // scratch buffer, sized in activate so process never allocates
}

/// # Safety
/// `p` must be a plugin pointer this library handed out.
unsafe fn inst<'a>(p: *const clap_plugin) -> &'a mut Instance {
    &mut *((*p).plugin_data as *mut Instance)
}

unsafe extern "C" fn init(_p: *const clap_plugin) -> bool {
    true
}

unsafe extern "C" fn destroy(p: *const clap_plugin) {
    drop(Box::from_raw((*p).plugin_data as *mut Instance));
}

unsafe extern "C" fn activate(p: *const clap_plugin, sr: f64, _min: u32, max: u32) -> bool {
    let i = inst(p);
    i.engine = Some(Engine::new(sr as f32));
    i.mono = vec![0.0; max.max(1) as usize];
    true
}

unsafe extern "C" fn deactivate(p: *const clap_plugin) {
    inst(p).engine = None;
}

unsafe extern "C" fn start_processing(_p: *const clap_plugin) -> bool {
    true
}

unsafe extern "C" fn stop_processing(_p: *const clap_plugin) {}

unsafe extern "C" fn reset(p: *const clap_plugin) {
    if let Some(e) = inst(p).engine.as_mut() {
        e.reset();
    }
}

/// A note from the host, in either dialect we accept.
unsafe fn handle(e: &mut Engine, h: *const clap_event_header) {
    if (*h).space_id != CLAP_CORE_EVENT_SPACE_ID {
        return;
    }
    match (*h).type_ {
        CLAP_EVENT_NOTE_ON => {
            let n = &*(h as *const clap_event_note);
            e.note_on(n.key, n.velocity as f32);
        }
        CLAP_EVENT_MIDI => {
            let m = &*(h as *const clap_event_midi);
            // note-on with velocity 0 is a note-off in MIDI; note-offs are ignored at this milestone
            if m.data[0] & 0xF0 == 0x90 && m.data[2] > 0 {
                e.note_on(m.data[1] as i16, m.data[2] as f32 / 127.0);
            }
        }
        _ => {}
    }
}

unsafe extern "C" fn process(p: *const clap_plugin, pr: *const clap_process) -> clap_process_status {
    let i = inst(p);
    let Some(e) = i.engine.as_mut() else { return CLAP_PROCESS_ERROR };
    let pr = &*pr;
    let n = pr.frames_count as usize;
    if n > i.mono.len() || pr.audio_outputs_count == 0 {
        return CLAP_PROCESS_ERROR;
    }
    let mono = &mut i.mono[..n];
    mono.fill(0.0);

    // sample-accurate: render up to each event, apply it, carry on
    let ev = &*pr.in_events;
    let count = ev.size.map_or(0, |f| f(ev));
    let mut at = 0usize;
    for k in 0..count {
        let Some(get) = ev.get else { break };
        let h = get(ev, k);
        if h.is_null() {
            continue;
        }
        let t = ((*h).time as usize).min(n);
        if t > at {
            e.render(&mut mono[at..t]);
            at = t;
        }
        handle(e, h);
    }
    if at < n {
        e.render(&mut mono[at..n]);
    }

    // the voice is mono, as in the web app's melody bus; same signal to every output channel
    let out = &*pr.audio_outputs;
    if !out.data32.is_null() {
        for c in 0..out.channel_count as usize {
            let ch = *out.data32.add(c);
            if !ch.is_null() {
                std::slice::from_raw_parts_mut(ch, n).copy_from_slice(mono);
            }
        }
    }
    CLAP_PROCESS_CONTINUE
}

// ---- ports: one note input, one stereo output --------------------------------------------------

fn name_into(dst: &mut [c_char], s: &str) {
    for (d, b) in dst.iter_mut().zip(s.bytes().chain(std::iter::once(0))) {
        *d = b as c_char;
    }
}

unsafe extern "C" fn audio_count(_p: *const clap_plugin, is_input: bool) -> u32 {
    if is_input { 0 } else { 1 }
}

unsafe extern "C" fn audio_get(_p: *const clap_plugin, index: u32, is_input: bool, info: *mut clap_audio_port_info) -> bool {
    if is_input || index != 0 {
        return false;
    }
    let info = &mut *info;
    info.id = 0;
    name_into(&mut info.name, "Output");
    info.flags = CLAP_AUDIO_PORT_IS_MAIN;
    info.channel_count = 2;
    info.port_type = CLAP_PORT_STEREO.as_ptr();
    info.in_place_pair = CLAP_INVALID_ID;
    true
}

static AUDIO_PORTS: clap_plugin_audio_ports = clap_plugin_audio_ports { count: Some(audio_count), get: Some(audio_get) };

unsafe extern "C" fn note_count(_p: *const clap_plugin, is_input: bool) -> u32 {
    if is_input { 1 } else { 0 }
}

unsafe extern "C" fn note_get(_p: *const clap_plugin, index: u32, is_input: bool, info: *mut clap_note_port_info) -> bool {
    if !is_input || index != 0 {
        return false;
    }
    let info = &mut *info;
    info.id = 0;
    info.supported_dialects = CLAP_NOTE_DIALECT_CLAP | CLAP_NOTE_DIALECT_MIDI;
    info.preferred_dialect = CLAP_NOTE_DIALECT_CLAP;
    name_into(&mut info.name, "Notes");
    true
}

static NOTE_PORTS: clap_plugin_note_ports = clap_plugin_note_ports { count: Some(note_count), get: Some(note_get) };

unsafe extern "C" fn get_extension(_p: *const clap_plugin, id: *const c_char) -> *const c_void {
    let id = CStr::from_ptr(id);
    if id == CLAP_EXT_AUDIO_PORTS {
        &AUDIO_PORTS as *const _ as *const c_void
    } else if id == CLAP_EXT_NOTE_PORTS {
        &NOTE_PORTS as *const _ as *const c_void
    } else {
        ptr::null()
    }
}

unsafe extern "C" fn on_main_thread(_p: *const clap_plugin) {}

// ---- the factory and the entry point the host looks up by name --------------------------------

unsafe extern "C" fn factory_count(_f: *const clap_plugin_factory) -> u32 {
    1
}

unsafe extern "C" fn factory_desc(_f: *const clap_plugin_factory, index: u32) -> *const clap_plugin_descriptor {
    if index == 0 { &DESCRIPTOR } else { ptr::null() }
}

unsafe extern "C" fn factory_create(_f: *const clap_plugin_factory, _host: *const clap_host, id: *const c_char) -> *const clap_plugin {
    if id.is_null() || CStr::from_ptr(id) != ID {
        return ptr::null();
    }
    let b = Box::into_raw(Box::new(Instance {
        clap: clap_plugin {
            desc: &DESCRIPTOR,
            plugin_data: ptr::null_mut(),
            init: Some(init),
            destroy: Some(destroy),
            activate: Some(activate),
            deactivate: Some(deactivate),
            start_processing: Some(start_processing),
            stop_processing: Some(stop_processing),
            reset: Some(reset),
            process: Some(process),
            get_extension: Some(get_extension),
            on_main_thread: Some(on_main_thread),
        },
        engine: None,
        mono: Vec::new(),
    }));
    (*b).clap.plugin_data = b as *mut c_void;
    &(*b).clap
}

static FACTORY: clap_plugin_factory = clap_plugin_factory {
    get_plugin_count: Some(factory_count),
    get_plugin_descriptor: Some(factory_desc),
    create_plugin: Some(factory_create),
};

unsafe extern "C" fn entry_init(_path: *const c_char) -> bool {
    true
}

unsafe extern "C" fn entry_deinit() {}

unsafe extern "C" fn entry_get_factory(id: *const c_char) -> *const c_void {
    if !id.is_null() && CStr::from_ptr(id) == CLAP_PLUGIN_FACTORY_ID {
        &FACTORY as *const _ as *const c_void
    } else {
        ptr::null()
    }
}

#[allow(non_upper_case_globals)]
#[no_mangle]
pub static clap_entry: clap_plugin_entry = clap_plugin_entry {
    clap_version: CLAP_VERSION,
    init: Some(entry_init),
    deinit: Some(entry_deinit),
    get_factory: Some(entry_get_factory),
};

// ---- the test plays host: load, send a note, listen to what comes back --------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::tests::{power, SR};
    use clap_sys::audio_buffer::clap_audio_buffer;

    struct Events(Vec<clap_event_note>);

    unsafe extern "C" fn ev_size(l: *const clap_input_events) -> u32 {
        let evs: &Events = &*((*l).ctx as *const Events);
        evs.0.len() as u32
    }
    unsafe extern "C" fn ev_get(l: *const clap_input_events, i: u32) -> *const clap_event_header {
        let evs: &Events = &*((*l).ctx as *const Events);
        &evs.0[i as usize].header
    }
    unsafe extern "C" fn out_push(_l: *const clap_output_events, _e: *const clap_event_header) -> bool {
        true
    }

    fn note_on(time: u32, key: i16) -> clap_event_note {
        clap_event_note {
            header: clap_event_header {
                size: std::mem::size_of::<clap_event_note>() as u32,
                time,
                space_id: CLAP_CORE_EVENT_SPACE_ID,
                type_: CLAP_EVENT_NOTE_ON,
                flags: 0,
            },
            note_id: -1,
            port_index: 0,
            channel: 0,
            key,
            velocity: 0.8,
        }
    }

    /// Load through the exported entry point exactly as a DAW does, and play `key` at frame 100.
    fn play_through_the_host_api(key: i16) -> Vec<f32> {
        unsafe {
            let entry = &clap_entry;
            assert!((entry.init.unwrap())(c"".as_ptr()));
            let f = (entry.get_factory.unwrap())(CLAP_PLUGIN_FACTORY_ID.as_ptr()) as *const clap_plugin_factory;
            assert!(!f.is_null(), "no plugin factory");
            assert_eq!(((*f).get_plugin_count.unwrap())(f), 1);
            let d = ((*f).get_plugin_descriptor.unwrap())(f, 0);
            assert_eq!(CStr::from_ptr((*d).id), ID);
            let p = ((*f).create_plugin.unwrap())(f, ptr::null(), (*d).id);
            assert!(!p.is_null());
            let pl = &*p;
            assert!((pl.init.unwrap())(p));
            assert!((pl.activate.unwrap())(p, SR as f64, 1, 512));
            assert!((pl.start_processing.unwrap())(p));

            let mut left = vec![0.0f32; 512];
            let mut right = vec![0.0f32; 512];
            let mut out = Vec::new();
            for block in 0..40 {
                let mut evs = Events(if block == 0 { vec![note_on(100, key)] } else { vec![] });
                let in_ev = clap_input_events { ctx: &mut evs as *mut _ as *mut c_void, size: Some(ev_size), get: Some(ev_get) };
                let out_ev = clap_output_events { ctx: ptr::null_mut(), try_push: Some(out_push) };
                let mut chans = [left.as_mut_ptr(), right.as_mut_ptr()];
                let mut ab = clap_audio_buffer { data32: chans.as_mut_ptr(), data64: ptr::null_mut(), channel_count: 2, latency: 0, constant_mask: 0 };
                let proc_ = clap_process {
                    steady_time: block * 512,
                    frames_count: 512,
                    transport: ptr::null(),
                    audio_inputs: ptr::null(),
                    audio_outputs: &mut ab,
                    audio_inputs_count: 0,
                    audio_outputs_count: 1,
                    in_events: &in_ev,
                    out_events: &out_ev,
                };
                assert_eq!((pl.process.unwrap())(p, &proc_), CLAP_PROCESS_CONTINUE);
                assert_eq!(left, right, "the two output channels differ");
                out.extend_from_slice(&left);
            }
            (pl.stop_processing.unwrap())(p);
            (pl.deactivate.unwrap())(p);
            (pl.destroy.unwrap())(p);
            out
        }
    }

    #[test]
    fn a_host_note_comes_out_at_the_right_time_and_pitch() {
        let out = play_through_the_host_api(69);
        assert!(out[..100].iter().all(|&s| s == 0.0), "sound before the note was sent");
        assert!(out[100..200].iter().any(|&s| s != 0.0), "nothing at the note's own frame");
        let body = &out[100 + 2400..100 + 12000];
        let p = power(body, 440.0);
        for other in [415.3f32, 466.2, 660.0] {
            assert!(p > power(body, other) * 20.0, "440Hz not dominant over {other}Hz");
        }
    }

    #[test]
    fn the_ports_are_what_a_daw_expects() {
        unsafe {
            let p: *const clap_plugin = ptr::null();
            let a = get_extension(p, CLAP_EXT_AUDIO_PORTS.as_ptr()) as *const clap_plugin_audio_ports;
            let n = get_extension(p, CLAP_EXT_NOTE_PORTS.as_ptr()) as *const clap_plugin_note_ports;
            assert!(!a.is_null() && !n.is_null());
            assert_eq!(((*a).count.unwrap())(p, false), 1);
            assert_eq!(((*a).count.unwrap())(p, true), 0);
            assert_eq!(((*n).count.unwrap())(p, true), 1);
            let mut info: clap_audio_port_info = std::mem::zeroed();
            assert!(((*a).get.unwrap())(p, 0, false, &mut info));
            assert_eq!(info.channel_count, 2);
            assert!(get_extension(p, c"clap.nonsense".as_ptr()).is_null());
        }
    }
}
