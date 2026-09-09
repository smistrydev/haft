import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
}

function decimalsFor(step: number) {
  if (step >= 1) return 0;
  const s = step.toString();
  return s.includes(".") ? s.split(".")[1]!.length : 1;
}

function snap(value: number, step: number) {
  const d = decimalsFor(step);
  return Number((Math.round(value / step) * step).toFixed(d));
}

export function ParamSlider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = "mm",
  onChange,
  hint,
}: ParamSliderProps) {
  const display = snap(value, step);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <Label>
          {label}
          {hint ? <span className="ml-2 font-normal text-faint">{hint}</span> : null}
        </Label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            inputMode="decimal"
            className="h-8 w-16 px-2 text-right font-medium tabular-nums"
            min={min}
            max={max}
            step={step}
            value={display}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!Number.isFinite(n)) return;
              onChange(snap(Math.min(max, Math.max(min, n)), step));
            }}
            aria-label={label}
          />
          <span className="w-7 text-xs text-faint">{unit}</span>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[display]}
        onValueChange={(v) => onChange(snap(v[0] ?? value, step))}
        aria-label={label}
      />
    </div>
  );
}
