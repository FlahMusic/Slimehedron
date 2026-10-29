//! The tank, headless: walls, panes and balls, ported from the web app's `step()` (the 3D prism: a polygon pushed
//! back into a box, with a front and a back pane). Every wall is a note; a ball ringing a wall is a hit.
//!
//! One seam: [`Tank::new`] with settings and a random seed, then [`Tank::tick`] once per 60 Hz physics step with
//! the clock, which hands back that tick's hits. Nothing here draws, and nothing allocates once the tank exists.
//!
//! The web app's pixel units and constants are kept as they are (a 720 px tank, `R` 300, `BR` 9, `BOXD` = R * 1.2)
//! so the code ports line for line and the parity numbers mean the same thing on both sides.
//! Notes come from the auto-notes melody ([`melody`]): one roll a beat, a ball floated toward the wall it wants.
//! The goo ([`goo`]) fills the tank over about 64 bars, slows the balls wading through it and softens their notes.
//! Not in this step at all: burst/reform (a full tank stays full), other spaces, solids, hands.

use crate::music::chord::home_chord;
use crate::music::scales::{by_id, Scale};
use crate::Rng;
use goo::Goo;
use melody::Melody;

pub mod goo;
pub mod melody;

#[cfg(test)]
mod tests;

/// The tank's canvas, in the web app's pixels.
pub const W: f64 = 720.0;
pub const H: f64 = 720.0;
pub const CX: f64 = W / 2.0;
pub const CY: f64 = H / 2.0;
/// Corner radius of the shape.
pub const R: f64 = 300.0;
/// Ball radius.
pub const BR: f64 = 9.0;
/// Depth of the box, front pane to back pane.
pub const BOXD: f64 = R * 1.2;
/// One physics tick, in ms (60 Hz).
pub const FIXED: f64 = 1000.0 / 60.0;
/// Most balls the auto-notes keep in the air (the web's `MAXBALLS`).
pub const MAXBALLS: usize = 12;
/// A hit this soon after a grid line counts as on it (ms).
pub const QLATE: f64 = 40.0;
/// The most a held note ever waits for the next grid line (ms).
pub const QWAIT: f64 = 45.0;
/// Most walls a shape has (the web's polygons run 3..12).
pub const MAX_WALLS: usize = 16;
const MAX_HITS: usize = 64;

#[derive(Debug, Clone, Copy)]
pub struct TankSettings {
    pub walls: usize,
    pub scale: &'static Scale,
    pub octs: i32,
    /// Grid step as a fraction of a whole note (1/16 = 0.0625: what the slime sets).
    pub div: f64,
    pub swing: f64,
    pub quantize: bool,
    /// The spin slider, -100..100. Studio turns `spin * 0.0003` radians a tick.
    pub spin: f64,
    /// How far a bounce knocks a ball off its angle.
    pub chaos: f64,
    pub vel_rand: bool,
    pub vel_fix: u8,
    pub vel_min: u8,
    pub vel_max: u8,
    /// The slime's auto-notes: the motif melody floats a new ball in, one roll a beat (the web's `autoMelodyNote`).
    pub auto_notes: bool,
}

impl Default for TankSettings {
    /// Studio with the slime on, at the spec's start state.
    fn default() -> Self {
        TankSettings { walls: 6, scale: by_id("major").unwrap(), octs: 2, div: 0.0625, swing: 0.15, quantize: true,
            spin: 0.0, chaos: 0.12, vel_rand: true, vel_fix: 100, vel_min: 12, vel_max: 94, auto_notes: true }
    }
}

/// The host's clock, as the tank sees it on one tick.
#[derive(Debug, Clone, Copy)]
pub struct Clock {
    /// The moment this tick stands for (the web's `_tickT`), ms.
    pub now_ms: f64,
    pub bpm: f64,
    pub playing: bool,
}

