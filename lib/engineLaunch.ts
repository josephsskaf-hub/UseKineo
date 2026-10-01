// KINEO-S25-LAUNCH-2026-09-01 — UM interruptor para o Seedance 2.5.
//
// A auditoria do fundador (01/09: 'coloca ele em todos os lugares onde ele
// precisa estar') encontrou 14 superficies que listam motores. Antes, cada
// motor novo era colado a mao em cada uma — e sempre faltava uma (o Omni ate
// hoje NAO esta no seletor do /generate). Agora todas leem DAQUI:
//   S25_PUBLIC=false → so contas internas veem o 2.5 (periodo de canario);
//   S25_PUBLIC=true  → mega-menu, /studio, /generate, pricing, FAQ, schema
//                      e calculadora mostram o motor de uma vez.
// Regra da casa que isto protege: nunca mostrar botao que o publico nao
// pode apertar (o gate do servidor le o MESMO interruptor).
import { isInternalEmail } from '@/lib/internalAccounts'

export const S25_PUBLIC = false

// ═══ KINEO-MOTOR-EM-MANUTENCAO-2026-09-15 — decisão do fundador (15/09, noite): a oferta concentra em cinco
// motores (Kineo 1, Kling 2.5, Kling 3 aprovados; Seedance 1.5 e Veo 3.1 em prova). MiniMax H3, Omni Flash e
// Seedance 2.5 ficam PAUSADOS para novas gerações: o servidor recusa antes de qualquer débito, a interface
// mostra manutenção com alternativa, e as superfícies públicas param de vender o que não pode ser apertado.
// Nada é apagado: motores, custos, filmes, clipes e a recuperação das tentativas existentes continuam.
// ═══ KINEO-H3-DE-VOLTA-2026-09-22 — o MiniMax H3 volta ao ar (fundador: "Bora voltar o H3" / "já voltar ele para o site").
// Prova: 3 filmes de 35 s no dia, todos montados em 3-6 min, juiz 80 · 95 · (nº 3 abaixo em docs/PROPOSTA-MOTORES-
// VOLTA-2026-09-22.md §8). O que mudou para ele voltar: compose com motivo (compose_failed), cena presa vira recusa
// e ressubmete (lib/stuckScene), juiz lendo a cena 1 (índice 0-based), prefixo sem pessoa e sem telefone nas famílias
// sem negative_prompt. Omni e Seedance 2.5 seguem pausados — mesmo caminho, ainda sem os 3 filmes.
export type PausedEngineKey = 'omni' | 's25'
export interface EnginePause { since: string; label: string; alternative: { key: 'hollywood' | 'kling'; label: string }; message: string }
export const ENGINE_PAUSE: Record<PausedEngineKey, EnginePause> = {
  omni: { since: '2026-09-15', label: 'Omni Flash', alternative: { key: 'hollywood', label: 'Kling 3' }, message: 'Omni Flash is temporarily paused for maintenance while we fix its film quality. Nothing was charged. Kling 3 is the closest engine and is available right now.' },
  s25: { since: '2026-09-15', label: 'Seedance 2.5', alternative: { key: 'kling', label: 'Kling 2.5' }, message: 'Seedance 2.5 is temporarily paused for maintenance. Nothing was charged. Kling 2.5 is available right now.' },
}
export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni', 's25'] // KINEO-H3-DE-VOLTA-2026-09-22
/** Pausa do motor pela chave da UI/rota ('h3' | 'omni' | 's25'); null quando o motor está ativo. */
export function enginePaused(engine: string | null | undefined): EnginePause | null {
  const k = typeof engine === 'string' ? engine.toLowerCase() : ''
  return (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null
}
/** Pausa pela quality do biller ('cinematic_h3' | 'cinematic_omni' | 'cinematic_s25'). */
export function qualityPaused(quality: string | null | undefined): EnginePause | null {
  const q = typeof quality === 'string' ? quality.toLowerCase() : ''
  return q === 'cinematic_omni' ? ENGINE_PAUSE.omni : q === 'cinematic_s25' ? ENGINE_PAUSE.s25 : null // KINEO-H3-DE-VOLTA-2026-09-22
}

/** O 2.5 aparece para este e-mail? Publico depois do lancamento; antes, so a casa. */
export function s25Visible(email?: string | null): boolean {
  return S25_PUBLIC || isInternalEmail(email)
}

// ═══ KINEO-AVATAR-FORA-2026-09-28 — decisão do fundador (27/09): "avatar sai por hora".
// O caso, medido no banco: em toda a história, 1 filme 'avatar' e 3 'presenter' entregues (o último em 15/07);
// nos últimos 30 dias, 3 avatar_dispatch_received, os 3 ensaios de $0 (dry_run), e 0 cliques no card do /studio
// (studio_avatar_card_clicked). Mesmo assim o Avatar era vendido em 14 superfícies públicas — contagem "Seven",
// mega-menu, bento e 4 cards da home, pricing, llms.txt, /ph, rodapé, sitemap, comparativos. É o mesmo desenho do
// S25_PUBLIC: AVATAR_PUBLIC=false tira o motor do CATÁLOGO público; contas da casa (isInternalEmail) continuam
// vendo o card do /studio. NÃO é pausa (enginePaused): pausa diz "manutenção" e o llms.txt publicaria um motivo
// falso. O /avatar e o /api/generate-avatar seguem no ar por link direto de propósito — a clonagem de voz mora lá
// (5 perfis com voz clonada, 1 pagante) e o seletor de voz do /studio/create aponta para ele. Preço e cobrança
// (engineCost 'avatar' 110 / 'presenter' 70) intocados. Para voltar: AVATAR_PUBLIC=true, e repor rodapé, sitemap,
// index do /ai-avatar, as linhas do pricing e a copy dos comparativos (lista em docs/AVATAR-FORA-2026-09-28.md).
export const AVATAR_PUBLIC = false

/** O Avatar aparece para este e-mail? Com AVATAR_PUBLIC=false, só a casa (mesma régua do s25Visible). */
export function avatarVisible(email?: string | null): boolean {
  return AVATAR_PUBLIC || isInternalEmail(email)
}

// ═══ KINEO-KINEO1-FORA-2026-09-29 — decisão do fundador (29/09): "quero tirar o kineo 1 do jogo, ele estraga a
// entrada". O filme grátis passa a ser o Seedance (15 s, E2a/E2b); o Kineo 1 sai da VITRINE PÚBLICA (home, mega-menu,
// bento, chip final, /arena, meta e esta contagem). Mesmo desenho do AVATAR_PUBLIC: nada é apagado — motor, custo,
// rota, curadoria (CURATED/homeVideoCuration) e o dado do /arena (lib/publicExamples) ficam; só o catálogo público
// para de oferecer. Quem continua vendo o motor (fundador: "deixar dentro do sistema dessas contas que já pagam esse
// motor que eles usam"): a casa (isInternalEmail), quem já pagou E já tem filme Kineo 1 concluído (qualquer data), e
// quem comprou pacote avulso (bulk*: BULK_PACKS é vendido em filmes Kineo 1) ou o passe do Studio Ads (recibo em minutos
// de Kineo 1) — os dois no eixo `boughtPack`. A leitura desses fatos mora no servidor
// (lib/kineo1Access.ts); aqui só a régua pura. NESTA entrega (E1) ninguém muda comportamento com ela — o Studio e o
// /generate passam a ler na E2b. Para voltar: KINEO1_PUBLIC=true (contagem e lista voltam sozinhas).
export const KINEO1_PUBLIC = false

/** Fatos de legado lidos no servidor (lib/kineo1Access.ts). Ausente = sem legado. */
export interface Kineo1Legacy {
  hasPaid?: boolean | null
  usedFast?: boolean | null
  boughtPack?: boolean | null
}

/** O Kineo 1 aparece para esta conta? Público só com KINEO1_PUBLIC; senão a casa, o pagante que já usa, ou quem comprou pacote. */
export function kineo1Visible(email?: string | null, legado?: Kineo1Legacy | null): boolean {
  if (KINEO1_PUBLIC || isInternalEmail(email)) return true
  const l = legado ?? {}
  return (l.hasPaid === true && l.usedFast === true) || l.boughtPack === true
}

// KINEO-KINEO1-FORA-2026-09-29 (conserto da revisão E1) — a COMPOSIÇÃO única que o servidor usa para entregar a flag
// (/api/me/credits e /studio/create). Antes cada rota montava a régua à mão e o guardião só procurava texto: trocar a
// leitura de has_paid por `true` passava verde. Agora as duas chamam esta função e o guardião a EXECUTA.
// Só lê o legado (3 consultas, service key) quando has_paid === true: pacote avulso e passe de anúncios gravam
// has_paid:true no mesmo UPDATE dos créditos (app/api/stripe/webhook/route.ts; lib/payments/grant.ts), então para
// quem nunca pagou (a maioria, trials) o resultado já é false e as leituras seriam custo puro.
// Falha de leitura propaga (quem chama decide); o e-mail da casa nunca chega a ler nada.
export async function resolveKineo1Flag(
  email: string | null | undefined,
  lerHasPaid: () => boolean | null | undefined | Promise<boolean | null | undefined>,
  lerLegado: () => Promise<Kineo1Legacy>,
): Promise<boolean> {
  if (kineo1Visible(email)) return true
  if ((await lerHasPaid()) !== true) return false
  const l = await lerLegado()
  return kineo1Visible(email, { hasPaid: true, usedFast: l.usedFast === true, boughtPack: l.boughtPack === true })
}

// ═══ KINEO-SEEDANCE-15S-2026-09-29 — "vai" nominal do fundador para o filme de 15 s no Seedance 1.5 (7 cr).
// Mesmo desenho do S25_PUBLIC: SEEDANCE_15S_PUBLIC=false → só as contas da casa (isInternalEmail) veem o BOTÃO de
// 15 s no /studio e no /generate (e o degrau "15 s cabe no seu saldo"), para o canário de
// docs/CANARIO-SEEDANCE-15S-2026-09-29.md. O SERVIDOR aceita 15 s no Seedance para qualquer conta, com o custo certo
// (creditCostForDuration('cinematic_ai', true, 15)), e recusa 15 s nos outros motores (lib/durationByEngine.ts).
// Virar true só depois do canário aprovado pelo fundador.
// LIGADO 29/09 (fundador): o filme grátis de quem chega é o Seedance 1.5 de 15 s. Vira JUNTO com a entrada (E2b —
// auto-start, Studio/Generate, ponte do trial) e os textos (E3 — "free 15-second film (Seedance 1.5)"): um sem o outro
// prometeria o que a conta nova não consegue apertar, ou esconderia o Kineo 1 sem dar filme ao trial.
export const SEEDANCE_15S_PUBLIC = true

/** O botão de 15 s do Seedance aparece para este e-mail? Mesma régua do s25Visible. */
export function seedance15sVisible(email?: string | null): boolean {
  return SEEDANCE_15S_PUBLIC || isInternalEmail(email)
}

// ═══ KINEO-DURACOES-CURTAS-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] ═══
// Os BOTÕES novos de duração curta — 15 s no Kling 2.5 e no Veo 3.1, 15 s e 30 s no Kling 3 / MiniMax H3 / Omni / Seedance 2.5
// (tabela em lib/durationByEngine.ts supportedDurationsFor). Mesmo desenho do SEEDANCE_15S_PUBLIC na E2a: false → só as contas
// da casa (isInternalEmail) veem os botões no /studio e no /generate, para os canários; o SERVIDOR aceita as durações da tabela
// para qualquer conta, com o custo certo (creditCostForDuration do motor). Virar true só depois dos canários aprovados pelo
// fundador (um commit de uma linha).
export const DURACOES_CURTAS_PUBLIC = true

/** Os botões curtos novos (Kling 2.5/Veo 15 s; hollywood 15/30 s) aparecem para este e-mail? */
export function duracoesCurtasVisible(email?: string | null): boolean {
  return DURACOES_CURTAS_PUBLIC || isInternalEmail(email)
}

// ═══ KINEO-ESTRELA-DO-FILME-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] ═══
// "Estrela do filme": 1–3 fotos do rosto de uma pessoa (com autorização) viram o protagonista de toda cena com gente
// (lib/estrelaDoFilme.ts). A sobretaxa é o PREÇO B do fundador (29/09, "2B"): 2 cr a cada 6 s de filme. Mesmo
// desenho do DURACOES_CURTAS_PUBLIC: false → só as contas da casa (isInternalEmail) veem o bloco no /studio, e o SERVIDOR
// recusa (403, antes do débito) a estrela de conta de fora. Virar true depois do canário aprovado (um commit de uma linha).
export const ESTRELA_PUBLIC = true // LIGADO 01/10 (fundador: "liga a estrela" — cliente pediu foto de referência no Kling 2.5)

/** O bloco "Estrela do filme" aparece (e o servidor aceita) para este e-mail? */
export function estrelaVisible(email?: string | null): boolean {
  return ESTRELA_PUBLIC || isInternalEmail(email)
}

/** Copy de contagem: 'Eight' hoje, 'Nine' no lancamento. Uma verdade, N telas. */
// KINEO-MOTOR-EM-MANUTENCAO-2026-09-15 — a contagem e a lista públicas só falam dos motores que o público pode
// apertar HOJE: Veo 3.1, Kling 3, Kling 2.5, Seedance 1.5, Kineo 1 e Avatar (H3/Omni/S25 pausados, S25 interno).
// KINEO-H3-DE-VOLTA-2026-09-22: sete — o MiniMax H3 voltou.
// KINEO-AVATAR-FORA-2026-09-28: seis — o Avatar saiu do catálogo público. Contagem e lista DERIVAM do interruptor,
// para que virar AVATAR_PUBLIC=true devolva 'Seven' e '..., Kineo 1 and Avatar' nas 4 telas que leem daqui
// (FAQ da home, FAQ/Organization do schema, /ph e a calculadora) sem ninguém redigitar número.
// KINEO-KINEO1-FORA-2026-09-29: cinco — o Kineo 1 saiu do catálogo público. A lista vira dado derivado dos DOIS
// interruptores (KINEO1_PUBLIC, AVATAR_PUBLIC) e a contagem é o tamanho dela: nenhum número digitado.
const PUBLIC_VIDEO_ENGINE_NAMES: readonly string[] = [
  'Veo 3.1', 'Kling 3', 'Kling 2.5', 'MiniMax H3', 'Seedance 1.5',
  ...(KINEO1_PUBLIC ? ['Kineo 1'] : []),
  ...(AVATAR_PUBLIC ? ['Avatar'] : []),
]
const ENGINE_COUNT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'] as const
export const VIDEO_ENGINE_COUNT_WORD: string = ENGINE_COUNT_WORDS[PUBLIC_VIDEO_ENGINE_NAMES.length]
export const VIDEO_ENGINE_COUNT_SENTENCE_START = VIDEO_ENGINE_COUNT_WORD
export const VIDEO_ENGINE_LIST_COPY = PUBLIC_VIDEO_ENGINE_NAMES.slice(0, -1).join(', ') + ' and ' + PUBLIC_VIDEO_ENGINE_NAMES[PUBLIC_VIDEO_ENGINE_NAMES.length - 1]
export const PAUSED_ENGINES_COPY = 'Omni Flash and Seedance 2.5 are temporarily paused for maintenance (since 15 September 2026); nothing is charged for a blocked attempt, and Kling 3 / Kling 2.5 cover the same jobs meanwhile.'
