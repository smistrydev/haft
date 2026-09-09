export type ProfileKind = "straight" | "waisted" | "barrel" | "flare" | "ergonomic";
export type CurveKind = "straight" | "gentle" | "hook" | "s-curve";
export type TextureKind =
  | "smooth"
  | "knurl"
  | "ribs"
  | "rings"
  | "spiral"
  | "dimple"
  | "flutes"
  | "diamond";
export type AttachmentKind = "none" | "socket" | "tenon";
export type PommelKind = "round" | "flat" | "flare" | "knob";

export interface HandleParams {
  name: string;
  /** Overall length of the grip, millimetres. */
  length: number;
  /** Radius at the palm end. */
  buttRadius: number;
  /** Radius at the thickest grip. */
  gripRadius: number;
  /** Radius at the tool/head end. */
  neckRadius: number;
  /** 1 = circular. >1 stretches the palm axis. */
  ovalRatio: number;
  /** Radial subdivisions. 6 = hex, 48+ reads round. */
  sides: number;
  profile: ProfileKind;
  /** 0–1 pinch amount for waisted profiles. */
  waist: number;
  curveKind: CurveKind;
  /** Bend in degrees (gentle/hook) or amplitude scale (s-curve). */
  bendAngle: number;
  /** 0–1, where curvature concentrates for hook. */
  bendPosition: number;
  /** Full twists from butt to neck. */
  twistTurns: number;
  texture: TextureKind;
  /** Displacement in mm. */
  textureDepth: number;
  /** Frequency multiplier. */
  textureScale: number;
  pommel: PommelKind;
  hangLoop: boolean;
  hangLoopRadius: number;
  hangLoopTube: number;
  attachment: AttachmentKind;
  /** Socket inner / tenon outer diameter, mm. */
  attachDiameter: number;
  attachDepth: number;
  wallThickness: number;
  /** Extra clearance added to a measured stem, mm. */
  clearance: number;
  /** 0–0.45, chops a printable flat on the bed. */
  printFlat: number;
}

export interface SavedDesign {
  id: string;
  name: string;
  params: HandleParams;
  savedAt: number;
}

export const PREVIEW_COLORS = [
  { id: "bone", label: "Bone", value: "#e8dfd2" },
  { id: "ink", label: "Ink", value: "#2a2c33" },
  { id: "chalk", label: "Chalk", value: "#f4f1ea" },
  { id: "sage", label: "Sage", value: "#8fa08c" },
  { id: "blush", label: "Blush", value: "#c9a39a" },
  { id: "slate", label: "Slate", value: "#6d7580" },
] as const;
