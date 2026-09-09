import * as THREE from "three";
import type { HandleParams } from "./types";

export type Quality = "preview" | "print";

export interface Frame {
  origin: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  t: number;
  radius: number;
}

const OUTER_COL: [number, number, number] = [1, 1, 1];
const LIP_COL: [number, number, number] = [0.42, 0.38, 0.34];
const BORE_COL: [number, number, number] = [0.16, 0.14, 0.12];

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

/** t = 0 at the mounting face (bottom). t = 1 at the pommel (top). */
export function radiusAt(t: number, p: HandleParams): number {
  const s = 1 - clamp(t, 0, 1);
  const b = p.buttRadius;
  const g = p.gripRadius;
  const n = p.neckRadius;
  let r: number;
  switch (p.profile) {
    case "straight":
      r = lerp(b, n, s);
      break;
    case "barrel": {
      r = lerp(lerp(b, n, s), g, Math.sin(s * Math.PI));
      break;
    }
    case "waisted": {
      const pinch = Math.sin(s * Math.PI) * p.waist;
      r = lerp(b, n, s) * (1 - pinch * 0.48);
      break;
    }
    case "flare": {
      r = lerp(Math.max(b, g), n, Math.pow(s, 0.52));
      break;
    }
    case "ergonomic":
    default: {
      const p0 = b;
      const p1 = g;
      const p2 = lerp(g, n, 0.38);
      const p3 = n;
      if (s < 0.28) r = lerp(p0, p1, smoothstep(0, 0.28, s));
      else if (s < 0.55) r = lerp(p1, p2, smoothstep(0.28, 0.55, s));
      else r = lerp(p2, p3, smoothstep(0.55, 1, s));
      break;
    }
  }

  if (p.pommel === "knob" && s < 0.14) {
    const u = 1 - s / 0.14;
    r += g * 0.24 * Math.sin(u * Math.PI);
  }
  if (p.pommel === "flare" && s < 0.12) {
    const u = 1 - s / 0.12;
    r *= 1 + 0.3 * u * u;
  }
  if (s > 0.86) {
    const u = smoothstep(0.86, 0.93, s) * (1 - smoothstep(0.97, 1, s));
    r += 0.55 * u;
  }

  if (p.attachment === "socket") {
    const inner = p.attachDiameter / 2 + p.clearance;
    const minOuter = inner + p.wallThickness;
    const mix = 1 - smoothstep(0.06, 0.2, t);
    r = lerp(r, Math.max(r, minOuter), mix);
  }

  return Math.max(r, 1.15);
}

export function centerlinePoint(t: number, p: HandleParams): THREE.Vector3 {
  const L = p.length;
  const tt = clamp(t, 0, 1);
  if (p.curveKind === "straight" || Math.abs(p.bendAngle) < 0.4) {
    return new THREE.Vector3(0, tt * L, 0);
  }

  if (p.curveKind === "s-curve") {
    const amp = (p.bendAngle / 60) * L * 0.22;
    return new THREE.Vector3(amp * Math.sin(tt * Math.PI * 2), tt * L, 0);
  }

  if (p.curveKind === "hook") {
    const steps = 48;
    const pos = new THREE.Vector3(0, 0, 0);
    let phi = 0;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      if (t1 > tt + 1e-6 && t0 > tt) break;
      const seg = Math.min(t1, tt) - t0;
      if (seg <= 0) continue;
      const mid = t0 + seg * 0.5;
      const k = ((p.bendAngle * Math.PI) / 180) * (1.6 + p.bendPosition) * Math.pow(mid, 0.6 + p.bendPosition);
      phi += k * seg;
      pos.x += Math.sin(phi) * (seg * L);
      pos.y += Math.cos(phi) * (seg * L);
    }
    return pos;
  }

  const alpha = (p.bendAngle * Math.PI) / 180;
  const R = L / alpha;
  const phi = tt * alpha;
  return new THREE.Vector3(R * (1 - Math.cos(phi)), R * Math.sin(phi), 0);
}

function tangentAt(t: number, p: HandleParams): THREE.Vector3 {
  const eps = 1e-3;
  const a = centerlinePoint(Math.max(0, t - eps), p);
  const b = centerlinePoint(Math.min(1, t + eps), p);
  const d = b.sub(a);
  if (d.lengthSq() < 1e-10) return new THREE.Vector3(0, 1, 0);
  return d.normalize();
}

