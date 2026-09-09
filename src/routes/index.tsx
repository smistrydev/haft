import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ControlPanel } from "@/components/control-panel";
import { ExportBar } from "@/components/export-bar";
import { TooltipProvider } from "@/components/ui/tooltip";

const Viewport = lazy(() => import("@/components/viewport"));

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg">
        <header className="flex items-end justify-between gap-4 border-b border-border px-5 py-4 lg:hidden">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-faint">Workshop</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-fg">Haft</h1>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section className="relative h-[46vh] shrink-0 bg-bg lg:h-auto lg:min-h-0 lg:flex-1">
            {mounted ? (
              <Suspense fallback={<ViewportFallback />}>
                <Viewport />
              </Suspense>
            ) : (
              <ViewportFallback />
            )}
            <div className="pointer-events-none absolute left-4 top-4 hidden max-w-xs lg:block">
              <p className="rounded-xl bg-surface/80 px-3 py-2 text-xs leading-relaxed text-muted shadow-[var(--shadow-border)] backdrop-blur-sm">
                Drag to orbit · pinch or scroll to zoom. Units are millimetres.
              </p>
            </div>
          </section>

          <aside className="flex min-h-0 w-full flex-1 flex-col border-t border-border lg:h-full lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
            <header className="hidden items-start justify-between gap-4 px-5 pb-4 pt-5 lg:flex">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-faint">Workshop</p>
                <h1 className="font-display text-3xl font-medium tracking-tight text-fg">Haft</h1>
                <p className="mt-1 max-w-[16rem] text-sm leading-relaxed text-muted">
                  A handle, turned to your hand. Round hole in the bottom — print a replacement for a broken brush or tool.
                </p>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5 lg:pt-0">
              <p className="mb-5 text-sm leading-relaxed text-muted lg:hidden">
                A handle, turned to your hand. Round hole in the bottom — print a replacement for a broken brush or tool.
              </p>
              <ControlPanel />
            </div>
            <div className="border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <ExportBar />
            </div>
          </aside>
        </div>
      </div>
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: "bg-raised text-fg shadow-[var(--shadow-border)] border-0",
            title: "text-fg",
            description: "text-muted",
          },
        }}
      />
    </TooltipProvider>
  );
}

function ViewportFallback() {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center bg-bg text-sm text-muted">
      Turning the handle…
    </div>
  );
}
