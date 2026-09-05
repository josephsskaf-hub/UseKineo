'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

// Preserve existing destination icons while preparing the five-slot UX lot.
// KINEO-NAV-REDESIGN-2026-07-10 — emoji icons replaced with the same refined
// line-icon set the Sidebar uses (17px, 1.7 stroke, currentColor) so mobile
// matches the professional desktop nav.
const NAV_ITEMS: { href: string; icon: JSX.Element; label: string; exact: boolean }[] = [
  {
    href: '/studio',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="5" width="14" height="14" rx="3" />
        <path d="M16.5 10.5 21.5 7v10l-5-3.5" />
      </svg>
    ),
    label: 'Studio',
    exact: false,
  },
  // KINEO-IMAGES-PROD-2026-08-17 — par do Sidebar: Kineo Images no mobile.
  {
    href: '/images',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m3.5 17 5-5 4 4 3-3 5 5" />
      </svg>
    ),
    label: 'Images',
    exact: false,
  },
  // KINEO-AUDIO-2026-08-17 — par do Sidebar: Kineo Audio no mobile.
  {
    href: '/audio',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
      </svg>
    ),
    label: 'Audio',
    exact: false,
  },
  {
    href: '/viral-now',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3c1 3-3 5-3 8.5a3.5 3.5 0 0 0 7 0c0-1-.4-2-1-2.8.2 2-1 2.6-1 1.3 0-2.5-1-5.5-2-7Z" />
        <path d="M8 14.5A6.5 6.5 0 1 0 18.5 14" />
      </svg>
    ),
    label: 'Viral Now',
    exact: false,
  },
  {
    href: '/history',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M3 9h18M8 4v5M16 4v5" />
      </svg>
    ),
    label: 'My Videos',
    exact: false,
  },
  {
    href: '/referral',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="8" width="17" height="4.5" rx="1.5" />
        <path d="M5 12.5V19a1.8 1.8 0 0 0 1.8 1.8h10.4A1.8 1.8 0 0 0 19 19v-6.5M12 8v12.8M12 8c-1.8 0-3.5-1-3.5-2.6S10.4 3 12 5c1.6-2 3.5-1.2 3.5.4S13.8 8 12 8Z" />
      </svg>
    ),
    label: 'Invite',
    exact: false,
  },
  // PUSH #95 — the affiliate program (40% recurring commission, working
  // dashboard + tracking) had zero internal links anywhere in the app.
  // Matching Sidebar.tsx entry, placed right after "Invite" per the same
  // job-to-be-done. Reuses the "pricing" tag icon (same SVG as the /pricing
  // item below) — closest existing icon for a commission/money concept.
  {
    href: '/affiliate',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3.5h12l3.5 5.5L12 21 2.5 9 6 3.5Z" />
        <path d="M2.5 9h19M9 9l3 12M15 9l-3 12" />
      </svg>
    ),
    label: 'Affiliate',
    exact: false,
  },
  {
    href: '/pricing',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3.5h12l3.5 5.5L12 21 2.5 9 6 3.5Z" />
        <path d="M2.5 9h19M9 9l3 12M15 9l-3 12" />
      </svg>
    ),
    label: 'Pricing',
    exact: false,
  },
]

