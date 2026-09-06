// ═══ KINEO-PACOTE-DE-PUBLICACAO-2026-09-06 (sprint-assinaturas #20) ════════
//
// A ARITMETICA QUE MANDOU CONSTRUIR ISTO (medida hoje, 06/09):
//
//   A casa recebe ~30 cadastros/dia (19 a 57 em 8 dias). Em 7 dias, 230
//   pessoas viraram 2 pagantes: 0,87%. Para bater 10 pagantes/dia com uma
//   conversao CINCO VEZES melhor (4,3%, que ninguem nesta industria tem)
//   seriam precisos ~230 cadastros POR DIA — 7 a 8 vezes o trafego de hoje.
//
//   Conclusao desconfortavel e honesta: todo o trabalho de conversao deste
//   ciclo tem teto de 1 a 2 pagantes/dia. A meta do fundador exige GENTE
//   NOVA, nao mais aperto na mesma base de 230.
//
// A UNICA ALAVANCA DE AQUISICAO QUE A CASA PODE PUXAR SOZINHA: cada filme que
// um cliente publica e um anuncio. A casa entrega ~20 filmes por dia e, hoje,
// entrega junto exatamente NADA para ajudar a publicar — o cliente baixa o MP4
// e some. Se ele posta, posta sem dizer de onde veio.
//
// O QUE ESTA PECA FAZ: todo filme concluido passa a vir com o pacote que o
// PROPRIO FUNDADOR usa todo dia (o formato "Lago Natron", gravado no CLAUDE.md
// como modelo aprovado): titulo de YouTube, descricao com a linha de credito,
// legenda de TikTok com hashtags, e comentario fixado. Pronto para colar.
//
// O ANGULO, e ele e do fundador: "isso que voce viu foi feito por IA a partir
// de N palavras". O video e o conteudo E o anuncio.
//
// ⚠️ ISTO NAO E ENGANO E NAO PODE VIRAR: o credito e uma SUGESTAO visivel num
// texto que a pessoa vai colar e pode apagar. A carta diz o que e. Nenhuma
// linha aqui afirma algo falso sobre o video dela — a linha de credito da
// casa e literalmente verdade sobre como aquele arquivo nasceu. E ela SO
// aparece no plano gratuito (ver o bloco de correcao de rota abaixo).
//
// ⚠️ NAO TOCA NO PIPELINE DE QUALIDADE. Titulo e descricao sao texto FORA do
// pipeline (permissao explicita do ciclo). Nenhuma palavra da narracao, do
// prompt de cena, da regua ou do motor e lida ou alterada aqui.
//
// ⚠️ NAO CRIA TABELA. Mesma escolha da temporada (#18): mora em `events`
// (`publish_pack_written`), chaveado por `session_id = video_id`.

/** Nome do evento que guarda o pacote escrito. */
export const PACOTE_EVENT = 'publish_pack_written'

/** 14 dias, alinhado a temporada e a memoria do episodio 2 — as tres sao
 *  lidas pelas mesmas cartas, e validades diferentes produziriam um e-mail
 *  que sabe o titulo e esqueceu a descricao. */
export const PACOTE_TTL_MS = 14 * 24 * 60 * 60 * 1000

// Tetos das plataformas. Nao sao estilo: passar deles faz a plataforma cortar
// no meio da palavra, e o corte cai justo em cima do credito, que vive no fim.
export const MAX_YT_TITULO = 100
export const MAX_YT_DESCRICAO = 1200
export const MAX_TT_LEGENDA = 400
export const MAX_COMENTARIO = 300

// ⚠️ CORRECAO DE ROTA DENTRO DA PROPRIA ROTACAO — LEIA ANTES DE MEXER.
//
// A primeira versao desta peca acrescentava um credito PROPRIO ("Made with AI
// at usekineo.com") em TODO pacote. Duas coisas erradas nisso, as duas
// descobertas lendo `lib/videoDescription.ts` depois de o codigo ja estar no
// ar (e antes de ele alcancar alguem — `publish_pack_written` estava em 0):
//
//   1. A CASA JA TEM UMA LINHA DE CREDITO, e ela e canonica:
//      `KINEO_CREDIT_LINE`. Escrever a minha criava uma SEGUNDA regua de "como
//      a Kineo se apresenta" — exatamente a classe de erro da memoria
//      `predicado-do-cobrador-nao-se-redigita`. Agora esta peca importa a da
//      casa e nao inventa texto de marca.
//
//   2. A CASA NAO POE CREDITO PARA QUEM PAGA, e isso e DELIBERADO:
//      `buildBrandedYouTubeDescription` devolve a descricao limpa quando
//      `isFreePlan` e falso. Quem assina compra, entre outras coisas, nao ter
//      de anunciar a ferramenta. Forcar o credito no pacote de um assinante
//      seria desfazer uma decisao de produto pelas costas — e quebrar uma
//      promessa que a pagina de precos faz. O pacote agora respeita a mesma
//      regra: credito no gratuito, pacote limpo no pago.
//
// O flywheel continua de pe: a coorte que publica sem assinar e justamente a
// gratuita, que e a maioria esmagadora dos ~20 filmes/dia.
// ⚠️ ESTE ARQUIVO CONTINUA SEM IMPORT NENHUM, E ISSO E DESENHO.
// A primeira tentativa de conserto importava `KINEO_CREDIT_LINE` de
// `lib/videoDescription` — e quebrou o guardiao, que executa este arquivo
// direto com o type-stripping do Node (o Node nao resolve o alias `@/` do
// tsconfig, e sem extensao nao resolve nem o relativo; memoria
// `guardioes-com-alias-nao-rodam`). A dependencia foi INVERTIDA: quem chama
// passa a linha de credito da casa. A regua continua UMA (mora em
// videoDescription), e este modulo continua puro e executavel num teste.
export const SITE = 'https://www.usekineo.com'

