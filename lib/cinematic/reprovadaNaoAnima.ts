// KINEO-REPROVADA-NAO-ANIMA-1111 [CEO 11/11, missão "média dos motores", item 3] — no filme clássico (motor padrão pago, H3 Max Turbo i2v) a MELHOR das
// fotos reprovadas era animada mesmo reprovada pelo motivo certo (Rudo do Zimbábue branca, "does not appear Zimbabwean"; a
// galinha no lugar do Lucas, "main subject is missing"). O Kling 4 grátis e a reserva já só animam foto APROVADA
// (lib/kling4Trial.ts approvedKling4TrialStills). Aqui a regra fica estreita: só em enforce, só BEST_FAIL, e só quando a
// tentativa escolhida falhou por SUJEITO, IDENTIDADE ou TEXTO — a cena segue sem foto (texto→vídeo do mesmo motor, mesmo preço
// por segundo). Nenhuma foto nova é gerada por isto. UNVERIFIED (crítico sem resposta), anatomia e artefato seguem como antes.
import type { ProblemaStill, RelatoCriticoStill } from '@/lib/cinematic/criticoStill' // só tipos: criticoStill.ts fica intocado (recibo exato do KINEO-CRITICO-OBSERVA-0911)
// Guardião: scripts/test-reprovada-nao-anima-1111.mjs.
export const PROBLEMAS_QUE_NAO_ANIMAM: readonly ProblemaStill[] = ['sujeito', 'identidade', 'texto']
/** A foto que o crítico escolheu pode virar o primeiro quadro do clipe? false = reprovada por um problema que a animação repete. */
export function stillPodeAnimar(r: Pick<RelatoCriticoStill, 'modo' | 'estado_final' | 'tentativas' | 'escolhida_tentativa' | 'url_final'>): boolean {
  if (r.modo !== 'enforce' || r.estado_final !== 'BEST_FAIL') return true
  const t = r.tentativas.find((x) => x.n === r.escolhida_tentativa && x.url === r.url_final)
  if (!t || t.veredito !== 'FAIL') return true
  return !t.problemas.some((p) => PROBLEMAS_QUE_NAO_ANIMAM.includes(p))
}

