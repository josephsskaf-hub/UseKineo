// The allowance is checked against app/api/enhance/route.ts by the pricing guard.
export const STUDIO_HD_ENHANCES_PER_MONTH = 2

export function studioIncludedPerks(savedCharacters?: number) {
  return [
    ...(savedCharacters ? [`Save up to ${savedCharacters} reusable characters`] : []),
    `${STUDIO_HD_ENHANCES_PER_MONTH} free HD enhances a month`,
  ]
}
