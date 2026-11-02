// KINEO-CASA-FICHA-SEM-LETRAS-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — revisão dos 20 vídeos do dia
// da casa (Seedance 1.5, 60 s, "Use my script as is", nota média 5,4): (1) a palavra solta virava a imagem ("3D models" → trem de
// brinquedo, "winged shoe" → salto alto dourado, "Earhart" → homem, casal vitoriano andando seco no fundo do Issyk-Kul); (2) época e
// lugar errados (Basílica de São Pedro em 392, Capitólio dos EUA na posse do JK, pinheiral como Amazônia, cruzes e caubói no
// Cazaquistão do séc. I, poste elétrico em 1845 e em Pompeia); (3) letra e número inventados na tela (placar sem sentido,
// "11.350 × 11.450" num empate, "Erik's Ihord") e o TRUMP na cena final sem estar no roteiro (risco de marca).
// O escritor de cenas só via a frase da cena como "o sujeito LITERAL", e nada no prompt dizia ONDE e QUANDO o filme acontece.
// Fundador (02/11): o conserto é UNIVERSAL — todo motor que gera imagem a partir de prompt recebe a MESMA regra, deste arquivo:
//   · lerCenarioDoFilme: UMA leitura semântica do roteiro inteiro (gpt-4o-mini, temperatura 0, json_schema, prazo 4 s + 1 tentativa
//     extra dentro de 6 s) → "era; lugar; povo/cultura" numa frase curta em inglês. Erro/prazo/JSON inválido/sem chave = null (o filme
//     segue sem a frase de cenário — nunca bloqueia, nunca inventa).
//   · regrasDoCenarioDoFilme: o bloco que os ESCRITORES de cena (descritor clássico e planejador hollywood) leem.
//   · comCenarioDoFilme: a cauda que vai no prompt FINAL de cada cena (still e clipe), em texto — o Seedance 1.5, o H3, o Omni e o
//     Seedance 2.5 não têm negative_prompt (lição de 56d361968/3c5c487c5: nunca mandar campo que o schema não tem).
//   · comCenarioNoKling4: a mesma regra, compacta, só se couber no orçamento de 512 do Kling 4 (com folga para o sujeito do pedido).
// Nenhuma lista de palavras, nenhum classificador por regex: o sentido vem da leitura e do escritor.
import { AI_TEXT_MODELS } from '@/lib/aiModels'

export const CENARIO_DO_FILME_VERSAO = 'casa_ficha_sem_letras_0211_v1' as const
export const CENARIO_PRAZO_MS = 4_000
export const CENARIO_ENTRADA_MAX = 6_000
export const CENARIO_MAX_CHARS = 180

/** Proibição de letra/número/placar e de figura pública fora do roteiro — a frase única de todos os motores. */
export const SEM_LETRAS_NEM_FIGURAS =
  'No text, letters, numbers, signs or scoreboards anywhere in the frame. Unnamed people are anonymous ordinary people, never a recognisable politician or celebrity.'
/** Quando o prompt já traz a proibição de texto do motor (NO_READABLE_TEXT_SUFFIX / NO_TEXT_SUFFIX): só o que faltava nela. */
export const SEM_NUMEROS_NEM_FIGURAS =
  'No numbers or scoreboards either. Unnamed people are anonymous ordinary people, never a recognisable politician or celebrity.'
const JA_PROIBE_TEXTO_RE = /\bno readable text\b/i

export const CENARIO_SISTEMA = `You read the full script of a short video and state, once, WHERE and WHEN the whole film happens. Reply with JSON only.
"setting": one short English phrase (max 25 words) with the era (year, century or "present day"), the place (country, region, city or landmark) and the people/culture of the story, in the form "<place>, <era>; <people/culture>".
Rules: use only what the script states or clearly implies; a real event or person implies its real era and place. If the script gives no era, the era is "present day". If the story is set in an invented or fantasy world, describe that world in a few words. Never add a landmark, building or person the script does not imply. If the text is not a story at all, return an empty string.`

export const CENARIO_SCHEMA = {
  name: 'film_setting',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: { setting: { type: 'string' } },
    required: ['setting'],
  },
} as const

