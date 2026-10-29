//! The goo in 3D: a lava lamp inside the prism (ADR 0007: the real goo, not a stand-in; ADR 0008: the 3D one).
//! Ported from the web app's `splash`, `fillPhysics`, `gooStep3D`, `lavaTick`, `gooContain3D`, `gooWake`,
//! `relax3D` and `buildGooHash`/`gooAt3`, number for number.
//!
//! Every wall hit splashes five drops. The ones the music clock allows join the goo (a shape may hold b/66 of a full
//! tank by bar b, so it fills in about 64 bars whatever the hit rate); the rest fly and fade. Pooled drops gather
//! into one soft heart that drifts round the middle and is squeezed on every beat. A ball pushes the goo aside, and
//! the goo slows the ball and softens its notes: [`Goo::density`] is what the balls feel.
//!
//! Left out because nothing hears them: colour (hues, ripples), the drawn position between ticks, the 2D goo
//! (ADR 0008), the burst (step 2b: a full tank stays full). The web's three hearts are one heart since it stopped
//! budding new ones, so only heart 0 is kept (the other two were computed and never used).
//! Nothing allocates after [`Goo::new`].

use super::{Ball, Wall, BOXD, BR, CX, CY, R};
use crate::Rng;

/// A drop's full radius.
pub const PR: f64 = 8.0;
/// The goo's gravity (the web's `GRAV`, straight down the tank: no phone to tilt).
const GRAV: f64 = 0.17;
/// The goo keeps this far inside the glass (px).
const GOO_IN: f64 = 10.0;
/// How much of the tank a full goo takes up.
const GOO_SHARE: f64 = 0.065;
/// The density grid's cell (px).
pub const GOOC: f64 = 24.0;
/// The shape's song: bars to fill.
const FILL_BARS: f64 = 66.0;
/// The neighbour grid's cell: two drop radii.
const CELL: f64 = 2.0 * PR;

/// The 13 neighbour cells "after" a cell: each pair of drops is met once.
const HALF_SHELL: [[i32; 3]; 13] = {
    let mut o = [[0i32; 3]; 13];
    let mut n = 0;
    let mut dz = -1;
    while dz <= 1 {
        let mut dy = -1;
        while dy <= 1 {
            let mut dx = -1;
            while dx <= 1 {
                if dz > 0 || (dz == 0 && (dy > 0 || (dy == 0 && dx > 0))) { o[n] = [dx, dy, dz]; n += 1; }
                dx += 1;
            }
            dy += 1;
        }
        dz += 1;
    }
    o
};

#[derive(Debug, Clone, Copy, Default)]
pub struct Drop {
    pub x: f64, pub y: f64,
    /// Depth, 0 = front pane, 1 = back pane.
    pub z: f64,
    pub vx: f64, pub vy: f64, pub vz: f64,
    pub r: f64,
    age: u32,
    /// Part of the goo (otherwise still flying as spray).
    pub pooled: bool,
    /// Spray past the music clock's allowance: it flies and is gone.
    pub fade: bool,
}

/// A flat grid over the tank, its dimensions fixed by the tank's size.
#[derive(Debug, Clone, Copy)]
struct Grid { nx: usize, nz: usize, ox: f64, oy: f64, oz: f64, cell: f64 }

impl Grid {
    fn new(cell: f64) -> Grid {
        let span = 2.0 * R * 1.3 + 4.0 * cell;
        let nx = (span / cell).ceil() as usize + 2;
        let nz = ((BOXD + 4.0 * cell) / cell).ceil() as usize + 2;
        Grid { nx, nz, ox: CX - span / 2.0, oy: CY - span / 2.0, oz: -BOXD / 2.0 - 2.0 * cell, cell }
    }
    fn len(&self) -> usize { self.nx * self.nx * self.nz }
    /// The cell a point falls in, clamped to the grid.
    fn cell_of(&self, x: f64, y: f64, z: f64) -> [usize; 3] {
        let c = |v: f64, o: f64, n: usize| { let a = ((v - o) / self.cell).floor(); if a < 0.0 { 0 } else if a >= n as f64 { n - 1 } else { a as usize } };
        [c(x, self.ox, self.nx), c(y, self.oy, self.nx), c((z - 0.5) * BOXD, self.oz, self.nz)]
    }
    fn key(&self, a: usize, b: usize, c: usize) -> usize { (c * self.nx + b) * self.nx + a }
}

