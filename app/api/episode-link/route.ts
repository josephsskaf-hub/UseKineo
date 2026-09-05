import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { normalizeInternalRedirect } from '@/lib/authRedirect'

// ═══ KINEO-PORTA-EPISODIO-EMAIL-2026-09-05 ═════════════════════════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (medido 05/09 em produção, 30 dias):
//
//   `series_continuation_landed` tem SETE fontes vivas — history_video_card
//   (42), generate_recent_video (24), history_milestone (24), done_screen
//   (22), studio_milestone (20), render_pill (8), landing_resume_strip (7).
//   TODAS são telas de dentro do app.
//
//   E-mail: ZERO. Não "poucas": zero linhas, em nenhuma das quatro fontes de
//   e-mail que existem no código (`video_ready_email`, `momentum_email`,
//   `lifecycle_loss_email`, `lifecycle_ending_email`).
//
//   O denominador não é pequeno: em 30 dias saíram 102 `momentum_nudge_sent`
//   (campanha cujo botão É este), 65 `video_ready_email_sent` com rodapé de
//   episódio 2 (44+3 pessoas) e 2.871 `trial_lifecycle_email_sent`. O botão
//   está no e-mail — `has_topic:true` nos carimbos — e mesmo assim nenhuma
//   aterrissagem carrega fonte de e-mail.
//
// O QUE O RASTREIO ACHOU (curl na URL real, deslogado, 05/09):
//
//   /generate?prompt=…&series=1&continuation_source=video_ready_email
//     → 307 /studio/create?…            (o porteiro do #296, query intacta)
//     → 307 /signup?redirect=…          (a página decide signup vs login)
//
//   A query sobrevive à viagem inteira — isso está correto e não é o defeito.
//   O defeito é o DESTINO: `/signup`. A escolha entre entrar e se cadastrar é
//   feita por `hasPriorSession` — existe cookie `sb-…auth-token` neste
//   navegador? Para um clique vindo do INBOX essa resposta é estruturalmente
//   "não": o Gmail do telefone abre em webview própria, o link é aberto em
//   outro aparelho, a aba é anônima. Ou seja, a pessoa que JÁ TEM CONTA — o
//   e-mail foi endereçado a ela, cadastrada, com filme entregue — recebe um
//   formulário de CRIAR CONTA. As sete fontes de dentro do app nunca passam
//   por aqui porque sempre têm sessão viva. É a única diferença entre as
//   fontes que funcionam e as que marcam zero.
//
// O QUE ESTA ROTA FAZ, e são duas coisas — nenhuma delas mexe no filme:
//
//   1. CONTA O CLIQUE. Hoje ninguém sabe se o zero é "ninguém clica" ou
//      "clica e morre no cadastro" — não existe evento entre o envio e a
//      aterrissagem. Sem esse degrau, qualquer conserto aqui seria medido no
//      escuro (a lição do denominador de 04/09). `episode_link_clicked` passa
//      a existir, com a fonte, se havia sessão, e um sinalizador de robô —
//      varredor de e-mail e pré-visualização de link batem em URL de inbox e
//      inflariam a conta se entrassem sem etiqueta.
//
//   2. MANDA PARA A PORTA CERTA. Com sessão viva, vai direto ao destino.
//      Sem sessão, vai para `/login?redirect=<destino completo>` — entrar,
//      não cadastrar — e o `redirect` preserva prompt, série e fonte, que é
//      o que faz o episódio 2 nascer escrito do outro lado.
//
// Falha SEMPRE aberta: qualquer erro de banco, de leitura de sessão ou de
// parâmetro termina em redirecionamento assim mesmo. Isto é um contador
// pendurado no caminho de volta do cliente; um 500 aqui trocaria "não
// medimos o clique" por "o cliente não volta", que é infinitamente pior.
//
// Não concede crédito, não gasta crédito, não chama fornecedor, não envia
// e-mail e não decide preço.
export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 (#17): rota SÓ-GET nasce com o Data Cache do
// Next ligado (revalidate=false) e passaria a servir a MESMA resposta para
// todo mundo. Ver scripts/test-data-cache-no-store.mjs.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

/** Destino real da casa de máquinas. O `/generate` é apelido legado e custa
 *  um 307 a mais em cima de um clique que já é frágil. */
const DESTINO = '/studio/create'

/** Só estes parâmetros atravessam. Lista fechada de propósito: o valor vem de
 *  dentro de um e-mail, e montar caminho com chave arbitrária é como se abre
 *  redirecionamento aberto. `utm_*` entra pela regra abaixo. */
const PARAMS_PERMITIDOS = new Set([
  'prompt',
  'autoanalyze',
  'series',
  'continuation_source',
  'engine',
])

const MAX_VALOR = 2000
const MAX_PARAMS = 24

/** Varredor de e-mail, pré-visualização de link e robô de segurança batem em
 *  URL de inbox sem nenhum humano por perto. Não bloqueamos (bloquear robô de
 *  varredura quebra o link para o cliente real que vem atrás) — só etiquetamos,
 *  para o clique humano poder ser contado separado depois. */
const ROBO = /(bot|crawler|spider|slurp|preview|scanner|monitor|curl|wget|python-requests|headless|proxy|fetcher|validator)/i

function ehRobo(ua: string | null): boolean {
  if (!ua) return true // sem user-agent nenhum não é navegador de gente
  return ROBO.test(ua)
}

export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin

  // ── 1. Destino: a query que chegou, filtrada, remontada sobre /studio/create.
  let destino = DESTINO
  let fonte = 'unknown'
  try {
    const entrada = req.nextUrl.searchParams
    const saida = new URLSearchParams()
    let n = 0
    for (const [chave, valor] of entrada.entries()) {
      if (n >= MAX_PARAMS) break
      if (typeof valor !== 'string' || !valor) continue
      const permitido = PARAMS_PERMITIDOS.has(chave) || /^utm_[a-z_]{1,32}$/.test(chave)
      if (!permitido) continue
      saida.append(chave, valor.slice(0, MAX_VALOR))
      n++
    }
    fonte = (entrada.get('continuation_source') || 'unknown').slice(0, 64)
    const qs = saida.toString()
    // normalizeInternalRedirect é o mesmo guarda que o login usa: recusa
    // `//host`, barra invertida e caractere de controle. Se recusar, o destino
    // vira a tela de criar pelada — nunca um host de fora.
    destino = normalizeInternalRedirect(qs ? `${DESTINO}?${qs}` : DESTINO) ?? DESTINO
  } catch {
    destino = DESTINO
  }

  // ── 2. Quem é (se houver sessão neste navegador). Falha = deslogado.
  let userId: string | null = null
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    userId = null
  }

  // ── 3. O degrau que não existia: o clique.
  try {
    const sessionId = cookies().get('kineo_event_session_id')?.value ?? null
    await writeServerEvent({
      name: 'episode_link_clicked',
      userId,
      path: '/api/episode-link',
      sessionId,
      metadata: {
        source: fonte,
        signed_in: Boolean(userId),
        bot: ehRobo(req.headers.get('user-agent')),
        has_prompt: destino.includes('prompt='),
        utm_campaign: req.nextUrl.searchParams.get('utm_campaign')?.slice(0, 64) ?? null,
      },
    })
  } catch {
    // contador é enfeite; o caminho de volta do cliente não é.
  }

  // ── 4. A porta certa. Com sessão, direto. Sem sessão, ENTRAR (a pessoa já
  // tem conta: o e-mail foi endereçado a ela), com o destino inteiro guardado.
  const url = userId
    ? `${origem}${destino}`
    : `${origem}/login?redirect=${encodeURIComponent(destino)}`
  return NextResponse.redirect(url, 302)
}
