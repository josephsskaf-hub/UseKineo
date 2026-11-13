// Responsive layout cohort, not a claim about the person's physical device.
export function watchViewportMetadata(width: unknown): { ui_layout: 'mobile'|'desktop'|'unknown'; viewport_width?: number } {
  if(typeof width!=='number'||!Number.isFinite(width)||width<=0)return {ui_layout:'unknown'}
  return {ui_layout:width<=760?'mobile':'desktop',viewport_width:Math.round(width)}
}
