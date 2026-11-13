// KINEO-NOTA-AUTO-1MIN-1311 — o juiz de visão da nota automática com o PROVEDOR TROCÁVEL (pedido da CEO, 13/11/2026 16:42).
//
// Uma interface só: chamarVisaoJson({ system, content }) → JSON + custo. Dois provedores:
//   · 'openai'  — chat.completions da OpenAI com a chave que já existe (OPENAI_API_KEY). Padrão.
//   · 'gateway' — Claude pelo Vercel AI Gateway, no formato da Messages API da Anthropic (POST /v1/messages).
// Autenticação do gateway (documentação da Vercel, conferida em 13/11: vercel.com/docs/ai-gateway/authentication-and-byok/oidc):
//   AI_GATEWAY_API_KEY, se existir, tem precedência; senão o token OIDC da implantação, que DENTRO de uma função implantada
//   chega no cabeçalho `x-vercel-oidc-token` da requisição (VERCEL_OIDC_TOKEN só existe no ambiente local via `vercel env pull`).
//   Por isso quem chama passa o token lido da requisição (tokenDoGateway(req)).
// HTTP direto (fetch), sem o SDK da Anthropic: o projeto não tem @anthropic-ai/sdk instalado e as chamadas à OpenAI daqui
// também são fetch; o corpo segue o formato documentado do endpoint /v1/messages do gateway.
// Escolha por variável: NOTA_AUTO_PROVEDOR ('openai' | 'gateway') e NOTA_AUTO_MODEL (id do modelo no provedor).
// Falha aberta: qualquer erro = null, nunca exceção. Recusa do modelo (stop_reason 'refusal') = null.
import { AI_TEXT_MODELS } from '@/lib/aiModels'

export type ProvedorVisao = 'openai' | 'gateway'
export type DetalheImagem = 'low' | 'high' | 'auto'
/** As partes no formato da OpenAI (o mesmo que o juiz já monta); o adaptador do gateway converte. */
export type ParteVisao = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: DetalheImagem } }
export type ChamadaVisao = { system: string; content: ParteVisao[]; maxTokens?: number }

export const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/messages'
export const GATEWAY_MODELOS_URL = 'https://ai-gateway.vercel.sh/v1/models'
/** Ids dos modelos Claude no gateway (com ponto, como o catálogo da Vercel escreve: anthropic/claude-opus-5.5). */
export const CLAUDE_NO_GATEWAY = {
  haiku: 'anthropic/claude-haiku-5.5',
  sonnet: 'anthropic/claude-sonnet-5.5',
  opus: 'anthropic/claude-opus-5.5',
} as const

/** US$ por milhão de tokens (entrada / saída). OpenAI: tabela do registro; Claude: preço de lista (o gateway repassa sem margem). */
export const TARIFAS_VISAO: Record<string, { inPerM: number; outPerM: number }> = {
  [AI_TEXT_MODELS.writer]: { inPerM: 2.5, outPerM: 10 },
  [AI_TEXT_MODELS.research]: { inPerM: 0.4, outPerM: 1.6 },
  [AI_TEXT_MODELS.vision]: { inPerM: 0.15, outPerM: 0.6 },
  [CLAUDE_NO_GATEWAY.haiku]: { inPerM: 0.1, outPerM: 0.5 },
  [CLAUDE_NO_GATEWAY.sonnet]: { inPerM: 2, outPerM: 10 },
  [CLAUDE_NO_GATEWAY.opus]: { inPerM: 4, outPerM: 20 },
}

export function lerProvedorNotaAuto(env: Record<string, string | undefined> = process.env): { provedor: ProvedorVisao; modelo: string } {
  const provedor: ProvedorVisao = String(env.NOTA_AUTO_PROVEDOR ?? '').trim().toLowerCase() === 'gateway' ? 'gateway' : 'openai'
  const modelo = String(env.NOTA_AUTO_MODEL ?? '').trim() || (provedor === 'gateway' ? CLAUDE_NO_GATEWAY.opus : AI_TEXT_MODELS.writer)
  return { provedor, modelo }
}