export function frameAt(t: number, p: HandleParams): Frame {
  const origin = centerlinePoint(t, p);
  const tangent = tangentAt(t, p);
  const binormal = new THREE.Vector3(0, 0, 1);
  let normal = new THREE.Vector3().crossVectors(binormal, tangent);
  if (normal.lengthSq() < 1e-8) {
    normal = new THREE.Vector3(-1, 0, 0);
  } else {
    normal.normalize();
  }
  binormal.crossVectors(tangent, normal).normalize();
  return {
    origin,
    tangent,
    normal,
    binormal,
    t,
    radius: radiusAt(t, p),
  };
}

function textureDelta(theta: number, t: number, p: HandleParams): number {
  const d = p.textureDepth;
  if (d < 0.01 || p.texture === "smooth") return 0;
  const s = Math.max(0.4, p.textureScale);
  switch (p.texture) {
    case "ribs": {
      const n = Math.max(5, Math.round(10 * s));
      return 0.5 * d * Math.sin(n * theta);
    }
    case "rings": {
      const n = Math.max(6, Math.round(14 * s));
      return 0.5 * d * Math.sin(n * t * Math.PI * 2);
    }
    case "spiral": {
      const n = Math.max(6, Math.round(9 * s));
      return 0.5 * d * Math.sin(n * theta + t * Math.PI * 2 * (p.twistTurns * 2 + 2));
    }
    case "knurl": {
      const nu = Math.max(6, Math.round(9 * s));
      const nv = Math.max(10, Math.round(16 * s));
      return d * Math.abs(Math.sin(nu * theta) * Math.sin(nv * t * Math.PI * 2));
    }
    case "diamond": {
      const nu = Math.max(6, Math.round(8 * s));
      const nv = Math.max(10, Math.round(14 * s));
      const a = Math.abs(((theta / (Math.PI * 2)) * nu) % 1);
      const b = Math.abs((t * nv) % 1);
      const da = Math.min(a, 1 - a);
      const db = Math.min(b, 1 - b);
      return d * (1 - clamp((da + db) * 2.4, 0, 1));
    }
    case "dimple": {
      const nu = Math.max(6, Math.round(7 * s));
      const nv = Math.max(8, Math.round(11 * s));
      const u = (theta / (Math.PI * 2)) * nu;
      const v = t * nv;
      const du = u - Math.round(u);
      const dv = v - Math.round(v);
      const dist = Math.hypot(du, dv * 1.05);
      const rad = 0.34;
      if (dist >= rad) return 0;
      const k = Math.cos((dist / rad) * Math.PI * 0.5);
      return -d * k * k;
    }
    case "flutes": {
      const n = Math.max(5, Math.round(5 * s));
      const wave = Math.sin(n * theta);
      return wave > 0 ? 0.12 * d * wave : 0.85 * d * wave;
    }
    default:
      return 0;
  }
}

interface RingSpec {
  frame: Frame;
  radius: number;
  applyTexture: boolean;
  inner?: boolean;
  color?: [number, number, number];
}

function ovalAt(t: number, p: HandleParams, inner?: boolean): number {
  if (inner) return 1;
  const base = Math.max(0.7, p.ovalRatio);
  if (p.attachment !== "socket") return base;
  const s = 1 - t;
  return lerp(base, 1, smoothstep(0.68, 0.92, s));
}

function makeRing(
  spec: RingSpec,
  p: HandleParams,
  radial: number,
  positions: number[],
  uvs: number[],
  colors: number[],
): number[] {
  const ids: number[] = [];
  const { frame, radius, applyTexture, inner } = spec;
  const col = spec.color ?? OUTER_COL;
  const oval = ovalAt(frame.t, p, inner);
  const rx = radius * Math.sqrt(oval);
  const rz = radius / Math.sqrt(oval);
  const twist = inner ? 0 : p.twistTurns * Math.PI * 2 * frame.t;
  const flatAmt = inner
    ? 0
    : p.attachment === "socket"
      ? clamp(p.printFlat, 0, 0.45) * smoothstep(0.12, 0.3, frame.t)
      : clamp(p.printFlat, 0, 0.45);
  const cutZ = inner ? -Infinity : -rz * (1 - flatAmt);

  for (let j = 0; j < radial; j++) {
    const u = j / radial;
    const theta = u * Math.PI * 2 + twist;
    let radMulX = rx;
    let radMulZ = rz;
    if (applyTexture) {
      const delta = textureDelta(theta, frame.t, p);
      const scale = 1 + delta / Math.max(radius, 1);
      radMulX *= scale;
      radMulZ *= scale;
    }
    let lx = Math.cos(theta) * radMulX;
    let lz = Math.sin(theta) * radMulZ;
    if (!inner && flatAmt > 0.001 && lz < cutZ) lz = cutZ;

    const x = frame.origin.x + frame.normal.x * lx + frame.binormal.x * lz;
    const y = frame.origin.y + frame.normal.y * lx + frame.binormal.y * lz;
    const z = frame.origin.z + frame.normal.z * lx + frame.binormal.z * lz;
    const idx = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(u, frame.t);
    colors.push(col[0], col[1], col[2]);
    ids.push(idx);
  }
  return ids;
}

