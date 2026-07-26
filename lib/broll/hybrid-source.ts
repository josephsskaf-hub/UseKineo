import type { BrollScene, VisualSource } from './types'

// Keywords in brollPrompt that signal AI generation is preferred because
// stock footage libraries rarely have these subjects.
const AI_PREFERRED_KEYWORDS = [
  'underground',
  'hidden',
  'secret',
  'ancient',
  'futuristic',
  'fantasy',
  'mystery',
  'ghost',
  'alien',
  'magic',
  'impossible',
]

/**
 * PUSH #94 — a scene is "unscored" when the embeddings relevance gate could not
 * run for it (see scoreAllScenes in lib/broll/relevance-score.ts, PUSH #93).
 * relevanceScore is then undefined and relevanceUnscored is true. Treated as a
 * THIRD state, never folded into either end of the scale.
 */
function isUnscored(scene: BrollScene): boolean {
  return scene.relevanceUnscored === true || typeof scene.relevanceScore !== 'number'
}

/**
 * Decide whether a scene should use AI video generation or stock footage.
 *
 * Rules (evaluated in order, first match wins):
 * 1. Hook scene with a KNOWN relevanceScore < 75 → AI (stock won't be specific enough)
 * 2. Any AI_PREFERRED_KEYWORD found in brollPrompt or keywords → AI
 * 3. visualMood is 'mysterious' or 'futuristic' → AI preferred
 * 4. Otherwise → stock
 *
 * PUSH #94 — an UNSCORED scene is excluded from rule 1 entirely; rules 2-4 still
 * apply, so the scene passes through unchanged rather than being forced either way.
 */
export function shouldUseAI(scene: BrollScene): boolean {
  // Rule 1: low-relevance hook.
  //
  // PUSH #94 — was `(scene.relevanceScore ?? 100) < 75`. The `?? 100` made an
  // UNSCORED scene look maximally relevant, i.e. an embeddings outage rendered
  // as flawless quality and silently disabled this gate — the same class of bug
  // as the fabricated 75 removed in PUSH #93, but with a worse default.
  // Flipping it to `?? 0` would be equally wrong in the other direction: every
  // hook would be routed to AI generation during an outage, which is exactly the
  // mass-regeneration / 504 storm #93 explicitly avoided.
  // So: unscored scenes skip the gate. Known-low hooks still route to AI.
  if (
    scene.scenePurpose === 'hook' &&
    !isUnscored(scene) &&
    (scene.relevanceScore as number) < 75
  ) {
    return true
  }

  // Rule 2: AI-preferred keyword present in brollPrompt or keywords array
  const searchText = [
    scene.brollPrompt.toLowerCase(),
    ...(scene.keywords ?? []).map((k) => k.toLowerCase()),
  ].join(' ')

  for (const kw of AI_PREFERRED_KEYWORDS) {
    if (searchText.includes(kw)) return true
  }

  // Rule 3: mood signals content that stock footage can't capture well
  if (scene.visualMood === 'mysterious' || scene.visualMood === 'futuristic') {
    return true
  }

  return false
}

/**
 * Assign the `source` field to every scene in the array.
 * Returns a new array (does not mutate input).
 */
export function assignSources(scenes: BrollScene[]): BrollScene[] {
  // PUSH #94 — log the skipped gate ONCE for the whole plan, mirroring the
  // aggregate log in scoreAllScenes (lib/broll/relevance-score.ts, PUSH #93).
  // Only hooks are affected, since rule 1 is the only relevance-gated rule.
  const unscoredHooks = scenes.filter((s) => s.scenePurpose === 'hook' && isUnscored(s))
  if (unscoredHooks.length > 0) {
    console.warn(
      `[hybrid-source] ${unscoredHooks.length} hook scene(s) have no relevance score ` +
        `(scene(s) ${unscoredHooks.map((s) => s.sceneNumber).join(', ')}) — ` +
        `low-relevance AI gate SKIPPED for them; source decided by keyword/mood rules only`,
    )
  }

  return scenes.map((scene) => ({
    ...scene,
    // PUSH #94 — was 'pexels'. Pexels is switched off repo-wide; lib/pixabay.ts
    // is the live stock module. Matches broll-engine.ts (PUSH #93) and the
    // existing `stock` entry in SOURCE_BADGE (components/video/SceneCard.tsx).
    // Verified: 'stock' is a member of the VisualSource union in ./types, and no
    // consumer in the repo compares `.source === 'pexels'`.
    source: (shouldUseAI(scene) ? 'ai' : 'stock') as VisualSource,
  }))
}