pub struct Goo {
    drops: Vec<Drop>,
    /// The drop budget for this shape (the web's `partCap`).
    cap: usize,
    /// How far the heart may wander from the middle on each axis (`gooRoom`).
    room: [f64; 3],
    /// The shape's song clock, in beats (`fillBeats`).
    fill_beats: f64,
    /// Pooled drops over 92% of the budget, read every 10 ticks (the web reads it in the draw, `measureFill`).
    measured_fill: f64,
    ticks: u64,
    // the lava lamp (`LAVA`): the beat it last squeezed on, the squeeze's axis and strength, the heart's centre
    lava_beat: Option<i64>,
    axis: [f64; 3],
    kick: f64,
    heart: [f64; 3],
    core: f64,
    // the neighbour grid, a linked list per cell (`_RG`)
    rg: Grid,
    head: Vec<i32>,
    next: Vec<i32>,
    cells: Vec<[usize; 3]>,
    // the density grid (`_GD`): pooled drop volume per cell
    gd: Grid,
    dens: Vec<f64>,
    dens_n: usize,
}

impl Goo {
    /// An empty tank. `area` is the shape's area (px^2), `room` the shortest way from the middle to a wall.
    pub fn new(area: f64, room: f64) -> Goo {
        let room = [room, room, BOXD / 2.0];
        // THE 3D TANK HOLDS GOO BY VOLUME: a prism's inside is its area times its depth (`tankVolume`, `partCap`)
        let cap = (1600.0f64).min(area * BOXD * GOO_SHARE / 3300.0).floor() as usize;
        let max = cap * 2 + 16; // the allowance caps the goo at `cap`; spray tops out near 1.15 x cap
        let (rg, gd) = (Grid::new(CELL), Grid::new(GOOC));
        Goo { drops: Vec::with_capacity(max), cap, room, fill_beats: 0.0, measured_fill: 0.0, ticks: 0,
            lava_beat: None, axis: [1.0, 0.0, 0.0], kick: 0.0, heart: [0.0; 3], core: 0.0,
            rg, head: vec![-1; rg.len()], next: vec![-1; max], cells: vec![[0; 3]; max],
            gd, dens: vec![0.0; gd.len()], dens_n: 0 }
    }

    pub fn drops(&self) -> &[Drop] { &self.drops }
    pub fn cap(&self) -> usize { self.cap }

    /// How full the tank reads, 0..1 (pooled drops over 92% of the budget).
    pub fn fill(&self) -> f64 { self.measured_fill }

    /// 0 = young goo floats weightless, 1 (half full or more) = heavy enough to settle (`settleAmt`).
    pub fn settle(&self) -> f64 { ((self.measured_fill - 0.22) / 0.28).clamp(0.0, 1.0) }

    /// Five drops off a wall hit, thrown back into the tank along the wall's normal and fanned along it. Only as many
    /// join the goo as the music clock allows; the rest are spray that fades.
    pub fn splash(&mut self, x: f64, y: f64, z: f64, inx: f64, iny: f64, rng: &mut Rng) {
        let feed = self.drops.iter().filter(|p| !p.fade).count();
        let allowance = (self.fill_beats / 4.0 / (FILL_BARS * 1.13)).min(1.0) * self.cap as f64;
        let keep = (allowance - feed as f64).floor().clamp(0.0, 5.0) as usize;
        let mut rand = || rng.next_f32() as f64;
        for i in 0..5 {
            if i >= keep && self.drops.len() as f64 >= self.cap as f64 * 1.15 { break; } // spray that only fades is capped too
            if self.drops.len() == self.drops.capacity() { break; }
            let sp = 1.4 + rand() * 2.6;
            let (tx, ty) = (-iny, inx);
            let tang = (rand() - 0.5) * 3.6;
            let px = x + (rand() - 0.5) * 8.0;
            let py = y + (rand() - 0.5) * 8.0;
            self.drops.push(Drop { x: px, y: py, z, vx: inx * sp + tx * tang, vy: iny * sp + ty * tang, vz: 0.0, r: 2.0, age: 0,
                pooled: false, fade: i >= keep });
        }
    }

