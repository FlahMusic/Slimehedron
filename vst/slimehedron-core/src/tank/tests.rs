//! The tank, tested from its one seam: settings and a seed in, a clock per tick, hits out.
//! Every test asserts what a listener would hear (which note, when, how often), never how it was computed.

use super::*;

const MS: f64 = 1000.0 / 60.0;

fn quiet() -> TankSettings { TankSettings { chaos: 0.0, ..TankSettings::default() } }

/// Run `n` ticks from t=0 at 80 bpm, collecting every hit.
fn run(t: &mut Tank, from: u64, n: u64) -> Vec<Hit> {
    let mut out = Vec::new();
    for i in from..from + n { out.extend_from_slice(t.tick(&Clock { now_ms: i as f64 * MS, bpm: 80.0, playing: true })); }
    out
}

/// A ball in the middle, fired straight at wall `w`'s midpoint, sitting mid-depth and drifting slowly (no pane soon).
fn fire_at(t: &mut Tank, w: usize) {
    let e = t.walls()[w];
    let (mx, my) = ((e.ax + e.bx) / 2.0, (e.ay + e.by) / 2.0);
    let (dx, dy) = (mx - CX, my - CY);
    let l = (dx * dx + dy * dy).sqrt();
    t.add_ball_at(CX, CY, 0.5, dx / l * 3.4, dy / l * 3.4, 0.0015);
}

#[test]
fn a_ball_fired_at_a_wall_rings_that_wall_once() {
    for w in 0..6 {
        let mut t = Tank::new(quiet(), 1);
        t.start(0.0);
        let cents = t.walls()[w].cents;
        fire_at(&mut t, w);
        // centre to wall is ~251 px at 3.4 px a tick (~74 ticks); the way back across takes ~150 more
        let hits: Vec<Hit> = run(&mut t, 0, 140).into_iter().filter(|h| !h.pane).collect();
        assert_eq!(hits.len(), 1, "wall {}: {} wall hits, want exactly one", w, hits.len());
        assert_eq!(hits[0].wall, Some(w), "wall {}: the note came from wall {:?}", w, hits[0].wall);
        assert_eq!(hits[0].cents, cents, "wall {}: plays {} cents, the wall is {}", w, hits[0].cents, cents);
    }
}

#[test]
fn six_walls_in_c_major_are_the_web_apps_notes() {
    // the web app's wallDegrees(6, 14) pulls walls onto the home chord: C E G C E G over two octaves
    let t = Tank::new(TankSettings::default(), 1);
    let c: Vec<f64> = t.walls().iter().map(|e| e.cents).collect();
    assert_eq!(c, vec![0.0, 400.0, 700.0, 1200.0, 1600.0, 1900.0]);
}

#[test]
fn nothing_escapes_in_ten_thousand_ticks() {
    let mut t = Tank::new(TankSettings::default(), 7);
    t.start(0.0);
    for _ in 0..12 { t.add_ball(); }
    for i in 0..10_000u64 {
        t.tick(&Clock { now_ms: i as f64 * MS, bpm: 80.0, playing: true });
        assert_eq!(t.balls().len(), 12, "tick {}: a ball left", i);
        for b in t.balls() {
            assert!(t.inside(b.x, b.y), "tick {}: a ball is outside the walls at ({:.1}, {:.1})", i, b.x, b.y);
            assert!((0.0..=1.0).contains(&b.z), "tick {}: a ball went through the glass (z {})", i, b.z);
        }
    }
}

#[test]
fn the_panes_chime_the_home_chord() {
    let mut t = Tank::new(quiet(), 3);
    t.start(0.0);
    // straight back toward the back pane, not moving across
    t.add_ball_at(CX, CY, 0.9, 0.0, 0.0, 0.01);
    let panes: Vec<Hit> = run(&mut t, 0, 600).into_iter().filter(|h| h.pane).collect();
    assert!(panes.len() >= 3, "only {} pane hits", panes.len());
    // back pane: the chord's root. front pane: a chord tone an octave up, alternating the third and the fifth
    assert_eq!(panes[0].cents, 0.0);
    assert_eq!(panes[1].cents, 1600.0);
    assert_eq!(panes[2].cents, 0.0);
    assert!(panes.iter().all(|h| h.vel < 60), "a pane is a soft chime, never a lead");
}

/// Share of hits that land within 20 ms of a grid line, by when the ball actually hit (not when a held note sounds).
fn on_grid(settings: TankSettings, seed: u64) -> (f64, usize) {
    let mut t = Tank::new(settings, seed);
    t.start(0.0);
    for _ in 0..6 { t.add_ball(); }
    let h: Vec<Hit> = run(&mut t, 0, 60 * 60);
    let n = h.iter().filter(|x| x.hit_grid_ms <= 20.0).count();
    (n as f64 / h.len().max(1) as f64, h.len())
}

#[test]
fn beat_lock_puts_the_hits_on_the_grid() {
    let (lock, n1) = on_grid(TankSettings::default(), 5);
    let (free, n2) = on_grid(TankSettings { quantize: false, ..TankSettings::default() }, 5);
    assert!(n1 > 100 && n2 > 100, "too few hits to tell ({} / {})", n1, n2);
    assert!(lock > 0.6, "with beat lock only {:.0}% of hits are on the grid", lock * 100.0);
    assert!(lock > free + 0.25, "beat lock {:.0}% vs off {:.0}%: no difference", lock * 100.0, free * 100.0);
}

