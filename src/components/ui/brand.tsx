import { BRAND } from "@/lib/i18n/da";

/** The Mindforward mark: a dot and a forward chevron in a rounded tile (design system → Logo). */
export function LogoMark({ size = 24, className = "", tone = "default" }: { size?: number; className?: string; tone?: "default" | "night" }) {
  const tile = tone === "night" ? "fill-on-night" : "fill-ink";
  const chevron = tone === "night" ? "stroke-night" : "stroke-bg";
  const dot = tone === "night" ? "fill-accent" : "fill-mark-dot";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }} aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <rect className={tile} width="64" height="64" rx="16" />
      <circle className={dot} cx="21" cy="32" r="6" />
      <path className={chevron} d="M32 19 L45 32 L32 45" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark + lowercase wordmark. `size` is the wordmark's font size in px. */
export function Wordmark({ size = 20, tone = "default", className = "" }: { size?: number; tone?: "default" | "night"; className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-[650] leading-none tracking-[-0.03em] ${tone === "night" ? "text-on-night" : "text-ink"} ${className}`}
      style={{ fontSize: `${size / 16}rem`, gap: "0.4em" }}
    >
      <LogoMark size={Math.round(size * 1.15)} tone={tone} />
      <span>{BRAND.toLowerCase()}</span>
    </span>
  );
}

const HEAD = [
  "M502.297 318.207C534.219 315.953 570.297 329.502 593.56 351.275C604.243 361.165 613.104 372.857 619.737 385.816C626.854 399.617 630.381 416.623 635.596 431.632C639.836 443.875 644.184 456.082 648.637 468.25C651.808 476.773 655.234 485.241 658.053 493.885C666.403 519.491 643.362 516.277 627.022 516.018C627.008 528.35 627.981 552.567 624.967 563.353C622.869 571.125 618.61 578.142 612.683 583.589C591.121 603.159 558.227 591.876 550.91 597.911C543.88 603.709 545.854 645.825 545.862 655.216L529.319 655.351C517.125 616.364 499.734 597.324 467.773 574.361C453.546 564.139 445.831 542.557 444.509 525.313C444.561 505.82 451.458 488.751 468.26 478.082C477.839 471.999 486.485 471.192 497.518 470.858C497.128 482.614 493.967 509.56 509.328 512.667C517.079 514.234 526.67 505.176 532 500.296C553.976 480.173 576.905 460.836 598.133 439.931C607.192 430.992 608.388 425.098 599.032 415.602C594.316 410.815 589.217 406.427 584.099 401.89L559.721 380.179C553.461 374.61 547.243 368.994 541.067 363.333C533.497 356.352 513.325 334.91 503.035 345.379C495.282 353.267 496.877 379.361 497.299 389.96C462.067 390.929 435.841 385.372 405.785 365.533C410.164 359.996 415.61 355.255 420.803 350.506C443.954 329.33 471.588 320.613 502.297 318.207Z",
  "M510.233 353.713C524.037 361.981 540.557 378.862 553.063 390.174C565.616 401.528 582.275 415.083 593.837 427.138L542.867 473.922C534.11 481.968 520.25 495.749 510.575 501.951C510.442 492.164 512.613 470.264 506.136 463.385C493.753 450.234 465.218 464.058 454.014 473.46C439.619 485.54 434.219 500.679 432.755 518.877C431.376 528.744 435 542.726 437.882 552.126C430.237 547.916 422.004 541.737 415.422 536.1C391.92 515.971 375.889 487.795 373.538 456.662C371.739 432.837 377.385 410.439 388.734 389.562C391.301 384.84 394.77 378.751 398.234 374.742C421.547 392.497 445.884 399.054 474.344 402.528C519.751 408.07 508.98 386.837 510.233 353.713Z",
  "M406.265 551.185C412.417 554.304 418.193 560.448 423.862 564.172C426.568 565.949 432.45 568.746 435.474 570.301C441.894 573.574 448.212 577.043 454.419 580.704C478.216 594.875 497.853 612.526 509.557 638.088C512.062 643.56 514.641 649.459 516.122 655.304C506.29 655.422 496.456 655.367 486.625 655.14C461.909 654.343 444.884 648.14 427.992 629.891C405.671 605.777 405.098 582.228 406.265 551.185Z",
] as const;

/** The v3 logo mark (Marco 16 Oct 2026): a head with a forward arrow. `light` turns the navy parts white (dark sidebar). */
export function HeadMark({ size = 30, tone = "default", className = "" }: { size?: number; tone?: "default" | "light"; className?: string }) {
  const head = tone === "light" ? "fill-on-sidebar" : "fill-logo-navy";
  return (
    <svg viewBox="360 310 310 352" width={size} height={size * 1.13} style={{ width: `${size / 16}rem`, height: `${(size * 1.13) / 16}rem` }} aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path className={head} d={HEAD[0]} />
      <path className="fill-logo-blue" d={HEAD[1]} />
      <path className={head} d={HEAD[2]} />
    </svg>
  );
}

/** App wordmark for the signed-in shell: v3 mark + lowercase name. */
export function AppWordmark({ size = 22, tone = "default", className = "" }: { size?: number; tone?: "default" | "light"; className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-bold leading-none tracking-[-0.02em] ${tone === "light" ? "text-on-sidebar" : "text-ink"} ${className}`}
      style={{ fontSize: `${size / 16}rem`, gap: "0.45em" }}
    >
      <HeadMark size={Math.round(size * 1.35)} tone={tone} />
      <span>{BRAND.toLowerCase()}</span>
    </span>
  );
}

/** Website logo (mindforward.dk, Oct 2026): duotone brain + "Forward". Used on the login/signup pages so they match the site. */
export function SiteLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <svg viewBox="0 0 256 256" width="36" height="36" aria-hidden="true" focusable="false" className="shrink-0 fill-site-brain">
        <path opacity="0.2" d="M240,124a48,48,0,0,1-32,45.27h0V176a40,40,0,0,1-80,0,40,40,0,0,1-80,0v-6.73h0a48,48,0,0,1,0-90.54V72a40,40,0,0,1,80,0,40,40,0,0,1,80,0v6.73A48,48,0,0,1,240,124Z" />
        <path d="M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z" />
      </svg>
      <span className="text-[23px] font-extrabold tracking-tighter text-site-ink">Forward</span>
    </span>
  );
}
