// KINEO-MCP-PAGINA-2026-09-30 — paleta ÚNICA da /claude-connector (página MCP no molde Buzzy/Higgsfield).
// Escura como as dos concorrentes; nenhuma cor digitada solta nos componentes — page.tsx, ConnectPanel.tsx,
// PresetFilter.tsx e ClientGlyphs.tsx leem daqui. Mexeu num tom, mexe só aqui.
export const MCP_PALETTE = {
  bg: '#000000',
  surface: '#0e0e10',
  card: '#161618',
  cardHi: '#1c1c1f',
  line: '#2a2a2d',
  lineSoft: '#1f1f22',
  code: '#0b0b0c',
  text: '#f5f5f7',
  body: '#d2d2d7',
  muted: '#86868b',
  accent: '#2997ff',
  accentSoft: 'rgba(41,151,255,0.14)',
  accentLine: 'rgba(41,151,255,0.4)',
  onAccent: '#ffffff',
  ok: '#30d158',
  okLine: 'rgba(48,209,88,0.4)',
  warn: '#ffb340',
  overlay: 'rgba(0,0,0,0.62)',
  shadow: '0 8px 24px rgba(0,0,0,0.45)',
  heroGlow: 'radial-gradient(60% 55% at 50% 0%, rgba(41,151,255,0.22), rgba(41,151,255,0) 70%)',
  placeholder: 'linear-gradient(135deg, #0b1a2e, #12324f 55%, #2997ff)',
  // Glifos dos clientes (desenho próprio, sem arquivo de logo de terceiros).
  glyphClaude: '#e08a6b',
  glyphChatgpt: '#d2d2d7',
  glyphCursor: '#f5f5f7',
  glyphCode: '#30d158',
  glyphOther: '#2997ff',
} as const

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
