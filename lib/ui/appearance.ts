/** Founder-approved appearance. Device preference only; never affects access or billing. */
export const APPEARANCE_KEY = 'kineo:appearance:v1'
export type Appearance = 'light' | 'dark'
export function parseAppearance(value: unknown): Appearance { return value === 'dark' ? 'dark' : 'light' }
// Runs in the head before paint. Storage can be unavailable in private/restricted browsers.
export const APPEARANCE_BOOT = `(()=>{let t='light';try{if(localStorage.getItem('${APPEARANCE_KEY}')==='dark')t='dark'}catch{}document.documentElement.dataset.theme=t})();`
