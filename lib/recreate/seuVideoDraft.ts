'use client'

// Browser-local handoff only. No network, auth, render intent, signed path or server result is persisted.
import { SEU_VIDEO_LIMITES, type SeuVideoGender } from './seuVideoRules'
import { seuVideoCatalogItem } from './seuVideoCatalog'
import { seuVideoContentType } from './seuVideoFileType'

export type SeuVideoDraft = {
  source: { kind: 'upload'; file: File } | { kind: 'catalog'; id: string }
  photos: File[]
  prompt: string
  people: 1 | 2 | 3
  consent: boolean
  genders?: (SeuVideoGender | null)[]
  requestKey?: string
}
export class SeuVideoDraftStorageError extends Error {
  constructor(readonly code: 'unavailable' | 'quota' | 'corrupt') {
    super(code === 'quota' ? 'There is not enough browser storage for this draft.' : code === 'corrupt' ? 'This browser draft could not be read. Choose the files again or clear the draft.' : 'Browser draft storage is unavailable. Your files have not been sent.')
    this.name = 'SeuVideoDraftStorageError'
  }
}

const DATABASE = 'kineo-seu-video-draft-v1', STORE = 'drafts'
const TAB_KEY = 'kineo:seu-video:tab:v1', REF_KEY = 'kineo:seu-video:reference:v1'
const TTL = 2 * 60 * 60 * 1000, PHOTO_MAX_BYTES = 8 * 1024 * 1024
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
type Reference = { tab: string; owner: string; id: string }
type StoredFile = { blob: Blob; name: string; lastModified: number }
type StoredDraft = { version: 1; tab: string; id: string; at: number; source: { kind: 'upload'; file: StoredFile } | { kind: 'catalog'; id: string }; photos: StoredFile[]; prompt: string; people: 1 | 2 | 3; consent: boolean; genders?: (SeuVideoGender | null)[]; requestKey?: string }
let pending: Promise<unknown> = Promise.resolve()
function serial<T>(work: () => Promise<T>): Promise<T> { const result = pending.then(work, work); pending = result.then(() => undefined, () => undefined); return result }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const only = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key))
const fresh = (at: unknown): at is number => typeof at === 'number' && Number.isFinite(at) && at <= Date.now() + 60_000 && Date.now() - at <= TTL
const keyValid = (key: unknown) => key === undefined || typeof key === 'string' && /^[a-z0-9][a-z0-9_-]{0,99}$/i.test(key)

