// KINEO-ANO-INVENTADO-0211 — guardião: o escritor nunca inventa o ano.
// [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
//
// Caso real (02/11/2026): a ideia "In today's world, understanding money is crucial. Use it wisely to build your future…"
// (sem ano nenhum) virou o gancho "Want to master your money game in 2023?" — gravado no filme como título e legenda.
// O "agora" do treino do modelo vazava para o roteiro.
//
// Prova, EXECUTANDO os system prompts reais (trechos do código das rotas, relógio fixo injetado), nunca uma cópia:
//   A. lib/dataRealDoEscritor: a regra única + a data do relógio (injetável; padrão = agora, no pedido);
//   B. /api/generate-script (o escritor da ideia — idea_written_on_server delega a ele): buildSystemPrompt traz data + regra,
//      e as 3 chamadas ao modelo (1ª, nova tentativa, resgate da recusa) partem dele;
//   C. /api/analyze-idea: o brief (viral_title/hook/captions/voiceover) e os 2 diretores visuais (viral_title + captions)
//      trazem data + regra; o único system prompt sem a regra é o de pontuação (proibido mudar qualquer palavra).
// Rodar: npx tsx scripts/test-ano-inventado-0211.mts   (sem rede, sem custo)
import fs from 'node:fs'
import ts from 'typescript'

let ok = 0
const falhas: string[] = []
function checa(nome: string, cond: unknown) {
  if (cond) { ok++; console.log('  ok  ' + nome) } else { falhas.push(nome); console.log('  XX  ' + nome) }
}
const lf = (t: string) => t.replace(/\r\n/g, '\n')
const GS = lf(fs.readFileSync('app/api/generate-script/route.ts', 'utf8'))
const AI = lf(fs.readFileSync('app/api/analyze-idea/route.ts', 'utf8'))
const js = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
function roda(code: string, env: Record<string, unknown>) {
  const nomes = Object.keys(env)
  return new Function(...nomes, js(code))(...nomes.map((n) => env[n]))
}
/** A função inteira `function nome(...) {...}` do código real (por contagem de chaves fora de strings simples). */
function funcao(src: string, nome: string): string | null {
  const a = src.indexOf(`function ${nome}(`)
  if (a < 0) return null
  const corpo = src.indexOf('{\n', a)
  let nivel = 0
  for (let i = corpo; i < src.length; i++) {
    if (src[i] === '{') nivel++
    else if (src[i] === '}') { nivel--; if (nivel === 0) return src.slice(a, i + 1) }
  }
  return null
}
/** As expressões `content:` de toda mensagem `role: 'system'` da rota. */
function sistemas(src: string): string[] {
  const out: string[] = []
  const re = /role:\s*'system',\s*content:\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, nivel = 0, q: string | null = null
    const ini = i
    for (; i < src.length; i++) {
      const c = src[i]
      if (q) { if (c === '\\') { i++; continue } if (c === q) q = null; continue }
      if (c === "'" || c === '"' || c === '`') { q = c; continue }
      if (c === '(' || c === '[' || c === '{') nivel++
      else if (c === ')' || c === ']' || c === '}') { if (nivel === 0) break; nivel-- }
      else if (c === ',' && nivel === 0) break
    }
    out.push(src.slice(ini, i).trim())
  }
  return out
}

let lib: typeof import('../lib/dataRealDoEscritor') | null = null
try { lib = await import('../lib/dataRealDoEscritor') } catch { lib = null }
const RELOGIO = new Date('2026-11-02T15:30:00Z')
const HOJE = new Date().toISOString().slice(0, 10)
const REGRA_ESPERADA = "Never mention a specific year, date or 'this year' unless the user's own text contains it; if the user's text names a year, keep it exactly."
// Sem a lib (origin/main), a regra esperada entra como dublê: assim B/C ainda provam que a ROTA a chama.
const fixo = () => lib ? lib.regraDaDataReal(RELOGIO) : `TODAY'S REAL DATE: 2026-11-02. ${REGRA_ESPERADA}`
const relogioReal = () => lib ? lib.regraDaDataReal() : `TODAY'S REAL DATE: ${HOJE}. ${REGRA_ESPERADA}`
const temRegraEData = (p: unknown, data = '2026-11-02') => typeof p === 'string' && p.includes(REGRA_ESPERADA) && p.includes(data)