    /// How thick the goo is round a point, 0..1 (`gooAt3`): packed drops read about 1, a heart's skin about 0.5.
    /// Depth counts: a ball in front of the goo is not in it.
    pub fn density(&self, x: f64, y: f64, z: f64) -> f64 {
        if self.dens_n == 0 { return 0.0; }
        let g = &self.gd;
        let cx = ((x - g.ox) / GOOC).floor() as i64;
        let cy = ((y - g.oy) / GOOC).floor() as i64;
        let cz = (((z - 0.5) * BOXD - g.oz) / GOOC).floor() as i64;
        let mut s = 0.0;
        for i in -1..=1 {
            for j in -1..=1 {
                for k in -1..=1 {
                    let (a, b, c) = (cx + i, cy + j, cz + k);
                    if a < 0 || b < 0 || c < 0 || a >= g.nx as i64 || b >= g.nx as i64 || c >= g.nz as i64 { continue; }
                    s += self.dens[g.key(a as usize, b as usize, c as usize)];
                }
            }
        }
        (s * 4.18879 / (27.0 * GOOC * GOOC * GOOC) * 1.9).min(1.0)
    }

    /// One physics tick (`fillPhysics` for the 3D tank). `balls_in` says whether any ball is flying (the song clock
    /// runs while there is goo or a ball, and starts again from an empty tank).
    pub fn step(&mut self, now_ms: f64, bpm: f64, walls: &[Wall], balls: &[Ball], rng: &mut Rng) {
        self.fill_beats = if !self.drops.is_empty() || !balls.is_empty() { self.fill_beats + bpm / 3600.0 } else { 0.0 };
        self.drops.retain(|p| !(p.fade && p.age > 34)); // spray that only splashed has flown: gone (in place, no allocation)
        self.step3d(now_ms, bpm, walls, balls, rng);
        self.ticks += 1;
        if self.ticks % 10 == 0 { self.measure(); }
    }

    /// The fill: pooled drops over 92% of the budget (a volume is full when the drops are all in).
    fn measure(&mut self) {
        let k = self.drops.iter().filter(|p| p.pooled).count();
        self.measured_fill = (k as f64 / (self.cap as f64 * 0.92).max(1.0)).min(1.0);
    }

    /// The lava lamp (`lavaTick`): on every new beat the heart is squeezed along a fresh axis, harder on the downbeat
    /// and the fuller the tank; the heart's centre wanders on its own slow cycle.
    fn lava(&mut self, beats: f64, pooled_n: usize, rng: &mut Rng) -> f64 {
        let fb = beats.floor() as i64;
        if self.lava_beat != Some(fb) {
            let first = self.lava_beat.is_none();
            self.lava_beat = Some(fb);
            if !first {
                let down = fb.rem_euclid(4) == 0;
                let fill = (pooled_n as f64 / (self.cap as f64 * 0.9).max(1.0)).min(1.0);
                let mut rand = || rng.next_f32() as f64;
                let z = rand() * 2.0 - 1.0;
                let a = rand() * std::f64::consts::TAU;
                let s = (1.0 - z * z).sqrt();
                self.axis = [s * a.cos(), s * a.sin(), z];
                self.kick = (0.5 + 0.5 * fill) * if down { 1.35 } else { 1.0 } * (0.8 + rand() * 0.4);
            }
        }
        let (w, cr) = (0.09, self.core + GOO_IN + PR);
        let room = self.room;
        let amp = |k: usize, f: f64| (room[k] * f).min((room[k] - cr).max(0.0)); // a big heart wanders less
        self.heart = [amp(0, 0.42) * (beats * w).sin(), amp(1, 0.5) * (beats * w * 0.63).sin(), amp(2, 0.42) * (beats * w * 1.21).sin()];
        beats - fb as f64
    }

