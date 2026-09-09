import { useEffect, useState, type ReactNode } from "react";
import {
  Bookmark,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Chip } from "@/components/chip";
import { ParamSlider } from "@/components/param-slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  PRESETS,
} from "@/lib/handle/presets";
import type {
  AttachmentKind,
  CurveKind,
  HandleParams,
  PommelKind,
  ProfileKind,
  TextureKind,
} from "@/lib/handle/types";
import { PREVIEW_COLORS } from "@/lib/handle/types";
import { printStats } from "@/lib/handle/geometry";
import { useHandleStore } from "@/store/handle";
import { cn } from "@/lib/utils";

const PROFILES: { id: ProfileKind; label: string }[] = [
  { id: "ergonomic", label: "Ergonomic" },
  { id: "barrel", label: "Barrel" },
  { id: "waisted", label: "Waisted" },
  { id: "flare", label: "Flare" },
  { id: "straight", label: "Straight" },
];

const CURVES: { id: CurveKind; label: string }[] = [
  { id: "straight", label: "Straight" },
  { id: "gentle", label: "Gentle" },
  { id: "hook", label: "Hook" },
  { id: "s-curve", label: "S-curve" },
];

const TEXTURES: { id: TextureKind; label: string }[] = [
  { id: "smooth", label: "Smooth" },
  { id: "ribs", label: "Ribs" },
  { id: "rings", label: "Rings" },
  { id: "spiral", label: "Spiral" },
  { id: "knurl", label: "Knurl" },
  { id: "diamond", label: "Diamond" },
  { id: "dimple", label: "Dimple" },
  { id: "flutes", label: "Flutes" },
];

const POMMELS: { id: PommelKind; label: string }[] = [
  { id: "round", label: "Round" },
  { id: "flat", label: "Flat" },
  { id: "flare", label: "Flare" },
  { id: "knob", label: "Knob" },
];

