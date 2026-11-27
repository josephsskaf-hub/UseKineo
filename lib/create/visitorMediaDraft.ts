import { publicEditorSignup } from '@/lib/analytics'
// Keep the file in this tab through signup. A return URL contains only its random reference.
type Surface = 'clip' | 'ads' | 'cartoon' | 'image'
const ttl = 2 * 60 * 60 * 1000
type Stored = { surface: Surface; at: number; fields: Record<string, string>; photos: File[] }
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('kineo-visitor-editor', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('drafts')
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}
export async function saveMediaDraft(surface: Surface, fields: Stored['fields'], photos: File[]) {
  const ref = crypto.randomUUID()
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite')
      const store = tx.objectStore('drafts')
      const old = store.openCursor()
      old.onsuccess = () => {
        const cursor = old.result
        if (!cursor) return
        if (Date.now() - cursor.value.at >= ttl) cursor.delete()
        cursor.continue()
      }
      store.put({ surface, at: Date.now(), fields, photos } satisfies Stored, ref)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
    const query = new URLSearchParams({ draft: ref, volta: '1' })
    for (const [key, value] of new URLSearchParams(window.location.search)) {
      if (['entry', 'style', 'bf_template', 'bf_lang'].includes(key)) query.set(key, value)
    }
    return publicEditorSignup('/create/' + surface, query)
  } finally { db.close() }
}
export async function readMediaDraft(surface: Surface): Promise<Stored | null> {
  const ref = new URLSearchParams(window.location.search).get('draft')
  if (!ref || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(ref)) return null
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const get = db.transaction('drafts').objectStore('drafts').get(ref)
      get.onerror = () => reject(get.error)
      get.onsuccess = () => {
        const d: Stored | undefined = get.result
        resolve(d?.surface === surface && Date.now() - d.at < ttl ? d : null)
      }
    })
  } finally { db.close() }
}
