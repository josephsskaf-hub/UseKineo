// ═══ KINEO-PACOTE-NA-ENTREGA-2026-09-07 — UM renderizador para o pacote ════
//
// POR QUE ESTE ARQUIVO EXISTE (medido no banco, 07/09 ~01:50 BRT):
//
//   video_ready_email_sent  (rota de status, no segundo em que o filme nasce)
//                            178 em 7 dias / 121 pessoas
//   video_ready_nudge_sent  (cron de 2o toque)          4 em TODA a historia
//   publish_pack_written                                0
//   publish_pack_unavailable                            0
//
// O pacote de publicacao (#20) foi pendurado no cron — o remetente com 4
// envios na historia, que ainda por cima e SUPRIMIDO justamente porque o
// e-mail de entrega ja saiu. O e-mail que 121 pessoas recebem nao tinha
// pacote. Razao de alcance: 44x. A sonda (`publish_pack_unavailable`) morava
// no mesmo lugar errado, e por isso tambem media zero.
//
// A marcacao do pacote vivia DENTRO de `buildEmail` do cron. Para levar o
// pacote ao e-mail de entrega sem duplicar HTML (memoria da casa: "importe a
// fonte unica em vez de consertar a copia"), ela foi EXTRAIDA para ca. Os
// dois remetentes importam daqui; um segundo template nao pode nascer.
//
// ⚠️ ESTE ARQUIVO E PURO DE PROPOSITO: so gera string. Sem builtin de Node,
// sem import de servidor, sem `@/`. `tsc` nao ve a fronteira servidor/cliente
// (memoria `tsc-nao-ve-a-fronteira-servidor-cliente`), e um guardiao precisa
// conseguir executa-lo direto com o type-stripping do Node.
//
// Os dois e-mails tem fundos diferentes (o cron e claro; o de entrega e o
// cartao escuro #161618). O tema troca SO as cores; a estrutura e uma.

import type { PacoteDePublicacao } from './publishPack'

export type PackEmailTheme = 'light' | 'dark'

/** Escape local — o modulo nao importa nada (ver cabecalho). Mesma regra dos
 *  quatro caracteres que `escapeHtmlText` do cron usa. */
export function escapePackHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Versao texto (parte `text` do e-mail). `null` => '' — o e-mail sai byte a
 * byte como sai sem pacote.
 */
export function packEmailText(pack: PacoteDePublicacao | null | undefined): string {
  const pk = pack ?? null
  if (!pk) return ''
  return `
── READY TO POST ──
Everything below is written for this video. Copy, edit, publish.

YOUTUBE TITLE
${pk.ytTitle}

YOUTUBE DESCRIPTION
${pk.ytDescription}
${pk.tiktokCaption ? `
TIKTOK CAPTION
${pk.tiktokCaption}` : ''}${pk.pinnedComment ? `

PINNED COMMENT
${pk.pinnedComment}` : ''}
───────────────────
`
}

const TEMAS: Record<PackEmailTheme, {
  border: string
  titulo: string
  sub: string
  rotulo: string
  caixaFundo: string
  caixaTexto: string
  margem: string
}> = {
  light: {
    border: '#e6e8ec',
    titulo: '#111',
    sub: '#475569',
    rotulo: '#8a8a8a',
    caixaFundo: '#f6f7f9',
    caixaTexto: '#111',
    margem: '0 0 16px',
  },
  dark: {
    border: '#26262a',
    titulo: '#fff',
    sub: '#94a3b8',
    rotulo: '#8a8a8a',
    caixaFundo: '#1f1f23',
    caixaTexto: '#f4f4f5',
    margem: '18px 0 0',
  },
}

/**
 * Versao HTML. `null` => '' (caminho NORMAL, nao erro). Todo valor do pacote
 * passa pelo escape — o modelo escreve o texto, o cliente pode ter digitado
 * `<` no tema, e nada disso pode virar marcacao.
 */
export function packEmailHtml(
  pack: PacoteDePublicacao | null | undefined,
  opts?: { theme?: PackEmailTheme },
): string {
  const pk = pack ?? null
  if (!pk) return ''
  const t = TEMAS[opts?.theme ?? 'light']
  const bloco = (rotulo: string, valor: string) =>
    valor
      ? `<p style="margin:0 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${t.rotulo};">${rotulo}</p>
  <p style="margin:0 0 14px;font-size:14px;white-space:pre-wrap;background:${t.caixaFundo};color:${t.caixaTexto};border-radius:8px;padding:10px 12px;">${escapePackHtml(valor)}</p>`
      : ''
  return `<div style="border:1px solid ${t.border};border-radius:12px;padding:16px 16px 4px;margin:${t.margem};">
  <p style="margin:0 0 12px;font-weight:bold;font-size:15px;color:${t.titulo};">Ready to post 🚀</p>
  <p style="margin:0 0 14px;color:${t.sub};font-size:14px;">Written for this video. Copy, edit, publish.</p>
  ${bloco('YouTube title', pk.ytTitle)}
  ${bloco('YouTube description', pk.ytDescription)}
  ${bloco('TikTok caption', pk.tiktokCaption)}
  ${bloco('Pinned comment', pk.pinnedComment)}
</div>`
}
