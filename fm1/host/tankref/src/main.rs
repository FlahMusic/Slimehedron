//! Runs the plugin's tank (vst/slimehedron-core) through the scenes in `fm1/host/scenes.txt` and prints every hit and,
//! every 30 ticks, the balls, the open walls and the goo, one line each. The C tank prints the same lines
//! (fm1/host/tanktest.c); fm1/host/check-tank.js compares them.

use slimehedron_core::music::scales::by_id;
use slimehedron_core::tank::{Clock, Tank, TankSettings, FIXED};

fn main() {
    let path = std::env::args().nth(1).expect("tankref SCENES");
    for line in std::fs::read_to_string(path).unwrap().lines() {
        let f: Vec<&str> = line.split_whitespace().collect();
        if f.is_empty() || f[0].starts_with('#') { continue; }
        // name walls scale octs spin chaos quantize swing vel_rand auto bpm seed bars
        let s = TankSettings { walls: f[1].parse().unwrap(), scale: by_id(f[2]).unwrap(), octs: f[3].parse().unwrap(),
            spin: f[4].parse().unwrap(), chaos: f[5].parse().unwrap(), quantize: f[6] == "1", swing: f[7].parse().unwrap(),
            vel_rand: f[8] == "1", auto_notes: f[9] == "1", ..TankSettings::default() };
        let (bpm, seed, bars): (f64, u64, u64) = (f[10].parse().unwrap(), f[11].parse().unwrap(), f[12].parse().unwrap());
        println!("scene {}", f[0]);
        let mut t = Tank::new(s, seed);
        t.start(0.0);
        if !s.auto_notes { for _ in 0..5 { t.add_ball(); } }
        let bar_ms = 240000.0 / bpm;
        let mut next_bar = bar_ms;
        let mut i: u64 = 0;
        while (i as f64) * FIXED < bars as f64 * bar_ms {
            let now = i as f64 * FIXED;
            for h in t.tick(&Clock { now_ms: now, bpm, playing: true }) {
                println!("h {} {:?} {} {:?} {:?} {} {} {:?} {:?} {:?} {:?}", i, h.cents, h.vel, h.imp, h.goo, h.pane as u8,
                    h.wall.map_or(-1, |w| w as i64), h.at_ms, h.sound_ms, h.grid_ms, h.hit_grid_ms);
            }
            if now >= next_bar { t.on_bar(); next_bar += bar_ms; }
            if std::env::var("TANKDBG").is_ok() { for (k, p) in t.goo().drops().iter().enumerate() { println!("d {} {} {:?} {:?} {:?} {:?} {:?} {:?} {:?}", i, k, p.x, p.y, p.z, p.vx, p.vy, p.vz, p.r); } }
            if i % 30 == 0 {
                let mut l = format!("s {} {}", i, t.balls().len());
                for b in t.balls() { l += &format!(" {:?} {:?} {:?} {:?} {:?} {:?} {:?}", b.x, b.y, b.z, b.vx, b.vy, b.vz, b.tq); }
                let open: Vec<String> = t.walls().iter().map(|e| format!("{}{:?}", e.broken as u8, e.reform)).collect();
                l += &format!(" w {}", open.join(","));
                let g = t.goo();
                let (mut sx, mut sy, mut sz, mut np) = (0.0, 0.0, 0.0, 0);
                for p in g.drops() { sx += p.x; sy += p.y; sz += p.z; if p.pooled { np += 1; } }
                l += &format!(" g {} {} {} {:?} {:?} {:?} {:?}", g.cap(), g.drops().len(), np, g.fill(), sx, sy, sz);
                println!("{}", l);
            }
            i += 1;
        }
    }
}
