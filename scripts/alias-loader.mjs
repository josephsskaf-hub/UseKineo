// KINEO-ALIAS-LOADER-2026-09-05
// Gancho de resolucao para os testes .mjs importarem modulos que usam o alias
// `@/` do tsconfig. O Node 24 executa .ts direto (type stripping), mas nao le
// os `paths` do tsconfig: sem isto, so da para testar biblioteca que nao
// importa nada — foi por isso que lib/seriesContinuation.ts foi escrita "sem
// import" de proposito. Com o gancho, biblioteca de verdade tambem tem teste.
//
// Uso: node --import ./scripts/alias-loader.mjs scripts/test-xxx.mjs
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register(new URL('./alias-hooks.mjs', import.meta.url), pathToFileURL('./'))
