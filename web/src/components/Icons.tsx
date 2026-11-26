// Small inline icon set (stroke icons, 24×24 grid).
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (props: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const IconOverview = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
)
export const IconArch = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="6" height="5" rx="1" /><rect x="15" y="3" width="6" height="5" rx="1" /><rect x="9" y="16" width="6" height="5" rx="1" /><path d="M6 8v3h12V8M12 11v5" /></svg>
)
export const IconRoadmap = (p: P) => (
  <svg {...base(p)}><path d="M3 12h18" /><circle cx="6" cy="12" r="2" /><circle cx="13" cy="12" r="2" /><path d="M19 9l3 3-3 3" /><path d="M6 5v3M13 16v3" /></svg>
)
export const IconProgress = (p: P) => (
  <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)
export const IconTeam = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16 14.2c2.8.2 5 2.6 5 5.8" /></svg>
)
export const IconResults = (p: P) => (
  <svg {...base(p)}><path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" /><path d="M7.5 15h9" /></svg>
)
export const IconDocs = (p: P) => (
  <svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
)
export const IconActivity = (p: P) => (
  <svg {...base(p)}><circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="12" r="2.2" /><path d="M6 8.2v7.6M8 6.8c5 .5 8 2.4 8.4 3.6" /></svg>
)
export const IconSun = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const IconMoon = (p: P) => (
  <svg {...base(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
)
export const IconMenu = (p: P) => (
  <svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
)
export const IconBranch = (p: P) => (
  <svg {...base(p)}><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="8" r="2" /><path d="M6 7v10M18 10c0 4-6 3-11.5 7" /></svg>
)
export const IconFlask = IconResults
export const IconInbox = (p: P) => (
  <svg {...base(p)}><path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M3 13h5l1.5 3h5L16 13h5" /></svg>
)
export const IconExternal = (p: P) => (
  <svg {...base(p)}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
)

export const IconTarget = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
)
export const IconCube = (p: P) => (
  <svg {...base(p)}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></svg>
)
export const IconCompare = (p: P) => (
  <svg {...base(p)}><path d="M4 20V8M10 20V4M16 20v-9M22 20H2" /><path d="M3 6l6-3 6 5 6-4" /></svg>
)
export const IconCamera = (p: P) => (
  <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
)

/** Project mark: a stylised two-link arm reaching a cap. */
export const BrandMark = (p: P) => (
  <svg viewBox="0 0 36 36" {...p}>
    <rect x="0.5" y="0.5" width="35" height="35" rx="9" fill="var(--accent-soft)" stroke="color-mix(in srgb, var(--accent) 45%, transparent)" />
    <path d="M9 27h9" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round" />
    <path d="M13.5 27l3-9 8-4" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="16.5" cy="18" r="1.9" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.6" />
    <rect x="24" y="9.5" width="5.5" height="4" rx="1.2" fill="var(--accent-2)" />
    <path d="M24.5 14.5v4M29 14.5v4" stroke="var(--text-2)" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
