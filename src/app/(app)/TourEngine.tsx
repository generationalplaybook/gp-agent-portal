"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR_STEPS } from "./tour-steps";

interface TourContextValue {
  active: boolean;
  startTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

// Any client component can call useTour().startTour() to launch the walkthrough — used by the
// "Start the Tour" button on /getting-started. Deliberately just a start/active pair: there's no
// per-step "done" state anywhere in here to reset, on purpose (see tour-steps.ts).
export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}

// Mounted once in layout.tsx, wrapping every (app) page — that's what lets the overlay survive a
// Next/Back click that navigates from /profile to /clients: layout.tsx doesn't remount across
// client-side navigation within the (app) group, so this component (and its state) doesn't either.
export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const startTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    if (pathname !== TOUR_STEPS[0].page) router.push(TOUR_STEPS[0].page);
  }, [pathname, router]);

  return (
    <TourContext.Provider value={{ active, startTour }}>
      {children}
      {active && (
        <TourOverlay
          stepIndex={stepIndex}
          onNavigate={setStepIndex}
          onClose={() => setActive(false)}
        />
      )}
    </TourContext.Provider>
  );
}

function TourOverlay({
  stepIndex,
  onNavigate,
  onClose,
}: {
  stepIndex: number;
  onNavigate: (i: number) => void;
  onClose: () => void;
}) {
  const step = TOUR_STEPS[stepIndex];
  const pathname = usePathname();
  const router = useRouter();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<Element | null>(null);

  // Locate this step's real element on the page. If we've just navigated and the new page hasn't
  // rendered yet (or the element loads in async), retry for up to ~3s before giving up quietly —
  // better to skip a spotlight than to block someone on a page that's just still loading.
  useEffect(() => {
    // Not on this step's page yet (navigation still in flight) — leave whatever's currently
    // showing alone rather than clearing it synchronously here; the moment `pathname` catches up
    // this effect re-runs and tryFind takes over. targetRef is a ref, not state, so resetting it
    // synchronously is fine.
    targetRef.current = null;
    if (pathname !== step.page) return;

    let cancelled = false;
    let attempts = 0;
    function tryFind() {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (el) {
        targetRef.current = el;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (!cancelled && targetRef.current) setRect(targetRef.current.getBoundingClientRect());
        }, 320);
      } else if (attempts < 30) {
        attempts += 1;
        setTimeout(tryFind, 100);
      } else if (!cancelled) {
        setRect(null); // gave up — no target on this page, stop showing a stale spotlight
      }
    }
    tryFind();
    return () => {
      cancelled = true;
    };
  }, [pathname, step.page, step.selector]);

  // Keep the spotlight aligned with the real element while it's showing (window resize, page
  // scroll elsewhere on the page, content above it changing height, etc).
  useEffect(() => {
    function update() {
      if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
    }
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const interval = setInterval(update, 400); // cheap catch-all for layout shifts scroll/resize miss
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      clearInterval(interval);
    };
  }, []);

  function goTo(index: number) {
    if (index < 0 || index >= TOUR_STEPS.length) {
      onClose();
      return;
    }
    const target = TOUR_STEPS[index];
    onNavigate(index);
    if (pathname !== target.page) router.push(target.page);
  }

  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <>
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 10,
            boxShadow: "0 0 0 3px #1E6B3C, 0 0 0 9999px rgba(28,28,28,0.55)",
            pointerEvents: "none",
            zIndex: 9998,
            transition: "top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease",
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          width: 320,
          maxWidth: "calc(100vw - 32px)",
          ...tooltipPosition(rect, step.placement),
        }}
        className="rounded-lg border border-[#D9CFBA] bg-white p-4 shadow-lg"
      >
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1E6B3C]">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="-mt-1 -mr-1 rounded px-1.5 text-sm text-[#B3AB9B] hover:bg-[#F5F0E8] hover:text-[#666]"
          >
            ✕
          </button>
        </div>
        <h3 className="font-serif text-base font-semibold text-[#1C1C1C]">{step.title}</h3>
        <p className="mt-1.5 text-sm text-[#555]">{step.body}</p>
        {!rect && <p className="mt-1.5 text-xs text-[#B3AB9B]">Finding this on the page…</p>}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#707070] underline underline-offset-2 hover:text-[#2E2E2E]"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => goTo(stepIndex - 1)}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#F5F0E8]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => goTo(stepIndex + 1)}
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function tooltipPosition(rect: DOMRect | null, placement: "top" | "bottom"): React.CSSProperties {
  if (typeof window === "undefined") return { top: 80, left: 80 };
  if (!rect) {
    // No target found (yet) — park it centered so it's still usable rather than invisible.
    return { top: "40%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const left = Math.min(Math.max(rect.left, 16), window.innerWidth - 320 - 16);
  if (placement === "bottom") {
    return { top: Math.min(rect.bottom + 14, window.innerHeight - 220), left };
  }
  return { bottom: Math.max(window.innerHeight - rect.top + 14, 16), left };
}
