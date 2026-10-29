// KINEO-QUALIDADE-TODOS-MOTORES-2910 — frozen visual identity, independent of dispatch engine. Pure; no casting or provider calls.
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { deriveStyleAnchor, type StyleAnchor } from '@/lib/cinematic/sceneStyle'

export const FILM_QUALITY_SNAPSHOT_VERSION = 'film_quality_2910_v1' as const
export interface FilmQualitySnapshot {
  version: typeof FILM_QUALITY_SNAPSHOT_VERSION
  sourceGenerationId: string
  characters: FichaDePersonagem[]
  style: StyleAnchor | null
  characterReferences: Array<{ nome: string; url: string }>
  approvedStills: Array<{ url: string; prompt: string; voiceover: string; characterNames: string[] }>
  characterSheet: string | null
  styleSheet: string | null
  environmentSheet: string | null
  portraitUrl: string | null
  environmentUrl: string | null
  provenance: 'snapshot' | 'legacy_birth'
  missing: string[]
}

type RecordValue = Record<string, unknown>
const record = (v: unknown): RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {}
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : []
const text = (v: unknown): string => typeof v === 'string' ? v.trim() : ''
const https = (v: unknown): string | null => /^https:\/\/[^\s]+$/i.test(text(v)) ? text(v) : null
const strings = (v: unknown): string[] => array(v).map(text).filter(Boolean)

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — read only persisted descriptions; missing fields never trigger a new character design.
function characters(value: unknown): FichaDePersonagem[] {
  return array(value).slice(0, 12).flatMap(value => {
    const f = record(value)
    if (!text(f.nome) || !text(f.canonica) || !['humano', 'animal', 'criatura'].includes(text(f.tipo))) return []
    return [{ nome: text(f.nome), nucleo: text(f.nucleo) || text(f.nome), tipo: f.tipo as FichaDePersonagem['tipo'],
      canonica: text(f.canonica), origem: ['autor', 'deterministica', 'modelo'].includes(text(f.origem)) ? f.origem as FichaDePersonagem['origem'] : 'autor',
      protagonista: f.protagonista === true, genero: f.genero === 'man' || f.genero === 'woman' ? f.genero : null }]
  })
}