    fn step3d(&mut self, now_ms: f64, bpm: f64, walls: &[Wall], balls: &[Ball], rng: &mut Rng) {
        let pooled_n = self.drops.iter().filter(|p| p.pooled).count();
        // where the music is, in beats (the web's `beatNow` with the band off: its clock times the tempo)
        let phase = self.lava(now_ms / 60000.0 * bpm, pooled_n, rng);
        let env = (-phase * 10.0).exp(); // the squeeze, sharp on the beat and gone before the next
        self.core = 8.5 * (pooled_n.max(1) as f64).cbrt(); // how big a packed heart of that many drops is
        let (h, axis, kick, core) = (self.heart, self.axis, self.kick, self.core);
        let t = now_ms * 0.001;
        for p in self.drops.iter_mut() {
            p.age += 1;
            if !p.pooled && !p.fade && (p.age > 40 || (p.age > 10 && (p.vx * p.vx + p.vy * p.vy + p.vz * p.vz).sqrt() < 1.2)) { p.pooled = true; }
            if p.pooled {
                if p.r < PR { p.r += 0.12; }
                let (rx, ry, rz) = (p.x - CX - h[0], p.y - CY - h[1], (p.z - 0.5) * BOXD - h[2]);
                let d = { let d = (rx * rx + ry * ry + rz * rz).sqrt(); if d == 0.0 { 1.0 } else { d } };
                let c = core * 0.75;
                if d > c { let k = 0.012 * (d - c) / d; p.vx -= rx * k; p.vy -= ry * k; p.vz -= rz * k; }
                if env > 0.01 {
                    // the beat: a sharp stretch along its axis, a squeeze across it, a breath out
                    let ka = kick * env;
                    let al = rx * axis[0] + ry * axis[1] + rz * axis[2];
                    let (sx, sy, sz) = (axis[0] * al, axis[1] * al, axis[2] * al);
                    p.vx += ka * (0.045 * sx - 0.024 * (rx - sx) + 0.01 * rx);
                    p.vy += ka * (0.045 * sy - 0.024 * (ry - sy) + 0.01 * ry);
                    p.vz += ka * (0.045 * sz - 0.024 * (rz - sz) + 0.01 * rz);
                }
                // a slow shimmer: never a perfect ball
                p.vx += 0.035 * (t * 1.3 + p.y * 0.035).sin();
                p.vy += 0.035 * (t * 1.1 + p.z * BOXD * 0.035).sin();
                p.vz += 0.035 * (t * 0.9 + p.x * 0.035).sin();
                p.vy += GRAV * 0.1; // nearly afloat, like wax in warm oil
                p.vx *= 0.88; p.vy *= 0.88; p.vz *= 0.88;
            } else {
                p.vy += GRAV; p.vx *= 0.985; p.vy *= 0.992; p.vz *= 0.96; // spray still flies and falls
            }
            p.x += p.vx; p.y += p.vy; p.z += p.vz / BOXD;
            contain(p, walls);
        }
        self.wake(balls);
        self.relax();
        self.relax();
        for p in self.drops.iter_mut() { contain(p, walls); }
        self.build_density();
    }

    /// A ball moving through the goo shoves it aside and drags a little of it along (`gooWake`).
    fn wake(&mut self, balls: &[Ball]) {
        let reach = BR + PR + 6.0;
        for b in balls {
            let vz = b.vz * BOXD;
            for p in self.drops.iter_mut() {
                if !p.pooled { continue; }
                let dx = p.x - b.x; if dx > reach || dx < -reach { continue; }
                let dy = p.y - b.y; if dy > reach || dy < -reach { continue; }
                let dz = (p.z - b.z) * BOXD; if dz > reach || dz < -reach { continue; }
                let d = { let d = (dx * dx + dy * dy + dz * dz).sqrt(); if d == 0.0 { 1.0 } else { d } };
                if d >= reach { continue; }
                let f = 1.0 - (d / reach) * (d / reach);
                p.vx += b.vx * 0.22 * f + dx / d * f * 1.2;
                p.vy += b.vy * 0.22 * f + dy / d * f * 1.2;
                p.vz += vz * 0.22 * f + dz / d * f * 1.2;
            }
        }
    }

