import { useEffect, useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  buildHandleGeometry,
  buildHangLoopGeometry,
  frameAt,
  innerRadius,
  radiusAt,
} from "@/lib/handle/geometry";
import type { HandleParams } from "@/lib/handle/types";

export function HandleMesh({
  params,
  color,
}: {
  params: HandleParams;
  color: string;
}) {
  const geo = useMemo(() => buildHandleGeometry(params, "preview"), [params]);
  const loop = useMemo(() => buildHangLoopGeometry(params), [params]);

  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => loop?.dispose(), [loop]);

  return (
    <group>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color={color}
          vertexColors
          roughness={0.42}
          metalness={0.05}
          clearcoat={0.28}
          clearcoatRoughness={0.45}
          sheen={0.18}
          sheenColor="#f0e6d8"
        />
      </mesh>
      {loop ? (
        <mesh geometry={loop}>
          <meshPhysicalMaterial
            color={color}
            roughness={0.42}
            metalness={0.05}
            clearcoat={0.28}
            clearcoatRoughness={0.45}
          />
        </mesh>
      ) : null}
    </group>
  );
}

export function BrushHeadGhost({ params }: { params: HandleParams }) {
  const mount = useMemo(() => frameAt(0, params), [params]);
  const stemR = params.attachDiameter / 2;
  const stemLen = Math.max(params.attachDepth * 0.55 + 14, 22);
  const padW = 62;
  const padLen = 78;
  const padT = 8;
  const out = useMemo(() => mount.tangent.clone().negate(), [mount]);

  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out.clone().normalize());
    return q;
  }, [out]);

  const stemPos = mount.origin.clone().addScaledVector(out, stemLen * 0.5);
  const padPos = mount.origin.clone().addScaledVector(out, stemLen + padLen * 0.42);

  return (
    <group>
      <mesh position={stemPos} quaternion={quat}>
        <cylinderGeometry args={[stemR, stemR * 0.9, stemLen, 18]} />
        <meshPhysicalMaterial
          color="#9aa3ad"
          transparent
          opacity={0.22}
          roughness={0.4}
          depthWrite={false}
        />
      </mesh>
      <mesh position={padPos} quaternion={quat}>
        <boxGeometry args={[padW, padLen, padT]} />
        <meshPhysicalMaterial
          color="#9aa3ad"
          transparent
          opacity={0.16}
          roughness={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function DimensionGuides({ params }: { params: HandleParams }) {
  const f0 = frameAt(0, params);
  const f1 = frameAt(1, params);
  const mid = frameAt(0.55, params);
  const rg = radiusAt(0.55, params);
  const color = "#8e8a83";
  const holeR = innerRadius(params);

  const lengthPts: [number, number, number][] = [
    [f0.origin.x, f0.origin.y, f0.origin.z],
    [f1.origin.x, f1.origin.y, f1.origin.z],
  ];
  const offset = mid.normal.clone().multiplyScalar(rg + 10);
  const a = f0.origin.clone().add(offset);
  const b = f1.origin.clone().add(offset);
  const gripA = mid.origin.clone().add(mid.binormal.clone().multiplyScalar(rg + 2));
  const gripB = mid.origin.clone().add(mid.binormal.clone().multiplyScalar(-(rg + 2)));

  return (
    <group>
      <Line points={lengthPts} color={color} lineWidth={1} dashed dashScale={4} transparent opacity={0.55} />
      <Line
        points={[
          [a.x, a.y, a.z],
          [b.x, b.y, b.z],
        ]}
        color={color}
        lineWidth={1.2}
      />
      <Html position={a.clone().lerp(b, 0.5)} center distanceFactor={220} style={{ pointerEvents: "none" }}>
        <div className="rounded-md bg-raised/90 px-2 py-0.5 text-xs font-medium tabular-nums text-fg shadow-[var(--shadow-border)]">
          {params.length.toFixed(0)} mm
        </div>
      </Html>
      <Line
        points={[
          [gripA.x, gripA.y, gripA.z],
          [gripB.x, gripB.y, gripB.z],
        ]}
        color={color}
        lineWidth={1}
      />
      <Html position={gripA.clone().lerp(gripB, 0.5).add(mid.normal.clone().multiplyScalar(6))} center distanceFactor={220} style={{ pointerEvents: "none" }}>
        <div className="rounded-md bg-raised/90 px-2 py-0.5 text-xs font-medium tabular-nums text-fg shadow-[var(--shadow-border)]">
          ⌀ {(rg * 2).toFixed(1)} mm
        </div>
      </Html>
      {params.attachment === "socket" ? (
        <>
          <Line
            points={Array.from({ length: 49 }, (_, j) => {
              const theta = (j / 48) * Math.PI * 2;
              const pt = f0.origin
                .clone()
                .addScaledVector(f0.normal, Math.cos(theta) * holeR)
                .addScaledVector(f0.binormal, Math.sin(theta) * holeR);
              return [pt.x, pt.y, pt.z] as [number, number, number];
            })}
            color={color}
            lineWidth={1.6}
          />
          <Html
            position={f0.origin
              .clone()
              .add(f0.tangent.clone().multiplyScalar(-4))
              .add(f0.normal.clone().multiplyScalar(params.neckRadius + 12))}
            center
            distanceFactor={220}
            style={{ pointerEvents: "none" }}
          >
            <div className="rounded-md bg-raised/90 px-2 py-0.5 text-xs font-medium tabular-nums text-fg shadow-[var(--shadow-border)]">
              hole ⌀ {(holeR * 2).toFixed(1)} mm
            </div>
          </Html>
        </>
      ) : null}
    </group>
  );
}