export function readFilmQualitySnapshot(value: unknown): FilmQualitySnapshot | null {
  const s = record(value)
  if (s.version !== FILM_QUALITY_SNAPSHOT_VERSION || !text(s.sourceGenerationId)) return null
  const look = record(s.style)
  const style = ['photoreal', 'animated3d', 'anime', 'illustration', 'noir'].includes(text(look.look)) && text(look.suffix) && text(look.lookPhrase)
    ? { look: look.look as StyleAnchor['look'], suffix: text(look.suffix), lookPhrase: text(look.lookPhrase) } : null
  return {
    version: FILM_QUALITY_SNAPSHOT_VERSION, sourceGenerationId: text(s.sourceGenerationId), characters: characters(s.characters), style,
    characterReferences: array(s.characterReferences).slice(0, 12).flatMap(value => { const r = record(value), url = https(r.url); return text(r.nome) && url ? [{ nome: text(r.nome), url }] : [] }),
    approvedStills: array(s.approvedStills).slice(0, 60).flatMap(value => { const r = record(value), url = https(r.url); return url ? [{ url, prompt: text(r.prompt), voiceover: text(r.voiceover), characterNames: strings(r.characterNames) }] : [] }),
    characterSheet: text(s.characterSheet) || null, styleSheet: text(s.styleSheet) || null, environmentSheet: text(s.environmentSheet) || null,
    portraitUrl: https(s.portraitUrl), environmentUrl: https(s.environmentUrl),
    provenance: s.provenance === 'legacy_birth' ? 'legacy_birth' : 'snapshot', missing: strings(s.missing),
  }
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — old claims omitted canonical sheets. Recover exact saved prompt clauses, never re-cast.
function legacyCharacters(response: RecordValue, sheetEvents: readonly RecordValue[], prompts: string[]): FichaDePersonagem[] {
  const persisted = characters(response.character_sheet ?? record(response.personagem).elenco)
  if (persisted.length) return persisted
  const reports = [record(response.personagem), ...sheetEvents]
  const names = reports.flatMap(r => array(r.elenco).map(record))
  const clauses = prompts.flatMap(prompt => [...prompt.matchAll(/(?:The same main character appears in this scene, consistent design:|Main character, consistent design:)\s*([^\n]+?)(?:\.(?=\s*(?:,|$))|$)/g)].map(m => m[1].trim()))
  return names.flatMap((entry, i) => {
    const name = text(entry.nome)
    const canonical = text(entry.canonica) || clauses.find(clause => clause.toLowerCase().startsWith(name.toLowerCase() + ',')) || ''
    return canonical ? characters([{ ...entry, nucleo: entry.nucleo || name, canonica: canonical, protagonista: i === 0 }]) : []
  }).filter((f, i, all) => all.findIndex(other => other.nome === f.nome) === i)
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — approval follows the selected URL, never merely the scene number or an earlier PASS.
function approvedLegacyUrl(url: string, critics: readonly RecordValue[]): boolean {
  return critics.some(r => text(r.url_final) === url && array(r.tentativas).some(value => {
    const a = record(value)
    return a.n === r.escolhida_tentativa && text(a.url) === url && a.veredito === 'PASS'
  }))
}

export function filmQualityFromBirth(args: {
  sourceGenerationId: string; response: unknown; sheetEvents?: readonly RecordValue[]; criticEvents?: readonly RecordValue[]
}): FilmQualitySnapshot {
  const response = record(args.response)
  const saved = readFilmQualitySnapshot(response.quality_snapshot)
  if (saved && saved.sourceGenerationId === args.sourceGenerationId) return saved
  const trialScenes = array(record(response.kling4_trial).scene_plan).map(record)
  const fallback = record(record(response.kling4_trial).fallback_response)
  const prompts = trialScenes.length ? trialScenes.map(s => text(s.prompt)) : array(response.scene_prompts ?? fallback.scene_prompts).map(text)
  const inputs = array(response.scene_fal_inputs).map(record)
  const narrations = array(response.scene_narrations).map(text)
  const cast = legacyCharacters(response, args.sheetEvents ?? [], prompts)
  const recordedNames = [record(response.personagem), ...(args.sheetEvents ?? [])].flatMap(r => array(r.elenco).map(value => text(record(value).nome))).filter(Boolean)
  const approvedStills = trialScenes.length
    // Birth stores only approvedKling4TrialStills here (exact selected URL + PASS).
    ? trialScenes.flatMap(s => { const url = https(s.still_url); return url ? [{ url, prompt: text(s.prompt), voiceover: text(s.text), characterNames: cast.filter(f => text(s.prompt).includes(f.canonica)).map(f => f.nome) }] : [] })
    : prompts.flatMap((prompt, i) => {
      const url = https(array(response.scene_anchor_urls)[i]) ?? https(inputs[i]?.image_url)
      return url && approvedLegacyUrl(url, args.criticEvents ?? []) ? [{ url, prompt, voiceover: narrations[i] ?? '', characterNames: cast.filter(f => prompt.includes(f.canonica)).map(f => f.nome) }] : []
    })
  const styleSource = [text(response.style_sheet), ...prompts].filter(Boolean).join('\n')
  return {
    version: FILM_QUALITY_SNAPSHOT_VERSION, sourceGenerationId: args.sourceGenerationId, characters: cast,
    style: styleSource ? deriveStyleAnchor(styleSource) : null, characterReferences: [], approvedStills,
    characterSheet: text(response.character_sheet) || (cast.map(f => f.canonica).join('; ') || null),
    styleSheet: text(response.style_sheet) || null, environmentSheet: text(response.environment_sheet) || null,
    portraitUrl: null, environmentUrl: null, provenance: 'legacy_birth',
    missing: [...(!cast.length ? ['canonical_character_sheet_not_persisted'] : recordedNames.some(name => !cast.some(f => f.nome === name)) ? ['canonical_character_sheet_incomplete'] : []), 'character_reference_urls_not_persisted', ...(!styleSource ? ['style_not_persisted'] : []), ...(!approvedStills.length ? ['approved_stills_not_persisted'] : [])],
  }
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — the existing screenplay call expands the story under the frozen visual bible.
export function filmQualityWriterDirection(snapshot: FilmQualitySnapshot | null): string {
  if (!snapshot) return ''
  const cast = snapshot.characters.map(f => f.canonica).join('; ') || snapshot.characterSheet
  return [snapshot.style ? `Keep this exact visual style in every scene: ${snapshot.style.lookPhrase}. ${snapshot.style.suffix}.` : '',
    cast ? `Keep these existing character designs without recasting: ${cast}.` : '',
    snapshot.environmentSheet ? `Preserve the established setting: ${snapshot.environmentSheet}.` : ''].filter(Boolean).join(' ')
}