const ATTACH: { id: AttachmentKind; label: string }[] = [
  { id: "socket", label: "Round hole" },
  { id: "tenon", label: "Pin" },
  { id: "none", label: "Closed" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

export function ControlPanel() {
  const params = useHandleStore((s) => s.params);
  const presetId = useHandleStore((s) => s.presetId);
  const setParam = useHandleStore((s) => s.setParam);
  const applyPreset = useHandleStore((s) => s.applyPreset);
  const previewColor = useHandleStore((s) => s.previewColor);
  const setPreviewColor = useHandleStore((s) => s.setPreviewColor);
  const showHead = useHandleStore((s) => s.showHead);
  const setShowHead = useHandleStore((s) => s.setShowHead);
  const showDimensions = useHandleStore((s) => s.showDimensions);
  const setShowDimensions = useHandleStore((s) => s.setShowDimensions);
  const autoRotate = useHandleStore((s) => s.autoRotate);
  const setAutoRotate = useHandleStore((s) => s.setAutoRotate);
  const saved = useHandleStore((s) => s.saved);
  const saveCurrent = useHandleStore((s) => s.saveCurrent);
  const loadSaved = useHandleStore((s) => s.loadSaved);
  const deleteSaved = useHandleStore((s) => s.deleteSaved);
  const reset = useHandleStore((s) => s.reset);
  const [saveName, setSaveName] = useState("");
  const [stats, setStats] = useState<ReturnType<typeof printStats> | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setStats(printStats(params)));
    return () => cancelAnimationFrame(id);
  }, [params]);

  const set = <K extends keyof HandleParams>(key: K) => (v: HandleParams[K]) =>
    setParam(key, v);

  return (
    <div className="flex flex-col gap-6">
      <Section title="Presets">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {PRESETS.map((p) => (
            <Chip
              key={p.id}
              active={presetId === p.id}
              onClick={() => applyPreset(p.id, p.params)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <p className="text-pretty text-sm leading-relaxed text-muted">
          {PRESETS.find((p) => p.id === presetId)?.blurb ??
            "A custom handle. Tune the form, then download STL for your slicer."}
        </p>
      </Section>

      <Separator />

      <Section title="Mounting hole">
        <p className="text-pretty text-sm leading-relaxed text-muted">
          Round hole in the bottom of every handle — the stem or shaft of whatever
          you are mounting it to goes in here. Measure that diameter. A little
          clearance is added so it slides, then glue with epoxy.
        </p>
        <JoinDiagram attachment={params.attachment} />
        <ChipRow>
          {ATTACH.map((a) => (
            <Chip key={a.id} active={params.attachment === a.id} onClick={() => setParam("attachment", a.id)}>
              {a.label}
            </Chip>
          ))}
        </ChipRow>
        {params.attachment !== "none" ? (
          <>
            <ParamSlider
              label={params.attachment === "socket" ? "Hole diameter" : "Pin diameter"}
              value={params.attachDiameter}
              min={2}
              max={24}
              step={0.1}
              onChange={set("attachDiameter")}
              hint="measured"
            />
            <ParamSlider
              label={params.attachment === "socket" ? "Hole depth" : "Pin length"}
              value={params.attachDepth}
              min={8}
              max={50}
              step={0.5}
              onChange={set("attachDepth")}
            />
            {params.attachment === "socket" ? (
              <>
                <ParamSlider label="Clearance" value={params.clearance} min={0} max={0.8} step={0.05} onChange={set("clearance")} hint="loose fit" />
                <ParamSlider label="Wall" value={params.wallThickness} min={1.6} max={5} step={0.1} onChange={set("wallThickness")} />
              </>
            ) : null}
          </>
        ) : null}
      </Section>

      <Separator />

      <Section title="Form">
        <ParamSlider label="Length" value={params.length} min={50} max={280} step={1} onChange={set("length")} />
        <ParamSlider label="Grip diameter" value={params.gripRadius * 2} min={10} max={50} step={0.1} onChange={(v) => setParam("gripRadius", v / 2)} />
        <ParamSlider label="Butt diameter" value={params.buttRadius * 2} min={8} max={48} step={0.1} onChange={(v) => setParam("buttRadius", v / 2)} />
        <ParamSlider label="Neck diameter" value={params.neckRadius * 2} min={6} max={40} step={0.1} onChange={(v) => setParam("neckRadius", v / 2)} />
        <ParamSlider label="Oval stretch" value={params.ovalRatio} min={0.75} max={2} step={0.01} unit="×" onChange={set("ovalRatio")} hint="1 is round" />
        <ParamSlider label="Facets" value={params.sides} min={6} max={64} step={1} unit="" onChange={(v) => setParam("sides", Math.round(v))} hint="6 hex · 48 round" />
        <div className="space-y-2">
          <Label>Profile</Label>
          <ChipRow>
            {PROFILES.map((p) => (
              <Chip key={p.id} active={params.profile === p.id} onClick={() => setParam("profile", p.id)}>
                {p.label}
              </Chip>
            ))}
          </ChipRow>
        </div>
        {params.profile === "waisted" ? (
          <ParamSlider label="Waist pinch" value={params.waist} min={0} max={0.7} step={0.01} unit="" onChange={set("waist")} />
        ) : null}
      </Section>

      <Separator />

      <Section title="Curve & swirl">
        <ChipRow>
          {CURVES.map((c) => (
            <Chip key={c.id} active={params.curveKind === c.id} onClick={() => setParam("curveKind", c.id)}>
              {c.label}
            </Chip>
          ))}
        </ChipRow>
        {params.curveKind !== "straight" ? (
          <ParamSlider
            label={params.curveKind === "s-curve" ? "Wave" : "Bend"}
            value={params.bendAngle}
            min={4}
            max={75}
            step={1}
            unit="°"
            onChange={set("bendAngle")}
          />
        ) : null}
        {params.curveKind === "hook" ? (
          <ParamSlider label="Bend position" value={params.bendPosition} min={0.3} max={0.9} step={0.01} unit="" onChange={set("bendPosition")} />
        ) : null}
        <ParamSlider label="Twist" value={params.twistTurns} min={0} max={3} step={0.05} unit="tr" onChange={set("twistTurns")} hint="swirl" />
      </Section>

      <Separator />

      <Section title="Texture">
        <ChipRow>
          {TEXTURES.map((t) => (
            <Chip key={t.id} active={params.texture === t.id} onClick={() => setParam("texture", t.id)}>
              {t.label}
            </Chip>
          ))}
        </ChipRow>
        {params.texture !== "smooth" ? (
          <>
            <ParamSlider label="Depth" value={params.textureDepth} min={0.05} max={1.4} step={0.05} onChange={set("textureDepth")} />
            <ParamSlider label="Scale" value={params.textureScale} min={0.5} max={2} step={0.05} unit="×" onChange={set("textureScale")} />
          </>
        ) : null}
      </Section>

      <Separator />

      <Section title="Ends & print">
        <div className="space-y-2">
          <Label>Pommel</Label>
          <ChipRow>
            {POMMELS.map((p) => (
              <Chip key={p.id} active={params.pommel === p.id} onClick={() => setParam("pommel", p.id)}>
                {p.label}
              </Chip>
            ))}
          </ChipRow>
        </div>
        <div className="flex h-11 items-center justify-between">
          <Label htmlFor="hang">Hang loop</Label>
          <Switch id="hang" checked={params.hangLoop} onCheckedChange={(v) => setParam("hangLoop", v)} />
        </div>
        {params.hangLoop ? (
          <>
            <ParamSlider label="Loop radius" value={params.hangLoopRadius} min={4} max={14} step={0.1} onChange={set("hangLoopRadius")} />
            <ParamSlider label="Loop thickness" value={params.hangLoopTube} min={1.4} max={4} step={0.1} onChange={set("hangLoopTube")} />
          </>
        ) : null}
        <ParamSlider
          label="Print flat"
          value={params.printFlat}
          min={0}
          max={0.4}
          step={0.01}
          unit=""
          onChange={set("printFlat")}
          hint="bed face"
        />
      </Section>

      <Separator />

      <Section title="Preview">
        <div className="flex flex-wrap gap-2">
          {PREVIEW_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              onClick={() => setPreviewColor(c.value)}
              className={cn(
                "size-8 rounded-full shadow-[var(--shadow-border)]",
                previewColor === c.value && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        <div className="flex h-11 items-center justify-between">
          <Label htmlFor="head">Ghost head</Label>
          <Switch id="head" checked={showHead} onCheckedChange={setShowHead} />
        </div>
        <div className="flex h-11 items-center justify-between">
          <Label htmlFor="dims">Dimensions</Label>
          <Switch id="dims" checked={showDimensions} onCheckedChange={setShowDimensions} />
        </div>
        <div className="flex h-11 items-center justify-between">
          <Label htmlFor="spin">Auto-rotate</Label>
          <Switch id="spin" checked={autoRotate} onCheckedChange={setAutoRotate} />
        </div>
      </Section>

      <Separator />

      <Section title="Print estimate">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Volume" value={stats ? `${stats.volumeCm3.toFixed(1)} cm³` : "—"} />
          <Stat label="PLA ~30% infill" value={stats ? `${stats.infillGrams.toFixed(0)} g` : "—"} />
          <Stat
            label="Bounding box"
            value={
              stats
                ? `${stats.size.x.toFixed(0)} × ${stats.size.y.toFixed(0)} × ${stats.size.z.toFixed(0)}`
                : "—"
            }
          />
          <Stat label="Max diameter" value={stats ? `${stats.maxDiameter.toFixed(1)} mm` : "—"} />
        </dl>
        <p className="text-pretty text-xs leading-relaxed text-muted">
          Export is millimetres, already laid on the bed. In Bambu Studio: drop the STL in, 0.20 mm
          layers, 3 walls, 30% gyroid, brim if you turned print-flat off. Lay-on-side is already
          applied — stronger than standing the handle up.
        </p>
      </Section>

      <Separator />

      <Section title="Library">
        <div className="flex gap-2">
          <Input
            placeholder="Name this handle"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="h-11"
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => {
              saveCurrent(saveName || params.name);
              setSaveName("");
            }}
          >
            <Bookmark />
            Save
          </Button>
        </div>
        {saved.length === 0 ? (
          <p className="text-sm text-muted">Saved designs stay on this device.</p>
        ) : (
          <ul className="space-y-1">
            {saved.map((d) => (
              <li key={d.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-raised"
                  onClick={() => loadSaved(d.id)}
                >
                  {d.name}
                </button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${d.name}`} onClick={() => deleteSaved(d.id)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="ghost" className="w-full" onClick={reset}>
          <RotateCcw />
          Reset paddle brush
        </Button>
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-raised px-3 py-2.5">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function JoinDiagram({ attachment }: { attachment: AttachmentKind }) {
  return (
    <svg viewBox="0 0 320 88" className="h-[4.5rem] w-full text-muted" aria-hidden="true">
      <text x="12" y="14" fontSize="10" fill="currentColor">
        bottom
      </text>
      {attachment === "socket" ? (
        <>
          <rect x="28" y="22" width="44" height="52" rx="8" fill="currentColor" opacity="0.38" />
          <ellipse cx="50" cy="74" rx="14" ry="6" fill="var(--color-bg)" stroke="currentColor" strokeWidth="1.6" />
          <ellipse cx="50" cy="74" rx="7" ry="3" fill="currentColor" opacity="0.25" />
          <rect x="88" y="48" width="10" height="8" rx="1" fill="currentColor" opacity="0.45" />
          <rect x="98" y="36" width="72" height="32" rx="4" fill="currentColor" opacity="0.22" />
          <text x="88" y="84" fontSize="10" fill="currentColor">
            round hole · stem goes in
          </text>
        </>
      ) : attachment === "tenon" ? (
        <>
          <rect x="28" y="22" width="44" height="44" rx="8" fill="currentColor" opacity="0.38" />
          <rect x="43" y="66" width="14" height="16" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="88" y="36" width="72" height="32" rx="4" fill="currentColor" opacity="0.22" />
          <text x="88" y="84" fontSize="10" fill="currentColor">
            pin into head
          </text>
        </>
      ) : (
        <>
          <rect x="28" y="22" width="44" height="52" rx="12" fill="currentColor" opacity="0.38" />
          <text x="88" y="52" fontSize="10" fill="currentColor">
            closed end
          </text>
        </>
      )}
    </svg>
  );
}
