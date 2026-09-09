import { useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { BrushHeadGhost, DimensionGuides, HandleMesh } from "@/components/handle-mesh";
import { buildHandleGeometry, frameAt } from "@/lib/handle/geometry";
import { useHandleStore } from "@/store/handle";

/** Tilt so the round hole in the bottom of the handle faces the camera. */
const TILT = new THREE.Euler(-0.78, 0.55, 0);
const LIFT = 32;

function displayMatrix() {
  const m = new THREE.Matrix4().makeRotationFromEuler(TILT);
  m.setPosition(0, LIFT, 0);
  return m;
}

function FrameCamera({ nonce }: { nonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const params = useHandleStore.getState().params;
    const geo = buildHandleGeometry(params, "preview");
    geo.computeBoundingSphere();
    const sphere = geo.boundingSphere;
    geo.dispose();
    if (!sphere) return;

    const xform = displayMatrix();
    const mountW = frameAt(0, params).origin.clone().applyMatrix4(xform);
    const pommelW = frameAt(1, params).origin.clone().applyMatrix4(xform);
    const center = mountW.clone().lerp(pommelW, 0.42);
    const along = pommelW.clone().sub(mountW);
    if (along.lengthSq() < 1e-6) along.set(0, 1, 0);
    else along.normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(worldUp, along);
    if (side.lengthSq() < 0.05) side.set(1, 0, 0);
    else side.normalize();
    const lift = new THREE.Vector3().crossVectors(along, side).normalize();

    const dist = Math.max((sphere.radius || 60) * 2.6, 155);
    camera.position.copy(center)
      .addScaledVector(side, dist * 0.78)
      .addScaledVector(lift, dist * 0.28)
      .addScaledVector(along, -dist * 0.62);
    camera.near = 0.5;
    camera.far = Math.max(4000, dist * 20);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    if (controls && "target" in controls) {
      const c = controls as unknown as { target: THREE.Vector3; update: () => void };
      c.target.copy(center);
      c.update();
    }
    invalidate();
  }, [nonce, camera, controls, invalidate]);

  return null;
}

function Scene() {
  const params = useHandleStore((s) => s.params);
  const color = useHandleStore((s) => s.previewColor);
  const showHead = useHandleStore((s) => s.showHead);
  const showDimensions = useHandleStore((s) => s.showDimensions);
  const autoRotate = useHandleStore((s) => s.autoRotate);
  const frameNonce = useHandleStore((s) => s.frameNonce);

  return (
    <>
      <color attach="background" args={["#0c0d10"]} />
      <hemisphereLight args={["#f0ebe3", "#1a1c22", 0.95]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[90, 160, 80]} intensity={1.25} />
      <directionalLight position={[-50, 30, 110]} intensity={0.7} color="#d7dbe2" />
      <directionalLight position={[10, -30, 60]} intensity={0.45} color="#8a8278" />

      <group position={[0, LIFT, 0]} rotation={[-0.78, 0.55, 0]}>
        <HandleMesh params={params} color={color} />
        {showHead && params.attachment !== "none" ? <BrushHeadGhost params={params} /> : null}
        {showDimensions ? <DimensionGuides params={params} /> : null}
      </group>
      <FrameCamera nonce={frameNonce} />

      <ContactShadows position={[0, 0, 0]} opacity={0.38} scale={320} blur={2.6} far={90} />
      <Grid
        infiniteGrid
        fadeDistance={420}
        fadeStrength={1.4}
        sectionSize={50}
        cellSize={10}
        sectionColor="#2c2f38"
        cellColor="#1b1e26"
        position={[0, -0.2, 0]}
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.55}
        minDistance={28}
        maxDistance={420}
        maxPolarAngle={Math.PI * 0.9}
        target={[0, 52, 0]}
      />
    </>
  );
}

export default function Viewport() {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
        alpha: false,
      }}
      camera={{ position: [140, 70, 160], fov: 34, near: 0.5, far: 4000 }}
    >
      <Scene />
    </Canvas>
  );
}
