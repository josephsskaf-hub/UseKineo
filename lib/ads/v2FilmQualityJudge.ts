// KINEO-QUALIDADE-TODOS-MOTORES-2910 — observe the final legacy Ads reference without any extra fal job.
import { julgarStillDoFilme } from '@/lib/cinematic/filmQualityJudge'
import { modoDoCriticoDoStill, novoFilmeDoCritico, type DepsCritico } from '@/lib/cinematic/criticoStill'
import { qualidadeDoPlanoAdsV2 } from './v2FilmQuality'
import type { AdsV2StoredPlan } from './v2Advance'

export async function julgarStillAdsV2(input: { plan: AdsV2StoredPlan | null; kind: string; indice: number; url: string; prompt: string },
  dependencies: Pick<DepsCritico, 'fetchImpl' | 'apiKey' | 'agora'> = {}) {
  const quality = qualidadeDoPlanoAdsV2(input.plan, input.kind, input.prompt)
  const filme = novoFilmeDoCritico(modoDoCriticoDoStill(), { orcamentoMs: 6_000 })
  filme.regeracoesRestantes = 0
  return julgarStillDoFilme({ indice: input.indice, url: input.url, mostra: quality.prompt,
    fala: input.plan?.narration ?? '', prompt: quality.prompt, seed: 0, referencia: quality.referencia },
    { ...dependencies, filme, fichas: quality.elenco, maxRegeracoesCena: 0, gerarStill: async () => null })
}