function stitch(
  a: number[],
  b: number[],
  indices: number[],
  reverse: boolean,
) {
  const n = a.length;
  if (n === 0 || b.length === 0) return;
  if (b.length === 1) {
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      if (reverse) indices.push(a[j]!, b[0]!, a[j2]!);
      else indices.push(a[j]!, a[j2]!, b[0]!);
    }
    return;
  }
  if (a.length === 1) {
    for (let j = 0; j < b.length; j++) {
      const j2 = (j + 1) % b.length;
      if (reverse) indices.push(a[0]!, b[j2]!, b[j]!);
      else indices.push(a[0]!, b[j]!, b[j2]!);
    }
    return;
  }
  const m = Math.min(a.length, b.length);
  for (let j = 0; j < m; j++) {
    const j2 = (j + 1) % m;
    const a0 = a[j]!, a1 = a[j2]!, b0 = b[j]!, b1 = b[j2]!;
    if (reverse) {
      indices.push(a0, b0, a1);
      indices.push(a1, b0, b1);
    } else {
      indices.push(a0, a1, b0);
      indices.push(a1, b1, b0);
    }
  }
}

function capFan(
  ring: number[],
  center: number,
  indices: number[],
  outward: boolean,
) {
  const n = ring.length;
  for (let j = 0; j < n; j++) {
    const j2 = (j + 1) % n;
    if (outward) indices.push(center, ring[j]!, ring[j2]!);
    else indices.push(center, ring[j2]!, ring[j]!);
  }
}

function addVertex(
  positions: number[],
  uvs: number[],
  colors: number[],
  x: number,
  y: number,
  z: number,
  u: number,
  v: number,
  col: [number, number, number] = OUTER_COL,
) {
  const i = positions.length / 3;
  positions.push(x, y, z);
  uvs.push(u, v);
  colors.push(col[0], col[1], col[2]);
  return i;
}

function circularRing(
  origin: THREE.Vector3,
  normal: THREE.Vector3,
  binormal: THREE.Vector3,
  radius: number,
  radial: number,
  positions: number[],
  uvs: number[],
  colors: number[],
  v: number,
  col: [number, number, number],
): number[] {
  const ids: number[] = [];
  for (let j = 0; j < radial; j++) {
    const u = j / radial;
    const theta = u * Math.PI * 2;
    const lx = Math.cos(theta) * radius;
    const lz = Math.sin(theta) * radius;
    const x = origin.x + normal.x * lx + binormal.x * lz;
    const y = origin.y + normal.y * lx + binormal.y * lz;
    const z = origin.z + normal.z * lx + binormal.z * lz;
    ids.push(addVertex(positions, uvs, colors, x, y, z, u, v, col));
  }
  return ids;
}

export function innerRadius(p: HandleParams): number {
  return p.attachDiameter / 2 + p.clearance;
}

export function socketDepth(p: HandleParams): number {
  return Math.min(p.attachDepth, p.length * 0.55);
}

