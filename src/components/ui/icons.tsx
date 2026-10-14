import type { SVGProps } from "react";

// Mindforward line icons: 16px grid, 1.75 stroke, round caps, currentColor (design system → Ikonografi).
const PATHS = {
  arrowRight: <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />,
  arrowLeft: <path d="M12.5 8h-9M7 4.5 3.5 8 7 11.5" />,
  check: <path d="m3.5 8.5 3 3 6-7" />,
  x: <path d="m4.5 4.5 7 7m0-7-7 7" />,
  dash: <path d="M4.5 8h7" />,
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  bulb: (
    <path d="M6 12.5h4M6.5 14.5h3M8 1.5a4.5 4.5 0 0 0-2.6 8.2c.4.3.6.7.6 1.1v.2h4v-.2c0-.4.2-.8.6-1.1A4.5 4.5 0 0 0 8 1.5Z" />
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.25v4M8 4.9v.1" />
    </>
  ),
  alert: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75v3.75M8 10.9v.1" />
    </>
  ),
  shield: (
    <>
      <path d="M8 1.75 2.75 3.75v4c0 3.1 2.2 5.4 5.25 6.5 3.05-1.1 5.25-3.4 5.25-6.5v-4Z" />
      <path d="m5.75 8 1.5 1.5 3-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75V8l2.25 1.5" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 4.5 5.5 4 5.5-4" />
    </>
  ),
  user: (
    <>
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 14c.6-2.6 2.7-4 5.25-4s4.65 1.4 5.25 4" />
    </>
  ),
  users: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.75 13.5c.5-2.3 2.2-3.5 4.25-3.5s3.75 1.2 4.25 3.5M10.5 3.25a2.5 2.5 0 0 1 0 4.75M11.5 10.2c1.4.4 2.4 1.5 2.75 3.3" />
    </>
  ),
  grid: (
    <>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
    </>
  ),
  route: (
    <>
      <circle cx="4" cy="12" r="1.75" />
      <circle cx="12" cy="4" r="1.75" />
      <path d="M5.75 12H10a2 2 0 0 0 0-4H6a2 2 0 0 1 0-4h4.25" />
    </>
  ),
  sandbox: (
    <>
      <rect x="2" y="2.5" width="12" height="11" rx="1.75" />
      <path d="M2 5.5h12M4.5 4h.01M6.5 4h.01" />
    </>
  ),
  award: (
    <>
      <circle cx="8" cy="6" r="4" />
      <path d="m5.5 9.25-1 5.25L8 12.75l3.5 1.75-1-5.25" />
    </>
  ),
  chart: <path d="M2.5 13.5h11M4.5 11V7.5M8 11V4.5M11.5 11V9" />,
  file: (
    <>
      <path d="M4 1.75h5l3 3v9.5H4Z" />
      <path d="M9 1.75v3h3M6 8.5h4M6 11h4" />
    </>
  ),
  card: (
    <>
      <rect x="1.75" y="3.5" width="12.5" height="9" rx="1.5" />
      <path d="M1.75 6.5h12.5M4.5 10h2" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.75v1.5M8 12.75v1.5M14.25 8h-1.5M3.25 8h-1.5M12.4 3.6l-1.05 1.05M4.65 11.35 3.6 12.4M12.4 12.4l-1.05-1.05M4.65 4.65 3.6 3.6" />
    </>
  ),
  help: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6.25 6.25a1.85 1.85 0 0 1 3.6.55c0 1.2-1.85 1.5-1.85 2.7M8 11.4v.1" />
    </>
  ),
  chat: <path d="M2.5 3.5h11v7.5H7l-3 2.5V11H2.5Z" />,
  logout: <path d="M6 2.75H3.25v10.5H6M10 5l3 3-3 3M13 8H6.5" />,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  chevronDown: <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />,
  chevronRight: <path d="m6.5 4.5 3.5 3.5-3.5 3.5" />,
  external: <path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M11.5 9.5v4h-9v-9h4" />,
  sparkle: <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l1.75 1.75M10.25 10.25 12 12M12 4l-1.75 1.75M5.75 10.25 4 12" />,
  target: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <circle cx="8" cy="8" r="3.25" />
      <circle cx="8" cy="8" r=".5" />
    </>
  ),
  download: <path d="M8 2.5v8M4.75 7.25 8 10.5l3.25-3.25M2.75 13.5h10.5" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3.25 3.25" />
    </>
  ),
  trash: <path d="M2.75 4.25h10.5M6.25 4.25V2.75h3.5v1.5M4.25 4.25l.6 9h6.3l.6-9" />,
  send: <path d="M2.5 8 13.5 2.5 10.5 13.5 8 9Z" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className = "", ...props }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