const limpa = (s: unknown) => String(s ?? '').replace(/[\u0000-\u001f\u007f"“”]+/g, ' ').replace(/\s+/g, ' ').trim()

/** A frase de cenário saneada (uma linha, sem aspas, sem ponto final, ≤ 180 caracteres em fronteira de palavra); null = sem cenário. */
export function cenarioSaneado(raw: unknown): string | null {
  let s = limpa(raw).replace(/[\s.;,:]+$/, '')
  if (s.length < 3 || /^(?:unknown|none|n\/?a|null|not specified)$/i.test(s)) return null
  if (s.length > CENARIO_MAX_CHARS) s = s.slice(0, CENARIO_MAX_CHARS).replace(/\s+\S*$/, '').replace(/[\s.;,:]+$/, '')
  return s || null
}

export interface LeituraDoCenario { cenario: string | null; erro: string | null; ms: number; tentativas: number }
export interface OpcoesDoCenario { fetchImpl?: typeof fetch; apiKey?: string; prazoMs?: number; prazoTotalMs?: number }

/** UMA leitura do roteiro inteiro. Nunca lança: falha = { cenario: null, erro }. */
export async function lerCenarioDoFilme(roteiro: string, opts: OpcoesDoCenario = {}): Promise<LeituraDoCenario> {
  const inicio = Date.now()
  const texto = String(roteiro ?? '').trim().slice(0, CENARIO_ENTRADA_MAX)
  if (!texto) return { cenario: null, erro: 'sem_texto', ms: 0, tentativas: 0 }
  const key = opts.apiKey ?? process.env.OPENAI_API_KEY
  if (!key) return { cenario: null, erro: 'sem_chave', ms: 0, tentativas: 0 }
  const doFetch = opts.fetchImpl ?? fetch
  const prazo = Math.max(500, opts.prazoMs ?? CENARIO_PRAZO_MS)
  const total = Math.max(prazo, opts.prazoTotalMs ?? 6_000)
  let erro: string | null = null
  let tentativas = 0
  while (tentativas < 2) {
    const resta = total - (Date.now() - inicio)
    if (tentativas > 0 && resta < 1_200) break
    tentativas += 1
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), Math.min(prazo, Math.max(500, resta)))
    try {
      const res = await doFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: AI_TEXT_MODELS.utility,
          temperature: 0,
          max_tokens: 120,
          response_format: { type: 'json_schema', json_schema: CENARIO_SCHEMA },
          messages: [{ role: 'system', content: CENARIO_SISTEMA }, { role: 'user', content: `Script:\n${texto}` }],
        }),
      })
      if (!res.ok) { erro = `http_${res.status}`; if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) break; continue }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      let setting: unknown = null
      try { setting = (JSON.parse(data.choices?.[0]?.message?.content ?? '') as { setting?: unknown }).setting } catch { erro = 'json'; continue }
      return { cenario: cenarioSaneado(setting), erro: null, ms: Date.now() - inicio, tentativas }
    } catch (e) {
      erro = ctrl.signal.aborted || (e instanceof Error && e.name === 'AbortError') ? 'timeout' : 'rede'
    } finally {
      clearTimeout(timer)
    }
  }
  return { cenario: null, erro: erro ?? 'rede', ms: Date.now() - inicio, tentativas }
}

/** As regras que o ESCRITOR de cenas lê (linhas "- ..."). Com cenário lido, ele vai escrito; sem, o escritor o tira do roteiro. */
export function regrasDoCenarioDoFilme(cenario: string | null): string {
  return [
    `- FILM SETTING (KINEO-CASA-FICHA-0211): the whole film happens in ONE setting read from the WHOLE script — its era, its place and its people/culture${cenario ? ` (${cenario})` : ''}. Architecture, clothing, vehicles, tools, light sources, religious symbols, plants and landscape must exist in that era and place: nothing built or invented later, nothing from another country, climate or religion.`,
    "- Show what each narration line MEANS in the context of the whole script, never a loose word taken literally: a person named in the script keeps that person's gender, age and era; a technical or figurative term is shown as what it means in the story, never as a toy, a prop or an unrelated object; never add people, couples, crowds or events the script does not mention.",
    '- No on-screen text, letters, numbers, signs, posters, inscriptions or scoreboards; no real public figure, politician or celebrity who is not named in the script.',
  ].join('\n')
}

