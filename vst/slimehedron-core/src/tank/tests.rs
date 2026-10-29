//! The tank, tested from its one seam: settings and a seed in, a clock per tick, hits out.
//! Every test asserts what a listener would hear (which note, when, how often), never how it was computed.

use super::*;

const MS: f64 = 1000.0 / 60.0;

/// One ball at a time, flying true: no knock off its angle, no auto-notes adding balls.
fn quiet() -> TankSettings { TankSettings { chaos: 0.0, auto_notes: false, ..TankSettings::default() } }

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
    let mut t = Tank::new(TankSettings { auto_notes: false, ..TankSettings::default() }, 11);
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

/// Ticks in one beat at 80 bpm (750 ms).
const BEAT: u64 = 45;

#[test]
fn auto_notes_roll_once_a_beat_at_the_webs_odds() {
    // an empty tank, 8 beats: every beat may float one note in, 60% on the strong (even) beats, 22% on the weak.
    // 500 random seeds; each share must sit within 3 standard deviations of its odds.
    let (mut strong, mut weak) = (0u32, 0u32);
    let runs = 500u64;
    for seed in 1..=runs {
        let mut t = Tank::new(TankSettings::default(), seed);
        t.start(0.0);
        let mut have = 0;
        for i in 0..8 * BEAT {
            t.tick(&Clock { now_ms: i as f64 * MS, bpm: 80.0, playing: true });
            let n = t.balls().len();
            if n > have {
                assert_eq!(n, have + 1, "seed {}: two notes floated in on one tick", seed);
                assert!(i % BEAT <= 1, "seed {}: a note floated in off the beat (tick {})", seed, i);
                if (i / BEAT) % 2 == 0 { strong += 1; } else { weak += 1; }
            }
            have = n;
        }
    }
    let per = (runs * 4) as f64;
    let (ps, pw) = (strong as f64 / per, weak as f64 / per);
    let sd = |p: f64| (p * (1.0 - p) / per).sqrt();
    assert!((ps - 0.6).abs() < 3.0 * sd(0.6), "strong beats float a note {:.1}% of the time, want 60%", ps * 100.0);
    assert!((pw - 0.22).abs() < 3.0 * sd(0.22), "weak beats float a note {:.1}% of the time, want 22%", pw * 100.0);
}

#[test]
fn auto_notes_stop_floating_when_the_air_is_full() {
    let mut t = Tank::new(TankSettings::default(), 3);
    t.start(0.0);
    for _ in 0..7 { t.add_ball(); }
    run(&mut t, 0, 40 * BEAT);
    assert_eq!(t.balls().len(), 7, "a note floated into a tank that already had 7 balls");
}

#[test]
fn an_auto_note_leans_toward_its_wall() {
    // each floated ball's first wall, against the wall the melody picked (the slice of the circle its degree owns).
    // The lean is wide (+-0.7 radians, the web's), so the geometry still decides a lot. A blind throw would ring the
    // picked wall or a neighbour about half the time (3 of 6 walls).
    let (mut near, mut total) = (0, 0);
    for seed in 1..=400u64 {
        let mut t = Tank::new(TankSettings { chaos: 0.0, ..TankSettings::default() }, seed);
        t.start(0.0);
        assert!(run(&mut t, 0, 3).is_empty());
        if t.balls().len() != 1 { continue; }
        let td = 14.0;
        let picked = (((t.aim_deg as f64 + 0.5) / td) * 6.0) as i64;
        let first = run(&mut t, 3, 200).into_iter().find(|h| !h.pane).and_then(|h| h.wall);
        if let Some(w) = first {
            total += 1;
            let d = (w as i64 - picked).rem_euclid(6);
            if d == 0 || d == 1 || d == 5 { near += 1; }
        }
    }
    eprintln!("{}/{} floated notes rang the picked wall or a neighbour", near, total);
    assert!(total > 150, "too few floated notes to tell ({})", total);
    assert!(near as f64 / total as f64 > 0.8, "only {}/{} floated notes rang the picked wall or a neighbour", near, total);
}

/// Bars of 180 ticks (80 bpm), with the host's bar line each bar (walls open and heal). Hits of every bar, and the
/// fill read at the end of each bar.
fn song(t: &mut Tank, bars: u64) -> (Vec<Hit>, Vec<f64>) {
    let (mut hits, mut fill) = (Vec::new(), Vec::new());
    for b in 0..bars {
        hits.extend(run(t, b * 180, 180));
        t.on_bar();
        fill.push(t.goo().fill());
    }
    (hits, fill)
}

