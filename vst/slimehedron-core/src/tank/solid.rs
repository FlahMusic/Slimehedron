//! Real solids: a solid is a set of face PLANES, and the shape is everything inside all of them, so it is always
//! convex, every face is flat, and the physics only ever needs "which plane did the ball cross". Every face is a note.
//!
//! Ported line for line from the web app's `REAL SOLIDS` block (`seedPlanes` .. `solidFaceDegrees` in `index.html`)
//! and checked against the web's own numbers (`_dev/solid-ref.json`, written by `node _dev/solid-ref.js`).
//! Shapes are built once, off the audio thread; nothing here runs per sample.
//!
//! Names: a seed (`tetra`, `cube`, `octa`, `dodeca`, `icosa`, `prismN`, `orbN`) then grow steps in order:
//! `cut` (truncate), `flip` (dual), `puff` (kis = flip, cut, flip). An **orb** has N faces from the Fibonacci
//! lattice (golden-angle spiral), one per note, climbing from the bottom pole to the top.
//! Coordinates are the web's: px, centred, y DOWN, z toward the back of the box.

use super::{BOXD, R};

/// Corner radius every solid is scaled to.
pub const SOLID_R: f64 = R * 0.95;
/// Fewest faces an orb has (fewer and the lattice does not always close round).
pub const ORB_MINF: usize = 12;
/// Most faces an orb has: 31-EDO over 4 octaves.
pub const ORB_MAXF: usize = 124;
const PHI: f64 = 1.618_033_988_749_895;

/// One face plane: unit outward normal `n`, distance `d` from the middle. Inside means `n . p <= d`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Plane {
    pub n: [f64; 3],
    pub d: f64,
}

/// A corner of a face outline, and which plane cut the edge that starts at it (-1: none).
#[derive(Debug, Clone, Copy)]
pub struct FacePoint {
    pub p: [f64; 3],
    pub t: i32,
}

/// A corner of the solid and the corners it shares an edge with.
#[derive(Debug, Clone)]
pub struct Vert {
    pub p: [f64; 3],
    pub nb: Vec<usize>,
}