/** Exact approved source list; the draft never persists/fetches a catalog item's remote media. */
function catalogId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-z0-9-]{1,100}$/.test(id) && seuVideoCatalogItem(id) !== null
}
function validBlob(blob: unknown, video: boolean, name = ''): blob is Blob {
  return typeof Blob !== 'undefined' && blob instanceof Blob && blob.size > 0 && blob.size <= (video ? SEU_VIDEO_LIMITES.maxBytes : PHOTO_MAX_BYTES) && (video ? seuVideoContentType({ name, type: blob.type }) !== null : ['image/jpeg', 'image/png', 'image/webp'].includes(blob.type))
}
function validGenders(genders: unknown, people: unknown): boolean {
  // Choice is optional. Keep slot alignment and partial manual choices across auth.
  return genders === undefined || (Array.isArray(genders) && genders.length === people &&
    Array.from(genders).every(value => value === null || value === 'man' || value === 'woman'))
}
function validInput(value: unknown): value is SeuVideoDraft {
  if (!object(value) || !only(value, ['source', 'photos', 'prompt', 'people', 'consent', 'genders', 'requestKey']) || !object(value.source)) return false
  const source = value.source
  if (source.kind === 'upload') { if (!only(source, ['kind', 'file']) || typeof File === 'undefined' || !(source.file instanceof File) || !validBlob(source.file, true, source.file.name)) return false }
  else if (source.kind !== 'catalog' || !only(source, ['kind', 'id']) || !catalogId(source.id)) return false
  return [1, 2, 3].includes(value.people as number) && Array.isArray(value.photos) && value.photos.length === value.people && value.photos.length <= SEU_VIDEO_LIMITES.maxFotos && value.photos.every(file => typeof File !== 'undefined' && file instanceof File && validBlob(file, false)) && typeof value.prompt === 'string' && value.prompt.length <= SEU_VIDEO_LIMITES.maxPrompt && typeof value.consent === 'boolean' && validGenders(value.genders, value.people) && keyValid(value.requestKey)
}
function pack(file: File): StoredFile {
  const safeName = file.name.replace(/[\\/:?*|<>\u0000-\u001f]/g, '_') || 'file', extension = /\.(?:mp4|mov)$/i.exec(safeName)?.[0] ?? ''
  // Generic MIME depends on the suffix; truncating a long name must not make a saved video unreadable.
  const name = safeName.length > 200 && extension ? safeName.slice(0, 200 - extension.length) + extension : safeName.slice(0, 200)
  return { blob: file.slice(0, file.size, file.type), name, lastModified: Number.isFinite(file.lastModified) && file.lastModified >= 0 ? file.lastModified : 0 }
}
function validStoredFile(value: unknown, video: boolean): value is StoredFile { return object(value) && only(value, ['blob', 'name', 'lastModified']) && typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 200 && !/[\\/:?*|<>\u0000-\u001f]/.test(value.name) && validBlob(value.blob, video, value.name) && typeof value.lastModified === 'number' && Number.isFinite(value.lastModified) && value.lastModified >= 0 }
function unpack(file: StoredFile): File { return new File([file.blob], file.name, { type: file.blob.type, lastModified: file.lastModified }) }
function validStored(value: unknown, ref: Reference): value is StoredDraft {
  if (!object(value) || !only(value, ['version', 'tab', 'id', 'at', 'source', 'photos', 'prompt', 'people', 'consent', 'genders', 'requestKey']) || value.version !== 1 || value.tab !== ref.owner || value.id !== ref.id || !fresh(value.at) || !object(value.source)) return false
  const source = value.source
  if (source.kind === 'upload') { if (!only(source, ['kind', 'file']) || !validStoredFile(source.file, true)) return false }
  else if (source.kind !== 'catalog' || !only(source, ['kind', 'id']) || !catalogId(source.id)) return false
  return [1, 2, 3].includes(value.people as number) && Array.isArray(value.photos) && value.photos.length === value.people && value.photos.length <= SEU_VIDEO_LIMITES.maxFotos && value.photos.every(file => validStoredFile(file, false)) && typeof value.prompt === 'string' && value.prompt.length <= SEU_VIDEO_LIMITES.maxPrompt && typeof value.consent === 'boolean' && validGenders(value.genders, value.people) && keyValid(value.requestKey)
}
function storageError(error: unknown): SeuVideoDraftStorageError { if (error instanceof SeuVideoDraftStorageError) return error; return new SeuVideoDraftStorageError(object(error) && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable') }
function tab(create: boolean): string | null {
  try { const existing = sessionStorage.getItem(TAB_KEY); if (existing && UUID.test(existing)) return existing; if (!create) return null; const id = crypto.randomUUID(); sessionStorage.setItem(TAB_KEY, id); if (sessionStorage.getItem(TAB_KEY) !== id) throw new Error('reference_not_saved'); return id } catch (error) { throw storageError(error) }
}
function reference(): Reference | null {
  let raw: string | null
  try { raw = sessionStorage.getItem(REF_KEY) } catch (error) { throw storageError(error) }
  if (!raw) return null
  let ref: unknown; try { ref = JSON.parse(raw) } catch { throw new SeuVideoDraftStorageError('corrupt') }
  if (!object(ref) || !only(ref, ['tab', 'owner', 'id']) || typeof ref.tab !== 'string' || !UUID.test(ref.tab) || typeof ref.owner !== 'string' || !UUID.test(ref.owner) || typeof ref.id !== 'string' || !UUID.test(ref.id)) throw new SeuVideoDraftStorageError('corrupt')
  return ref.tab === tab(false) ? { tab: ref.tab, owner: ref.owner, id: ref.id } : null
}
function adopt(ref: Reference): void {
  let previous: string | null | undefined
  try { previous = sessionStorage.getItem(REF_KEY); const raw = JSON.stringify(ref); sessionStorage.setItem(REF_KEY, raw); if (sessionStorage.getItem(REF_KEY) !== raw) throw new Error('reference_not_saved') }
  catch (error) { if (previous !== undefined) try { if (previous === null) sessionStorage.removeItem(REF_KEY); else sessionStorage.setItem(REF_KEY, previous) } catch {} throw storageError(error) }
}
/** Opaque local record identity only; contains no customer text or file URL. */
export function getSeuVideoDraftRef(): string | null { try { return reference()?.id ?? null } catch { return null } }
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    try {
      const request = indexedDB.open(DATABASE, 1)
      request.onupgradeneeded = () => { const store = request.result.objectStoreNames.contains(STORE) ? request.transaction!.objectStore(STORE) : request.result.createObjectStore(STORE, { keyPath: 'id' }); if (!store.indexNames.contains('at')) store.createIndex('at', 'at') }
      request.onblocked = () => { settled = true; reject(new SeuVideoDraftStorageError('unavailable')) }
      request.onerror = () => { settled = true; reject(storageError(request.error)) }
      request.onsuccess = () => { if (settled) { request.result.close(); return } settled = true; request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    } catch (error) { reject(storageError(error)) }
  })
}
async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, mode), request = work(tx.objectStore(STORE))
      tx.oncomplete = () => { db.close(); resolve(request.result) }
      tx.onerror = tx.onabort = () => { db.close(); reject(storageError(tx.error || request.error)) }
    } catch (error) { db.close(); reject(storageError(error)) }
  })
}
async function expire(): Promise<void> {
  // Key-only expiry index: never enumerate/read another tab's draft or Blob in order to find a return draft.
  const db = await open()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, 'readwrite'), request = tx.objectStore(STORE).index('at').openKeyCursor(IDBKeyRange.upperBound(Date.now() - TTL, true))
      request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue() } }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = tx.onabort = () => { db.close(); reject(storageError(tx.error || request.error)) }
    } catch (error) { db.close(); reject(storageError(error)) }
  })
}
function removeReference(): void { try { sessionStorage.removeItem(REF_KEY) } catch (error) { throw storageError(error) } }

