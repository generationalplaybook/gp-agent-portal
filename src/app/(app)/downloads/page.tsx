import { DOWNLOADS } from "@/lib/downloads-data";
import { KB_BADGE_STYLES } from "@/lib/kb-data";

export default function DownloadsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Downloads</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DOWNLOADS.map((d) => {
          const style = KB_BADGE_STYLES[d.badge] ?? { bg: "#1C1C1C", color: "#fff" };
          const available = Boolean(d.file);
          return (
            <a
              key={d.name}
              href={available ? d.file : undefined}
              target={available ? "_blank" : undefined}
              rel={available ? "noopener noreferrer" : undefined}
              className={`flex flex-col gap-2 rounded-lg border border-[#D9CFBA] bg-[#F5F0E8] p-4 text-sm transition ${
                available ? "hover:shadow-sm" : "cursor-not-allowed opacity-60"
              }`}
              aria-disabled={!available}
              onClick={(e) => {
                if (!available) e.preventDefault();
              }}
            >
              <span
                className="inline-block w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: style.bg, color: style.color }}
              >
                {d.label}
              </span>
              <div className="font-semibold text-[#1C1C1C]">{d.name}</div>
              <div className="text-xs text-[#666]">{d.desc}</div>
              {!available && (
                <div className="text-xs font-medium text-[#8B1A1A]">Not uploaded yet</div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
