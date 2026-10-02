// KINEO-PRODUCAO-ADS-2026-10-01 — guardião da "Produção" do Ads (personagem → planos → prévia → clipe/fala → montagem).
// Só readFileSync + transpile local (guardião com alias @/ não roda). A régua pura (lib/ads/producao.ts) é EXECUTADA; as
// rotas e a tela são lidas como texto e conferidas na ORDEM que importa (porta antes de gasto, peça resolvida no banco).
import { readFileSync } from 'node:fs'
import ts from 'typescript'

let ok = 0, falhas = 0
function checa(nome, cond) { if (cond) { ok++; console.log('  ✓', nome) } else { falhas++; console.log('  ✗', nome) } }
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ordem = (src, ...marcas) => { let at = -1; for (const m of marcas) { const i = src.indexOf(m, at + 1); if (i < 0 || i <= at) return false; at = i } return true }

const libSrc = ler('lib/ads/producao.ts')
const serverSrc = ler('lib/ads/producaoServer.ts')
const planSrc = ler('app/api/ads/producao/plan/route.ts')
const montSrc = ler('app/api/ads/producao/montage/route.ts')
const pageSrc = ler('app/(dashboard)/ads/producao/page.tsx')
const clientSrc = ler('app/(dashboard)/ads/producao/ProducaoClient.tsx')
const avatarSrc = ler('app/api/generate-avatar/route.ts')
const imagesSrc = ler('app/api/images/generate/route.ts')
const audioSrc = ler('app/api/audio/generate/route.ts')
const eventsSrc = ler('app/api/events/route.ts')