export type PacoteDePublicacao = {
  ytTitle: string
  ytDescription: string
  tiktokCaption: string
  pinnedComment: string
}

/** O mesmo criterio de `hasKineoCredit` da casa: procura o dominio, ignorando
 *  caixa. Duplicar UMA comparacao de substring e o preco de manter este modulo
 *  sem import; se o criterio da casa mudar, o guardiao 8 (credito nao duplica)
 *  continua sendo o que protege. */
function jaTemCredito(s: string): boolean {
  return s.toLowerCase().includes('usekineo.com')
}

function texto(v: unknown, teto: number): string {
  if (typeof v !== 'string') return ''
  return v
    .replace(/\r\n/g, '\n')
    // espaco horizontal colapsa; quebra de linha sobrevive (a descricao tem
    // paragrafos e as hashtags moram na ultima linha).
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/^["“”']+|["“”']+$/g, '')
    .trim()
    .slice(0, teto)
}

/**
 * Recorta, valida e GARANTE O CREDITO.
 *
 * A garantia e o ponto da funcao: o modelo esquece a linha de credito com
 * frequencia, e um pacote sem credito e um anuncio sem endereco — o cliente
 * publica, o video circula, e ninguem descobre a Kineo. Em vez de rejeitar o
 * pacote (o que deixaria o cliente sem nada), a casa ACRESCENTA a linha.
 *
 * Devolve null so quando falta peca estrutural (titulo ou descricao): meio
 * pacote e pior que nenhum, porque o cliente cola e descobre o buraco depois.
 */
export function prepararPacote(
  bruto: unknown,
  opts?: { creditLine?: string | null },
): PacoteDePublicacao | null {
  if (!bruto || typeof bruto !== 'object') return null
  const b = bruto as Record<string, unknown>
  // Fail-closed no sentido do CLIENTE: sem linha de credito passada, o pacote
  // sai LIMPO. Errar para o lado de nao anunciar e o unico erro reversivel dos
  // dois — o contrario poe uma linha nossa na descricao de alguem que pagou
  // exatamente para nao te-la.
  const credito = typeof opts?.creditLine === 'string' ? opts.creditLine.trim() : ''
  const podeCreditar = credito.length > 0

  const ytTitle = texto(b.ytTitle ?? b.title, MAX_YT_TITULO)
  let ytDescription = texto(b.ytDescription ?? b.description, MAX_YT_DESCRICAO)
  let tiktokCaption = texto(b.tiktokCaption ?? b.caption, MAX_TT_LEGENDA)
  let pinnedComment = texto(b.pinnedComment ?? b.comment, MAX_COMENTARIO)

  if (!ytTitle || !ytDescription) return null

  // O credito entra onde faltar, e SO no plano gratuito. O corte vem DEPOIS de
  // acrescentar, senao a linha entraria e seria decapitada pelo teto — que e
  // exatamente o modo de falha do "menino da bolha" (27/08): cortar por
  // tamanho no fim de um texto que carrega a parte importante na cauda.
  //
  // A deteccao evita credito duplicado quando o proprio modelo ja escreveu o
  // dominio na descricao — acontece, e duas linhas iguais leem como spam.
  if (podeCreditar) {
    if (!jaTemCredito(ytDescription)) {
      ytDescription = `${ytDescription}\n\n${credito}`
    }
    if (tiktokCaption && !jaTemCredito(tiktokCaption)) {
      tiktokCaption = `${tiktokCaption} · Made with Kineo 🎬 usekineo.com`
    }
    if (pinnedComment && !jaTemCredito(pinnedComment)) {
      pinnedComment = `${pinnedComment} Made with Kineo — usekineo.com, free to try.`
    }
  }

  return {
    ytTitle,
    ytDescription: ytDescription.slice(0, MAX_YT_DESCRICAO + 200),
    tiktokCaption: tiktokCaption.slice(0, MAX_TT_LEGENDA + 80),
    pinnedComment: pinnedComment.slice(0, MAX_COMENTARIO + 80),
  }
}

/** Le o que foi gravado. Falha SEMPRE aberta. */
export function lerPacote(metadata: unknown): PacoteDePublicacao | null {
  if (!metadata || typeof metadata !== 'object') return null
  // Leitura NAO credita: o que foi gravado ja passou pela regra do plano no
  // momento da escrita. Creditar de novo aqui poria a linha num pacote de
  // assinante toda vez que ele fosse relido.
  return prepararPacote(metadata)
}

/** Data ilegivel ou ausente = NAO vale (fail-closed): reescrever custa uma
 *  chamada barata; servir um pacote velho para um filme novo nao. */
export function pacoteAindaVale(criadoEm: string | null | undefined, agora: number): boolean {
  if (!criadoEm) return false
  const t = Date.parse(criadoEm)
  if (!Number.isFinite(t)) return false
  return agora - t < PACOTE_TTL_MS
}
