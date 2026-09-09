"use client";

import { useTour } from "../TourEngine";

export default function StartTourButton({ label = "Start the Tour" }: { label?: string }) {
  const { startTour } = useTour();
  return (
    <button
      type="button"
      onClick={startTour}
      className="rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
    >
      {label}
    </button>
  );
}
