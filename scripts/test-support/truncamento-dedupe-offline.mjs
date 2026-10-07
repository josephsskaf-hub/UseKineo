import vm from 'node:vm'
import ts from 'typescript'

// Imports explicitamente substituídos: nenhum alias resolve módulo de produção.
export function compileOffline(source, imports = {}, globals = {}) {
  const exports = {}
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, {
    exports, module: { exports }, Date, Map, Set, URL, URLSearchParams,
    process: { env: {} }, console: { log() {}, warn() {}, error() {} },
    fetch: () => { throw new Error('Rede proibida no teste offline') },
    setTimeout: (fn) => { fn(); return 0 },
    require(id) {
      if (Object.hasOwn(imports, id)) return imports[id]
      throw new Error('Import sem dublê: ' + id)
    },
    ...globals,
  }, { timeout: 5000 })
  return exports
}

// Teto PostgREST, filtros, ordenação total, range inclusivo e falha page 2.
// A lista é reordenada fisicamente a cada leitura: sem desempate único,
// páginas distintas podem repetir/perder linhas, como num OFFSET sem ORDER.
export function memoryDb(tables, { failTable, failFrom = 1000, maxCalls = 100 } = {}) {
  const calls = [], writes = []
  return {
    calls, writes,
    from(table) {
      let filters = [], order = [], bounds = [0, 999], mutation = null
      const q = {
        select: () => q,
        eq(k, value) { filters.push((r) => r[k] === value); return q },
        in(k, values) { filters.push((r) => values.includes(r[k])); return q },
        gte(k, value) { filters.push((r) => r[k] >= value); return q },
        lte(k, value) { filters.push((r) => r[k] <= value); return q },
        order(k, { ascending = true } = {}) { order.push([k, ascending]); return q },
        range(from, to) { bounds = [from, to]; return q },
        limit(count) { bounds = [0, Math.min(count, 1000) - 1]; return q },
        insert(row) { mutation = row; return q },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (calls.length >= maxCalls) throw new Error('Leitura sem progresso')
            if (mutation) { writes.push({ table, row: mutation }); return { data: null, error: null } }
            calls.push({ table, bounds: [...bounds], order: order.map((r) => [...r]) })
            if (table === failTable && bounds[0] === failFrom) return { data: null, error: { message: 'página indisponível' } }
            let rows = [...(tables[table] ?? [])].filter((r) => filters.every((f) => f(r)))
            const missing = rows.length && order.find(([key]) => !Object.hasOwn(rows[0], key))
            if (missing) return { data: null, error: { message: 'ORDER em coluna inexistente: ' + missing[0] } }
            if (rows.length) {
              const shift = calls.length * 137 % rows.length
              rows = rows.slice(shift).concat(rows.slice(0, shift))
            }
            rows.sort((a, b) => { for (const [k, asc] of order) { const n = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0; if (n) return asc ? n : -n } return 0 })
            return { data: rows.slice(bounds[0], Math.min(bounds[1] + 1, bounds[0] + 1000)), error: null }
          }).then(resolve, reject)
        },
      }
      return q
    },
  }
}
