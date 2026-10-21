// KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — o lado de SERVIDOR do still com folha.
//
// A régua mora em ./personagemAjuste (pura, executada pelo guardião scripts/test-meta95-personagem-ajuste-2010.mjs). Aqui só a rede,
// com a MESMA disciplina de lib/estrelaServer (o still da Estrela, validado em produção desde 01/10):
//   · UM POST por still ao fal-ai/nano-banana-pro/edit (submitFalQueueOnce) e só leitura depois (status/result);
//   · os primeiros 64 KB do arquivo pronto para conferir largura × altura (conserto 1) quando a fal não as devolve;
//   · a moderação de saída da casa (superfície 'estrela', etapa 'output') e, só no caso da criatura em cena inocente, a 2ª
//     conferência com o texto sem termo de idade (conserto 2).
// FALHA ABERTA PARA O FILME, FECHADA PARA O STILL: qualquer falha devolve url null e a cena usa o still FLUX de hoje.
// A Estrela (lib/estrelaServer gerarStillDaEstrela) não muda: só a folha de personagem chama este arquivo.
import { fal } from '@fal-ai/client'
import { submitFalQueueOnce } from '@/lib/falQueue'
import { moderateContent } from '@/lib/safety/contentModeration'
import { ESTRELA_EDIT_SLUG } from '@/lib/estrelaDoFilme'
import { stillComFolha, type DepsStillComFolha, type ResultadoStillComFolha } from '@/lib/cinematic/personagemAjuste'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'

const BYTES_DO_CABECALHO = 65_535
const BYTES_PRAZO_MS = 5_000

const pedir: DepsStillComFolha['pedir'] = async (input, pollWindowMs) => {
  let requestId: string
  try {
    requestId = await submitFalQueueOnce(ESTRELA_EDIT_SLUG, input)
  } catch (err) {
    console.warn('[personagem] submit do edit falhou (cena volta ao still de hoje):', err instanceof Error ? err.message : String(err))
    return { url: null, motivo: 'provider_failed' }
  }
  const prazo = Date.now() + pollWindowMs
  let authFails = 0
  while (Date.now() < prazo) {
    try {
      const st = (await fal.queue.status(ESTRELA_EDIT_SLUG, { requestId })) as { status?: string }
      if (st.status === 'COMPLETED') {
        type Img = { url?: string; width?: number | null; height?: number | null }
        const r = (await fal.queue.result(ESTRELA_EDIT_SLUG, { requestId })) as { data?: { images?: Img[] }; images?: Img[] }
        const img = r?.data?.images?.[0] ?? r?.images?.[0]
        return img?.url ? { url: img.url, motivo: 'ok', largura: img.width ?? null, altura: img.height ?? null } : { url: null, motivo: 'provider_failed' }
      }
      if (st.status === 'FAILED') return { url: null, motivo: 'provider_failed' }
      authFails = 0
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const code = (err as { status?: number })?.status
      if (code === 401 || code === 403 || /forbidden|unauthorized/i.test(msg)) {
        authFails += 1
        if (authFails >= 3) return { url: null, motivo: 'provider_failed' }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return { url: null, motivo: 'provider_timeout' }
}

const bytes: DepsStillComFolha['bytes'] = async (url) => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), BYTES_PRAZO_MS)
  try {
    const res = await fetch(url, { headers: { Range: `bytes=0-${BYTES_DO_CABECALHO}` }, signal: ctrl.signal })
    if (!res.ok && res.status !== 206) return null
    return new Uint8Array(await res.arrayBuffer()).slice(0, BYTES_DO_CABECALHO + 1)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Um still com folha (edit → formato → moderação). Nunca lança; url null = a cena fica com o FLUX de hoje. */
export async function gerarStillComFolha(args: {
  prompt: string
  imageUrls: string[]
  aspect: unknown
  userId: string
  engine: string
  pollWindowMs: number
  fichas: ReadonlyArray<Pick<FichaDePersonagem, 'tipo'>>
}): Promise<ResultadoStillComFolha> {
  const key = process.env.FAL_KEY
  if (!key) return { url: null, motivo: 'no_key', razao: null, reconferida: false }
  fal.config({ credentials: key })
  const r = await stillComFolha(
    { prompt: args.prompt, imageUrls: args.imageUrls, aspect: args.aspect, fichas: args.fichas, pollWindowMs: args.pollWindowMs, meta: { engine: args.engine } },
    {
      pedir,
      bytes,
      moderar: async (texto, imageUrls, meta) => {
        const v = await moderateContent({ surface: 'estrela', stage: 'output', userId: args.userId, text: texto, imageUrls, meta })
        return v.ok ? { ok: true } : v.reason === 'blocked' ? { ok: false, reason: 'blocked', decision: v.decision } : { ok: false, reason: v.reason }
      },
    },
  )
  if (r.motivo !== 'ok') console.warn(`[personagem] still com folha recusado (${r.motivo}${r.razao !== null ? `, razão ${r.razao}` : ''}) — a cena fica com o FLUX de hoje`)
  return r
}