const module = { exports: {} }
new Function('module', 'exports', 'require', ts.transpileModule(libSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(module, module.exports, () => ({}))
const P = module.exports

// ── P1 interruptor e preço "a definir" ──
checa('P1 nasce só da casa (PRODUCAO_PUBLIC = false)', P.PRODUCAO_PUBLIC === false && /export const PRODUCAO_PUBLIC = false\n/.test(libSrc))
checa('P2 producaoVisibleFor: público OU casa', P.producaoVisibleFor(true, false) && P.producaoVisibleFor(false, true) && !P.producaoVisibleFor(false, false))
checa('P3 abrir ao público exige preço da montagem decidido (null = "a definir" só com a casa)', !P.PRODUCAO_PUBLIC || typeof P.PRODUCAO_MONTAGE_CREDITS === 'number')
// Reancorado 02/10 (KINEO-NUVEM-A3): o preço deixou de ser null (proposta 2 cr) e a cobrança tem interruptor próprio
// (PRODUCAO_MONTAGE_CHARGE_LIVE); a prova é a mesma — público sem cobrança ligada recusa ANTES de ler o pedido.
checa('P4 a montagem recusa (403 price_not_set) público sem cobrança ligada ANTES de ler o pedido', ordem(montSrc, "if (PRODUCAO_PUBLIC && !PRODUCAO_MONTAGE_CHARGE_LIVE) return producaoFail('price_not_set', 403)", 'parseMontageRefs(body?.shots)'))

// ── P5 espelhos de preço (o número da tela = o que a rota cobra) ──
checa('P5 imagem: 5 cr = MODELS.nanobanana.cost do /api/images/generate', P.PRODUCAO_IMAGE_CREDITS === 5 && /nanobanana: \{\n\s+slug: 'fal-ai\/nano-banana-pro',\n\s+cost: 5,/.test(imagesSrc))
checa('P6 fala para a câmera: 110 cr = AVATAR_CREDIT_COST do fabric', P.PRODUCAO_AVATAR_CREDITS === 110 && P.PRODUCAO_AVATAR_ENGINE === 'fabric' && avatarSrc.includes("const AVATAR_CREDIT_COST = engine === 'presenter' ? 70 : 110"))
checa('P7 piso de 12 s = AVATAR_MIN_NARRATION_SECONDS da rota', P.PRODUCAO_AVATAR_MIN_SECONDS === 12 && avatarSrc.includes('const AVATAR_MIN_NARRATION_SECONDS = 12'))
checa('P8 narração: 2 cr/1.000 caracteres = perK do minimax e a mesma fórmula da rota',
  P.PRODUCAO_NARRATION_CREDITS_PER_1K === 2 && /minimax: \{[\s\S]{0,900}?perK: 2,/.test(audioSrc) && audioSrc.includes('const cost = Math.max(1, Math.ceil(text.length / 1000)) * model.perK') &&
  P.narrationCredits('') === 0 && P.narrationCredits('abc') === 2 && P.narrationCredits('x'.repeat(1000)) === 2 && P.narrationCredits('x'.repeat(1001)) === 4)
// Reancorado 02/10 (KINEO-NUVEM-A3): o "a definir" virou proposta (2 cr) atrás de PRODUCAO_MONTAGE_CHARGE_LIVE=false; a
// prova continua: enquanto não cobra, a tela diz "grátis" antes do clique (a cobrança ligada mostra o preço).
checa('P9 montagem: preço só cobrado com o interruptor e a tela diz isso antes do clique', P.PRODUCAO_MONTAGE_CHARGE_LIVE === false && P.montageChargeCredits() === 0 && clientSrc.includes("'Montage: free while in preview · saved to your Library'") && clientSrc.includes('PRODUCAO_MONTAGE_CHARGE_LIVE ?'))

// ── P10 personagem e prompts ──
checa('P10 a frase de identidade do pedido do fundador', P.identityLine('woman') === 'This exact woman, same face, hair and outfit' && P.identityLine('man') === 'This exact man, same face, hair and outfit' && P.identityLine('mascot') === 'This exact character, same face, hair and outfit')
const pr = P.buildShotImagePrompt({ kind: 'woman', shot: { imagePrompt: 'selfie framing, cozy living room.' } })
checa('P11 o prompt do plano abre com a identidade + a referência, mantém o plano e fecha sem texto/marca', pr.startsWith('This exact woman, same face, hair and outfit as in the first reference image. selfie framing, cozy living room.') && pr.includes('No text, no letters, no logos, no brand names, no watermark.') && pr.includes('Vertical 9:16'))
const prP = P.buildShotImagePrompt({ kind: 'man', shot: { imagePrompt: 'close-up of the phone' }, productPhoto: true })
checa('P12 com foto de produto/app, o prompt aponta a 2ª referência; teto 2.000', prP.includes('second reference image') && P.buildShotImagePrompt({ kind: 'woman', shot: { imagePrompt: 'x'.repeat(5000) } }).length <= 2000)
checa('P13 personagem por IA: retrato 9:16 sem texto nem marca', /Vertical 9:16 photo\. No text/.test(P.buildCharacterPrompt('mascot', 'a smiling coffee bean')) && P.buildCharacterPrompt('man', '').startsWith('A man in his'))

// ── P14 modelos prontos no topo ──
const T = P.PRODUCAO_TEMPLATES
checa('P14 três modelos, nesta ordem: Depoimento (UGC) · Mascote da marca · Seu app no celular',
  T.length === 3 && T[0].key === 'ugc' && T[0].title === 'Testimonial (UGC)' && T[1].key === 'mascot' && T[1].title === 'Brand mascot' && T[2].key === 'app' && T[2].title === 'Your app on the phone' && T[1].characterKind === 'mascot')
checa('P15 cada reserva tem 3 a 5 planos e ao menos um clipe; o mascote fala no final', T.every((t) => t.fallback.length >= 3 && t.fallback.length <= 5 && t.fallback.some((s) => s.mode === 'clip')) && T[1].fallback.at(-1).mode === 'talk')
const fb = P.fallbackPlan('ugc', 'Minha ideia de anúncio para testar')
checa('P16 plano de reserva leva a ideia para as falas (e nada para os clipes)', fb.filter((s) => s.mode === 'talk').every((s) => s.line === 'Minha ideia de anúncio para testar') && fb.filter((s) => s.mode === 'clip').every((s) => s.line === ''))
checa('P17 nenhum prompt de reserva cita marca de terceiros', !/\b(iphone|apple|samsung|nike|coca|starbucks|google|instagram|tiktok)\b/i.test(JSON.stringify(T)))

// ── P18 planejador ──
const msgs = P.buildPlanMessages({ idea: 'Um café novo no bairro', template: 'mascot', kind: 'mascot', language: 'pt', productPhoto: true })
checa('P18 o planejador pede 3–5 planos em JSON, fala na língua do anúncio e não descreve rosto', msgs.system.includes('3 to 5 shots') && msgs.system.includes('Brazilian Portuguese') && msgs.system.includes('NEVER describe their face') && msgs.system.includes('second reference image') && msgs.user.includes('Um café novo no bairro'))
const mk = (n, extra = {}) => JSON.stringify({ shots: Array.from({ length: n }, (_, i) => ({ title: `T${i}`, image_prompt: `a scene number ${i} <b>bold</b>`, motion_prompt: 'push in', mode: 'clip', line: 'x', ...extra })) })
checa('P19 parsePlan: 4 → 4; 7 → corta em 5; 2 → null; lixo → null', P.parsePlan(mk(4)).length === 4 && P.parsePlan(mk(7)).length === 5 && P.parsePlan(mk(2)) === null && P.parsePlan('not json') === null && P.parsePlan({}) === null)
const p4 = P.parsePlan(mk(4))
checa('P20 parsePlan limpa <> e zera a fala dos clipes', !p4[0].imagePrompt.includes('<') && p4.every((s) => s.line === ''))
checa('P21 parsePlan: "talk" sem fala vira clipe; com fala fica fala', P.parsePlan(mk(3, { mode: 'talk', line: '' })).every((s) => s.mode === 'clip') && P.parsePlan(mk(3, { mode: 'talk', line: 'Olá, eu sou a Ana.' })).every((s) => s.mode === 'talk' && s.line === 'Olá, eu sou a Ana.'))
checa('P22 estimativa de fala: 38 palavras ≈ 12,3 s (≥ 12); 30 palavras < 12', P.talkLongEnough(Array(38).fill('palavra').join(' ')) && !P.talkLongEnough(Array(30).fill('palavra').join(' ')))

// ── P23 voz do avatar sem o truque ──
checa('P23 voz feminina = nova, masculina = onyx; outro valor = null', P.PRODUCAO_VOICE_IDS.female === 'nova' && P.PRODUCAO_VOICE_IDS.male === 'onyx' && P.producaoVoice('female') === 'female' && P.producaoVoice('nova') === null && P.producaoVoice(undefined) === null)
checa('P24 generate-avatar: a voz escolhida entra DEPOIS da clonada e ANTES do caminho de sempre (onyx/persona intactos)',
  ordem(avatarSrc, 'if (cloneVoiceId) {', '} else if (chosenVoice) {', "model: 'tts-1-hd'", "voice: PRODUCAO_VOICE_IDS[chosenVoice]", '} else {', "? await generateTTS(ttsSource, 1.0, undefined, 'free', language)"))
checa('P25 a impressão digital só muda com a voz escolhida (sem voz = mesmo hash de antes)', avatarSrc.includes("...(chosenVoice ? { voiceGender: chosenVoice } : {}),") && avatarSrc.includes('const chosenVoice = producaoVoice(body.voiceGender)'))
checa('P26 a tela manda voiceGender e scriptMode verbatim ao avatar, motor escolhido (padrão fabric), sem b-roll', clientSrc.includes("engine: producaoTalkEngine(s.talkEngine).key, scriptMode: 'verbatim', noBroll: true, voiceGender: s.voice") /* Reancorado 02/10 (KINEO-NUVEM-A3): presenter 70 ao lado do fabric 110; o padrão segue fabric */ && P.PRODUCAO_TALK_DEFAULT === 'fabric' && !clientSrc.includes('[Pexels:') && !clientSrc.includes("vertical: 'curiosities'"))

// ── P27 montagem (Creatomate), EXECUTADA ──
const VID = (n) => `https://x.supabase.co/storage/v1/object/public/renders/clips/u/${n}.mp4`
const src = P.buildProducaoMontageSource({
  shots: [{ kind: 'clip', videoUrl: VID(1), seconds: 5 }, { kind: 'talk', videoUrl: 'https://v3.fal.media/files/a.mp4', voiceUrl: 'https://x.supabase.co/storage/v1/object/public/voiceovers/vo.mp3', seconds: 13.2 }, { kind: 'clip', videoUrl: VID(2), seconds: 5 }],
  narration: { url: 'https://x.supabase.co/storage/v1/object/public/renders/audio/u/n.mp3', seconds: 20 },
  endCard: { logoUrl: 'https://x.supabase.co/storage/v1/object/public/avatars/u/brand-logo.png?v=1', slogan: 'Conecte-se', support: 'vivaexemplo.com', theme: 'light' },
})
const els = src.elements
const vids = els.filter((e) => e.type === 'video')
checa('P27 MP4 1080×1920', src.output_format === 'mp4' && src.width === 1080 && src.height === 1920)
checa('P28 planos na ordem, faixas alternadas, começo = fim do anterior − 0,4 s', vids.length === 3 && vids[0].time === 0 && vids[1].time === 4.6 && vids[2].time === 17.4 && vids[0].track !== vids[1].track && vids[1].track !== vids[2].track)
checa('P29 transição de 0,4 s em fade a partir do 2º plano; clipes mudos', !vids[0].enter_transition && vids.slice(1).every((v) => v.enter_transition?.type === 'fade' && v.enter_transition.duration === 0.4) && vids.every((v) => v.volume === '0%'))
const voz = els.filter((e) => e.type === 'audio' && e.track === 5)
checa('P30 a fala do avatar entra no MESMO instante e com a MESMA duração do plano', voz.length === 1 && voz[0].time === 4.6 && voz[0].duration === 13.2 && voz[0].source.includes('voiceovers'))
const narr = els.filter((e) => e.type === 'audio' && e.track === 6)
checa('P31 a narração para no começo da primeira fala (nunca duas vozes juntas)', narr.length === 1 && narr[0].time === 0 && narr[0].duration === 4.6)
const card = els.find((e) => e.type === 'shape' && e.track === 4)
const logo = els.find((e) => e.type === 'image')
checa('P32 cartão final de 3 s, entrando em fade no fim do último plano', card && card.time === 22 && card.duration === 3 && src.duration === 25 && card.enter_transition?.duration === 0.4)
checa('P33 o logo da conta em tela cheia (contain, 84% da largura) no cartão', logo && logo.fit === 'contain' && logo.width === '84%' && logo.time === card.time && logo.source.includes('brand-logo'))
checa('P34 slogan e linha de apoio no cartão', els.filter((e) => e.type === 'text').map((e) => e.text).join('|') === 'Conecte-se|vivaexemplo.com')
const semLogo = P.buildProducaoMontageSource({ shots: [{ kind: 'clip', videoUrl: VID(1), seconds: 5 }, { kind: 'clip', videoUrl: VID(2), seconds: 5 }], endCard: { logoUrl: null, slogan: '', support: '', theme: 'dark' } })
checa('P35 sem logo: sem imagem; sem fala: a narração ausente não cria áudio; tema escuro pinta o cartão', !semLogo.elements.some((e) => e.type === 'image') && !semLogo.elements.some((e) => e.type === 'audio') && semLogo.elements.find((e) => e.track === 4).fill_color === '#0B0E13')
const lanca = (f) => { try { f(); return false } catch { return true } }
checa('P36 recusa http, fala sem voz, 6 planos, segundos fora da faixa', lanca(() => P.buildProducaoMontageSource({ shots: [{ kind: 'clip', videoUrl: 'http://a/b.mp4', seconds: 5 }], endCard: {} })) &&
  lanca(() => P.buildProducaoMontageSource({ shots: [{ kind: 'talk', videoUrl: VID(1), seconds: 13 }], endCard: {} })) &&
  lanca(() => P.buildProducaoMontageSource({ shots: Array(6).fill({ kind: 'clip', videoUrl: VID(1), seconds: 5 }), endCard: {} })) &&
  lanca(() => P.buildProducaoMontageSource({ shots: [{ kind: 'clip', videoUrl: VID(1), seconds: 0 }], endCard: {} })))
checa('P37 só propriedades que os montadores da casa já exercitam (sem color_filter, playback_rate, vinheta)', !/color_filter|playback_rate|vignette/.test(libSrc))

// ── P38 pedido de montagem: o navegador manda ids, nunca URL ──
const U1 = '11111111-2222-4333-8444-555555555555'
checa('P38 parseMontageRefs aceita clip_id (uuid) e generation_id; recusa URL, tipo estranho, vazio e > 5',
  P.parseMontageRefs([{ kind: 'clip', clip_id: U1 }, { kind: 'talk', generation_id: 'producao_s1_abc123' }])?.length === 2 &&
  P.parseMontageRefs([{ kind: 'clip', url: VID(1) }]) === null && P.parseMontageRefs([{ kind: 'image', clip_id: U1 }]) === null &&
  P.parseMontageRefs([]) === null && P.parseMontageRefs(Array(6).fill({ kind: 'clip', clip_id: U1 })) === null)
checa('P39 a montagem resolve cada peça na conta: clips (user_id, done), claim assinado do avatar, audios da conta',
  montSrc.includes(".from('clips').select('id,user_id,status,video_url,seconds').eq('id', ref.clipId).eq('user_id', user.id)") && montSrc.includes("c.status !== 'done'") &&
  montSrc.includes('loadPrepaidAvatarClaimForGeneration({ db: admin, secret, userId: user.id, generationId: ref.generationId })') && montSrc.includes('claim.completedVideoUrl') &&
  montSrc.includes(".from('audios').select('id,user_id,url,duration_ms').eq('id', narrationId).eq('user_id', user.id)") && montSrc.includes('isOwnedProducaoAudioUrl(a.url, user.id, origin)') &&
  !/body\?\.(video_url|clip_url|avatar_url|voiceover_url)/.test(montSrc))
checa('P40 POST: porta → peças → logo da conta → source → Creatomate → evento com render_id', ordem(montSrc, 'const g = await producaoGate()', 'parseMontageRefs(', 'findBrandLogoUrl(user.id)', 'buildProducaoMontageSource(', 'submitCreatomateRender(source)', 'name: PRODUCAO_MONTAGE_EVENT'))
const getSrc = montSrc.slice(montSrc.indexOf('export async function GET'))
checa('P41 GET: só quem enviou (evento com o render_id) antes de perguntar à Creatomate; cópia no nosso storage', ordem(getSrc, 'producaoGate()', ".eq('name', PRODUCAO_MONTAGE_EVENT)", ".eq('metadata->>render_id', id)", 'pollCreatomateRender(id)', 'persistRenderAssets('))
checa('P42 nenhuma rota da Produção debita crédito (a montagem é "a definir"; as peças cobram nas rotas de sempre)', !/debitVideoCredits|debit_video_credits/.test(planSrc + montSrc))
checa('P43 eventos só de servidor (o navegador não cunha a prova de dono nem o teto)', eventsSrc.includes("'producao_plan_created',") && eventsSrc.includes("'producao_montage_submitted',") && P.PRODUCAO_PLAN_EVENT === 'producao_plan_created' && P.PRODUCAO_MONTAGE_EVENT === 'producao_montage_submitted')
checa('P44 narração: posse por pasta renders/audio/<uid>/', P.isOwnedProducaoAudioUrl('https://x.supabase.co/storage/v1/object/public/renders/audio/11111111-2222-4333-8444-555555555555/a.mp3', U1, 'https://x.supabase.co') &&
  !P.isOwnedProducaoAudioUrl('https://x.supabase.co/storage/v1/object/public/renders/audio/99999999-2222-4333-8444-555555555555/a.mp3', U1, 'https://x.supabase.co') &&
  !P.isOwnedProducaoAudioUrl('https://evil.co/storage/v1/object/public/renders/audio/11111111-2222-4333-8444-555555555555/a.mp3', U1, 'https://x.supabase.co') &&
  !P.isOwnedProducaoAudioUrl('https://x.supabase.co/storage/v1/object/public/renders/audio/11111111-2222-4333-8444-555555555555/a.mp3?x=1', U1, 'https://x.supabase.co'))

// ── P45 porta e planejador ──
checa('P45 porta: login (401) → interruptor/casa exata do Ads (404) → acesso ao Studio Ads (403)', ordem(serverSrc, "producaoFail('unauthenticated', 401)", 'producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))', "producaoFail('not_found', 404)", 'loadAdsAccess(user.id, user.email)', "producaoFail('no_access', 403)"))
checa('P46 planejador: porta → moderação → teto diário → OpenAI → reserva → evento; grátis', ordem(planSrc, 'producaoGate()', 'moderateContent(', ".eq('name', PRODUCAO_PLAN_EVENT)", 'PRODUCAO_PLAN_DAILY_CAP', 'openai.chat.completions.create(', 'fallbackPlan(', 'name: PRODUCAO_PLAN_EVENT') && planSrc.includes("response_format: { type: 'json_object' }") && planSrc.includes('maxRetries: 0'))
checa('P47 o evento do planejador não grava a ideia nem a descrição (sem dado pessoal)', !/metadata: \{[^}]*\b(idea|characterDescription)\b[^}]*\}/.test(planSrc))
checa('P48 página: login → interruptor (404) → acesso ao Ads (redirect)', ordem(pageSrc, "redirect(`/login?redirect=${encodeURIComponent('/ads/producao')}`)", 'producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))', 'notFound()', 'adsGate(reason)', "redirect('/ads?from=producao')"))

// ── P49 a tela ──
checa('P49 formato kps: quadro à esquerda, palco à direita, cor do Ads', clientSrc.includes('className="kps-grid"') && clientSrc.includes('className="kps-panel"') && clientSrc.includes('<ProductStage') && clientSrc.includes("useProductStage('ads')") && clientSrc.includes('<ProductStageStyles />'))
checa('P50 modelos no topo, antes do quadro', ordem(clientSrc, 'PRODUCAO_TEMPLATES.map(', 'className="kps-grid"'))
checa('P51 os 5 passos na ordem: personagem → ideia → prévia (só imagens) → dar vida → montar', ordem(clientSrc, "step(1, 'Your character'", "step(2, 'Your idea'", "step(3, 'Scene preview'", "step(4, 'Bring it to life'", "step(5, 'Assemble the ad'"))
checa('P52 custo visível antes de cada clique (personagem, imagens, refazer, dar vida, narração, montagem)',
  clientSrc.includes('`Create with AI · ${PRODUCAO_IMAGE_CREDITS} cr`') && clientSrc.includes('`Generate ${imagesToMake} images · ${imagesToMake * PRODUCAO_IMAGE_CREDITS} cr`') &&
  clientSrc.includes('`Redo · ${PRODUCAO_IMAGE_CREDITS} cr`') && clientSrc.includes('`Bring ${needLife.length} shots to life · ${lifeCost} cr`') &&
  clientSrc.includes('`Generate narration · ${narrationCredits(narration.text)} cr (MiniMax Speech 2.8 HD)`') && clientSrc.includes('<UiLabel>{montagePrice}</UiLabel>'))
checa('P53 vídeo só depois de aprovar: dar vida lê os planos aprovados com imagem', clientSrc.includes('const approved = shots.filter((s) => s.approved && s.imageUrl)') && clientSrc.includes('const needLife = approved.filter('))
checa('P54 o clipe usa a imagem gerada direto (renders/images/<uid>/, sem reenvio) e o preço do catálogo do /api/clips', clientSrc.includes("postJson('/api/clips', { engine: s.engine, seconds: s.seconds, aspect: '9:16', image_url: s.imageUrl, prompt: s.motionPrompt }") && clientSrc.includes("credits[String(s.seconds)]"))
checa('P55 as imagens dos planos vão com a referência do personagem (Nano Banana Pro, 9:16, consentimento)', clientSrc.includes('model: PRODUCAO_IMAGE_MODEL, size: PRODUCAO_IMAGE_SIZE, reference_paths: refs, reference_consent: true') && clientSrc.includes('buildShotImagePrompt({ kind, shot: s, productPhoto: Boolean(productRef) })'))
checa('P56 personagem salvo para reusar (/api/characters) e foto real só com autorização marcada', clientSrc.includes("postJson('/api/characters', {") && clientSrc.includes("fetch('/api/characters'") && clientSrc.includes('disabled={!!busy || !consent}') && clientSrc.includes('if (!files?.length || !consent) return'))
checa('P57 textos da tela passam por UiLabel (nenhum <h1>/<h2> cru)', (clientSrc.match(/<UiLabel>/g) || []).length >= 40 && !/<h[12][^>]*>[A-Za-z]/.test(clientSrc))
checa('P58 selo honesto: o palco nomeia o motor real de cada peça', clientSrc.includes("badge: 'Nano Banana Pro'") && clientSrc.includes("s.mode === 'talk' ? producaoTalkEngine(s.talkEngine).model") /* Reancorado 02/10 (KINEO-NUVEM-A3): o selo é o modelo real da fala escolhida */ && clientSrc.includes('photoEngines.find((e) => e.key === s.engine)?.label'))

console.log(`\ntest-producao-ads-2026-10-01: ${ok} ok · ${falhas} falhas`)
process.exit(falhas ? 1 : 0)
