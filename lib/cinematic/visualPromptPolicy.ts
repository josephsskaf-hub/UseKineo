// One visual contract for the classic clip, its still and its safe fallback.
// Pure/deterministic: no provider calls, narration rewriting or new model cost.
import { aspectSpec } from '../aspect'
import { applyStyleAnchor, buildStoryScenePrompt, textSafetySuffix, type StyleAnchor } from './sceneStyle'
import type { VisualMode } from './visualMode'

export interface VisualPromptPolicy {
  mode: VisualMode
  style: StyleAnchor
  character?: string | null
  aspect?: string | null
  eraSuffix?: string
  opening?: boolean
}

// Preserve the classic faceless identity guard. Story/presenter requests do not
// run through it: deleting the requested protagonist contradicted those modes.
const PERSON_NOUN_RE = /\b(?:(?:a|an|the)\s+)?(?:(?:random|generic|young|old|asian|white|black|european|american|middle[-\s]?aged)\s+)*(?:businessman|businesswoman|man|woman|men|women|person|persons|people|guy|guys|boy|boys|girl|girls|lady|ladies|gentleman|ceo|entrepreneur|trader|crowd|family|child|children|kid|kids|student|students)s?\b/gi
const NAMED_TITLE_RE = /\b(?:[Ee]mperor|[Gg]eneral|[Mm]arshal|[Kk]ing|[Qq]ueen|[Tt]sar|[Cc]zar|[Pp]resident|[Cc]ommander|[Cc]olonel|[Aa]dmiral|[Cc]aptain|[Dd]uke|[Ll]ord|[Ss]ir|[Kk]aiser|[Pp]haraoh)\s+[A-Z][\w'-]+/g
const NAMED_FIGURE_RE = /\b(?:napoleon(?:\s+bonaparte)?|bonaparte|wellington|hitler|stalin|churchill|caesar|cleopatra|genghis\s+khan|alexander\s+the\s+great|abraham\s+lincoln|george\s+washington|joan\s+of\s+arc)\b/gi

export function isStylizedLook(style: StyleAnchor): boolean {
  return style.look === 'animated3d' || style.look === 'anime' || style.look === 'illustration'
}

/** No blanket people ban: faceless means no foreground face or presenter. */
export function classicVisualNegativePrompt(mode: VisualMode, stylized: boolean): string {
  const format = mode === 'presenter' ? ''
    : mode === 'character_story' ? 'talking head, looking directly into the camera, '
      : 'foreground human face, close-up portrait, talking head, presenter, '
  const look = stylized ? '' : 'cartoon, anime, illustration, 3d render, '
  return format + look + 'blur, distort, low quality, watermark, text, logo, caption'
}

/** Remove stale hard-coded orientation instructions, not the scene content. */
export function applyVisualFraming(prompt: string, aspect?: string | null): string {
  const frame = aspectSpec(aspect)
  return prompt
    .replace(/(?:\b(?:vertical|widescreen|square|portrait|landscape)\s+)*\b(?:9:16|16:9|1:1|4:5)(?:\s+(?:vertical|widescreen|square|portrait|landscape|cinematic|framing|composition))*/gi, frame.promptFraming)
}

/** Shared direction for the existing description call; no additional LLM call. */
export function visualDescriptionDirection(policy: VisualPromptPolicy): string {
  const mode = policy.mode === 'documentary_faceless'
    ? 'Faceless visual storytelling: environments, objects, hands or distant silhouettes; no foreground face or unrelated presenter.'
    : policy.mode === 'character_story'
      ? 'Show the described characters and actions. Preserve their identity and design; they do not address the camera.'
      : 'Preserve the explicitly requested on-screen presenter and setting; do not replace the subject with an empty landscape.'
  return `${mode} ${policy.style.lookPhrase}. ${policy.style.suffix}. ${aspectSpec(policy.aspect).promptFraming}.`
}

export function buildClassicVisualPrompt(visual: string, policy: VisualPromptPolicy): string {
  let prompt: string
  if (policy.mode !== 'documentary_faceless') {
    prompt = buildStoryScenePrompt(visual, policy.style, policy.character ?? null)
  } else {
    const subject = (visual || '')
      .replace(NAMED_FIGURE_RE, 'a distant silhouetted figure seen from behind')
      .replace(NAMED_TITLE_RE, 'a distant silhouetted figure seen from behind')
      .replace(PERSON_NOUN_RE, ' ')
      .replace(/\s+/g, ' ').replace(/^[\s,.;:–-]+/, '').trim()
    prompt = applyStyleAnchor(
      `${subject || 'the described story setting'}, faceless cinematic b-roll, ` +
      'focus on the described subject and its environment, no foreground human faces, ' +
      'photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, ' +
      'subject clearly framed with the lower third clear for captions, no text, no watermark, no logo',
      policy.style,
    )
  }
  const opening = policy.opening
    ? 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. '
    : ''
  // Non-speaking illustration is not an avatar/lip-sync claim.
  const performance = policy.mode === 'character_story' ? ', characters act naturally within the scene without addressing the viewer' : ''
  return opening + applyVisualFraming(prompt, policy.aspect) + performance +
    (policy.eraSuffix || '') + textSafetySuffix(visual) + `, ${aspectSpec(policy.aspect).promptFraming}`
}