#[test]
fn the_goo_fills_over_the_song_and_stops_at_full() {
    for seed in [1u64, 2, 3] {
        let mut t = Tank::new(TankSettings::default(), seed);
        t.start(0.0);
        let mut most = 0;
        let mut fill = Vec::new();
        for b in 0..110u64 {
            run(&mut t, b * 180, 180);
            t.on_bar();
            fill.push(t.goo().fill());
            most = most.max(t.goo().drops().iter().filter(|p| !p.fade).count());
        }
        eprintln!("seed {}: fill at bar 8 {:.2}, 16 {:.2}, 32 {:.2}, 64 {:.2}, 110 {:.2}; most goo drops {} of {}",
            seed, fill[7], fill[15], fill[31], fill[63], fill[109], most, t.goo().cap());
        assert!(fill[7] < fill[15] && fill[15] < fill[31] && fill[31] < fill[63], "seed {}: the goo did not keep growing", seed);
        // the shape's song: the music clock lets it fill about a 75th of the way a bar (3D), whatever the hit rate.
        // Measured: 0.46 at bar 32 on every seed (the web: 0.85 +- 0.07 at bar 64).
        assert!((0.35..0.55).contains(&fill[31]), "seed {}: fill at bar 32 is {:.2}, off the 64-bar song", seed, fill[31]);
        assert!(most <= t.goo().cap(), "seed {}: {} goo drops, past the budget of {}", seed, most, t.goo().cap());
        assert!(fill.iter().all(|&f| f <= 1.0));
    }
}

#[test]
fn no_balls_no_goo() {
    let mut t = Tank::new(TankSettings { auto_notes: false, ..TankSettings::default() }, 1);
    t.start(0.0);
    song(&mut t, 20);
    assert!(t.goo().drops().is_empty() && t.goo().fill() == 0.0, "goo appeared in a tank no note ever hit");
}

#[test]
fn gooed_notes_ring_softer_and_looser() {
    // the goo gathers in the middle and the notes ring at the walls, so a gooed wall hit is rare: about 3 in 100 bars
    // in the six-wall tank, on the web (dev-vstparity, 2026-10-29) and here alike. A triangle's walls sit nearer the
    // goo, so it gives enough of them to measure. A fixed velocity (100) so the goo's softening is not lost in the
    // random spread of 12..94.
    let (mut gv, mut gn, mut cv, mut cn, mut gg, mut cg) = (0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    for seed in 1..=4u64 {
        let mut t = Tank::new(TankSettings { walls: 3, vel_rand: false, ..TankSettings::default() }, seed);
        t.start(0.0);
        let (hits, _) = song(&mut t, 100);
        for h in hits.iter().filter(|h| !h.pane) {
            if h.goo > 0.0 { gv += h.vel as f64; gn += 1.0; gg += h.grid_ms; } else { cv += h.vel as f64; cn += 1.0; cg += h.grid_ms; }
        }
    }
    let (level, gooed_off, clean_off) = ((gv / gn) / (cv / cn), gg / gn, cg / cn);
    eprintln!("{} gooed wall hits, {} clean: level {:.3}, off the grid {:.1} ms vs {:.1} ms", gn, cn, level, gooed_off, clean_off);
    assert!(gn >= 20.0, "only {} gooed hits in 400 bars", gn);
    assert!(level < 0.93, "gooed notes are not softer (level {:.3})", level);
    assert!(gooed_off > clean_off * 1.5, "gooed notes sit as close to the grid as clean ones ({:.1} vs {:.1} ms)", gooed_off, clean_off);
}

#[test]
fn the_goo_slows_a_ball_wading_through_it() {
    // over a full song: a ball's speed on the ticks it sits in thick goo, against its speed in clear air
    let mut t = Tank::new(TankSettings::default(), 6);
    t.start(0.0);
    let (mut gs, mut gn, mut cs, mut cn) = (0.0, 0.0, 0.0, 0.0);
    for b in 0..100u64 {
        for i in b * 180..(b + 1) * 180 {
            t.tick(&Clock { now_ms: i as f64 * MS, bpm: 80.0, playing: true });
            for ball in t.balls() {
                let sp = (ball.vx * ball.vx + ball.vy * ball.vy).sqrt();
                if t.goo().density(ball.x, ball.y, ball.z) > 0.5 { gs += sp; gn += 1.0; } else if t.goo().density(ball.x, ball.y, ball.z) == 0.0 { cs += sp; cn += 1.0; }
            }
        }
        t.on_bar();
    }
    eprintln!("speed in thick goo {:.2} px a tick ({} ball-ticks), in clear air {:.2} ({})", gs / gn, gn, cs / cn, cn);
    assert!(gn > 500.0, "balls hardly ever met thick goo ({} ball-ticks)", gn);
    assert!(gs / gn < cs / cn * 0.85, "a ball in thick goo is not slower ({:.2} vs {:.2})", gs / gn, cs / cn);
}
