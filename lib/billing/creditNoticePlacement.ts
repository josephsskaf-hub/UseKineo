type Bounds = { top: number; bottom: number; left: number; right: number }

/** Start in the corner and move above any player or action in the way. */
export function creditNoticeBottom(card: Bounds, protectedAreas: Bounds[], viewportBottom: number, bottomInset: number, viewportTop = 0): number | null {
  const gap = 12
  const height = card.bottom - card.top
  let bottom = viewportBottom - bottomInset
  const sameColumn = protectedAreas.filter((area) => area.left < card.right && area.right > card.left)
    .sort((a, b) => b.bottom - a.bottom)
  for (const area of sameColumn) {
    if (area.top < bottom && area.bottom > bottom - height) bottom = area.top - gap
  }
  return bottom - height >= viewportTop + gap ? viewportBottom - bottom : null
}