/** False means stay on the current screen. IDB atomically replaces the existing record only on commit. */
export function saveSeuVideoDraft(draft: SeuVideoDraft): Promise<boolean> {
  return serial(async () => {
    let created = false, raw: string | null = null
    try {
      if (!validInput(draft)) return false
      const owner = tab(true)!
      let ref = reference()
      if (!ref) {
        ref = { tab: owner, owner, id: crypto.randomUUID() }; raw = JSON.stringify(ref)
        sessionStorage.setItem(REF_KEY, raw)
        if (sessionStorage.getItem(REF_KEY) !== raw) throw new SeuVideoDraftStorageError('unavailable')
        created = true
      }
      const record: StoredDraft = { version: 1, tab: ref.owner, id: ref.id, at: Date.now(), source: draft.source.kind === 'catalog' ? { kind: 'catalog', id: draft.source.id } : { kind: 'upload', file: pack(draft.source.file) }, photos: draft.photos.map(pack), prompt: draft.prompt, people: draft.people, consent: draft.consent, ...(draft.genders ? { genders: [...draft.genders] } : {}), ...(draft.requestKey === undefined ? {} : { requestKey: draft.requestKey }) }
      await expire()
      await transaction('readwrite', store => store.put(record))
      return true
    } catch { if (created) try { if (sessionStorage.getItem(REF_KEY) === raw) sessionStorage.removeItem(REF_KEY) } catch {} return false }
  })
}

/** Idempotent: never consumes a usable draft. Errors reject so the UI can report unavailable/corrupt storage. */
export function restoreSeuVideoDraft(explicitRef?: string): Promise<SeuVideoDraft | null> {
  return serial(async () => {
    if (explicitRef !== undefined && (typeof explicitRef !== 'string' || !UUID.test(explicitRef))) throw new SeuVideoDraftStorageError('corrupt')
    let ref = explicitRef === undefined ? reference() : null
    if (!ref && explicitRef === undefined) return null
    const id = explicitRef ?? ref!.id
    const record = await transaction<unknown>('readonly', store => store.get(id))
    if (!record) { if (explicitRef === undefined) removeReference(); return null }
    if (!object(record) || record.id !== id || typeof record.tab !== 'string' || !UUID.test(record.tab)) throw new SeuVideoDraftStorageError('corrupt')
    if (!ref) ref = { tab: '', owner: record.tab, id }
    if (record.tab === ref.owner && !fresh(record.at)) { await transaction('readwrite', store => store.delete(id)); if (reference()?.id === id) removeReference(); await expire(); return null }
    if (!validStored(record, ref)) throw new SeuVideoDraftStorageError('corrupt')
    await expire()
    if (explicitRef !== undefined) adopt({ tab: tab(true)!, owner: record.tab, id })
    return { source: record.source.kind === 'catalog' ? { kind: 'catalog', id: record.source.id } : { kind: 'upload', file: unpack(record.source.file) }, photos: record.photos.map(unpack), prompt: record.prompt, people: record.people, consent: record.consent, ...(record.genders ? { genders: [...record.genders] } : {}), ...(record.requestKey === undefined ? {} : { requestKey: record.requestKey }) }
  })
}

export function clearSeuVideoDraft(explicitRef?: string): Promise<void> {
  return serial(async () => {
    if (explicitRef !== undefined && (typeof explicitRef !== 'string' || !UUID.test(explicitRef))) throw new SeuVideoDraftStorageError('corrupt')
    let ref: Reference | null
    try { ref = reference() } catch (error) { if (!(error instanceof SeuVideoDraftStorageError) || error.code !== 'corrupt') throw error; removeReference(); ref = null; if (explicitRef === undefined) { await expire(); return } }
    const id = explicitRef ?? ref?.id; if (!id) return
    if (explicitRef === undefined) { const record = await transaction<unknown>('readonly', store => store.get(id)); if (object(record) && record.tab !== ref!.owner) throw new SeuVideoDraftStorageError('corrupt') }
    await transaction('readwrite', store => store.delete(id)); if (ref?.id === id) removeReference(); await expire()
  })
}

/** Signing out applies to the device, even when initiated from a different tab. */
export function clearSeuVideoDraftsOnLogout(): Promise<void> {
  return serial(async () => {
    await transaction('readwrite', store => store.clear())
    removeReference()
  })
}