/// One note the tank made.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Hit {
    /// Cents above the key's root.
    pub cents: f64,
    pub vel: u8,
    /// How hard it hit, 0..1 (the synth's `imp`).
    pub imp: f64,
    /// How gooed-up the ball was, 0..1. A gooed note is never held for the grid.
    pub goo: f64,
    /// A front/back pane chime (never feeds the chord follower).
    pub pane: bool,
    /// Which wall, for a wall hit.
    pub wall: Option<usize>,
    /// When the ball hit.
    pub at_ms: f64,
    /// When the note sounds: `at_ms`, or the next grid line if quantize held it.
    pub sound_ms: f64,
    /// How far the note sounds from the nearest grid line.
    pub grid_ms: f64,
    /// How far the ball's hit was from the nearest grid line (what beat lock steers).
    pub hit_grid_ms: f64,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct Wall {
    pub ax: f64, pub ay: f64, pub bx: f64, pub by: f64,
    /// Unit normal, pointing into the tank.
    pub nx: f64, pub ny: f64,
    /// Scale degree across all octaves.
    pub deg: i32,
    pub cents: f64,
    pub flash: f64,
    /// An open gap: balls pour through, the note is silent.
    pub broken: bool,
    /// A gap healing back, 0..1. Above 0.55 it catches balls again.
    pub reform: f64,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct Ball {
    pub x: f64, pub y: f64,
    /// Depth, 0 = front pane, 1 = back pane.
    pub z: f64,
    pub vx: f64, pub vy: f64, pub vz: f64,
    /// Beat lock's speed factor (0.8..1.22).
    pub tq: f64,
    /// The grid line beat lock is aiming at (0 = none).
    tg: f64,
    bl: u32,
    last_hit: f64,
    last_pane: f64,
    pane_n: u32,
    /// How thick a goo this ball tolerates (0 = it has not met the goo yet). Each ball draws its own.
    visc: f64,
}

pub struct Tank {
    s: TankSettings,
    rng: Rng,
    walls: [Wall; MAX_WALLS],
    verts: [(f64, f64); MAX_WALLS],
    n: usize,
    /// The shape's own turn (the web's `rot`) and how far it turned this tick (`_rotV`).
    rot: f64,
    rot_v: f64,
    balls: Vec<Ball>,
    hits: Vec<Hit>,
    bpm: f64,
    playing: bool,
    now: f64,
    /// The quantize grid (the web's `lastTick`, `tickCount`).
    last_tick: f64,
    tick_count: u64,
    /// Open walls, oldest first.
    broken_order: [usize; MAX_WALLS],
    broken_n: usize,
    wall_bars: u64,
    last_break: f64,
    home_root_deg: i32,
    /// The auto-notes singer and its beat clock (the web's `_melNext`, `_melStepN`).
    melody: Melody,
    mel_next: Option<f64>,
    mel_step_n: u64,
    /// The wall (as a degree across the octaves) the last floated note leaned toward. Tests read it.
    aim_deg: i32,
    goo: Goo,
    /// The view's slow lean (the web's `_phi`): the balls fall toward its "down" as the goo grows heavy.
    phi: f64,
}

impl Tank {
    pub fn new(settings: TankSettings, seed: u64) -> Self {
        let mut t = Tank { s: settings, rng: Rng::new(seed), walls: [Wall::default(); MAX_WALLS], verts: [(0.0, 0.0); MAX_WALLS],
            n: 0, rot: 0.0, rot_v: 0.0, balls: Vec::with_capacity(MAXBALLS + 4), hits: Vec::with_capacity(MAX_HITS),
            bpm: 80.0, playing: true, now: 0.0, last_tick: 0.0, tick_count: 0, broken_order: [0; MAX_WALLS], broken_n: 0,
            wall_bars: 0, last_break: f64::NEG_INFINITY, home_root_deg: 0,
            melody: Melody::new(), mel_next: None, mel_step_n: 0, aim_deg: -1,
            goo: Goo::new(0.0, 0.0), phi: 0.0 };
        t.s.walls = t.s.walls.clamp(3, MAX_WALLS);
        t.rebuild(false);
        // a regular polygon: its area, and the way from the middle to a wall's midpoint
        let n = t.n as f64;
        let area = 0.5 * n * R * R * (std::f64::consts::TAU / n).sin();
        let room = t.walls[..t.n].iter().map(|e| ((e.ax + e.bx) / 2.0 - CX).hypot((e.ay + e.by) / 2.0 - CY)).fold(f64::INFINITY, f64::min);
        t.goo = Goo::new(area, room);
        t
    }

    /// Play from here: the grid starts on this moment (the web's `setPlaying(true)`).
    pub fn start(&mut self, now_ms: f64) { self.last_tick = now_ms; self.now = now_ms; self.mel_next = None; }

    pub fn walls(&self) -> &[Wall] { &self.walls[..self.n] }
    pub fn balls(&self) -> &[Ball] { &self.balls }
    pub fn settings(&self) -> &TankSettings { &self.s }
    pub fn rng(&mut self) -> &mut Rng { &mut self.rng }

    fn rand(&mut self) -> f64 { self.rng.next_f32() as f64 }

    fn total_degrees(&self) -> i32 { self.s.scale.degrees() as i32 * self.s.octs }
    fn cents_for_degree(&self, d: i32) -> f64 { self.s.scale.cents_for_degree(d) as f64 }

    /// The web's `buildEdges` for a plain polygon, turned by `rot`. Rebuilding keeps each wall's flash (and, as in
    /// the web app, a spinning rebuild closes any open wall: `buildEdges` makes fresh walls).
    fn rebuild(&mut self, keep_flash: bool) {
        let n = self.s.walls;
        let (c, s) = (self.rot.cos(), self.rot.sin());
        for i in 0..n {
            let a = -std::f64::consts::FRAC_PI_2 + i as f64 * 2.0 * std::f64::consts::PI / n as f64;
            let (px, py) = (R * a.cos(), R * a.sin());
            self.verts[i] = (CX + (px * c - py * s), CY + (px * s + py * c));
        }
        let td = self.total_degrees();
        let mut degs = [0i32; MAX_WALLS];
        self.wall_degrees(n, td, &mut degs);
        let (mut cx, mut cy) = (0.0, 0.0);
        for v in &self.verts[..n] { cx += v.0; cy += v.1; }
        cx /= n as f64; cy /= n as f64;
        for i in 0..n {
            let (ax, ay) = self.verts[i];
            let (bx, by) = self.verts[(i + 1) % n];
            let (mut nx, mut ny) = (-(by - ay), bx - ax);
            let len = { let l = (nx * nx + ny * ny).sqrt(); if l == 0.0 { 1.0 } else { l } };
            nx /= len; ny /= len;
            if nx * (cx - ax) + ny * (cy - ay) < 0.0 { nx = -nx; ny = -ny; }
            let flash = if keep_flash { self.walls[i].flash } else { 0.0 };
            self.walls[i] = Wall { ax, ay, bx, by, nx, ny, deg: degs[i], cents: self.cents_for_degree(degs[i]), flash, broken: false, reform: 0.0 };
        }
        self.n = n;
        self.broken_n = 0;
    }

    /// The web's `wallDegrees`: walls ascend round the shape, two of every three pulled onto the home chord.
    fn wall_degrees(&self, n: usize, td: i32, out: &mut [i32; MAX_WALLS]) {
        let len = self.s.scale.degrees() as i32;
        let mut ct = [0usize; 3];
        let k = home_chord(self.s.scale.cents, &mut ct);
        let is_tri = |d: i32| ct[..k].contains(&(d.rem_euclid(len) as usize));
        let mut prev = -1;
        for i in 0..n {
            let mut d = (i as f64 / n as f64 * td as f64).round() as i32;
            let (mut best, mut bd) = (None, 99);
            for c in d - 1..=d + 1 {
                if c < 0 || c >= td || c <= prev || !is_tri(c) { continue; }
                let dist = (c - d).abs();
                if dist < bd { bd = dist; best = Some(c); }
            }
            if let Some(b) = best { d = b; }
            if d < prev { d = prev; }
            if d >= td { d = td - 1; }
            out[i] = d;
            prev = d;
        }
    }

    /// Is a point inside the shape? (ray casting, the web's `inPoly`)
    pub fn inside(&self, x: f64, y: f64) -> bool {
        let vs = &self.verts[..self.n];
        let mut inside = false;
        let mut j = vs.len() - 1;
        for i in 0..vs.len() {
            let (xi, yi) = vs[i];
            let (xj, yj) = vs[j];
            if (yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi { inside = !inside; }
            j = i;
        }
        inside
    }

    /// A new ball where the web's `zInit` puts one: at the front glass, drifting back.
    pub fn add_ball_at(&mut self, x: f64, y: f64, z: f64, vx: f64, vy: f64, vz: f64) -> bool {
        if self.balls.len() >= self.balls.capacity() { return false; }
        self.balls.push(Ball { x, y, z, vx, vy, vz, tq: 1.0, tg: 0.0, bl: 0, last_hit: f64::NEG_INFINITY, last_pane: f64::NEG_INFINITY, pane_n: 0, visc: 0.0 });
        true
    }

    /// A ball from the middle in a random direction at the tempo's speed, starting at the front glass (`zInit`).
    pub fn add_ball(&mut self) -> bool {
        let a = self.rand() * std::f64::consts::TAU;
        let r0 = R * 0.3 * self.rand();
        let sp = self.ball_speed();
        let vz = 0.003 + self.rand() * 0.004;
        self.add_ball_at(CX + a.cos() * r0, CY + a.sin() * r0, 0.02, a.cos() * sp, a.sin() * sp, vz)
    }

    /// Steady, tempo-driven ball speed (px a tick).
    pub fn ball_speed(&self) -> f64 { (self.bpm / 80.0) * 3.4 }

    /// Grid step `c`'s length in ms (swing: the even steps lean long, the odd ones short).
    pub fn tick_interval(&self, c: u64) -> f64 {
        let beat = 60.0 / self.bpm;
        let mut d = self.s.div * 4.0 * beat;
        if self.s.swing > 0.01 { d *= if c % 2 == 0 { 1.0 + self.s.swing * 0.5 } else { 1.0 - self.s.swing * 0.5 }; }
        d * 1000.0
    }

    /// One bar has passed (the host's bar line). A wall opens every 8 bars and the oldest gap heals every 24, so the
    /// oldest notes drift out and the tank never jams (the web's `advanceHarmony`, slime on).
    pub fn on_bar(&mut self) {
        self.wall_bars += 1;
        if self.wall_bars % 8 == 0 { self.break_wall(); }
        if self.wall_bars % 24 == 0 { self.repair_wall(); }
    }

    fn break_wall(&mut self) {
        if self.now - self.last_break < 650.0 { return; }
        self.last_break = self.now;
        let n = self.n;
        let live = self.walls[..n].iter().filter(|e| !e.broken).count();
        let broken_now = n - live;
        if broken_now >= ((n as f64 * 0.34).floor() as usize).max(1) || live <= 3 { return; }
        let len = self.s.scale.degrees() as i32;
        let root = self.home_root_deg.rem_euclid(len);
        // don't open the tonic wall: the harmony stays grounded
        let is_cand = |e: &Wall| !e.broken && deg_of(self.s.scale, e.cents) != root;
        let cand = self.walls[..n].iter().filter(|e| is_cand(e)).count();
        let pool = if cand > 0 { cand } else { live };
        let pick = (self.rand() * pool as f64) as usize;
        let mut k = 0;
        for i in 0..n {
            let e = self.walls[i];
            let ok = if cand > 0 { is_cand(&e) } else { !e.broken };
            if !ok { continue; }
            if k == pick {
                self.walls[i].broken = true;
                self.walls[i].reform = 0.0;
                if self.broken_n < MAX_WALLS { self.broken_order[self.broken_n] = i; self.broken_n += 1; }
                break;
            }
            k += 1;
        }
    }

    fn repair_wall(&mut self) {
        if self.broken_n == 0 { return; }
        let i = self.broken_order[0];
        self.broken_order.copy_within(1..self.broken_n, 0);
        self.broken_n -= 1;
        if !self.walls[i].broken { return; }
        self.walls[i].reform = 0.001;
    }

    /// One 60 Hz physics step. Returns this tick's hits.
    pub fn tick(&mut self, clock: &Clock) -> &[Hit] {
        self.hits.clear();
        self.playing = clock.playing;
        if !clock.playing { return &self.hits; } // the DAW stopped: the tank is frozen
        self.bpm = clock.bpm.max(1.0);
        let now = clock.now_ms;
        self.now = now;
        // the grid (the web's transport): drift-free, re-anchors if it fell far behind
        let ti = self.tick_interval(self.tick_count);
        if now - self.last_tick >= ti {
            self.last_tick = if now - self.last_tick > ti * 3.0 { now } else { self.last_tick + ti };
            self.tick_count += 1;
        }
        // base spin (studio): the same walls, turned; a struck one keeps its flash
        if self.s.spin != 0.0 {
            let d = self.s.spin * 0.0003;
            self.rot += d;
            self.rebuild(true);
            self.rot_v = d;
        } else { self.rot_v = 0.0; }
        if self.s.auto_notes { self.auto_notes(now); }
        self.step(now);
        self.goo.step(now, self.bpm, &self.walls[..self.n], &self.balls, &mut self.rng);
        // the view leans round once every 16 bars (the web's `viewTick`, which the balls' gravity reads)
        self.phi += std::f64::consts::TAU * (FIXED / 1000.0) / (16.0 * (4.0 * 60.0 / self.bpm).max(0.2));
        // a healing wall fades back in (the web does this in the 3D draw, wallUpkeep)
        for e in self.walls[..self.n].iter_mut() {
            if e.broken && e.reform > 0.0 { e.reform = (e.reform + 0.007).min(1.0); if e.reform >= 1.0 { e.broken = false; e.reform = 0.0; } }
            e.flash *= 0.86;
        }
        &self.hits
    }

    /// The slime's auto-notes (the web's transport): one roll a beat, a strong beat every other one. A note floats in
    /// only while the air is fairly clear (fewer than 7 balls): 60% on a strong beat, 22% on a weak one.
    fn auto_notes(&mut self, now: f64) {
        let beat = 60000.0 / self.bpm.max(40.0);
        let mut next = match self.mel_next { Some(m) if now - m <= beat * 4.0 => m, _ => now }; // (re)start without a burst
        while now >= next {
            let strong = self.mel_step_n % 2 == 0;
            if self.balls.len() < 7 {
                let roll = self.rand();
                if roll < if strong { 0.6 } else { 0.22 } { self.auto_melody_note(strong); }
            }
            self.mel_step_n += 1;
            next += beat;
        }
        self.mel_next = Some(next);
    }

    /// A gentle, floaty ball, leaned toward the wall that plays the melody's next note. The lean is wide, so the
    /// geometry still decides a lot (the web's `autoMelodyNote`).
    fn auto_melody_note(&mut self, strong: bool) {
        let len = self.s.scale.degrees() as i32;
        let root = self.home_root_deg;
        let deg = { let rng = &mut self.rng; self.melody.next_deg(strong, len, root, &mut || rng.next_f32() as f64) };
        let cents = self.cents_for_degree(deg);
        let td = self.total_degrees();
        let oct = ((cents / 1200.0).floor() as i32).min((td as f64 / len as f64).ceil() as i32 - 1).max(0);
        let dd = (td - 1).min(oct * len + deg_of(self.s.scale, cents)); // the note-wall we lean toward
        self.aim_deg = dd;
        let ang = self.rot - std::f64::consts::FRAC_PI_2 + ((dd as f64 + 0.5) / td as f64) * std::f64::consts::TAU
            + (self.rand() - 0.5) * 1.4;
        let sp = self.ball_speed() * (0.45 + self.rand() * 0.3);
        let r0 = R * 0.14 * self.rand();
        if self.balls.len() >= MAXBALLS { return; } // full: skip this note, the open walls let old ones go
        let vz = 0.003 + self.rand() * 0.004;
        self.add_ball_at(CX + ang.cos() * r0, CY + ang.sin() * r0, 0.02, ang.cos() * sp, ang.sin() * sp, vz);
    }

    fn step(&mut self, now: f64) {
        self.balls.retain(|b| b.x.is_finite() && b.y.is_finite() && b.vx.is_finite() && b.vy.is_finite());
        if self.balls.len() > MAXBALLS && !self.walls[..self.n].iter().any(|e| e.broken) { self.break_wall(); }
        // AUTO gravity: a whisper, just enough drift that a full tank feels a touch heavier, never a fall
        let g = self.goo.settle() * 0.09;
        let ts = self.ball_speed();
        let gy = g * 0.55;
        let mut bi = self.balls.len();
        while bi > 0 {
            bi -= 1;
            let mut b = self.balls[bi];
            b.vy += gy;
            if b.vy > ts * 1.6 { b.vy = ts * 1.6; }
            // substep so a fast ball can never leap past a wall: at most half a radius per micro-step
            let dist0 = (b.vx * b.vx + b.vy * b.vy).sqrt();
            let sub = ((dist0 / (BR * 0.5)).ceil() as usize).clamp(1, 8);
            let isub = 1.0 / sub as f64;
            let mut killed = false;
            for _ in 0..sub {
                b.x += b.vx * isub;
                b.y += b.vy * isub;
                let mut hit_wall = false;
                for wi in 0..self.n {
                    let e = self.walls[wi];
                    if e.broken && e.reform < 0.55 { continue; }
                    let dist = (b.x - e.ax) * e.nx + (b.y - e.ay) * e.ny;
                    if dist >= BR { continue; }
                    let (ex, ey) = (e.bx - e.ax, e.by - e.ay);
                    let l2 = { let l = ex * ex + ey * ey; if l == 0.0 { 1.0 } else { l } };
                    let t = ((b.x - e.ax) * ex + (b.y - e.ay) * ey) / l2;
                    if !(-0.05..=1.05).contains(&t) { continue; } // past a corner: corners stay open to escape
                    let vn = b.vx * e.nx + b.vy * e.ny;
                    if vn < 0.0 {
                        hit_wall = true;
                        b.vx -= 2.0 * vn * e.nx;
                        b.vy -= 2.0 * vn * e.ny;
                        self.jitter(&mut b);
                        b.x += (BR - dist) * e.nx;
                        b.y += (BR - dist) * e.ny;
                        self.walls[wi].flash = 1.0;
                        if now - b.last_hit > 60.0 {
                            b.last_hit = now;
                            // a goo-slathered hit rings softer and rounder
                            let gd = self.goo.density(b.x, b.y, b.z);
                            let under = gd > 0.3;
                            let depth = if under { ((gd - 0.3) / 0.6).min(1.0) } else { 0.0 };
                            if under && b.visc == 0.0 { b.visc = 0.80 + self.rand() * 0.12; }
                            let goo = if under { ((0.35 + 0.65 * depth) * ((1.0 - b.visc) / 0.2)).min(1.0) } else { 0.0 };
                            let imp = (vn.abs() / if ts == 0.0 { 1.0 } else { ts }).min(1.0) * (1.0 - goo * 0.45);
                            self.trigger(e.cents, imp, goo, false, Some(wi), now);
                            self.goo.splash(b.x, b.y, b.z, e.nx, e.ny, &mut self.rng); // the note's drops join the pool
                        }
                    }
                }
                // a ball that truly left through an open gap and wandered off is gone
                if !hit_wall && !self.inside(b.x, b.y) && (b.x < -80.0 || b.x > W + 80.0 || b.y < -80.0 || b.y > H + 80.0) {
                    killed = true;
                    break;
                }
            }
            if killed { self.balls.remove(bi); continue; }
            // the third dimension: between the front and the back pane
            if b.vz != 0.0 {
                if g > 0.0 { let gv = self.gravity(); b.vx += gv[0] * gy; b.vz += gv[2] * gy / BOXD; } // the tilted box leans balls toward a pane
                b.vz = b.vz.clamp(-0.012, 0.012);
                if b.vz.abs() < 0.0015 { b.vz = if b.vz < 0.0 { -0.0015 } else { 0.0015 }; } // never parked against the glass
                b.z += b.vz * b.tq;
                if b.z < 0.0 { b.z = -b.z; b.vz = -b.vz; self.hit_pane(&mut b, false, now); }
                else if b.z > 1.0 { b.z = 2.0 - b.z; b.vz = -b.vz; self.hit_pane(&mut b, true, now); }
            }
            // steady tempo speed, give or take beat lock's little steer onto the grid
            self.beat_lock(&mut b, now);
            let tsb = ts * b.tq;
            let sp = { let s = (b.vx * b.vx + b.vy * b.vy).sqrt(); if s == 0.0 { 1.0 } else { s } };
            let k = (tsb / sp) * (1.0 - g) + g;
            b.vx *= k;
            b.vy *= k;
            if g > 0.0 { b.vx *= 1.0 - g * 0.06; b.vy *= 1.0 - g * 0.015; } // they land and settle instead of skating
            // the goo is thick: a ball wading through it drags at its own rate, deeper = thicker, so a full tank
            // plays looser than an empty one
            let gd = self.goo.density(b.x, b.y, b.z);
            if gd > 0.3 {
                if b.visc == 0.0 { b.visc = 0.68 + self.rand() * 0.16; }
                let depth = ((gd - 0.3) / 0.6).min(1.0);
                let drag = (1.0 - (1.0 - b.visc) * (0.8 + 1.3 * depth)).max(0.55);
                b.vx *= drag;
                b.vy *= drag;
                if b.vz != 0.0 { b.vz *= drag; }
            }
            self.balls[bi] = b;
        }
    }

    /// The front and back panes: the back plays the chord's root, the front a chord tone an octave up.
    fn hit_pane(&mut self, b: &mut Ball, back: bool, now: f64) {
        if now - b.last_pane < 140.0 { return; }
        b.last_pane = now;
        if !self.inside(b.x, b.y) { return; }
        let rd = self.home_root_deg;
        let c = if back { self.cents_for_degree(rd) } else {
            b.pane_n += 1;
            self.cents_for_degree(rd + if b.pane_n % 2 == 1 { 2 } else { 4 }) + 1200.0
        };
        self.trigger(c, 0.35, 0.0, true, None, now);
        self.goo.splash(b.x, b.y, if back { 0.97 } else { 0.03 }, 0.0, -1.0, &mut self.rng);
    }

    /// Down, as the leaning box feels it (the web's `boxGravity` off the `viewTick` turn): [x, y, z per unit].
    fn gravity(&self) -> [f64; 3] {
        let (ux, uy) = (self.phi.cos(), self.phi.sin());
        let th = 0.3 + 0.34 * (0.5 - 0.5 * (self.phi * 0.5).cos()); // 16 bars to lean all the way in, 16 back
        let (c, s) = (th.cos(), th.sin());
        let k = 1.0 - c;
        [ux * uy * k, c + uy * uy * k, -ux * s]
    }

    /// The goo, for tests and the engine.
    pub fn goo(&self) -> &Goo { &self.goo }

    /// Knock a bouncing ball a little off its angle; its speed stays.
    fn jitter(&mut self, b: &mut Ball) {
        if self.s.chaos <= 0.0 { return; }
        let sp = (b.vx * b.vx + b.vy * b.vy).sqrt();
        let a = b.vy.atan2(b.vx) + (self.rand() - 0.5) * self.s.chaos * 2.2;
        b.vx = a.cos() * sp;
        b.vy = a.sin() * sp;
    }

    fn vel_for_hit(&mut self) -> f64 {
        if self.s.vel_rand {
            let (lo, hi) = (self.s.vel_min as f64, self.s.vel_max as f64);
            (lo + self.rand() * (hi - lo)).round()
        } else { self.s.vel_fix as f64 }
    }

    /// The web's `trigger` for a ball: the level, and whether quantize holds the note for the next grid line.
    fn trigger(&mut self, cents: f64, imp: f64, goo: f64, pane: bool, wall: Option<usize>, now: f64) {
        let mut vel = (self.vel_for_hit() * (1.0 - goo * 0.3)).round();
        if pane { vel = (vel * 0.62).round().max(1.0); }
        let ti = self.tick_interval(self.tick_count);
        let (prev, next) = (self.last_tick, self.last_tick + ti);
        let held = self.s.quantize && goo == 0.0 && now - prev > QLATE && next - now <= QWAIT;
        let sound = if held { next } else { now };
        let near = |t: f64| (t - prev).abs().min((next - t).abs());
        if self.hits.len() < MAX_HITS {
            self.hits.push(Hit { cents, vel: vel.clamp(1.0, 127.0) as u8, imp, goo, pane, wall, at_ms: now, sound_ms: sound,
                grid_ms: near(sound), hit_grid_ms: near(now) });
        }
    }

    /// Ticks until this ball next makes a note (a wall or a pane), flying straight at its current speed. A spinning
    /// shape turns its walls into the ball's path, so then the flight is walked forward in the shape's turning frame.
    fn hit_ticks(&self, b: &Ball) -> f64 {
        let mut best = f64::INFINITY;
        if b.vz != 0.0 {
            let t = if b.vz < 0.0 { b.z / (-b.vz * b.tq) } else { (1.0 - b.z) / (b.vz * b.tq) };
            if t >= 0.0 { best = t; }
        }
        let (x0, y0) = (b.x - CX, b.y - CY);
        let mut q = [[0f64; 3]; MAX_WALLS];
        let mut m = 0;
        for e in &self.walls[..self.n] {
            if e.broken && e.reform < 0.55 { continue; }
            q[m] = [-e.nx, -e.ny, -((e.ax - CX) * e.nx + (e.ay - CY) * e.ny) - BR];
            m += 1;
        }
        let w = self.rot_v;
        if w.abs() < 1e-6 {
            for qq in &q[..m] {
                let vn = qq[0] * b.vx + qq[1] * b.vy;
                if vn <= 1e-6 { continue; }
                let t = (qq[2] - (qq[0] * x0 + qq[1] * y0)) / vn;
                if t >= 0.0 && t < best { best = t; }
            }
            return best;
        }
        let room = |t: f64, k: usize| {
            let (x, y) = (x0 + b.vx * t, y0 + b.vy * t);
            let a = -w * t;
            let (ca, sa) = (a.cos(), a.sin());
            q[k][2] - (q[k][0] * (x * ca - y * sa) + q[k][1] * (x * sa + y * ca))
        };
        let mut prev = [0f64; MAX_WALLS];
        for k in 0..m { prev[k] = room(0.0, k); }
        const DT: f64 = 4.0;
        let mut t = DT;
        while t <= best.min(320.0) {
            for k in 0..m {
                let r = room(t, k);
                if prev[k] > 0.0 && r <= 0.0 { let hit = t - DT * r / (r - prev[k]); if hit < best { best = hit; } }
                prev[k] = r;
            }
            t += DT;
        }
        best
    }

    /// BEAT LOCK: steer a ball's speed a little (never more than about a fifth) so its next note lands on a grid line.
    fn beat_lock(&self, b: &mut Ball, now: f64) {
        let goo_here = self.goo.density(b.x, b.y, b.z); // a ball in the goo is not steered
        if !self.s.quantize || !self.playing || goo_here > 0.3 {
            b.tq += (1.0 - b.tq) * 0.2;
            b.tg = 0.0;
            return;
        }
        b.bl += 1;
        if b.bl % 2 == 1 { return; } // every other tick is plenty
        let tq = b.tq;
        let n = self.hit_ticks(b);
        if !(n < 1e5) { b.tq = tq + (1.0 - tq) * 0.2; b.tg = 0.0; return; }
        if n < 4.0 { return; } // too close to steer smoothly: hold course
        let left = n * FIXED;
        let t_hit = now + left;
        let count = (2.0 + ((left * 1.4) / self.tick_interval(self.tick_count).max(30.0)).ceil()).min(400.0) as usize;
        let want = |g: f64| tq * left / (g - now).max(1.0);
        let mut tg = if b.tg != 0.0 && b.tg > now + FIXED * 3.0 && (want(b.tg) - 1.0).abs() < 0.22 { b.tg } else { 0.0 };
        if tg == 0.0 {
            let mut bd = 1e9;
            let (mut g, mut c) = (self.last_tick, self.tick_count);
            for _ in 0..count {
                g += self.tick_interval(c);
                c += 1;
                if g <= now + FIXED * 2.0 { continue; }
                let w = want(g);
                let d = w.ln().abs();
                if (w - 1.0).abs() < 0.22 && d < bd { bd = d; tg = g; }
                if g > t_hit + left { break; }
            }
        }
        if tg == 0.0 { b.tq = tq + (1.0 - tq) * 0.2; return; }
        b.tg = tg;
        b.tq = tq + (want(tg).clamp(0.8, 1.22) - tq) * 0.35;
    }
}

/// The scale degree (0..len-1) nearest to a pitch, ignoring the octave (the web's `degOf`).
fn deg_of(scale: &Scale, cents: f64) -> i32 {
    let rem = (cents.round() as i64).rem_euclid(1200) as f64;
    let (mut idx, mut bd) = (0, 1e9);
    for (i, &c) in scale.cents.iter().enumerate() {
        let d = (c as f64 - rem).abs().min(1200.0 - (c as f64 - rem).abs());
        if d < bd { bd = d; idx = i as i32; }
    }
    idx
}
