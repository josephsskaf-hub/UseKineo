// ═══ KINEO-RADAR-DE-QUALIDADE-2026-09-20 — o juiz roda sozinho e o fundador fica sabendo antes do cliente reclamar ═══
//
// Fundador (20/09 madrugada): "olhei na aba Coerência… alguns vídeos não vieram 80, 90"; e na noite de 19/09 foi ele
// quem percebeu o filme das meias — o juiz tinha dado 100 e ninguém tinha olhado. Hoje a nota só nasce quando o painel
// abre (maxCompute por chamada), e o cliente pagante com filme ruim só é descoberto se alguém abrir o painel a tempo.
//
// REGRA: (1) a cada 15 min o cron julga os filmes novos ainda sem nota (até 8 por rodada, custo ~US$ 0,002 cada);
// (2) filme de conta PAGANTE com nota < ALERTA_PAGANTE vira alerta imediato ao fundador (e-mail + webhook), com
// problemas, link do painel e o botão de crédito — o Axel de ontem teria chegado ao fundador 15 min depois do
// render, não 3 h; (3) uma vez por dia (08:05 BRT) sai o resumo: quantos filmes, média por motor, os 5 piores.
// Nada aqui toca o render, o preço ou o cliente: só olha e avisa. Decisões puras abaixo; o cron executa.

export const QUALITY_RADAR_VERSION = 'radar_qualidade_v1'
export const ALERTA_PAGANTE = 60
export const ALERTA_TRIAL = 45
export const RADAR_ALERT_EVENT = 'quality_radar_alert'
export const RADAR_DIGEST_EVENT = 'quality_radar_digest'
export const RADAR_MAX_JUDGE_PER_RUN = 8

export type RadarFilm = {
  video_id: string
  email: string | null
  engine: string
  topic: string
  score: number | null
  visual: number | null
  texto: number | null
  problems: string[]
  created_at: string
  hasPaid: boolean
  credits: number | null
}

export type RadarAlertReason = 'no_score' | 'score_ok' | 'internal_account' | 'already_alerted' | 'alert_paid' | 'alert_trial'

export function decideRadarAlert(input: { score: number | null; hasPaid: boolean; internal: boolean; alreadyAlerted: boolean }): { alert: boolean; reason: RadarAlertReason } {
  if (input.internal) return { alert: false, reason: 'internal_account' }
  if (input.score === null || !Number.isFinite(input.score)) return { alert: false, reason: 'no_score' }
  if (input.alreadyAlerted) return { alert: false, reason: 'already_alerted' }
  if (input.hasPaid && input.score < ALERTA_PAGANTE) return { alert: true, reason: 'alert_paid' }
  if (!input.hasPaid && input.score < ALERTA_TRIAL) return { alert: true, reason: 'alert_trial' }
  return { alert: false, reason: 'score_ok' }
}

const ENGINE_PT: Record<string, string> = {
  fast: 'Kineo 1', cinematic_ai: 'Seedance 1.5', cinematic_veo: 'Veo 3.1', cinematic_kling: 'Kling 2.5',
  cinematic_hollywood: 'Kling 3', cinematic_h3: 'MiniMax H3', cinematic_omni: 'Omni', cinematic_s25: 'Seedance 2.5', avatar: 'Avatar',
}
const engineLabel = (e: string) => ENGINE_PT[e] ?? e

export function radarAlertText(f: RadarFilm, appUrl: string): { subject: string; text: string } {
  const who = f.hasPaid ? 'PAGANTE' : 'trial'
  const subject = `⚠ Filme ruim de ${who}: ${f.email ?? '?'} · nota ${f.score} (${engineLabel(f.engine)})`
  const text = [
    `Conta ${who}: ${f.email ?? '?'}${f.credits != null ? ` · saldo ${f.credits} cr` : ''}`,
    `Motor: ${engineLabel(f.engine)} · feito ${f.created_at.slice(0, 16).replace('T', ' ')}Z`,
    `Nota ${f.score} (texto ${f.texto ?? '?'} · visual ${f.visual ?? '?'})`,
    `Pediu: ${f.topic.slice(0, 200)}`,
    f.problems.length ? `Problemas:\n${f.problems.map((p) => `  · ${p}`).join('\n')}` : 'Problemas: (juiz não nomeou)',
    '',
    `Painel: ${appUrl}/admin/coerencia`,
    `Dar crédito (botão + créditos): ${appUrl}/admin/people`,
    f.hasPaid ? 'Sugestão: abrir o filme, e se for defeito nosso, devolver o crédito e escrever para a pessoa hoje.' : 'Sugestão: só olhar; trial ruim é o motor pedindo conserto, não crédito.',
  ].join('\n')
  return { subject, text }
}

export function radarDigestText(films: RadarFilm[], appUrl: string): { subject: string; text: string } {
  const scored = films.filter((f) => f.score != null)
  const media = scored.length ? Math.round(scored.reduce((a, f) => a + (f.score ?? 0), 0) / scored.length) : null
  const porMotor = new Map<string, { n: number; soma: number; visual: number; nv: number }>()
  for (const f of scored) {
    const cur = porMotor.get(f.engine) ?? { n: 0, soma: 0, visual: 0, nv: 0 }
    cur.n += 1; cur.soma += f.score ?? 0
    if (f.visual != null) { cur.visual += f.visual; cur.nv += 1 }
    porMotor.set(f.engine, cur)
  }
  const linhasMotor = [...porMotor.entries()].sort((a, b) => b[1].n - a[1].n)
    .map(([e, v]) => `  · ${engineLabel(e)}: ${v.n} filme${v.n === 1 ? '' : 's'} · média ${Math.round(v.soma / v.n)}${v.nv ? ` · visual ${Math.round(v.visual / v.nv)}` : ''}`)
  const piores = [...scored].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 5)
    .map((f) => `  · ${f.score} — ${f.hasPaid ? 'PAGANTE ' : ''}${f.email ?? '?'} · ${engineLabel(f.engine)} · "${f.topic.slice(0, 70)}"${f.problems[0] ? ` — ${f.problems[0].slice(0, 90)}` : ''}`)
  const abaixo70 = scored.filter((f) => (f.score ?? 0) < 70).length
  const subject = `📊 Qualidade 24 h: ${scored.length} filmes · média ${media ?? '—'} · ${abaixo70} abaixo de 70`
  const text = [
    `Filmes julgados nas últimas 24 h: ${scored.length} (sem nota ainda: ${films.length - scored.length})`,
    `Média geral: ${media ?? '—'} · abaixo de 70: ${abaixo70} · 80+: ${scored.filter((f) => (f.score ?? 0) >= 80).length}`,
    'Por motor:',
    ...(linhasMotor.length ? linhasMotor : ['  (nenhum)']),
    'Os 5 piores:',
    ...(piores.length ? piores : ['  (nenhum)']),
    '',
    `Painel: ${appUrl}/admin/coerencia`,
  ].join('\n')
  return { subject, text }
}
