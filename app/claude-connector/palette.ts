// KINEO-MCP-PAGINA-2026-09-30 — paleta ÚNICA da /claude-connector (página MCP no molde Buzzy/Higgsfield).
// (Era escura como as dos concorrentes até 20/10.) Nenhuma cor digitada solta nos componentes — page.tsx, ConnectPanel.tsx,
// PresetFilter.tsx e ClientGlyphs.tsx leem daqui. Mexeu num tom, mexe só aqui.
// KINEO-MCP-STUDIO-AJUSTE-2010 — CLARA, nos tokens da home de hoje (app/kineoLandingTheme.ts, .klp: --bg #F7F7F5, --card #FFF,
// --line #E4E4E0, --txt #0E1116, --muted #5A5F67, --home-action #0A5CFF, --home-wash #EEF3FF). Fundador 20/10: a página
// escura, de vídeos velhos, estava "muito feia". Mesma fonte da home (var(--font-sans) = Manrope, app/layout.tsx).
export const MCP_PALETTE = {
  bg: '#F7F7F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardHi: '#F1F1EE',
  line: '#E4E4E0',
  lineSoft: '#EBEBE7',
  code: '#F1F1EE',
  text: '#0E1116',
  body: '#2A2F37',
  muted: '#5A5F67',
  accent: '#0A5CFF',
  accentSoft: '#E8EFFF',
  accentLine: 'rgba(10,92,255,0.35)',
  onAccent: '#ffffff',
  ok: '#0F7B4F',
  okLine: 'rgba(15,123,79,0.35)',
  okSoft: '#E6F4EC',
  warn: '#A35A00',
  overlay: 'rgba(10,12,18,0.52)',
  onOverlay: '#ffffff',
  shadow: '0 1px 2px rgba(14,17,22,0.03), 0 8px 24px -12px rgba(14,17,22,0.08)',
  shadowHi: '0 1px 2px rgba(10,14,22,0.06), 0 22px 44px -26px rgba(10,14,22,0.45)',
  heroGlow: 'radial-gradient(ellipse 1100px 650px at 0 0, #EEF3FF, rgba(238,243,255,0) 72%)',
  placeholder: 'linear-gradient(135deg, #EEF3FF, #DCE6FF 55%, #B9CCFF)',
  // Glifos dos clientes (desenho próprio, sem arquivo de logo de terceiros).
  glyphClaude: '#D97757',
  glyphChatgpt: '#0E1116',
  glyphCursor: '#0E1116',
  glyphCode: '#0F7B4F',
  glyphOther: '#0A5CFF',
} as const

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