/** A frase de cenário que vai no prompt final ('' sem cenário). */
export function fraseDoCenario(cenario: string | null): string {
  const c = cenarioSaneado(cenario)
  return c ? `Setting of the whole film: ${c} — architecture, clothing, objects and technology true to that era and place.` : ''
}

/** A cauda exata que comCenarioDoFilme acrescenta a este prompt ('' = nada a acrescentar). */
function caudaDoCenario(prompt: string, cenario: string | null): string {
  const partes: string[] = []
  const frase = fraseDoCenario(cenario)
  if (frase && !prompt.includes(frase)) partes.push(frase)
  if (!prompt.includes(SEM_LETRAS_NEM_FIGURAS) && !prompt.includes(SEM_NUMEROS_NEM_FIGURAS)) partes.push(JA_PROIBE_TEXTO_RE.test(prompt) ? SEM_NUMEROS_NEM_FIGURAS : SEM_LETRAS_NEM_FIGURAS)
  return partes.join(' ')
}

/** O prompt final da cena com o cenário do filme e a proibição de letra/figura pública, no FIM (a 1ª frase continua sendo a ação).
 *  Idempotente: rodar duas vezes devolve o mesmo texto. */
export function comCenarioDoFilme(prompt: string, cenario: string | null): string {
  const p = String(prompt ?? '')
  const cauda = caudaDoCenario(p, cenario)
  if (!cauda) return p
  return `${p.replace(/[\s,.]+$/, '')}. ${cauda}`
}

/** O prompt sem a cauda desta camada (para quem precisa recompactar, como o Kling 4). */
export function semCenarioDoFilme(prompt: string, cenario: string | null): string {
  const p = String(prompt ?? '')
  const frase = fraseDoCenario(cenario)
  const regras = [SEM_LETRAS_NEM_FIGURAS, SEM_NUMEROS_NEM_FIGURAS]
  const caudas = [...(frase ? regras.map((r) => `${frase} ${r}`) : []), ...regras, frase] // a mais longa primeiro
  for (const cauda of caudas) {
    const i = cauda ? p.lastIndexOf(`. ${cauda}`) : -1
    if (i >= 0) return p.slice(0, i) + p.slice(i + cauda.length + 2) // camada posterior que acrescentou depois da cauda (desenho infantil) fica
  }
  return p
}

/** Kling 4 (teto de 512 code points por cena): a regra compacta entra antes da cauda "Mouth closed", só se couber no orçamento
 *  com folga para o sujeito do pedido (60 ≈ a cláusula "Main subject clearly visible in frame: …"); senão cenário + figura pública; senão só o cenário; senão a cena fica como estava (nunca corta a ação). */
export function comCenarioNoKling4(prompt: string, cenario: string | null, orcamento: number, folga = 60): string {
  const len = (s: string) => Array.from(s).length
  const c = cenarioSaneado(cenario)
  const regra = 'No numbers or scoreboards; unnamed people are anonymous, never a real celebrity or politician.'
  const cauda = ' Mouth closed, no speaking.'
  const corpo = prompt.endsWith(cauda) ? prompt.slice(0, -cauda.length) : prompt
  const fim = prompt.endsWith(cauda) ? cauda : ''
  for (const extra of [c ? `Setting: ${c}. ${regra}` : regra, c ? `Setting: ${c}. No real celebrities or politicians.` : '', c ? `Setting: ${c}.` : '']) {
    if (!extra || prompt.includes(extra)) continue
    const novo = `${corpo.replace(/[\s,.]+$/, '')}. ${extra}${fim}`
    if (len(novo) <= orcamento - folga) return novo
  }
  return prompt
}

const FRASE_DO_CENARIO_RE = /Setting of the whole film: (.+?) — architecture, clothing, objects and technology true to that era and place\./
/** A cauda desta camada no prompt (a frase que comCenarioDoFilme escreveu): tem = há cauda; cenario = o que ela diz (null = só a regra). */
export function caudaDoCenarioNoPrompt(prompt: string): { tem: boolean; cenario: string | null } {
  const p = String(prompt ?? '')
  const cenario = FRASE_DO_CENARIO_RE.exec(p)?.[1] ?? null
  return { tem: !!cenario || p.includes(SEM_LETRAS_NEM_FIGURAS) || p.includes(SEM_NUMEROS_NEM_FIGURAS), cenario }
}