export function buildHandleGeometry(
  p: HandleParams,
  quality: Quality = "preview",
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const radial =
    p.attachment === "socket"
      ? quality === "print"
        ? Math.max(72, p.sides)
        : Math.max(48, p.sides)
      : p.sides < 24
        ? p.sides
        : quality === "print"
          ? Math.max(p.sides, 72)
          : Math.max(p.sides, 40);
  const segs = quality === "print" ? 120 : 72;
  const capSegs = p.pommel === "flat" ? 0 : quality === "print" ? 10 : 7;

  const bodyRings: number[][] = [];
  const mount = frameAt(0, p);

  // Closed bottom (no hole, no pin): a dome or flat under the grip.
  if (p.attachment === "none") {
    const R = radiusAt(0, p);
    if (capSegs > 0) {
      for (let k = capSegs; k >= 1; k--) {
        const phi = (k / capSegs) * (Math.PI / 2);
        const r = Math.max(0.15, R * Math.cos(phi));
        const along = -R * Math.sin(phi);
        const origin = mount.origin.clone().addScaledVector(mount.tangent, along);
        const frame: Frame = {
          origin,
          tangent: mount.tangent,
          normal: mount.normal,
          binormal: mount.binormal,
          t: 0,
          radius: r,
        };
        if (k === capSegs) {
          const pole = addVertex(positions, uvs, colors, origin.x, origin.y, origin.z, 0.5, 0);
          bodyRings.push([pole]);
        } else {
          bodyRings.push(makeRing({ frame, radius: r, applyTexture: false }, p, radial, positions, uvs, colors));
        }
      }
    }
  }

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const frame = frameAt(t, p);
    const r = radiusAt(t, p);
    const tex = t > 0.08 && t < 0.9;
    bodyRings.push(makeRing({ frame, radius: r, applyTexture: tex }, p, radial, positions, uvs, colors));
  }

  for (let i = 0; i < bodyRings.length - 1; i++) {
    stitch(bodyRings[i]!, bodyRings[i + 1]!, indices, false);
  }

  const firstOuter = bodyRings[p.attachment === "none" && capSegs > 0 ? capSegs - 1 : 0]!;
  const lastOuter = bodyRings[bodyRings.length - 1]!;
  const pommel = frameAt(1, p);

  if (p.attachment === "socket") {
    const innerR = innerRadius(p);
    const depth = socketDepth(p);
    const chamfer = Math.min(2.4, Math.max(1.2, innerR * 0.32));
    const innerSegs = quality === "print" ? 24 : 14;
    const n = mount.normal;
    const b = mount.binormal;
    const tan = mount.tangent;

    const faceOuter = bodyRings[0]!;
    const lip = circularRing(
      mount.origin,
      n,
      b,
      innerR + chamfer,
      radial,
      positions,
      uvs,
      colors,
      0.02,
      LIP_COL,
    );
    stitch(faceOuter, lip, indices, true);

    const innerRings: number[][] = [lip];
    for (let i = 1; i <= innerSegs; i++) {
      const u = i / innerSegs;
      const along = u * depth;
      let r: number;
      let col: [number, number, number];
      if (u < 0.14) {
        r = lerp(innerR + chamfer, innerR, u / 0.14);
        col = LIP_COL;
      } else {
        r = innerR;
        col = BORE_COL;
      }
      const origin = mount.origin.clone().addScaledVector(tan, along);
      innerRings.push(
        circularRing(origin, n, b, r, radial, positions, uvs, colors, u, col),
      );
    }
    for (let i = 0; i < innerRings.length - 1; i++) {
      stitch(innerRings[i]!, innerRings[i + 1]!, indices, false);
    }
    const floor = innerRings[innerRings.length - 1]!;
    const floorOrigin = mount.origin.clone().addScaledVector(tan, depth);
    const floorCenter = addVertex(
      positions,
      uvs,
      colors,
      floorOrigin.x,
      floorOrigin.y,
      floorOrigin.z,
      0.5,
      1,
      BORE_COL,
    );
    capFan(floor, floorCenter, indices, false);
  } else if (p.attachment === "tenon") {
    const tenonR = p.attachDiameter / 2;
    const depth = p.attachDepth;
    const tenonSegs = quality === "print" ? 12 : 8;
    let prev = firstOuter;
    for (let i = 0; i <= tenonSegs; i++) {
      const u = i / tenonSegs;
      const along = -u * depth;
      const r =
        u < 0.12
          ? lerp(radiusAt(0, p), tenonR, u / 0.12)
          : u > 0.82
            ? lerp(tenonR, tenonR * 0.78, (u - 0.82) / 0.18)
            : tenonR;
      const origin = mount.origin.clone().addScaledVector(mount.tangent, along);
      const frame: Frame = {
        origin,
        tangent: mount.tangent,
        normal: mount.normal,
        binormal: mount.binormal,
        t: 0,
        radius: r,
      };
      const ring = makeRing({ frame, radius: r, applyTexture: false }, p, radial, positions, uvs, colors);
      stitch(prev, ring, indices, true);
      prev = ring;
    }
    const capOrigin = mount.origin.clone().addScaledVector(mount.tangent, -depth);
    const cap = addVertex(positions, uvs, colors, capOrigin.x, capOrigin.y, capOrigin.z, 0.5, 0);
    capFan(prev, cap, indices, false);
  } else if (p.attachment === "none" && capSegs === 0) {
    const capOrigin = mount.origin.clone();
    const cap = addVertex(positions, uvs, colors, capOrigin.x, capOrigin.y, capOrigin.z, 0.5, 0);
    capFan(bodyRings[0]!, cap, indices, false);
  }

  // Pommel at the top
  if (capSegs > 0) {
    const R = radiusAt(1, p);
    let prev = lastOuter;
    for (let k = 1; k <= capSegs; k++) {
      const phi = (k / capSegs) * (Math.PI / 2);
      const r = Math.max(0.12, R * Math.cos(phi));
      const along = R * Math.sin(phi);
      const origin = pommel.origin.clone().addScaledVector(pommel.tangent, along);
      if (k === capSegs) {
        const pole = addVertex(positions, uvs, colors, origin.x, origin.y, origin.z, 0.5, 1);
        stitch(prev, [pole], indices, false);
      } else {
        const frame: Frame = {
          origin,
          tangent: pommel.tangent,
          normal: pommel.normal,
          binormal: pommel.binormal,
          t: 1,
          radius: r,
        };
        const ring = makeRing({ frame, radius: r, applyTexture: false }, p, radial, positions, uvs, colors);
        stitch(prev, ring, indices, false);
        prev = ring;
      }
    }
  } else {
    const capOrigin = pommel.origin.clone();
    const cap = addVertex(positions, uvs, colors, capOrigin.x, capOrigin.y, capOrigin.z, 0.5, 1);
    capFan(lastOuter, cap, indices, true);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function buildHangLoopGeometry(p: HandleParams): THREE.BufferGeometry | null {
  if (!p.hangLoop) return null;
  const f1 = frameAt(1, p);
  const R = radiusAt(1, p);
  const ringR = p.hangLoopRadius;
  const tube = p.hangLoopTube;
  const geo = new THREE.TorusGeometry(ringR, tube, 14, 28);
  const along = p.pommel === "flat" ? 0.2 : R * 0.35;
  const origin = f1.origin.clone().addScaledVector(f1.tangent, along);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    f1.tangent.clone(),
  );
  geo.applyQuaternion(quat);
  geo.translate(origin.x, origin.y, origin.z);
  geo.computeVertexNormals();
  return geo;
}

