import type { CSSProperties } from 'react'

const paths = {
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  image: 'M3 3h18v18H3zM3 16l6-6 5 5 3-3 4 4M15 7h.01',
  film: 'M3 5h18v14H3zM7 5v14M17 5v14M3 10h4m10 0h4M3 14h4m10 0h4',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14z',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  search: 'm16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  star: 'm12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z',
  play: 'm8 4 12 8-12 8z',
} as const

export default function ControlIcon({ name, style }: { name: keyof typeof paths; style?: CSSProperties }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}><path d={paths[name]} /></svg>
}
