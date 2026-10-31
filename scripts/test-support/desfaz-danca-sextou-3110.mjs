// KINEO-DANCA-SEXTOU-3110 — DESFAZ, em memória, esta entrega (o Friday Groove (dança só da casa no remix de rosto) na rota do /clips) nos arquivos que ela MODIFICOU, para os guardiões que
// conferem arquivos BYTE A BYTE contra uma base anterior. Diff REVERSO exato (contexto 3, gerado por generate-rosto-cards-2810-undo.mjs
// danca-sextou-3110): cada bloco de AGORA (moldurado por quebras de linha) aparece UMA vez e volta a ser o de ANTES. Arquivo fora da lista ou sem
// a marca volta igual. Camadas mais novas do mesmo arquivo saem ANTES desta.
export const MARCA = 'KINEO-DANCA-SEXTOU-3110'
export const BASE = '255b655e3'
const DESFAZ = {"app/api/clips/route.ts":[{"before":"  const access = engineAccessFor(account)\n  // Galeria de efeitos: só com o interruptor ligado ou para a casa, e só com motores que esta conta pode apertar.\n  const effects = clipEffectsVisible(isInternalEmail(user.email)) ? publicClipEffects((engine) => access(engine).ok) : []\n  const face_remixes = faceRemixVisible(isInternalEmail(user.email)) ? publicFaceRemixes((engine) => access(engine).ok) : [] // KINEO-ROSTO-NO-CLIPE-2810\n  // Falha de leitura não se disfarça de lista vazia (lição do incidente JWT-skew, 28/08).\n  if (rows === null) {\n    return NextResponse.json(","now":"  const access = engineAccessFor(account)\n  // Galeria de efeitos: só com o interruptor ligado ou para a casa, e só com motores que esta conta pode apertar.\n  const effects = clipEffectsVisible(isInternalEmail(user.email)) ? publicClipEffects((engine) => access(engine).ok) : []\n  const face_remixes = faceRemixVisible(isInternalEmail(user.email)) ? publicFaceRemixes((engine) => access(engine).ok, isInternalEmail(user.email)) : [] // KINEO-ROSTO-NO-CLIPE-2810 · KINEO-DANCA-SEXTOU-3110 — + modelos da casa (Friday Groove) só para a casa\n  // Falha de leitura não se disfarça de lista vazia (lição do incidente JWT-skew, 28/08).\n  if (rows === null) {\n    return NextResponse.json("},{"before":"  let remix: FaceRemixItem | null = null // KINEO-ROSTO-NO-CLIPE-2810\n  if (wantsFaceRemix(body.remix)) { // KINEO-ROSTO-NO-CLIPE-2810\n    if (effect) return NextResponse.json({ error: 'Choose one: an effect or a clip remix.', code: 'remix' }, { status: 400, headers: NO_STORE }) // KINEO-ROSTO-NO-CLIPE-2810\n    const resolved = resolveFaceRemixRequest(body.remix, { visible: faceRemixVisible(isInternalEmail(user.email)), imageUrl: body.image_url ?? body.imageUrl, consent: body.consent, faceImageUrl: body.face_image_url }) // KINEO-ROSTO-NO-CLIPE-2810 · KINEO-ROSTO-QUADRO-CHAVE-2810 — + o recorte do rosto (2ª referência do quadro-chave; posse conferida no submitClip)\n    if (!resolved.ok) return NextResponse.json({ error: resolved.error, code: resolved.code }, { status: resolved.status, headers: NO_STORE }) // KINEO-ROSTO-NO-CLIPE-2810\n    remix = resolved.item // KINEO-ROSTO-NO-CLIPE-2810\n    clipBody = resolved.body // KINEO-ROSTO-NO-CLIPE-2810","now":"  let remix: FaceRemixItem | null = null // KINEO-ROSTO-NO-CLIPE-2810\n  if (wantsFaceRemix(body.remix)) { // KINEO-ROSTO-NO-CLIPE-2810\n    if (effect) return NextResponse.json({ error: 'Choose one: an effect or a clip remix.', code: 'remix' }, { status: 400, headers: NO_STORE }) // KINEO-ROSTO-NO-CLIPE-2810\n    const resolved = resolveFaceRemixRequest(body.remix, { visible: faceRemixVisible(isInternalEmail(user.email)), imageUrl: body.image_url ?? body.imageUrl, house: isInternalEmail(user.email), consent: body.consent, faceImageUrl: body.face_image_url }) // KINEO-ROSTO-NO-CLIPE-2810 · KINEO-DANCA-SEXTOU-3110 — + house (modelos da casa) · KINEO-ROSTO-QUADRO-CHAVE-2810 — + o recorte do rosto (2ª referência do quadro-chave; posse conferida no submitClip)\n    if (!resolved.ok) return NextResponse.json({ error: resolved.error, code: resolved.code }, { status: resolved.status, headers: NO_STORE }) // KINEO-ROSTO-NO-CLIPE-2810\n    remix = resolved.item // KINEO-ROSTO-NO-CLIPE-2810\n    clipBody = resolved.body // KINEO-ROSTO-NO-CLIPE-2810"}]}
/** Arquivos sem lugar para a marca (JSON): o 1º bloco de AGORA presente = a camada está lá; ausente = volta igual. */
const SEM_MARCA = new Set([])
/** Nascidos nesta entrega (sem hunk): listados para inventários de guardiões antigos; o desfaz devolve o texto intacto. */
export const NOVOS = []
export const ARQUIVOS = [...Object.keys(DESFAZ), ...NOVOS]
export function semDancaSextou3110(text, rel) {
  if (typeof text !== 'string') return text
  const original = text
  const chave = String(rel ?? '').replace(/\\/g, '/').replace(/^\.\//, '')
  const hunks = DESFAZ[chave]
  if (!hunks) return original
  if (SEM_MARCA.has(chave) ? !original.replace(/\r\n/g, '\n').includes(hunks[0].now) : !original.includes(MARCA)) return original
  const crlf = original.includes('\r\n')
  let s = '\n' + original.replace(/\r\n/g, '\n') + '\n'
  for (const h of hunks) {
    const parts = s.split('\n' + h.now + '\n')
    if (parts.length !== 2) throw new Error('semDancaSextou3110: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join('\n' + h.before + '\n')
  }
  s = s.slice(1, -1)
  if (s.includes(MARCA)) throw new Error('semDancaSextou3110: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
