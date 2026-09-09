import { useState } from "react";
import { Download, Focus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportObj, exportStl, saveFile } from "@/lib/handle/export";
import { useHandleStore } from "@/store/handle";

export function ExportBar() {
  const params = useHandleStore((s) => s.params);
  const frame = useHandleStore((s) => s.frame);
  const [busy, setBusy] = useState<"stl" | "obj" | null>(null);

  async function run(kind: "stl" | "obj") {
    setBusy(kind);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const file = kind === "stl" ? exportStl(params) : exportObj(params);
      const result = await saveFile(file.blob, file.filename);
      if (result === "cancelled") return;
      if (result === "shared") {
        toast.success("Handle ready to save", {
          description: "Choose Save to Files, then open the .stl in your slicer. Units are millimetres.",
        });
      } else {
        toast.success(`Saved ${file.filename}`, {
          description:
            kind === "stl"
              ? "Drop this into Bambu Studio, Orca, or PrusaSlicer. Units are millimetres."
              : "Wavefront OBJ, millimetres. Check Downloads if the file did not appear.",
        });
      }
    } catch (err) {
      toast.error("Could not export", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={() => run("stl")} disabled={busy !== null} className="min-w-36">
        {busy === "stl" ? <Loader2 className="animate-spin" /> : <Download />}
        Download STL
      </Button>
      <Button type="button" variant="secondary" onClick={() => run("obj")} disabled={busy !== null}>
        {busy === "obj" ? <Loader2 className="animate-spin" /> : null}
        OBJ
      </Button>
      <Button type="button" variant="ghost" onClick={frame} aria-label="Frame the handle">
        <Focus />
        Frame
      </Button>
    </div>
  );
}
