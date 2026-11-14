'use client'

// Local catalog handoff only. No URL, upload, API or generation result is stored.
import { recreateFormat } from './formats'
import { publicRecreatePath } from './entry'

type StoredPhoto = { blob: Blob; name: string; lastModified: number }
type StoredDraft = { version: 1; id: string; owner: string; accountKey: string | null; at: number; model: string; photos: StoredPhoto[]; prompt: string; requestKey?: string }
type Pointers = { tab: string; refs: Record<string, string> }
export type RecreateFlowDraft = { photos: File[]; prompt: string; requestKey?: string }
const DATABASE = 'kineo-recreate-flow-v1', STORE = 'drafts'
const TAB_KEY = 'kineo:recreate-flow:tab:v1', REFS_KEY = 'kineo:recreate-flow:refs:v1'
const TTL = 2 * 60 * 60 * 1000, PHOTO_MAX = 8 * 1024 * 1024
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
export const flowDraftRefValid = (ref: unknown): ref is string => typeof ref === 'string' && UUID.test(ref)
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const only = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key))
const accountValid = (key: unknown): key is string | null => key === null || typeof key === 'string' && /^[a-z0-9_-]{1,128}$/i.test(key)
const keyValid = (key: unknown) => key === undefined || typeof key === 'string' && /^[a-z0-9._:-]{8,100}$/i.test(key)
const fresh = (at: unknown): at is number => typeof at === 'number' && Number.isFinite(at) && at >= 0 && at <= Date.now() && Date.now() - at < TTL
function slots(model: unknown): number | null {
  if (typeof model !== 'string' || !/^[a-z0-9-]{1,100}$/.test(model) || !publicRecreatePath(model)) return null
  const format = recreateFormat(model)
  return format && Number.isInteger(format.photoSlots) && format.photoSlots > 0 ? format.photoSlots : null
}
function photoValid(photo: unknown): photo is StoredPhoto {
  return object(photo) && only(photo, ['blob', 'name', 'lastModified']) && photo.blob instanceof Blob && photo.blob.size > 0 && photo.blob.size <= PHOTO_MAX && /^image\/(jpeg|png|webp)$/.test(photo.blob.type)
    && typeof photo.name === 'string' && photo.name.length > 0 && photo.name.length <= 200 && !/[\\/:?*|<>\u0000-\u001f]/.test(photo.name)
    && typeof photo.lastModified === 'number' && Number.isFinite(photo.lastModified) && photo.lastModified >= 0
}
function valid(record: unknown): record is StoredDraft {
  if (!object(record) || !only(record, ['version', 'id', 'owner', 'accountKey', 'at', 'model', 'photos', 'prompt', 'requestKey'])) return false
  const count = slots(record.model)
  return record.version === 1 && flowDraftRefValid(record.id) && flowDraftRefValid(record.owner) && accountValid(record.accountKey) && fresh(record.at) && count !== null
    && Array.isArray(record.photos) && record.photos.length === count && Array.from(record.photos).every(photoValid) && typeof record.prompt === 'string' && record.prompt.length <= 550 && keyValid(record.requestKey)
}
function pack(file: File): StoredPhoto {
  return { blob: file.slice(0, file.size, file.type), name: (file.name.replace(/[\\/:?*|<>\u0000-\u001f]/g, '_') || 'photo').slice(0, 200), lastModified: Number.isFinite(file.lastModified) && file.lastModified >= 0 ? file.lastModified : 0 }
}
function tab(create: boolean): string | null {
  const current = sessionStorage.getItem(TAB_KEY)
  if (current !== null) { if (!flowDraftRefValid(current)) throw new Error('Invalid draft tab.'); return current }
  if (!create) return null
  const id = crypto.randomUUID(); sessionStorage.setItem(TAB_KEY, id)
  if (sessionStorage.getItem(TAB_KEY) !== id) throw new Error('Draft tab was not saved.')
  return id
}
function pointers(): Pointers | null {
  const raw = sessionStorage.getItem(REFS_KEY)
  if (raw === null) return null
  const value: unknown = JSON.parse(raw)
  if (!object(value) || !only(value, ['tab', 'refs']) || !flowDraftRefValid(value.tab) || value.tab !== tab(false) || !object(value.refs)
    || !Object.entries(value.refs).every(([id, owner]) => flowDraftRefValid(id) && flowDraftRefValid(owner))) throw new Error('Invalid draft references.')
  return value as Pointers
}
function remember(ref: string, owner: string): void {
  const previous = sessionStorage.getItem(REFS_KEY), saved = pointers(), current = tab(true)!
  const raw = JSON.stringify({ tab: current, refs: { ...(saved?.refs ?? {}), [ref]: owner } })
  try { sessionStorage.setItem(REFS_KEY, raw); if (sessionStorage.getItem(REFS_KEY) !== raw) throw new Error('Draft reference was not saved.') }
  catch (error) { try { if (previous === null) sessionStorage.removeItem(REFS_KEY); else sessionStorage.setItem(REFS_KEY, previous) } catch {} throw error }
}
function forget(ref?: string): void {
  if (ref === undefined) { sessionStorage.removeItem(REFS_KEY); sessionStorage.removeItem(TAB_KEY); return }
  const saved = pointers(); if (!saved?.refs[ref]) return
  const refs = { ...saved.refs }; delete refs[ref]
  if (Object.keys(refs).length) sessionStorage.setItem(REFS_KEY, JSON.stringify({ tab: saved.tab, refs })); else sessionStorage.removeItem(REFS_KEY)
}
let pending: Promise<unknown> = Promise.resolve()
function serial<T>(work: () => Promise<T>): Promise<T> { const next = pending.then(work, work); pending = next.then(() => undefined, () => undefined); return next }
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    try {
      const request = indexedDB.open(DATABASE, 1)
      request.onupgradeneeded = () => { const store = request.result.objectStoreNames.contains(STORE) ? request.transaction!.objectStore(STORE) : request.result.createObjectStore(STORE, { keyPath: 'id' }); if (!store.indexNames.contains('at')) store.createIndex('at', 'at') }
      request.onblocked = () => { settled = true; reject(new Error('Local draft storage is blocked.')) }
      request.onerror = () => { settled = true; reject(request.error ?? new Error('Local draft storage unavailable.')) }
      request.onsuccess = () => { if (settled) { request.result.close(); return } settled = true; request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    } catch (error) { reject(error) }
  })
}
async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    try { const tx = db.transaction(STORE, mode), request = work(tx.objectStore(STORE)); tx.oncomplete = () => { db.close(); resolve(request.result) }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? request.error ?? new Error('Draft transaction failed.')) } }
    catch (error) { db.close(); reject(error) }
  })
}
/** Key-only index sweep: expire abandoned photos without enumerating their contents. */
async function expire(): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, 'readwrite'), request = tx.objectStore(STORE).index('at').openKeyCursor(IDBKeyRange.upperBound(Date.now() - TTL))
      request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue() } }
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? request.error ?? new Error('Draft expiry failed.')) }
    } catch (error) { db.close(); reject(error) }
  })
}
export const expireRecreateFlowDrafts = (): Promise<void> => serial(expire)