#[test]
fn quantize_holds_a_late_note_for_the_next_line() {
    let mut t = Tank::new(TankSettings::default(), 5);
    t.start(0.0);
    for _ in 0..6 { t.add_ball(); }
    let h = run(&mut t, 0, 60 * 60);
    let held: Vec<&Hit> = h.iter().filter(|x| x.sound_ms > x.at_ms).collect();
    assert!(!held.is_empty(), "quantize held no note at all ({} hits)", h.len());
    assert!(held.iter().all(|x| x.sound_ms - x.at_ms <= 45.0 + 1e-9), "a note waited more than 45 ms");
    assert!(h.iter().all(|x| x.grid_ms <= 20.0 || x.sound_ms == x.at_ms), "a held note did not land on a line");
    let mut off = Tank::new(TankSettings { quantize: false, ..TankSettings::default() }, 5);
    off.start(0.0);
    for _ in 0..6 { off.add_ball(); }
    assert!(run(&mut off, 0, 60 * 60).iter().all(|x| x.sound_ms == x.at_ms), "quantize off still held a note");
}

fn wall_sequence(spin: f64) -> Vec<Option<usize>> {
    let mut t = Tank::new(TankSettings { spin, ..quiet() }, 9);
    t.start(0.0);
    fire_at(&mut t, 0);
    run(&mut t, 0, 2000).into_iter().filter(|h| !h.pane).map(|h| h.wall).take(12).collect()
}

#[test]
fn spin_changes_which_walls_ring() {
    let still = wall_sequence(0.0);
    let turning = wall_sequence(40.0);
    assert!(still.len() >= 8 && turning.len() >= 8);
    assert_ne!(still, turning, "spinning the shape rang the same walls in the same order");
}

#[test]
fn spin_turns_the_walls() {
    let mut t = Tank::new(TankSettings { spin: 40.0, ..TankSettings::default() }, 1);
    t.start(0.0);
    let a0 = t.walls()[0].ax;
    run(&mut t, 0, 30);
    assert!((t.walls()[0].ax - a0).abs() > 1.0, "the walls did not move");
    assert_eq!(t.walls()[0].cents, 0.0, "a turned wall keeps its note");
}

fn fingerprint(seed: u64) -> Vec<(u64, i64, u8)> {
    let mut t = Tank::new(TankSettings::default(), seed);
    t.start(0.0);
    for _ in 0..6 { t.add_ball(); }
    run(&mut t, 0, 3000).iter().map(|h| ((h.at_ms * 1000.0) as u64, h.cents as i64, h.vel)).collect()
}

#[test]
fn the_same_seed_gives_the_same_hits() {
    let a = fingerprint(42);
    assert!(a.len() > 50);
    assert_eq!(a, fingerprint(42));
    assert_ne!(a, fingerprint(43), "a different seed gave the same music: the seed is ignored");
}

#[test]
fn an_open_wall_lets_balls_out_and_heals() {
    let mut t = Tank::new(TankSettings::default(), 11);
    t.start(0.0);
    for _ in 0..7 { t.add_ball(); }
    let bar = 180u64; // ticks in a bar at 80 bpm
    let mut tick = 0u64;
    let mut opened = false;
    for b in 1..=24u64 {
        run(&mut t, tick, bar); tick += bar;
        t.on_bar();
        if b == 8 { opened = t.walls().iter().any(|e| e.broken); }
    }
    assert!(opened, "no wall opened after 8 bars");
    assert!(t.balls().len() < 7, "an open wall let no ball out ({} left)", t.balls().len());
    // bars 8 and 16 opened two walls (a third of six is the cap); bar 24 starts healing the oldest
    assert_eq!(t.walls().iter().filter(|e| e.broken).count(), 2);
    assert_eq!(t.walls().iter().filter(|e| e.broken && e.reform > 0.0).count(), 1, "the oldest gap did not start healing at bar 24");
    // a healing wall fades back in over ~143 ticks (0.007 a tick)
    run(&mut t, tick, 200);
    assert_eq!(t.walls().iter().filter(|e| e.broken).count(), 1, "the healed wall did not close");
    // and the home chord's root wall is never opened
    assert!(t.walls().iter().filter(|e| e.deg % 7 == 0).all(|e| !e.broken));
}

#[test]
fn stopped_means_frozen() {
    let mut t = Tank::new(TankSettings::default(), 2);
    t.start(0.0);
    for _ in 0..6 { t.add_ball(); }
    run(&mut t, 0, 100);
    let before: Vec<(f64, f64)> = t.balls().iter().map(|b| (b.x, b.y)).collect();
    for i in 100..400u64 { assert!(t.tick(&Clock { now_ms: i as f64 * MS, bpm: 80.0, playing: false }).is_empty()); }
    let after: Vec<(f64, f64)> = t.balls().iter().map(|b| (b.x, b.y)).collect();
    assert_eq!(before, after);
}

#[test]
fn tempo_sets_the_ball_speed_within_one_tick() {
    let mut t = Tank::new(TankSettings { quantize: false, ..quiet() }, 2);
    t.start(0.0);
    t.add_ball_at(CX, CY, 0.5, 3.4, 0.0, 0.0015);
    t.tick(&Clock { now_ms: 0.0, bpm: 160.0, playing: true });
    let b = t.balls()[0];
    assert!(((b.vx * b.vx + b.vy * b.vy).sqrt() - 6.8).abs() < 1e-6, "speed {}", (b.vx * b.vx + b.vy * b.vy).sqrt());
}
