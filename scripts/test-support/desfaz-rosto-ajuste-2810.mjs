// KINEO-ROSTO-AJUSTE-2810 — DESFAZ, em memória, esta entrega (o ajuste do remix no /clips: foto obrigatória dita na tela) nos arquivos que ela MODIFICOU, para os guardiões que
// conferem arquivos BYTE A BYTE contra uma base anterior. Diff REVERSO exato (contexto 3, gerado por generate-rosto-cards-2810-undo.mjs
// rosto-ajuste-2810): cada bloco de AGORA (moldurado por quebras de linha) aparece UMA vez e volta a ser o de ANTES. Arquivo fora da lista ou sem
// a marca volta igual. Camadas mais novas do mesmo arquivo saem ANTES desta.
export const MARCA = 'KINEO-ROSTO-AJUSTE-2810'
export const BASE = '563542621'
const DESFAZ = {"app/(dashboard)/clips/ClipsClient.tsx":[{"before":"        // eslint-disable-next-line @next/next/no-img-element\n        ? <><img src={photoUrl} alt=\"\" /><button type=\"button\" className=\"pill\" onClick={() => setPhotoUrl(null)}>{t('removePhoto')}</button></>\n        : <button type=\"button\" className=\"pill\" disabled={uploading} onClick={() => fileRef.current?.click()}><ControlIcon name=\"image\" /> {uploading ? t('uploading') : t('addPhoto')}</button>}\n      <span className=\"clip-meta\" style={{ marginTop: 0 }}>{effect ? t('effectPhoto') : <>{t('photo')} · {t('photoHint')}</>}</span>\n      <input ref={fileRef} type=\"file\" accept=\"image/jpeg,image/png,image/webp\" hidden onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)} />\n    </div>\n  )","now":"        // eslint-disable-next-line @next/next/no-img-element\n        ? <><img src={photoUrl} alt=\"\" /><button type=\"button\" className=\"pill\" onClick={() => setPhotoUrl(null)}>{t('removePhoto')}</button></>\n        : <button type=\"button\" className=\"pill\" disabled={uploading} onClick={() => fileRef.current?.click()}><ControlIcon name=\"image\" /> {uploading ? t('uploading') : t('addPhoto')}</button>}\n      <span className=\"clip-meta\" style={{ marginTop: 0 }}>{effect ? t('effectPhoto') : remix ? <UiLabel>Required — one clear photo where the face is easy to see. It becomes the first frame.</UiLabel> : <>{t('photo')} · {t('photoHint')}</>}</span>{/* KINEO-ROSTO-AJUSTE-2810 — no remix a foto é obrigatória (o \"Photo (optional)\" do clipe livre enganava) */}\n      <input ref={fileRef} type=\"file\" accept=\"image/jpeg,image/png,image/webp\" hidden onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)} />\n    </div>\n  )"}]}
export const ARQUIVOS = Object.keys(DESFAZ)
export function semRostoAjuste2810(text, rel) {
  if (typeof text !== 'string') return text
  const original = text
  const hunks = DESFAZ[String(rel ?? '').replace(/\\/g, '/').replace(/^\.\//, '')]
  if (!hunks || !original.includes(MARCA)) return original
  const crlf = original.includes('\r\n')
  let s = '\n' + original.replace(/\r\n/g, '\n') + '\n'
  for (const h of hunks) {
    const parts = s.split('\n' + h.now + '\n')
    if (parts.length !== 2) throw new Error('semRostoAjuste2810: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join('\n' + h.before + '\n')
  }
  s = s.slice(1, -1)
  if (s.includes(MARCA)) throw new Error('semRostoAjuste2810: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
