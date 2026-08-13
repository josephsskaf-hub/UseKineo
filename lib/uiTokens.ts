/**
 * uiTokens — fonte da verdade do design system Kineo (roadmap Higgsfield 20 dias).
 * Doc: docs/UI-1PORCENTO-BACKLOG.md [KINEO-HIGGSFIELD-20D-2026-08-12]
 *
 * Regra: adaptar a DISCIPLINA do Higgsfield (1 escala de raio, poucos cinzas,
 * 3 duracoes), mantendo a identidade Kineo (azul #2997ff, fundo #000).
 * As sprints de UI (14h/18h) consomem estas constantes ao unificar paginas.
 */

/** Escala unica de raios. Mapa de conversao dos orfaos:
 *  6/8/11/12px -> xs | 13/14px -> sm | 16/18px -> md | 20/24/30px -> lg | 980/9999px -> pill
 *  Tailwind: rounded-md/lg -> xs, rounded-xl -> sm, rounded-2xl/3xl -> lg, rounded-full -> pill
 */
export const radius = {
  xs: '8px',
  sm: '13px',
  md: '18px', // ja existia como --r-md no KLP_CSS
  lg: '22px', // ja existia como --r-lg no KLP_CSS
  pill: '999px',
} as const;

/** 9 tons neutros documentados (KLP_CSS tinha 21). */
export const color = {
  bg: '#000000',
  surface1: '#141416', // absorve 131315/161618/17171a/191919/19191c
  surface2: '#1d1d1f', // absorve 1a1a1d/212124/26262a
  border: '#2a2a2d', // absorve 3a3a3d
  borderHover: '#4d4d50',
  text1: '#f5f5f7',
  text2: '#c7c7cd', // absorve c9c9cf
  text3: '#86868b', // absorve a1a1a8/a1a1a6/8f8f96
  accent: '#2997ff', // papel do lime do Higgsfield: raro, so acao/foco
  accentSoft: '#8cc6ff',
} as const;

/** 3 duracoes (havia 14 distintas) + 2 easings emprestados do CSS real do Higgsfield. */
export const motion = {
  durFast: '150ms', // hover, focus, toast
  durBase: '250ms', // crossfade poster->video, cards
  durSlow: '400ms', // entradas, cascata (delay 60ms/card)
  easeSwift: 'cubic-bezier(.2,0,0,1)', // padrao de tudo
  easeOutExpo: 'cubic-bezier(.16,1,.3,1)', // entradas em viewport
} as const;

/** Sombras ja existentes no KLP_CSS — replicadas para uso fora da landing. */
export const shadow = {
  card: 'inset 0 1px 0 rgba(255,255,255,.045),0 18px 44px -30px rgba(0,0,0,.95)',
  cta: '0 1px 0 rgba(255,255,255,.5) inset,0 10px 28px -12px rgba(255,255,255,.32)',
} as const;

/** Tipografia: mesmas familias do Higgsfield (Inter/Space Grotesk), ja no layout.tsx. */
export const font = {
  ui: 'var(--font-inter), system-ui, -apple-system, sans-serif',
  display: 'var(--font-display), var(--font-inter), system-ui, sans-serif',
} as const;

export const uiTokens = { radius, color, motion, shadow, font } as const;
export type UiTokens = typeof uiTokens;
