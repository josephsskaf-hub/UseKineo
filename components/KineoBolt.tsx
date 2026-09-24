import { Fragment, type CSSProperties, type ReactNode } from 'react'

/** The blue lightning mark approved on the home page, shared by every surface. */
export default function KineoBolt({ size = '1.3em', className, style }: {
  size?: number | string
  className?: string
  style?: CSSProperties
}) {
  return <span aria-hidden="true" className={className ? `kineo-bolt ${className}` : 'kineo-bolt'} style={{
    display: 'inline-block', flexShrink: 0, color: '#2997ff', fontFamily: 'var(--font-manrope), Arial, sans-serif',
    fontSize: size, fontWeight: 800, fontStyle: 'normal', lineHeight: 1, verticalAlign: '-.08em', ...style,
  }}>ϟ</span>
}

/** Keep authored copy/translation keys intact; only replace the decorative glyph. */
export function KineoBoltText({ children, inheritColor = false }: { children: ReactNode; inheritColor?: boolean }) {
  if (typeof children !== 'string' || !children.includes('⚡')) return <>{children}</>
  return <>{children.split('⚡').map((text, index) => <Fragment key={index}>
    {index > 0 && <KineoBolt style={inheritColor ? { color: 'currentColor' } : undefined} />}{text}
  </Fragment>)}</>
}
