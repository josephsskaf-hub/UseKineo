import { openai } from '@/lib/openai'
import type { BrollScene } from './types'

// Generic terms that indicate a low-quality, non-specific broll prompt.
// Each match deducts 10 points from the raw cosine similarity score.
const GENERIC_TERMS = [
  'city skyline',
  'people walking',
  'ai robot',
  'money falling',
  'generic',
  'random',
  'business meeting',
  'abstract',
]

/**
 * Compute cosine similarity between two embedding vectors.
 * Returns a value in [-1, 1]. Two identical vectors → 1.0.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  if (denom === 0) return 0
  return dot / denom
}

/**
 * Get embeddings for a piece of text using text-embedding-3-small.
 * Throws if the API call fails — callers should catch and handle.
 */
async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create(
    {
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // API limit safety
    },
    { timeout: 15000, maxRetries: 0 },
  )
  return res.data[0]?.embedding ?? []
}

/**
 * Score how semantically relevant a brollPrompt is to the narration.
 *
 * Algorithm:
 * 1. Get embeddings for narration and brollPrompt via text-embedding-3-small
 * 2. Compute cosine similarity → raw score in [-1, 1]
 * 3. Normalize to [0, 100]
 * 4. Subtract 10 for each generic term found in the brollPrompt
 * 5. Clamp to [0, 100]
 *
 * PUSH #93 — returns null (NOT a number) when the score could not be computed.
 * The old code returned 75 on any embedding failure. Because the regeneration
 * gate in app/api/generate-broll-plan/route.ts is `relevanceScore < 70`, a
 * fabricated 75 silently marked EVERY unscorable scene as "good enough", so an
 * embedding outage disabled the whole quality loop with zero visible signal.
 * null means "not scored" and is never confused with a genuine good score.
 */
export async function scoreRelevance(
  narration: string,
  brollPrompt: string,
): Promise<number | null> {
  try {
    const [narrationEmbed, promptEmbed] = await Promise.all([
      embed(narration),
      embed(brollPrompt),
    ])

    if (narrationEmbed.length === 0 || promptEmbed.length === 0) {
      // PUSH #93 — empty embedding vector is a failure, not a neutral score.
      console.error('[relevance-score] embeddings API returned an empty vector — scene left unscored')
      return null
    }

    const similarity = cosineSimilarity(narrationEmbed, promptEmbed)

    // Normalize from [-1, 1] to [0, 100]
    let score = ((similarity + 1) / 2) * 100

    // Apply penalty for generic terms (case-insensitive)
    const lowerPrompt = brollPrompt.toLowerCase()
    for (const term of GENERIC_TERMS) {
      if (lowerPrompt.includes(term)) {
        score -= 10
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[relevance-score] embeddings API failed:', msg)
    // PUSH #93 — was `return 75`, which is above the REGEN_THRESHOLD of 70 and
    // therefore read downstream as "this scene is fine". null = unknown.
    return null
  }
}

/**
 * Score all scenes in parallel and return them with relevanceScore populated.
 * Runs all embed calls concurrently via Promise.all for efficiency.
 *
 * PUSH #93 — chosen middle behaviour on scoring failure:
 *   - relevanceScore is left UNDEFINED (never a made-up number), and
 *     relevanceUnscored is set to true so the failure is visible to the route,
 *     the telemetry and the UI;
 *   - an unscored scene is NOT auto-regenerated. Regeneration is only
 *     meaningful when we can measure whether it improved anything; during a
 *     total embedding outage the re-score would fail too, so regenerating
 *     everything would just burn MAX_RETRIES x N GPT calls and risk a 504
 *     without any quality gain.
 * Net effect: no silent "75", no regeneration storm, and the caller can report
 * that the quality gate did not run.
 */
export async function scoreAllScenes(scenes: BrollScene[]): Promise<BrollScene[]> {
  const scores = await Promise.all(
    scenes.map((scene) => scoreRelevance(scene.narration, scene.brollPrompt)),
  )
  // PUSH #93 — log the aggregate failure once; individual failures already log.
  const failed = scores.filter((s) => s === null).length
  if (failed > 0) {
    console.error(
      `[relevance-score] ${failed}/${scenes.length} scenes could not be scored — relevance quality gate SKIPPED for those scenes`,
    )
  }
  return scenes.map((scene, i) => ({
    ...scene,
    relevanceScore: scores[i] ?? undefined,
    relevanceUnscored: scores[i] === null ? true : undefined,
  }))
}