/** A guest return is bound atomically to its first signed-in account. */
async function readOwned(ref: string, model: string, accountKey: string | null, expectedOwner?: string): Promise<StoredDraft | null> {
  const db = await open()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, 'readwrite'), store = tx.objectStore(STORE), request = store.get(ref)
      let result: StoredDraft | null = null
      request.onsuccess = () => {
        const record: unknown = request.result
        if (!valid(record) || record.id !== ref || record.model !== model || expectedOwner !== undefined && record.owner !== expectedOwner) return
        if (record.accountKey !== null && record.accountKey !== accountKey) return
        result = record
        if (record.accountKey === null && accountKey !== null) { result = { ...record, accountKey }; store.put(result) }
      }
      tx.oncomplete = () => { db.close(); resolve(result) }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? request.error ?? new Error('Draft return failed.')) }
    } catch (error) { db.close(); reject(error) }
  })
}
/** Only a committed, verified record and opaque session reference may leave this page. */
export function saveRecreateFlowDraft(model: string, photos: File[], prompt: string, requestKey?: string, accountKey: string | null = null): Promise<string | null> {
  let snapshot: StoredPhoto[]
  try {
    if (!accountValid(accountKey) || !Array.isArray(photos) || !Array.from(photos).every(file => file instanceof File)) return Promise.resolve(null)
    snapshot = photos.map(pack)
    if (slots(model) !== snapshot.length || !snapshot.every(photoValid) || typeof prompt !== 'string' || prompt.length > 550 || !keyValid(requestKey)) return Promise.resolve(null)
  } catch { return Promise.resolve(null) }
  return serial(async () => {
    let written: string | null = null
    try {
      const record: StoredDraft = { version: 1, id: crypto.randomUUID(), owner: tab(true)!, accountKey, at: Date.now(), model, photos: snapshot, prompt, ...(requestKey === undefined ? {} : { requestKey }) }
      if (!valid(record)) return null
      await expire(); await transaction('readwrite', store => store.put(record)); written = record.id
      const stored = await transaction<unknown>('readonly', store => store.get(record.id))
      if (!valid(stored) || stored.id !== record.id || stored.owner !== record.owner || stored.accountKey !== accountKey || stored.at !== record.at || stored.model !== model || stored.prompt !== prompt || stored.requestKey !== requestKey
        || stored.photos.some((photo, i) => photo.name !== snapshot[i].name || photo.lastModified !== snapshot[i].lastModified || photo.blob.size !== snapshot[i].blob.size || photo.blob.type !== snapshot[i].blob.type)) throw new Error('Draft readback failed.')
      remember(record.id, record.owner)
      return record.id
    } catch {
      if (written) try { await transaction('readwrite', store => store.delete(written!)) } catch {}
      return null
    }
  })
}
/** Explicit ref is an opaque capability for email/OAuth return; load never consumes it. */
export function loadRecreateFlowDraft(ref: string, model: string, accountKey: string | null = null): Promise<RecreateFlowDraft | null> {
  if (!flowDraftRefValid(ref) || slots(model) === null || !accountValid(accountKey)) return Promise.resolve(null)
  return serial(async () => {
    try {
      const expectedOwner = pointers()?.refs[ref]
      await expire()
      const record = await readOwned(ref, model, accountKey, expectedOwner)
      if (!record) return null
      remember(ref, record.owner)
      return { photos: record.photos.map(photo => new File([photo.blob], photo.name, { type: photo.blob.type, lastModified: photo.lastModified })), prompt: record.prompt, ...(record.requestKey === undefined ? {} : { requestKey: record.requestKey }) }
    } catch { return null }
  })
}
/** Accepted/refused return clears its ref; logout clears only this catalog namespace. */
export function clearRecreateFlowDraft(ref?: string): Promise<void> {
  if (ref !== undefined && !flowDraftRefValid(ref)) return Promise.resolve()
  return serial(async () => { await transaction('readwrite', store => ref === undefined ? store.clear() : store.delete(ref)); forget(ref) })
}