// ─────────────────────────────────────────────────────────────────────────────
console.log('== A. a regra única ==')
checa('A0 lib/dataRealDoEscritor existe', lib !== null)
if (lib) {
  checa('A1 REGRA_ANO_INVENTADO é a regra pedida, literal', lib.REGRA_ANO_INVENTADO === REGRA_ESPERADA)
  checa('A2 relógio injetado → a data dele (2026-11-02) + a regra', temRegraEData(lib.regraDaDataReal(RELOGIO)))
  checa('A3 sem relógio → a data de hoje, calculada no pedido', temRegraEData(lib.regraDaDataReal(), HOJE))
  checa('A4 outro dia → outra data (nada fixo no código)', lib.regraDaDataReal(new Date('2031-01-15T00:00:00Z')).includes('2031-01-15'))
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('== B. /api/generate-script (escritor da ideia) ==')
checa('B0 importa a regra do módulo único', /import \{[^}]*\bregraDaDataReal\b[^}]*\} from '@\/lib\/dataRealDoEscritor'/.test(GS))
checa('B0b o escritor da ideia (idea_written_on_server) delega ao /api/generate-script',
  lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')).includes("escritor: async (corpo) => { const r = await escritorMarcadoDoGenerateScript(new NextRequest(new URL('/api/generate-script'"))
const bspGS = funcao(GS, 'buildSystemPrompt')
checa('B1 buildSystemPrompt achado', !!bspGS)
if (bspGS) {
  const env = {
    LANGUAGE_NAMES: { pt: 'Portuguese (Brazil)', es: 'Spanish' }, WORDS_PER_SECOND: 2.3, MIN_COVERAGE: 0.95,
    minWordsFor: () => 130, maxWordsFor: () => 170,
  }
  let en: unknown = null, pt: unknown = null, curto: unknown = null, real: unknown = null
  try {
    en = roda(`${bspGS}\nreturn buildSystemPrompt('en', 60)`, { ...env, regraDaDataReal: fixo })
    pt = roda(`${bspGS}\nreturn buildSystemPrompt('pt', 35)`, { ...env, regraDaDataReal: fixo })
    curto = roda(`${bspGS}\nreturn buildSystemPrompt('en', 15)`, { ...env, regraDaDataReal: fixo })
    real = roda(`${bspGS}\nreturn buildSystemPrompt('en', 90)`, { ...env, regraDaDataReal: relogioReal })
  } catch (e) { console.log('     (erro ao executar: ' + (e as Error).message + ')') }
  checa('B2 inglês 60 s: data do relógio + regra', temRegraEData(en))
  checa('B3 português 35 s: data do relógio + regra', temRegraEData(pt))
  checa('B4 filme curto 15 s: data do relógio + regra', temRegraEData(curto))
  checa('B5 relógio real: a data de hoje', temRegraEData(real, HOJE))
}
const sisGS = sistemas(GS)
checa('B6 as 3 chamadas ao modelo têm system prompt', sisGS.length === 3)
checa('B7 todas partem do SYSTEM_PROMPT (1ª e nova tentativa via PROMPT_DO_ROTEIRO; resgate direto)',
  sisGS.length > 0 && sisGS.every((e) => /^(PROMPT_DO_ROTEIRO|SYSTEM_PROMPT\b)/.test(e)))
checa('B8 SYSTEM_PROMPT = buildSystemPrompt(...) e PROMPT_DO_ROTEIRO = SYSTEM_PROMPT + ...',
  /const SYSTEM_PROMPT = buildSystemPrompt\(/.test(GS) && /const PROMPT_DO_ROTEIRO = SYSTEM_PROMPT \+/.test(GS))

// ─────────────────────────────────────────────────────────────────────────────
console.log('== C. /api/analyze-idea (brief + diretores visuais: título e legendas na tela) ==')
checa('C0 importa a regra do módulo único', /import \{[^}]*\bregraDaDataReal\b[^}]*\} from '@\/lib\/dataRealDoEscritor'/.test(AI))
const bspAI = funcao(AI, 'buildSystemPrompt')
const langAI = funcao(AI, 'languageInstruction')
checa('C1 buildSystemPrompt achado', !!bspAI && !!langAI)
if (bspAI && langAI) {
  const env = {
    durationPlanFor: (d: number) => ({ duration: d, wordCountRange: [80, 100], sceneCount: 5 }),
    MICRO_KNOWLEDGE_SYSTEM_RULES: 'MK', SAFE_COMPOSITION_RULES: 'SC', LANGUAGE_NAMES: { pt: 'Portuguese (Brazil)' },
    regraDePessoasReais: (s: string) => s, ESTRELA_REAL_PEOPLE_EXCEPTION: 'EX',
  }
  let en: unknown = null, pt: unknown = null, real: unknown = null
  try {
    en = roda(`${langAI}\n${bspAI}\nreturn buildSystemPrompt(60, 'en', false)`, { ...env, regraDaDataReal: fixo })
    pt = roda(`${langAI}\n${bspAI}\nreturn buildSystemPrompt(35, 'pt', true)`, { ...env, regraDaDataReal: fixo })
    real = roda(`${langAI}\n${bspAI}\nreturn buildSystemPrompt(60, 'en', false)`, { ...env, regraDaDataReal: relogioReal })
  } catch (e) { console.log('     (erro ao executar: ' + (e as Error).message + ')') }
  checa('C2 brief em inglês: data do relógio + regra', temRegraEData(en))
  checa('C3 brief em português (estrela): data do relógio + regra', temRegraEData(pt))
  checa('C4 relógio real: a data de hoje', temRegraEData(real, HOJE))
}
const sisAI = sistemas(AI)
const pontuacao = sisAI.filter((e) => e.includes('Improve ONLY the punctuation'))
const escritores = sisAI.filter((e) => !e.includes('Improve ONLY the punctuation'))
checa('C5 4 system prompts: 1 de pontuação (não muda palavra) + 3 escritores', pontuacao.length === 1 && escritores.length === 3)
checa('C6 o brief usa buildSystemPrompt', escritores.some((e) => e.startsWith('buildSystemPrompt(')))
const diretores = escritores.filter((e) => !e.startsWith('buildSystemPrompt('))
checa('C7 os 2 diretores visuais (viral_title + captions) achados', diretores.length === 2)
diretores.forEach((e, i) => {
  let p: unknown = null
  try { p = roda(`return (${e})`, { regraDaDataReal: fixo }) } catch { p = null }
  checa(`C8.${i + 1} diretor visual ${i + 1}: data do relógio + regra`, temRegraEData(p))
  checa(`C9.${i + 1} diretor visual ${i + 1}: o resto do prompt intacto`, typeof p === 'string' && p.startsWith('You are a cinematic video director. Return valid JSON only — no markdown, no code blocks.'))
})

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
