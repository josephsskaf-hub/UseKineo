/** Founder-approved appearance. Device preference only; never affects access or billing. */
export const APPEARANCE_KEY = 'kineo:appearance:v1'
export const FOR_CREATORS_PATH = /^\/for-creators\/?$/
const MOBILE_APPEARANCE_QUERY = '(max-width:767px)'
export type Appearance = 'light' | 'dark'
export function parseAppearance(value: unknown): Appearance { return value === 'dark' ? 'dark' : 'light' }

export function readPageAppearance(defaultDark: boolean): Appearance {
  try {
    const saved = localStorage.getItem(APPEARANCE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    if (defaultDark || matchMedia(MOBILE_APPEARANCE_QUERY).matches) return 'dark'
  } catch { /* Use the route's fallback when storage is unavailable. */ }
  return defaultDark ? 'dark' : 'light'
}

// Runs in the head before paint. Storage can be unavailable in private/restricted browsers.
export const APPEARANCE_BOOT = `(()=>{const c=typeof location!=='undefined'&&${FOR_CREATORS_PATH}.test(location.pathname);let t='light';try{const s=localStorage.getItem('${APPEARANCE_KEY}');if(s==='dark'||(s!=='light'&&(c||matchMedia('${MOBILE_APPEARANCE_QUERY}').matches)))t='dark'}catch{if(c)t='dark'}document.documentElement.dataset.theme=t})();`
