import * as THREE from "three";
import type { HandleParams } from "./types";
import { buildHandleGeometry, buildHangLoopGeometry } from "./geometry";

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "handle";
}

export function fileBase(params: HandleParams) {
  return `haft-${slug(params.name)}-${Math.round(params.length)}mm`;
}

function collectGeometries(params: HandleParams, quality: "preview" | "print") {
  const geos = [buildHandleGeometry(params, quality)];
  const loop = buildHangLoopGeometry(params);
  if (loop) geos.push(loop);
  return geos;
}

/** Lay length along +X, Z-up, lowest point on the bed (z = 0). */
function toPrintMatrix(geos: THREE.BufferGeometry[]) {
  const box = new THREE.Box3();
  for (const g of geos) {
    g.computeBoundingBox();
    if (g.boundingBox) box.union(g.boundingBox);
  }
  const m = new THREE.Matrix4().makeRotationZ(-Math.PI / 2);
  box.applyMatrix4(m);
  const min = box.min;
  const t = new THREE.Matrix4().makeTranslation(-min.x, -min.y, -min.z);
  m.premultiply(t);
  return m;
}

function appendGeometry(
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  triangles: { n: THREE.Vector3; a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }[],
) {
  const pos = geo.getAttribute("position");
  const idx = geo.getIndex();
  if (!pos) return;
  const normalMat = new THREE.Matrix3().getNormalMatrix(matrix);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const i0 = idx ? idx.getX(i * 3) : i * 3;
    const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    va.fromBufferAttribute(pos, i0).applyMatrix4(matrix);
    vb.fromBufferAttribute(pos, i1).applyMatrix4(matrix);
    vc.fromBufferAttribute(pos, i2).applyMatrix4(matrix);
    const n = new THREE.Vector3()
      .subVectors(vb, va)
      .cross(new THREE.Vector3().subVectors(vc, va))
      .applyMatrix3(normalMat)
      .normalize();
    if (!Number.isFinite(n.x)) n.set(0, 0, 1);
    triangles.push({ n, a: va.clone(), b: vb.clone(), c: vc.clone() });
  }
}

function writeBinaryStl(
  triangles: { n: THREE.Vector3; a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }[],
) {
  const headerLen = 80;
  const count = triangles.length;
  const buf = new ArrayBuffer(headerLen + 4 + count * 50);
  const view = new DataView(buf);
  const header = "Haft parametric handle — millimetres, binary STL";
  for (let i = 0; i < headerLen; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(80, count, true);
  let o = 84;
  const writeV = (v: THREE.Vector3) => {
    view.setFloat32(o, v.x, true); o += 4;
    view.setFloat32(o, v.y, true); o += 4;
    view.setFloat32(o, v.z, true); o += 4;
  };
  for (const t of triangles) {
    writeV(t.n);
    writeV(t.a);
    writeV(t.b);
    writeV(t.c);
    view.setUint16(o, 0, true);
    o += 2;
  }
  return buf;
}

export function exportStl(params: HandleParams): { blob: Blob; filename: string } {
  const geos = collectGeometries(params, "print");
  const matrix = toPrintMatrix(geos);
  const triangles: { n: THREE.Vector3; a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }[] = [];
  for (const g of geos) appendGeometry(g, matrix, triangles);
  for (const g of geos) g.dispose();
  const buf = writeBinaryStl(triangles);
  return {
    blob: new Blob([buf], { type: "model/stl" }),
    filename: `${fileBase(params)}.stl`,
  };
}

function writeObj(geos: THREE.BufferGeometry[], matrix: THREE.Matrix4) {
  const lines: string[] = [
    "# Haft parametric handle — millimetres",
    "o handle",
  ];
  let vOffset = 1;
  const v = new THREE.Vector3();
  for (const geo of geos) {
    const pos = geo.getAttribute("position");
    const idx = geo.getIndex();
    if (!pos) continue;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      lines.push(`v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}`);
    }
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    for (let i = 0; i < triCount; i++) {
      const i0 = (idx ? idx.getX(i * 3) : i * 3) + vOffset;
      const i1 = (idx ? idx.getX(i * 3 + 1) : i * 3 + 1) + vOffset;
      const i2 = (idx ? idx.getX(i * 3 + 2) : i * 3 + 2) + vOffset;
      lines.push(`f ${i0} ${i1} ${i2}`);
    }
    vOffset += pos.count;
  }
  return lines.join("\n");
}

export function exportObj(params: HandleParams): { blob: Blob; filename: string } {
  const geos = collectGeometries(params, "print");
  const matrix = toPrintMatrix(geos);
  const text = writeObj(geos, matrix);
  for (const g of geos) g.dispose();
  return {
    blob: new Blob([text], { type: "model/obj" }),
    filename: `${fileBase(params)}.obj`,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function isAppleTouch() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export async function saveFile(
  blob: Blob, filename: string,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const mime = blob.type || "application/octet-stream";
  const file = new File([blob], filename, { type: mime, lastModified: Date.now() });
  const alt = new File([blob], filename, {
    type: "application/octet-stream",
    lastModified: Date.now(),
  });

  if (typeof navigator.share === "function") {
    for (const candidate of [file, alt]) {
      const data: ShareData = { files: [candidate], title: filename };
      try {
        if (!isAppleTouch() && navigator.canShare && !navigator.canShare(data)) {
          continue;
        }
        await navigator.share(data);
        return "shared";
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return "cancelled";
      }
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}
