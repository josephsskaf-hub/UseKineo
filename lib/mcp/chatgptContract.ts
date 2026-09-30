import {
  ASPECTS, DURATIONS, ENGINE_LABELS, HANDOFF_ENGINES, HANDOFF_TTL_DAYS, HANDOFF_SHORT_DURATION,
  SCRIPT_MAX_CHARS, STUDIO_PROMPT_MAX_CHARS, engineFamily,
} from '@/lib/gptHandoff'
import type { McpTool } from '@/lib/mcp/kineoMcp'

// An explicit endpoint/profile, not client sniffing. Claude keeps its existing
// contract. Never copy the commercial facts object into the ChatGPT profile.
export const CHATGPT_MCP_INSTRUCTIONS =
  'Kineo prepares narration scripts for video production. kineo_facts returns technical capabilities; ' +
  'create_video_handoff saves a user-approved script and returns its text, word count, duration assessment and Studio link. ' +
  'Saving makes a bearer link: anyone with the link can read the script. The link expires after ' +
  HANDOFF_TTL_DAYS + ' days. Neither tool renders or publishes media.'

const str = { type: 'string' }
const num = { type: 'number' }
const bool = { type: 'boolean' }
const outcomeSchema = {
  type: 'object', additionalProperties: false,
  required: ['kind', 'effectiveSeconds', 'requestedSeconds', 'missingWords', 'lost60sFloor'],
  properties: {
    kind: { enum: ['at_target', 'shorter_film', 'too_short'] },
    effectiveSeconds: num, requestedSeconds: num, missingWords: num, lost60sFloor: bool,
  },
}
const errorSchema = {
  type: 'object', required: ['error'], additionalProperties: false,
  properties: {
    error: str, words: num, outcome: outcomeSchema,
    refusal: { type: 'object', additionalProperties: true },
  },
}
const capabilityProperties = {
  engines: {
    type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['id', 'name', 'family', 'durations'],
      properties: {
        id: str, name: str, family: { enum: ['classic', 'hollywood'] },
        durations: { type: 'array', items: { type: 'integer' } },
      },
    },
  },
  aspects: { type: 'array', items: str },
  scriptMaxChars: { type: 'integer' },
  studioMaxChars: { type: 'integer' },
  behavior: str,
}
export const CHATGPT_FACTS_SCHEMA = {
  type: 'object', oneOf: [
    { type: 'object', additionalProperties: false, properties: capabilityProperties, required: Object.keys(capabilityProperties) },
    errorSchema,
  ],
}
const handoffProperties = {
  url: { type: 'string', format: 'uri' }, expiresAt: { type: 'string', format: 'date-time' },
  script: str, words: { type: 'integer' }, seconds: num, fitMessage: str,
  outcome: outcomeSchema, outcomeMessage: str, durationSec: { type: 'integer' },
  engineHint: str, aspect: str, language: str, overStudioLimit: bool, studioLimitChars: { type: 'integer' },
}
export const CHATGPT_HANDOFF_SCHEMA = {
  type: 'object', oneOf: [
    { type: 'object', additionalProperties: false, properties: handoffProperties, required: Object.keys(handoffProperties) },
    errorSchema,
  ],
}

export function chatgptCapabilities(pausedEngines: readonly string[]): Record<string, unknown> {
  return {
    engines: HANDOFF_ENGINES.filter(e => !pausedEngines.includes(e)).map(id => ({
      id, name: ENGINE_LABELS[id], family: engineFamily(id),
      durations: DURATIONS.filter(seconds => seconds !== HANDOFF_SHORT_DURATION || id === 'seedance'),
    })),
    aspects: [...ASPECTS], scriptMaxChars: SCRIPT_MAX_CHARS, studioMaxChars: STUDIO_PROMPT_MAX_CHARS,
    behavior: 'Prepare a narration script and review its duration assessment. Saving creates a shareable link; rendering is a separate action in an existing Kineo account.',
  }
}

export function chatgptTools(base: McpTool[]): McpTool[] {
  return base.map(tool => {
    const facts = tool.name === 'kineo_facts'
    const title = facts ? 'Get video script capabilities' : 'Save an approved video script'
    return {
      ...tool, title,
      description: facts
        ? 'Returns available video engines, supported frame shapes and durations, and script length limits. Read-only technical information for preparing a video narration.'
        : 'Saves the narration the user approved. Returns the full script, server word count, duration assessment and a shareable Kineo Studio link. Anyone with the link can read it. The link expires after ' +
          HANDOFF_TTL_DAYS + ' days. Does not render, publish or charge. Existing Kineo accounts can open the script in Studio.',
      inputSchema: facts ? { type: 'object', properties: {}, additionalProperties: false } : tool.inputSchema,
      outputSchema: facts ? CHATGPT_FACTS_SCHEMA : CHATGPT_HANDOFF_SCHEMA,
      annotations: { ...tool.annotations, title },
      securitySchemes: [{ type: 'noauth' }],
      _meta: { securitySchemes: [{ type: 'noauth' }] },
    }
  })
}
