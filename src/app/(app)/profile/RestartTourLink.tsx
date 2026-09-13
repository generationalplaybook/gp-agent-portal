"use client";

import { useTour } from "../TourEngine";

// The quiet, always-there way back into the tour once onboarding's done (Karina, 9/9: "once
// completed it should maybe hide at the bottom of the profile page, not in this dropdown") — the
// header's prominent "Getting Started" link (layout.tsx) stops showing the moment the 3 signals
// are all true, so this is what replaces it as the one remaining way to relaunch.
export default function RestartTourLink() {
  const { startTour } = useTour();
  return (
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={startTour}
        className="text-xs text-[#707070] underline underline-offset-2 hover:text-[#2E2E2E]"
      >
        Need a refresher? Restart the Getting Started tour
      </button>
    </div>
  );
}
