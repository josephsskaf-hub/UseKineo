// KINEO-TRENDING-INVENTARIO-2510 — exact single-line historical-test adapter.
// No original source hash or manifest is changed; no filesystem mutation or network.
import { readFileSync } from 'node:fs'
const swap = JSON.parse(readFileSync(new URL('./desfaz-trending-inventario-2510-troca.json', import.meta.url), 'utf8'))

export function semTrendingInventario2510(text, file) {
  if (typeof text !== 'string' || String(file ?? '').replace(/\\/g, '/') !== swap.file) return text
  const normalized = text.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const matches = lines.filter(line => line === swap.after).length
  if (!matches && !normalized.includes('KINEO-TRENDING-INVENTARIO-2510')) return text
  if (matches !== 1) throw new Error('desfaz Trending inventario: linha divergente')
  const restored = lines.map(line => line === swap.after ? swap.before : line).join('\n')
  return text.includes('\r\n') ? restored.replace(/\n/g, '\r\n') : restored
}
