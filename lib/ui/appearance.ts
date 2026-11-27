/** Shared initial appearance; an explicit choice is saved on this device. */
export const APPEARANCE_KEY = 'kineo:appearance:v1'
export const DEFAULT_APPEARANCE = 'dark'
export type Appearance = 'light' | 'dark'

export function parseAppearance(value: unknown): Appearance {
  return value === 'light' ? 'light' : DEFAULT_APPEARANCE
}

// Runs in the head before paint, including when storage is unavailable.
export const APPEARANCE_BOOT = `(()=>{let theme='${DEFAULT_APPEARANCE}';try{if(localStorage.getItem('${APPEARANCE_KEY}')==='light')theme='light'}catch{}document.documentElement.dataset.theme=theme})();`
