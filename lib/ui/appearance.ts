/** Founder-approved appearance. Device preference only; never affects access or billing. */
export const APPEARANCE_KEY = 'kineo:appearance:v1'
export type Appearance = 'light' | 'dark'
export function parseAppearance(value: unknown): Appearance { return value === 'dark' ? 'dark' : 'light' }
// Runs in the head before paint. Storage can be unavailable in private/restricted browsers.
export const APPEARANCE_BOOT = `(()=>{let t='light';try{const s=localStorage.getItem('${APPEARANCE_KEY}');if(s==='dark'||(s!=='light'&&matchMedia('(max-width:767px)').matches))t='dark'}catch{}document.documentElement.dataset.theme=t})();`