    /// Drops push apart and trade a little speed, so the goo slumps like a liquid (`relax3D`). Each pair of
    /// neighbours is met once: a drop looks at the drops after it in its own cell and in the 13 cells after its own.
    fn relax(&mut self) {
        let n = self.drops.len();
        if n == 0 { return; }
        let g = self.rg;
        self.head.fill(-1);
        for i in 0..n {
            let p = self.drops[i];
            let c = g.cell_of(p.x, p.y, p.z);
            let k = g.key(c[0], c[1], c[2]);
            self.next[i] = self.head[k];
            self.head[k] = i as i32;
            self.cells[i] = c; // binned once: drops move as pairs are pushed, the grid is not rebuilt mid-pass
        }
        for i in 0..n {
            let [ca, cb, cc] = self.cells[i];
            let mut j = self.next[i];
            while j != -1 { self.pair(i, j as usize); j = self.next[j as usize]; }
            for o in HALF_SHELL {
                let (gx, gy, gz) = (ca as i32 + o[0], cb as i32 + o[1], cc as i32 + o[2]);
                if gx < 0 || gy < 0 || gz < 0 || gx >= g.nx as i32 || gy >= g.nx as i32 || gz >= g.nz as i32 { continue; }
                let mut j = self.head[g.key(gx as usize, gy as usize, gz as usize)];
                while j != -1 { self.pair(i, j as usize); j = self.next[j as usize]; }
            }
        }
    }

    fn pair(&mut self, i: usize, j: usize) {
        let (mut p, mut q) = (self.drops[i], self.drops[j]);
        let (mut dx, mut dy, mut dz) = (q.x - p.x, q.y - p.y, (q.z - p.z) * BOXD);
        let d2 = dx * dx + dy * dy + dz * dz;
        let min = p.r + q.r;
        if d2 < min * min && d2 > 1e-8 {
            let d = d2.sqrt();
            let push = (min - d) / 2.0;
            dx /= d; dy /= d; dz /= d;
            p.x -= dx * push; p.y -= dy * push; p.z -= dz * push / BOXD;
            q.x += dx * push; q.y += dy * push; q.z += dz * push / BOXD;
            let (rvx, rvy, rvz) = ((p.vx - q.vx) * 0.25, (p.vy - q.vy) * 0.25, (p.vz - q.vz) * 0.25);
            p.vx -= rvx; p.vy -= rvy; p.vz -= rvz;
            q.vx += rvx; q.vy += rvy; q.vz += rvz;
            self.drops[i] = p;
            self.drops[j] = q;
        }
    }

    /// The density grid the balls feel: each pooled drop's volume added to its cell (`buildGooHash`).
    fn build_density(&mut self) {
        self.dens.fill(0.0);
        self.dens_n = 0;
        let g = self.gd;
        for p in &self.drops {
            if !p.pooled { continue; }
            let a = ((p.x - g.ox) / GOOC).floor();
            let b = ((p.y - g.oy) / GOOC).floor();
            let c = (((p.z - 0.5) * BOXD - g.oz) / GOOC).floor();
            if a < 0.0 || b < 0.0 || c < 0.0 || a >= g.nx as f64 || b >= g.nx as f64 || c >= g.nz as f64 { continue; }
            self.dens[g.key(a as usize, b as usize, c as usize)] += p.r * p.r * p.r;
            self.dens_n += 1;
        }
    }
}

/// Keep one drop inside the prism, GOO_IN in from the glass (`gooContain3D` + `bounceInside`): its walls (again only
/// if it moved: in a corner, leaving one wall can mean entering the next), then its two panes. An open wall lets
/// the goo through.
fn contain(p: &mut Drop, walls: &[Wall]) {
    let r = p.r + GOO_IN;
    for _ in 0..3 {
        let (x, y) = (p.x, p.y);
        for e in walls {
            if e.broken { continue; }
            let dist = (p.x - e.ax) * e.nx + (p.y - e.ay) * e.ny;
            if dist < r {
                p.x += (r - dist) * e.nx;
                p.y += (r - dist) * e.ny;
                let vn = p.vx * e.nx + p.vy * e.ny;
                if vn < 0.0 { p.vx -= 1.7 * vn * e.nx; p.vy -= 1.7 * vn * e.ny; }
            }
        }
        if p.x == x && p.y == y { break; }
    }
    let m = r / BOXD;
    if p.z < m { p.z = m; if p.vz < 0.0 { p.vz *= -0.4; } } else if p.z > 1.0 - m { p.z = 1.0 - m; if p.vz > 0.0 { p.vz *= -0.4; } }
}
