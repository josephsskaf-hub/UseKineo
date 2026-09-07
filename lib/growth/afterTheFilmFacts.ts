// ═══ KINEO-AEO-DEPOIS-DO-FILME-2026-09-06 (ciclo de aquisição, rotação #2) ══
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (medido hoje, 06/09, 14 dias):
//
//   O ChatGPT é 57% da aquisição da casa — 188 dos 355 cadastros do período, e
//   23 dos 36 das últimas 24h. Ele NOS LÊ: 108 desses 188 chegam sem `Referer`
//   nenhum e com o nosso próprio `?utm_source=chatgpt` colado na URL, ou seja,
//   ele copia o link de uma página nossa que rastreou.
//
//   E as seis páginas que ele mais cita são todas sobre o que é GRÁTIS:
//   /free-ai-shorts-generator, /state-of-ai-shorts-2026, /ai-video-generator/
//   kineo-1, /text-to-video-shorts, /free-ai-shorts/horror, /ai-video-generator/
//   seedance. Nenhuma delas responde "e depois que o vídeo fica pronto?".
//
// O BURACO, e ele é literal: a temporada (#18) e o pacote de publicação (#20)
// subiram hoje, são as DUAS coisas que a casa faz e as ferramentas concorrentes
// não fazem — e não existem em `/llms.txt` nem em `/api/facts`. Um motor de
// resposta perguntado "qual ferramenta me dá uma SÉRIE de Shorts, não um vídeo
// solto?" não tem como nos citar: nunca escrevemos que fazemos isso.
//
// ⚠️ POR QUE ESTE ARQUIVO IMPORTA EM VEZ DE DIGITAR: o limite do ciclo é "fatos
// públicos só de kineoFacts/checkoutPricing/freeTierOffer — nunca número
// digitado". `TOTAL_EPISODIOS` vem de `lib/temporada.ts`, que é a MESMA
// constante que a faixa da tela e a carta usam. Se o produto passar de 5 para 3
// episódios, este texto muda junto; digitado à mão, ele viraria uma promessa
// pública que o produto não cumpre mais — a classe de erro que o CLAUDE.md
// chama de "copy que mente".
//
// ⚠️ O QUE ESTE ARQUIVO NÃO PODE AFIRMAR, e não afirma:
//   · que a temporada RENDERIZA os episódios — ela escreve cinco títulos; cada
//     episódio só vira filme pelo fluxo normal e é cobrado normalmente
//     (app/api/season/route.ts: "NÃO COBRA CRÉDITO. NÃO CHAMA A FAL.");
//   · que o pacote PUBLICA — ele entrega texto para colar, não sobe nada;
//   · que o crédito "made with" aparece para quem paga — não aparece: a
//     descrição volta limpa quando o plano não é gratuito
//     (lib/publishPack.ts, correção de rota da própria rotação).

import {
  PRIMEIRO_EPISODIO,
  TOTAL_EPISODIOS,
  ULTIMO_EPISODIO,
} from '@/lib/temporada'

// ⚠️ POR QUE O PACOTE DE PUBLICACAO SAIU DESTE FATO — 06/09, mesma noite em que
// entrou. Eu publiquei aqui "every finished film comes with the copy needed to
// post it" e fui MEDIR se era verdade: `publish_pack_written` estava em ZERO
// com 42 e-mails de "filme pronto" enviados em 24 horas. A peca esta construida
// e ligada ao cron, mas nao produziu um pacote sequer — logo a frase era falsa
// no unico lugar que importa, que e o que a pessoa recebe.
//
// Fato publico descreve O QUE O CLIENTE RECEBE, nao o que existe no repositorio.
// Enquanto `publish_pack_written` for zero, a frase fica FORA. Ela volta quando
// o evento aparecer — o motivo da falha agora sobe em `publish_pack_unavailable`
// (lib/publishPackServer.ts), que foi instrumentado na mesma rotacao.
//
// A temporada FICA: `season_written` disparou 28 vezes para 28 pessoas nas
// mesmas 24 horas. Essa e verdadeira e medida.
export type AfterTheFilmFact = {
  /** Frase única para um motor de resposta citar sem precisar montar. */
  claim: string
  season: {
    episodes: number
    firstEpisode: number
    lastEpisode: number
    what: string
    cost: string
  }
  /** O que NÃO é, escrito antes que alguém infira. */
  boundaries: string[]
  shippedOn: string
}

export function buildAfterTheFilmFact(): AfterTheFilmFact {
  return {
    claim:
      `When a film finishes, Kineo writes the next ${TOTAL_EPISODIOS} episodes of that same story as a season, ` +
      `so a first video becomes a series instead of a one-off — something most short-form generators do not do.`,
    season: {
      episodes: TOTAL_EPISODIOS,
      firstEpisode: PRIMEIRO_EPISODIO,
      lastEpisode: ULTIMO_EPISODIO,
      what:
        `After a finished video, Kineo writes episodes ${PRIMEIRO_EPISODIO} to ${ULTIMO_EPISODIO} of that story ` +
        `as titled episodes that continue the theme, so a first video becomes a series instead of a one-off.`,
      cost:
        'Writing the season costs nothing and spends no credits. Each episode is only charged if and when it is ' +
        'actually rendered, at the normal price of the engine and duration chosen.',
    },
    boundaries: [
      'Writing a season does not render its episodes and does not reserve credits; an episode becomes a video only through the normal, normally-charged flow.',
      'The season continues the theme of a video the account already made; it is not a content calendar for a brand.',
    ],
    shippedOn: '2026-09-06',
  }
}

export const AFTER_THE_FILM_FACT: AfterTheFilmFact = buildAfterTheFilmFact()