fn hypot3(a: f64, b: f64, c: f64) -> f64 { (a * a + b * b + c * c).sqrt() }
fn vlen(a: [f64; 3]) -> f64 { hypot3(a[0], a[1], a[2]) }
fn vnorm(a: [f64; 3]) -> [f64; 3] {
    let l = vlen(a);
    let l = if l == 0.0 { 1.0 } else { l };
    [a[0] / l, a[1] / l, a[2] / l]
}
fn vdot(a: [f64; 3], b: [f64; 3]) -> f64 { a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
fn vcross(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
fn dist(a: [f64; 3], b: [f64; 3]) -> f64 { hypot3(a[0] - b[0], a[1] - b[1], a[2] - b[2]) }

/// Is this a name the solids understand?
pub fn is_solid_name(name: &str) -> bool {
    let mut parts = name.split('.');
    let seed = parts.next().unwrap_or("");
    let numbered = |pre: &str| seed.strip_prefix(pre).is_some_and(|n| !n.is_empty() && n.bytes().all(|b| b.is_ascii_digit()));
    let seed_ok = matches!(seed, "tetra" | "cube" | "octa" | "dodeca" | "icosa") || numbered("prism") || numbered("orb");
    seed_ok && parts.all(|op| matches!(op, "cut" | "puff" | "flip"))
}

/// An orb's face count from its name (`orb93` is 93), clamped to [ORB_MINF, ORB_MAXF]. None for any other name.
pub fn orb_faces(name: &str) -> Option<usize> {
    let n: usize = name.strip_prefix("orb")?.parse().ok()?;
    Some(n.clamp(ORB_MINF, ORB_MAXF))
}

fn unit(ns: Vec<[f64; 3]>) -> Vec<Plane> { ns.into_iter().map(|n| Plane { n: vnorm(n), d: 1.0 }).collect() }

/// The seed's planes, before any grow step.
pub fn seed_planes(name: &str) -> Vec<Plane> {
    let p = PHI;
    let mut ns: Vec<[f64; 3]> = Vec::new();
    match name {
        "tetra" => ns.extend([[1.0, 1.0, 1.0], [1.0, -1.0, -1.0], [-1.0, 1.0, -1.0], [-1.0, -1.0, 1.0]]),
        "cube" => ns.extend([[1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [0.0, 0.0, -1.0]]),
        "octa" => {
            for a in [1.0, -1.0] { for b in [1.0, -1.0] { for c in [1.0, -1.0] { ns.push([a, b, c]); } } }
        }
        "dodeca" => {
            for a in [1.0, -1.0] { for b in [p, -p] { ns.push([0.0, a, b]); ns.push([a, b, 0.0]); ns.push([b, 0.0, a]); } }
        }
        "icosa" => {
            for a in [1.0, -1.0] { for b in [1.0, -1.0] { for c in [1.0, -1.0] { ns.push([a, b, c]); } } }
            for a in [1.0 / p, -1.0 / p] { for b in [p, -p] { ns.push([0.0, a, b]); ns.push([a, b, 0.0]); ns.push([b, 0.0, a]); } }
        }
        _ => {
            if let Some(n) = orb_faces(name) {
                // the Fibonacci lattice: point i at height 1-(2i+1)/N, turned by the golden angle each step.
                // i = 0 is at y > 0, the BOTTOM (y is down)
                let ga = std::f64::consts::PI * (3.0 - 5f64.sqrt());
                for i in 0..n {
                    let y = 1.0 - (2 * i + 1) as f64 / n as f64;
                    let r = (1.0 - y * y).sqrt();
                    let a = i as f64 * ga;
                    ns.push([r * a.cos(), y, r * a.sin()]);
                }
            } else {
                // the flat shape pushed into a box: N sides, a front and a back
                let n: usize = name.strip_prefix("prism").and_then(|s| s.parse().ok()).unwrap_or(6);
                let pi = std::f64::consts::PI;
                let mut out: Vec<Plane> = (0..n)
                    .map(|i| {
                        let a = -pi / 2.0 + (i as f64 + 0.5) * 2.0 * pi / n as f64;
                        Plane { n: vnorm([a.cos(), a.sin(), 0.0]), d: (pi / n as f64).cos() * R }
                    })
                    .collect();
                out.push(Plane { n: [0.0, 0.0, 1.0], d: BOXD / 2.0 });
                out.push(Plane { n: [0.0, 0.0, -1.0], d: BOXD / 2.0 });
                return out;
            }
        }
    }
    scale_solid(&unit(ns), SOLID_R)
}

/// One face's outline: a big square in the plane, clipped by every other plane. Each edge remembers which plane
/// cut it, which is how a slice knows which face each of its walls belongs to.
fn clip_poly(poly: &[FacePoint], n: [f64; 3], d: f64, tag: i32) -> Vec<FacePoint> {
    let mut out = Vec::with_capacity(poly.len() + 1);
    let len = poly.len();
    let lerp = |a: [f64; 3], b: [f64; 3], t: f64| [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for i in 0..len {
        let (a, b) = (poly[i], poly[(i + 1) % len]);
        let (da, db) = (vdot(n, a.p) - d, vdot(n, b.p) - d);
        if da <= 1e-7 {
            out.push(a);
            if db > 1e-7 { out.push(FacePoint { p: lerp(a.p, b.p, da / (da - db)), t: tag }); }
        } else if db <= 1e-7 {
            out.push(FacePoint { p: lerp(a.p, b.p, da / (da - db)), t: a.t });
        }
    }
    out
}

fn plane_square(n: [f64; 3], d: f64, size: f64) -> Vec<FacePoint> {
    let u = vnorm(if n[0].abs() < 0.9 { vcross(n, [1.0, 0.0, 0.0]) } else { vcross(n, [0.0, 1.0, 0.0]) });
    let w = vcross(n, u);
    let c = [n[0] * d, n[1] * d, n[2] * d];
    let q = |a: f64, b: f64| FacePoint { p: [c[0] + u[0] * a + w[0] * b, c[1] + u[1] * a + w[1] * b, c[2] + u[2] * a + w[2] * b], t: -1 };
    vec![q(size, size), q(-size, size), q(-size, -size), q(size, -size)] // counter-clockwise seen from outside
}

/// Every face's outline, in plane order (an empty outline for a plane that makes no face).
pub fn solid_faces(planes: &[Plane]) -> Vec<Vec<FacePoint>> {
    let big = R * 8.0;
    planes
        .iter()
        .enumerate()
        .map(|(i, pl)| {
            let mut poly = plane_square(pl.n, pl.d, big);
            for (j, o) in planes.iter().enumerate() {
                if poly.is_empty() { break; }
                if j != i { poly = clip_poly(&poly, o.n, o.d, j as i32); }
            }
            // drop the slivers clipping leaves where three or more planes meet at one corner
            let mut out: Vec<FacePoint> = Vec::with_capacity(poly.len());
            for v in poly {
                match out.last_mut() {
                    Some(l) if dist(l.p, v.p) <= 0.05 => *l = FacePoint { p: l.p, t: v.t },
                    _ => out.push(v),
                }
            }
            while out.len() > 1 && dist(out[0].p, out[out.len() - 1].p) <= 0.05 { out.pop(); }
            if out.len() >= 3 { out } else { Vec::new() }
        })
        .collect()
}

/// The solid's corners (merged within 0.5 px) and which corners share an edge.
pub fn solid_verts(faces: &[Vec<FacePoint>]) -> Vec<Vert> {
    let mut v: Vec<Vert> = Vec::new();
    let at = |p: [f64; 3], v: &mut Vec<Vert>| -> usize {
        if let Some(i) = v.iter().position(|q| dist(q.p, p) < 0.5) { return i; }
        v.push(Vert { p, nb: Vec::new() });
        v.len() - 1
    };
    for f in faces {
        let ids: Vec<usize> = f.iter().map(|q| at(q.p, &mut v)).collect();
        for k in 0..ids.len() {
            let (a, b) = (ids[k], ids[(k + 1) % ids.len()]);
            if a != b {
                if !v[a].nb.contains(&b) { v[a].nb.push(b); }
                if !v[b].nb.contains(&a) { v[b].nb.push(a); }
            }
        }
    }
    v
}

fn scale_solid(planes: &[Plane], rt: f64) -> Vec<Plane> {
    let v = solid_verts(&solid_faces(planes));
    let r = v.iter().map(|q| vlen(q.p)).fold(0.0, f64::max);
    let k = if r > 0.0 { rt / r } else { 1.0 };
    planes.iter().map(|p| Plane { n: p.n, d: p.d * k }).collect()
}

/// Dual: corners become faces and faces become corners (polar reciprocation).
pub fn solid_flip(planes: &[Plane]) -> Vec<Plane> {
    let rho = SOLID_R;
    let flipped: Vec<Plane> = solid_verts(&solid_faces(planes)).iter().map(|q| Plane { n: vnorm(q.p), d: rho * rho / vlen(q.p) }).collect();
    scale_solid(&flipped, SOLID_R)
}

/// Truncate: a new face at every corner, a third of the way down each edge.
pub fn solid_cut(planes: &[Plane]) -> Vec<Plane> {
    let v = solid_verts(&solid_faces(planes));
    let mut out = planes.to_vec();
    for q in &v {
        let n = vnorm(q.p);
        let (mut s, mut c) = (0.0, 0usize);
        for &j in &q.nb {
            let u = v[j].p;
            s += vdot(n, [q.p[0] + (u[0] - q.p[0]) / 3.0, q.p[1] + (u[1] - q.p[1]) / 3.0, q.p[2] + (u[2] - q.p[2]) / 3.0]);
            c += 1;
        }
        if c > 0 { out.push(Plane { n, d: s / c as f64 }); }
    }
    scale_solid(&out, SOLID_R)
}

/// Kis: a low pyramid on every face (flip, cut, flip).
pub fn solid_puff(planes: &[Plane]) -> Vec<Plane> { solid_flip(&solid_cut(&solid_flip(planes))) }

/// The planes for a whole name, grow steps applied, keeping only planes that really make a face.
/// None if the name is not a solid.
pub fn solid_planes(name: &str) -> Option<Vec<Plane>> {
    if !is_solid_name(name) { return None; }
    let mut parts = name.split('.');
    let mut p = seed_planes(parts.next()?);
    for op in parts {
        p = match op { "cut" => solid_cut(&p), "flip" => solid_flip(&p), _ => solid_puff(&p) };
    }
    let f = solid_faces(&p);
    Some(p.into_iter().zip(f).filter(|(_, f)| f.len() >= 3).map(|(p, _)| p).collect())
}

/// An orb's notes: one degree per face, bottom to top, out of `td` degrees in the tank (indexed by plane).
/// Faces are ordered low (big y, y is down) to high, ties round the middle, exactly as the web sorts them.
pub fn orb_face_degrees(planes: &[Plane], td: usize) -> Vec<usize> {
    let mut idx: Vec<usize> = (0..planes.len()).collect();
    idx.sort_by(|&a, &b| {
        let (pa, pb) = (planes[a].n, planes[b].n);
        let by_y = pb[1] - pa[1];
        let k = if by_y != 0.0 { by_y } else { pa[2].atan2(pa[0]) - pb[2].atan2(pb[0]) };
        k.partial_cmp(&0.0).unwrap_or(std::cmp::Ordering::Equal)
    });
    let n = planes.len();
    let mut out = vec![0; n];
    for (j, &k) in idx.iter().enumerate() { out[k] = (j * td / n).min(td.saturating_sub(1)); }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The web's numbers, from `node _dev/solid-ref.js`.
    const REF: &str = include_str!("../../../../_dev/solid-ref.json");

    /// The nested number arrays right after `"<key>":` inside shape `name` (tiny reader: no dependencies here).
    fn ref_numbers(name: &str, key: &str) -> Vec<f64> {
        let at = REF.find(&format!("\"{name}\":{{")).unwrap_or_else(|| panic!("{name} not in solid-ref.json"));
        let rest = &REF[at..];
        let k = rest.find(&format!("\"{key}\":")).unwrap() + key.len() + 3;
        let rest = &rest[k..];
        let mut depth = 0;
        let mut end = rest.len();
        for (i, ch) in rest.char_indices() {
            match ch {
                '[' => depth += 1,
                ']' => { depth -= 1; if depth == 0 { end = i + 1; break; } }
                ',' | '}' if depth == 0 => { end = i; break; }
                _ => {}
            }
        }
        rest[..end].split(|c: char| !(c.is_ascii_digit() || c == '.' || c == '-' || c == 'e' || c == 'E'))
            .filter(|s| !s.is_empty()).map(|s| s.parse().unwrap()).collect()
    }

    const NAMES: &[&str] = &["tetra", "cube", "octa", "dodeca", "icosa", "prism3", "prism6", "prism12", "cube.cut", "icosa.cut",
        "cube.flip", "cube.puff", "octa.cut", "dodeca.flip", "tetra.cut.flip", "orb12", "orb21", "orb31", "orb62", "orb93", "orb124"];

    #[test]
    fn every_shape_has_the_webs_planes() {
        for &name in NAMES {
            let want = ref_numbers(name, "planes");
            let got: Vec<f64> = solid_planes(name).unwrap().iter().flat_map(|p| [p.n[0], p.n[1], p.n[2], p.d]).collect();
            assert_eq!(got.len(), want.len(), "{name}: {} planes here, {} on the web", got.len() / 4, want.len() / 4);
            for (i, (g, w)) in got.iter().zip(&want).enumerate() {
                assert!((g - w).abs() < 1e-5, "{name}: plane {} number {} is {g}, the web has {w}", i / 4, i % 4);
            }
        }
    }

    #[test]
    fn every_shape_has_the_webs_corners_and_edges_and_eulers_count() {
        for &name in NAMES {
            let p = solid_planes(name).unwrap();
            let v = solid_verts(&solid_faces(&p));
            let e: usize = v.iter().map(|q| q.nb.len()).sum::<usize>() / 2;
            assert_eq!(v.len() as f64, ref_numbers(name, "verts")[0], "{name} corners");
            assert_eq!(e as f64, ref_numbers(name, "edges")[0], "{name} edges");
            assert_eq!(v.len() as i64 - e as i64 + p.len() as i64, 2, "{name}: V - E + F is not 2");
        }
    }

    #[test]
    fn orbs_have_exactly_n_faces_for_every_size() {
        for n in ORB_MINF..=ORB_MAXF {
            assert_eq!(solid_planes(&format!("orb{n}")).unwrap().len(), n, "orb{n}");
        }
        assert_eq!(orb_faces("orb5"), Some(ORB_MINF));
        assert_eq!(orb_faces("orb500"), Some(ORB_MAXF));
    }

    #[test]
    fn orb_notes_match_the_web_and_climb() {
        for name in ["orb12", "orb21", "orb31", "orb62", "orb93", "orb124"] {
            let p = solid_planes(name).unwrap();
            let got: Vec<f64> = orb_face_degrees(&p, 21).iter().map(|&d| d as f64).collect();
            assert_eq!(got, ref_numbers(name, "deg"), "{name}");
        }
        let p = solid_planes("orb93").unwrap();
        let d = orb_face_degrees(&p, 93);
        let mut by_height: Vec<usize> = (0..93).collect();
        by_height.sort_by(|&a, &b| p[b].n[1].partial_cmp(&p[a].n[1]).unwrap());
        assert!(by_height.windows(2).all(|w| d[w[1]] == d[w[0]] + 1), "orb93 with 93 notes: each face one above the face under it");
    }

    #[test]
    fn names() {
        for ok in ["cube", "orb93", "prism6.cut", "icosa.cut.flip.puff"] { assert!(is_solid_name(ok), "{ok}"); }
        for bad in ["orb", "prism", "cube.melt", "sphere", "orbx", ""] { assert!(!is_solid_name(bad), "{bad}"); }
    }
}
