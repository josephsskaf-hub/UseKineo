// ═══════════════════════════════════════════════════════════════════════════
// KINEO-TRILHOS-2026-09-07 (#11) — "O TRILHO ESTÁ VIVO NESTE DEPLOY?"
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE EXISTE. O ciclo de 07/09 construiu dois trilhos de pagamento novos
// (Dodo = UPI/RuPay/Pix, PayPal = 2ª porta) e os dois nascem DESLIGADOS por
// env, esperando as chaves que o fundador cola na Vercel. Até hoje não havia
// como saber, de fora, em qual dos TRÊS estados a casa está:
//
//   1. chave nunca foi colada            → esperado, nada a fazer
//   2. chave colada, deploy NÃO refeito  → ⚠ o caso perigoso
//   3. chave colada e deploy refeito     → vendendo
//
// Os três se parecem IGUAIS na tela: nenhum botão de UPI, nenhum erro, nenhum
// log. A ordem urgente do fundador morreria em silêncio no estado 2 — e o
// estado 2 é o padrão, não a exceção, porque a documentação da Vercel é
// literal: "Any change you make to environment variables are not applied to
// previous deployments, they only apply to new deployments"
// (vercel.com/docs/environment-variables). A função serverless que está
// servindo agora carrega as envs do deploy que a construiu; colar a chave no
// painel não a alcança. É por isso que esta rota devolve, lado a lado, QUAIS
// envs este processo enxerga e QUAL deploy é este.
//
// ⛔ REGRA DE OURO DESTE ARQUIVO: só NOMES de env, nunca valores, nunca
// prefixo, nunca comprimento. A resposta é para ser lida em voz alta e colada
// no diário sem vazar nada. O único juízo é "presente / ausente".
//
// GET /api/admin/payment-rails — admin only, mesmo guard das outras /admin.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '../_shared/db'
import {
  DODO_SKUS,
  METODO_LOCAL_POR_PAIS,
  dodoMissingEnvFor,
  dodoMode,
  isDodoEnabled,
  localMethodFor,
} from '@/lib/dodo'
import { PAYPAL_ENV_NAMES, isPaypalEnabled, paypalMissingEnv } from '@/lib/paypal'

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso. Sem esta linha,
// a resposta poderia congelar no primeiro estado lido — e um painel que diz
// "desligado" para sempre seria pior que painel nenhum.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

/** Presença de uma env por NOME. Nunca devolve, mede nem loga o valor. */
function presente(nome: string): boolean {
  const v = process.env[nome]
  return typeof v === 'string' && v.trim().length > 0
}

type Trilho = {
  rail: 'stripe' | 'dodo' | 'paypal'
  live: boolean
  missing_env: string[]
  nota: string
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // ── Quem é o deploy que está respondendo ──────────────────────────────────
  // Este bloco é metade do valor da rota: sem ele, "DODO_API_KEY ausente" não
  // distingue "não colei" de "colei e não redeployei". Com o SHA e a hora em
  // que o processo subiu na mão, o fundador compara com o relógio de quando
  // colou a chave.
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null
  const deploy = {
    sha,
    sha_curto: sha ? sha.slice(0, 8) : null,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    env: process.env.VERCEL_ENV ?? 'local',
    processo_subiu_em: new Date(Date.now() - Math.round(process.uptime() * 1000)).toISOString(),
    agora: new Date().toISOString(),
  }

  // ── Dodo ──────────────────────────────────────────────────────────────────
  const dodoLigado = isDodoEnabled()
  const modo = dodoMode()
  const porSku = DODO_SKUS.map((sku) => ({
    sku,
    vendavel: dodoMissingEnvFor(sku).length === 0,
    missing_env: dodoMissingEnvFor(sku),
  }))

  // Os países são lidos pelo MESMO `localMethodFor` que a tela consulta via
  // /api/geo — não por uma cópia do mapa. Se um dia isto e a tela discordarem,
  // é porque alguém duplicou o portão.
  // `metodo_local: null` num país listado = chave ausente. É exatamente o que
  // a pessoa na Índia vê: nada.
  const paises = Object.keys(METODO_LOCAL_POR_PAIS).map((pais) => ({
    pais,
    metodo_local: localMethodFor(pais),
  }))

  const trilhos: Trilho[] = [
    {
      rail: 'stripe',
      live: presente('STRIPE_SECRET_KEY'),
      missing_env: presente('STRIPE_SECRET_KEY') ? [] : ['STRIPE_SECRET_KEY'],
      nota: 'A porta de sempre. Cobra o mundo todo; e-mandate do RBI barra a recorrência indiana.',
    },
    {
      rail: 'dodo',
      live: dodoLigado,
      missing_env: dodoMissingEnvFor('starter'),
      nota: dodoLigado
        ? `Ligado em modo ${modo}. UPI/RuPay (IN) e Pix (BR) aparecem na tela.`
        : 'Desligado: /api/dodo/checkout responde 503 e /api/geo devolve local_method null.',
    },
    {
      rail: 'paypal',
      live: isPaypalEnabled(),
      missing_env: paypalMissingEnv(),
      nota: isPaypalEnabled()
        ? 'Ligado: 2a porta disponivel na recusa de cartao.'
        : `Desligado: faltam ${paypalMissingEnv().length} de ${PAYPAL_ENV_NAMES.length} envs.`,
    },
  ]

  const faltando = trilhos.filter((t) => !t.live).flatMap((t) => t.missing_env)

  return NextResponse.json(
    {
      deploy,
      trilhos,
      dodo: { modo, por_sku: porSku, paises },
      // A frase que impede o erro de amanhã. Fica NA RESPOSTA, e não só num
      // comentário, porque quem vai ler isto às 21h é o fundador, não o código.
      como_ligar: {
        passo_1: 'Colar as envs que faltam no painel da Vercel (Production).',
        passo_2: 'REDEPLOY. Sem deploy novo a chave nao e enxergada — a Vercel diz: "not applied to previous deployments, they only apply to new deployments".',
        passo_3: 'Reabrir esta rota: live:true e missing_env vazio provam que o trilho vende.',
        envs_que_faltam: Array.from(new Set(faltando)),
      },
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