/** O token do gateway para ESTA requisição: chave explícita > cabeçalho OIDC da Vercel > OIDC do ambiente local. */
export function tokenDoGateway(req?: { headers: { get(n: string): string | null } } | null, env: Record<string, string | undefined> = process.env): { token: string; origem: 'api_key' | 'oidc_cabecalho' | 'oidc_ambiente' } | null {
  if (env.AI_GATEWAY_API_KEY) return { token: env.AI_GATEWAY_API_KEY, origem: 'api_key' }
  const h = req?.headers.get('x-vercel-oidc-token')
  if (h) return { token: h, origem: 'oidc_cabecalho' }
  if (env.VERCEL_OIDC_TOKEN) return { token: env.VERCEL_OIDC_TOKEN, origem: 'oidc_ambiente' }
  return null
}

/** O 1º objeto JSON de um texto (o Claude pode cercar com ```json). null se não houver. */
export function jsonDoTexto(t: string): unknown {
  const s = String(t ?? '')
  const i = s.indexOf('{')
  const j = s.lastIndexOf('}')
  if (i < 0 || j <= i) return null
  try {
    return JSON.parse(s.slice(i, j + 1))
  } catch {
    return null
  }
}

/** Partes da OpenAI → blocos da Messages API (imagem por URL; data URL vira base64). */
export function partesParaAnthropic(content: ParteVisao[]): Array<Record<string, unknown>> {
  return content.map((p) => {
    if (p.type === 'text') return { type: 'text', text: p.text }
    const url = p.image_url.url
    const m = /^data:(image\/[a-z]+);base64,(.*)$/i.exec(url)
    return m ? { type: 'image', source: { type: 'base64', media_type: m[1].toLowerCase(), data: m[2] } } : { type: 'image', source: { type: 'url', url } }
  })
}

const usdDe = (modelo: string, entrada: number, saida: number) => {
  const t = TARIFAS_VISAO[modelo] ?? TARIFAS_VISAO[CLAUDE_NO_GATEWAY.opus]
  return (Math.max(0, entrada) * t.inPerM + Math.max(0, saida) * t.outPerM) / 1e6
}

export async function chamarVisaoJson(
  c: ChamadaVisao,
  opts: { provedor?: ProvedorVisao; modelo?: string; fetchImpl?: typeof fetch; apiKey?: string; tokenGateway?: string | null; timeoutMs?: number },
): Promise<{ json: unknown; usd: number; modelo: string; provedor: ProvedorVisao } | null> {
  const lido = lerProvedorNotaAuto()
  const provedor = opts.provedor ?? lido.provedor
  const modelo = opts.modelo ?? (opts.provedor && opts.provedor !== lido.provedor ? (provedor === 'gateway' ? CLAUDE_NO_GATEWAY.opus : AI_TEXT_MODELS.writer) : lido.modelo)
  const doFetch = opts.fetchImpl ?? fetch
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 150_000)
  try {
    if (provedor === 'openai') {
      const key = opts.apiKey ?? process.env.OPENAI_API_KEY
      if (!key) return null
      const res = await doFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: modelo, temperature: 0, max_tokens: c.maxTokens ?? 3000, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: c.system }, { role: 'user', content: c.content }] }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
      let json: unknown
      try {
        json = JSON.parse(data.choices?.[0]?.message?.content ?? '')
      } catch {
        return null
      }
      return { json, usd: usdDe(modelo, data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0), modelo, provedor }
    }
    const token = opts.tokenGateway ?? tokenDoGateway(null)?.token
    if (!token) return null
    const res = await doFetch(GATEWAY_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'anthropic-version': '2023-06-01' },
      // sem prefill e sem `thinking`: nos Claude 5.x o raciocínio adaptativo é o padrão; o JSON é pedido no texto do sistema
      body: JSON.stringify({ model: modelo, max_tokens: c.maxTokens ?? 16000, system: c.system, messages: [{ role: 'user', content: partesParaAnthropic(c.content) }] }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }>; stop_reason?: string; usage?: { input_tokens?: number; output_tokens?: number } }
    if (data.stop_reason === 'refusal') return null
    const texto = (data.content ?? []).filter((b) => b?.type === 'text').map((b) => b.text ?? '').join('\n')
    const json = jsonDoTexto(texto)
    if (json === null) return null
    return { json, usd: usdDe(modelo, data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0), modelo, provedor }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
