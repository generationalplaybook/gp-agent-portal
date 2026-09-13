// 9/11 — Karina sent her real Generational Playbook icon + wordmark and asked to "improve the
// resolution and make these larger files so that I have real logo files," then "implement that
// second one with the icon and the words onto the portal and remove that generic GP advisor
// portal text." The two source images were 512x512 and 560x100 raster PNGs — rather than just
// upscaling those pixels (which would have just smoothly blurred them bigger, and would have
// carried over a faint dithering artifact visible in her original icon file at high zoom), this
// is a from-scratch vector recreation: the icon mark is 4 flat shapes (a diamond + 3 chevron
// strokes) at the exact opacities pixel-sampled from her file (14.1%, 32.9%, 60%, 100% of
// #1c1c1c over the site's cream background), and the wordmark text uses the app's existing
// Georgia serif token (--font-serif in globals.css) plus a pixel-sampled warm gray (#9a9184) for
// "PLAYBOOK." Verified by rendering this reconstruction side-by-side against her original files
// before wiring it in — very close, not pixel-identical (this is a redraw, not a lossless clone;
// worth knowing if she ever compares closely against the original files).
//
// Two variants: `mark` (icon only, for tight spaces) and `full` (icon + wordmark, the default —
// this is "that second one" she asked for). `size` scales the whole lockup; the wordmark's own
// internal proportions stay fixed since it's one SVG viewBox.
type LogoProps = {
  variant?: "full" | "mark";
  size?: number; // rendered height in px
  className?: string;
};

export default function Logo({ variant = "full", size = 28, className = "" }: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 512 512"
        height={size}
        width={size}
        className={className}
        aria-label="Generational Playbook"
        role="img"
      >
        <polygon points="256,132 320.5,172.5 256,213 191.5,172.5" fill="#1C1C1C" opacity={0.141} />
        <polyline points="176,204 256,262 335,204" fill="none" stroke="#1C1C1C" strokeWidth={18} strokeLinejoin="miter" strokeLinecap="butt" opacity={0.329} />
        <polyline points="150,249 256,320 361,249" fill="none" stroke="#1C1C1C" strokeWidth={20} strokeLinejoin="miter" strokeLinecap="butt" opacity={0.6} />
        <polyline points="130,291 256,376 381,291" fill="none" stroke="#1C1C1C" strokeWidth={22} strokeLinejoin="miter" strokeLinecap="butt" opacity={1} />
      </svg>
    );
  }

  // full wordmark — one fixed-aspect SVG (560x100) so the icon mark and the two text lines stay
  // in the same relative position at any size.
  const width = size * (560 / 100);
  return (
    <svg
      viewBox="0 0 560 100"
      height={size}
      width={width}
      className={className}
      aria-label="Generational Playbook"
      role="img"
    >
      <polygon points="45.6,15.3 63.5,26.5 45.6,37.7 27.8,26.5" fill="#1C1C1C" opacity={0.141} />
      <polyline points="23.5,35.2 45.6,51.2 67.5,35.2" fill="none" stroke="#1C1C1C" strokeWidth={5.0} strokeLinejoin="miter" strokeLinecap="butt" opacity={0.329} />
      <polyline points="16.3,47.6 45.6,67.3 74.7,47.6" fill="none" stroke="#1C1C1C" strokeWidth={5.5} strokeLinejoin="miter" strokeLinecap="butt" opacity={0.6} />
      <polyline points="10.8,59.3 45.6,82.8 80.2,59.3" fill="none" stroke="#1C1C1C" strokeWidth={6.1} strokeLinejoin="miter" strokeLinecap="butt" opacity={1} />
      <text x="104" y="42" fontFamily="Georgia, 'Times New Roman', serif" fontSize={33} fill="#1B1B1B">
        Generational
      </text>
      <text x="105" y="72" fontFamily="Georgia, 'Times New Roman', serif" fontSize={11} letterSpacing={2.6} fill="#9A9184">
        PLAYBOOK
      </text>
    </svg>
  );
}