// Same destinations as the desktop sidebar; no checkout or generation side effects.
const TOOL_LINKS = [
  { href: '/images', label: 'Images' },
  { href: '/audio', label: 'Audio' },
  { href: '/avatar', label: 'AI Presenter' },
  { href: '/animate', label: 'Animate a Photo' },
  { href: '/thumbnail-generator', label: 'AI Thumbnails' },
]
const MORE_LINKS = [
  { href: '/library', label: 'Library' },
  { href: '/viral-now', label: 'Viral Now' },
  { href: '/channel', label: 'Channel Builder' },
  { href: '/autopilot', label: 'Autopilot' },
  { href: '/referral', label: 'Invite & Earn', signedIn: true },
  { href: '/affiliate', label: 'Affiliate', signedIn: true },
  { href: '/account', label: 'Account', signedIn: true },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

function closeDisclosures(nav: HTMLElement | null) {
  nav?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((details) => {
    details.open = false
  })
}

export default function MobileNav({ isLoggedIn = true }: { isLoggedIn?: boolean }) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)

  // Next keeps the shell mounted on navigation, so an open sheet must not
  // follow the visitor to another page. Never reset a generator or its input.
  useEffect(() => { closeDisclosures(navRef.current) }, [pathname, isLoggedIn])
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        closeDisclosures(navRef.current)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  const primary = NAV_ITEMS.filter((item) => ['/studio', '/history', '/pricing'].includes(item.href))
  const groups = [
    { label: 'Tools', links: TOOL_LINKS },
    { label: 'More', links: MORE_LINKS.filter((item) => isLoggedIn || !item.signedIn) },
  ]
  const primaryLink = (href: string) => {
    const item = primary.find((entry) => entry.href === href)!
    const active = isActive(pathname, item.href)
    return (
      <Link key={href} href={href} className="kineo-mobile-tab"
        aria-current={active ? (pathname === href ? 'page' : 'location') : undefined}
        data-active={active || undefined}>
        {item.icon}<span>{item.label}</span>
      </Link>
    )
  }
  const disclosure = (group: typeof groups[number]) => (
    <details key={group.label} className="kineo-mobile-group"
      onToggle={(event) => {
        const current = event.currentTarget
        if (!current.open) return
        navRef.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((other) => {
          if (other !== current) other.open = false
        })
      }}>
      <summary className="kineo-mobile-tab"
        data-active={group.links.some((item) => isActive(pathname, item.href)) || undefined}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          {group.label === 'Tools'
            ? <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>
            : <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>}
        </svg>
        <span>{group.label}</span>
      </summary>
      <div className="kineo-mobile-sheet">
        <div className="kineo-mobile-sheet-heading">
          <strong>{group.label}</strong>
          <button type="button" aria-label={'Close ' + group.label}
            onClick={(event) => {
              const details = event.currentTarget.closest('details')
              if (details) { details.open = false; details.querySelector('summary')?.focus() }
            }}>×</button>
        </div>
        {group.links.map((item) => (
          <Link key={item.href} href={item.href}
            aria-current={isActive(pathname, item.href) ? (pathname === item.href ? 'page' : 'location') : undefined}
            onClick={() => closeDisclosures(navRef.current)}>
            {item.label}<span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </details>
  )

  return (
    <nav ref={navRef} aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden kineo-mobile-nav"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        const open = navRef.current?.querySelector<HTMLDetailsElement>('details[open]')
        if (open) { event.preventDefault(); open.open = false; open.querySelector('summary')?.focus() }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          closeDisclosures(navRef.current)
        }
      }}>
      <div className="kineo-mobile-row">
        {primaryLink('/studio')}
        {primaryLink('/history')}
        {disclosure(groups[0])}
        {primaryLink('/pricing')}
        {disclosure(groups[1])}
      </div>
      <style>{`
        .kineo-mobile-nav{background:#000;border-top:1px solid #2a2a2d;padding-bottom:max(env(safe-area-inset-bottom),6px)}
        .kineo-mobile-row{display:flex;align-items:stretch;height:62px}
        .kineo-mobile-nav .kineo-mobile-tab{flex:1;min-width:0;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#a1a1aa;text-decoration:none;cursor:pointer;list-style:none;position:relative}
        .kineo-mobile-tab>span{font-size:11px;font-weight:600;white-space:nowrap}
        .kineo-mobile-tab[data-active]{color:#2997ff;background:rgba(41,151,255,.08)}
        .kineo-mobile-tab[data-active]:before{content:'';position:absolute;top:0;left:20%;right:20%;height:2px;background:#2997ff}
        .kineo-mobile-group{flex:1;min-width:0}
        .kineo-mobile-group summary::-webkit-details-marker{display:none}
        .kineo-mobile-group[open] summary{color:#f5f5f7;background:#161619}
        .kineo-mobile-sheet{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);max-height:50vh;max-height:50dvh;overflow-y:auto;overscroll-behavior:contain;padding:12px;border:1px solid #303036;border-radius:16px;background:#111113;box-shadow:0 8px 32px #0009}
        .kineo-mobile-sheet-heading{display:flex;align-items:center;justify-content:space-between;padding-left:12px;color:#f5f5f7}
        .kineo-mobile-sheet button{min-width:44px;min-height:44px;border:0;background:transparent;color:#a1a1aa;font-size:24px;cursor:pointer}
        .kineo-mobile-sheet a{display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:8px 12px;color:#d4d4d8;text-decoration:none;font-size:14px;border-radius:8px}
        .kineo-mobile-sheet a[aria-current],.kineo-mobile-sheet a:hover{background:#1f1f24;color:#fff}
        .kineo-mobile-nav a:focus-visible,.kineo-mobile-nav summary:focus-visible,.kineo-mobile-nav button:focus-visible{outline:2px solid #2997ff;outline-offset:-3px;border-radius:8px}
      `}</style>
    </nav>
  )
}