export function meshVolumeMm3(geo: THREE.BufferGeometry): number {
  const pos = geo.getAttribute("position");
  const idx = geo.getIndex();
  if (!pos) return 0;
  let acc = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cr = new THREE.Vector3();
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const i0 = idx ? idx.getX(i * 3) : i * 3;
    const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    cr.crossVectors(b, c);
    acc += a.dot(cr);
  }
  return Math.abs(acc) / 6;
}

export function printStats(p: HandleParams) {
  const geo = buildHandleGeometry(p, "preview");
  const volume = meshVolumeMm3(geo);
  const box = geo.boundingBox ?? new THREE.Box3().setFromBufferAttribute(
    geo.getAttribute("position") as THREE.BufferAttribute,
  );
  const size = new THREE.Vector3();
  box.getSize(size);
  geo.dispose();
  const cm3 = volume / 1000;
  const solidGrams = cm3 * 1.24;
  const infillGrams = solidGrams * 0.42;
  return {
    volumeMm3: volume,
    volumeCm3: cm3,
    solidGrams,
    infillGrams,
    size,
    maxDiameter: Math.max(p.buttRadius, p.gripRadius, p.neckRadius) * 2 * Math.sqrt(Math.max(p.ovalRatio, 1)),
  };
}

export interface MountHoleInfo {
  expectedR: number;
  sampleCount: number;
  meanR: number;
  maxDev: number;
  faceY: number;
  bboxMinY: number;
  holeAtBottom: boolean;
}

/** Measure the cylindrical bore: it must be round and sit at the bottom of the mesh. */
export function inspectMountHole(p: HandleParams, quality: Quality = "preview"): MountHoleInfo {
  const geo = buildHandleGeometry(p, quality);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const mount = frameAt(0, p);
  const expectedR = innerRadius(p);
  const depth = socketDepth(p);
  const plane = mount.origin.clone().addScaledVector(mount.tangent, depth * 0.45);
  const rs: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const rel = v.clone().sub(plane);
    const along = rel.dot(mount.tangent);
    if (Math.abs(along) > 0.7) continue;
    const radial = rel.clone().addScaledVector(mount.tangent, -along);
    const r = radial.length();
    if (Math.abs(r - expectedR) < 0.9) rs.push(r);
  }
  const box = geo.boundingBox ?? new THREE.Box3().setFromBufferAttribute(pos);
  geo.dispose();
  const meanR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
  const maxDev = rs.length ? Math.max(...rs.map((r) => Math.abs(r - meanR))) : Infinity;
  const faceY = mount.origin.y;
  return {
    expectedR,
    sampleCount: rs.length,
    meanR,
    maxDev,
    faceY,
    bboxMinY: box.min.y,
    holeAtBottom: Math.abs(faceY - box.min.y) < 6,
  };
}
