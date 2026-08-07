// KINEO-CHARACTER-LOCK-2026-07-10 — Character Lock API (Feature 2).
// GET    → the user's saved characters (My Characters library)
// POST   → save a character { name, imageUrl, source? } (image is persisted
//          into our avatars bucket server-side; fal URLs are mirrored)
// DELETE → ?id= remove a character (owner-scoped)
//
// Premium surface. Os números reais são os que `characterLimitFor`
// (lib/characters.ts) devolve, por STRING DE PLANO e não por tier de marketing:
//   free = 0 · starter/starter_trial/basic/basic_trial = 3 · pro/pro_trial = 10
//   · qualquer outra string = `hasPaid ? 3 : 0`
// ⚠️ BUG PRÉ-EXISTENTE, não corrigido aqui: 'creator', 'studio', 'autopilot' e
// seus _trial NÃO têm ramo e caem no fallback — um `plan='studio'` recebe 3
// personagens, não 10, e um 'creator' sem `has_paid` recebe 0. As quatro
// strings são valores que o webhook da Stripe realmente escreve
// (app/api/admin/users/route.ts lista o conjunto canônico). Registrado em
// docs/GATES-ABERTOS.md; consertar exige decidir preço/limite, não é copy.
// [KINEO-TRIAL-FEATURE-GATES-2026-08-07] O comentário anterior dizia "free
// accounts save 1 character, paying accounts 12" — os dois números estavam
// errados desde 10/07 e ninguém leu a função ao lado.
// The generation routes resolve character ids via
// getCharacterImageUrl — the client never injects raw URLs into renders.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  characterLimitFor,
  countCharacters,
  deleteCharacter,
  extractCharacterTraits,
  listCharacters,
  persistCharacterImage,
  saveCharacter,
} from '@/lib/characters'
// KINEO-TRIAL-FEATURE-GATES-2026-08-07 — ver o bloco do limite no POST.
// `isTrialActive` e NÃO `getEffectiveEntitlement`: esta rota só precisa saber
// "está em trial?". `ent.treatAsPaid` seria ARMADILHA aqui, porque o predicado
// de pagante desta rota é `characterLimitFor > 0`, que devolve 0 para
// creator/studio/autopilot sem `has_paid` (ver o bug pré-existente no
// cabeçalho) — um assinante viria como não-pagante.
import { isTrialActive, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'

/**
 * Cota de personagens de um trial Creator. NÃO é um número novo: é o mesmo 3
 * que `characterLimitFor` devolve para `starter`/`basic`, e o trial é vendido
 * como "direitos de Creator, exceto os motores Studio". Aplicado com `Math.max`
 * para nunca REBAIXAR quem já tem mais (um Studio que entrasse em trial por
 * qualquer caminho continua com 10).
 */
const TRIAL_CHARACTER_LIMIT = 3

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  try {
    const { user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    const characters = await listCharacters(user.id)
    return NextResponse.json({ characters })
  } catch (err) {
    console.error('[characters] GET failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Could not load your characters.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    let body: { name?: string; imageUrl?: string; source?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }
    const name = (body.name ?? '').trim()
    const imageUrl = (body.imageUrl ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Give your character a name.' }, { status: 400 })
    if (!imageUrl) return NextResponse.json({ error: 'Character image is required.' }, { status: 400 })

    // KINEO-CHARLOCK-V2-2026-07-10 — per-plan limits from the paid-job
    // briefing: FREE = 0 (the locked UI is the upgrade bait), Starter/Creator
    // = 3, Studio = 10. Counted server-side (never localStorage).
    // ⚠️ O `error` é lido, e não descartado como antes: o SELECT ganhou 3
    // colunas que vêm de uma MIGRAÇÃO que a flag não controla. Num ambiente sem
    // elas o PostgREST devolve 42703, `data` vem null, `characterLimitFor('')`
    // devolve 0 e a rota daria 402 "feature paga" para TODO usuário, pagante
    // inclusive — falha silenciosa do lado caro. `PGRST116` (0 linhas) fica
    // FORA do 503: perfil inexistente sempre caiu no 402, e mudar isso seria
    // mudança de comportamento com a flag OFF.
    const { data: profile, error: profileAccessError } = await supabase
      .from('profiles')
      .select(`has_paid, plan, ${TRIAL_ENTITLEMENT_COLUMNS}`)
      .eq('id', user.id)
      .single()
    if (profileAccessError && profileAccessError.code !== 'PGRST116') {
      console.error('[characters] entitlement lookup failed:', profileAccessError.message)
      return NextResponse.json(
        { error: 'Your plan could not be verified. Nothing was saved. Please retry.' },
        { status: 503 },
      )
    }
    const plan = (profile?.plan ?? '').toString()
    const hasPaid = profile?.has_paid === true
    const planLimit = characterLimitFor(plan, hasPaid)
    // [KINEO-TRIAL-FEATURE-GATES-2026-08-07] Com a flag OFF `isTrialActive()`
    // retorna false na PRIMEIRA instrução (lib/reverseTrial.ts, antes de ler o
    // perfil), logo `limit === planLimit` byte a byte — diff de runtime zero, o
    // 402 e o 409 saem para exatamente as mesmas pessoas de antes. Com a flag
    // ON o trial recebe a cota de Creator, e nunca menos do que já tinha.
    const limit = isTrialActive(profile) ? Math.max(planLimit, TRIAL_CHARACTER_LIMIT) : planLimit
    const current = await countCharacters(user.id)
    if (limit === 0) {
      return NextResponse.json(
        {
          error: 'Saving characters is a paid feature — lock the SAME face into every video and thumbnail you make. Upgrade to unlock it.',
          upsell: 'credits',
          upgrade: '/pricing',
        },
        { status: 402 },
      )
    }
    if (current >= limit) {
      return NextResponse.json(
        {
          error: `You reached your ${limit}-character limit${limit < 10 ? ' — upgrade to Studio for 10 characters, or' : ' —'} delete one to save a new one.`,
          upgrade: '/pricing',
        },
        { status: 409 },
      )
    }

    const source = ['upload', 'scene', 'hollywood', 'other'].includes((body.source ?? '').toString())
      ? (body.source as string)
      : 'upload'
    // KINEO-CHARLOCK-V2 — persist first, then best-effort trait extraction on
    // the PERSISTED public URL (vision needs a reachable URL; failure never
    // blocks the save).
    const persistedUrl = await persistCharacterImage(user.id, imageUrl)
    const traits = await extractCharacterTraits(persistedUrl)
    const character = await saveCharacter({ userId: user.id, name, imageUrl: persistedUrl, source, traits })
    console.log(`[characters] saved user=${user.id.slice(0, 8)} id=${character.id} source=${source} traits=${traits ? 'yes' : 'no'}`)
    return NextResponse.json({ character })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[characters] POST failed:', msg)
    const friendly = msg.startsWith('Character image') || msg.startsWith('Could not download')
      ? msg
      : 'Could not save the character. Please try again.'
    return NextResponse.json({ error: friendly }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    const ok = await deleteCharacter(user.id, id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[characters] DELETE failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Could not delete the character.' }, { status: 500 })
  }
}
