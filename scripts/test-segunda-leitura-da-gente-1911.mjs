// KINEO-SEGUNDA-LEITURA-DA-GENTE-1911 · B1(c) + KINEO-FICHA-IDADE-ESCRITA-1911 · B1(b) [CEO 19/11] — Node puro, sem rede: executa as libs REAIS.
// (c) o leão Aaron em francês (filme c92b352b, 16/11): o leitor do elenco o chamou de 'human' (ele lê sem as pistas [Pexels]); a 2ª leitura recebe o pedido,
//     as falas que o nomeiam e as pistas dessas seções e só troca com a citação conferida no pedido ou nas pistas. Caso inverso: gente de verdade com
//     apelido de bicho ("Marcos, o Tubarão") NÃO vira bicho. Sem gente nomeada (o filme do polvo e do tubarão, b3491d1e) = nenhuma chamada.
// (b) a idade lida da folha só entra quando o texto escreve a idade (age_text do leitor); cabelo, pele, barba e ROUPA ficam.
// Os dois atrás de interruptor 'off' (a main byte a byte) | 'internal' (só os 3 e-mails exatos do ensaio) | 'public'. Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/cinematic/segundaLeituraDaGente1911.ts', TRAVA = 'lib/cinematic/elencoTrava.ts', ELENCO = 'lib/cinematic/elencoSemantico.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'

// o roteiro REAL do c92b352b (cinematic_submission_claim de 16/11 02:24), seção por seção
const AARON = [
  { voiceover: '« Un lion blanc cherche du travail désespérément... »', pexelsQuery: 'luxury restaurant exterior' },
  { voiceover: '« Aaron, pauvre et épuisé, entre dans le restaurant. »', pexelsQuery: 'tired lion entering' },
  { voiceover: '« Les clients riches rient de lui. »', pexelsQuery: 'rich customers laughing' },
  { voiceover: '« Léon, un milliardaire, voit Aaron... et double son salaire. »', pexelsQuery: 'blue lion offering job' },
]
const TEXTO_AARON = AARON.map((s, i) => `${['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'PAYOFF'][i]}: [Pexels: ${s.pexelsQuery}] ${s.voiceover}`).join('\n\n')
const gente = (name, o = {}) => ({ name, role: null, role_text: null, kind: 'human', species: 'human', species_text: null, gender: null, age_text: null, ...o })
// o que o leitor devolveu (os dois 'human', ficha do autor "Aaron, pauvre et épuisé")
const LEITOR_AARON = { protagonist: gente('Aaron', { role_text: 'pauvre et épuisé', role: 'poor and exhausted' }), supporting: [gente('Léon', { role_text: 'un milliardaire', role: 'billionaire' })], places_and_orgs: [] }
// o inverso: gente com apelido de bicho
const MARCOS = [{ voiceover: 'Marcos, o Tubarão, nadador de 30 anos, treina às 5h da manhã.', pexelsQuery: 'swimmer training in pool' }, { voiceover: 'Ele quer o ouro.', pexelsQuery: 'gold medal podium' }]
const LEITOR_MARCOS = { protagonist: gente('Marcos', { role_text: 'nadador', role: 'swimmer', age_text: 'de 30 anos' }), supporting: [], places_and_orgs: [] }
// o filme do polvo e do tubarão (b3491d1e, 17/11): sem gente nomeada
const POLVO = [{ voiceover: 'These 3 facts sound fake... but they’re actually TRUE.', pexelsQuery: 'shocked face' }, { voiceover: 'Sharks have existed for over 400 million years.', pexelsQuery: 'shark swimming' }, { voiceover: 'Octopuses have three hearts.', pexelsQuery: 'octopus close up' }]
const LEITOR_POLVO = { protagonist: { name: null, role: 'octopus', role_text: 'octopuses', kind: 'animal', species: 'octopus', species_text: 'octopuses', gender: null, age_text: null }, supporting: [], places_and_orgs: [] }

const resposta = (characters, usage = { prompt_tokens: 420, completion_tokens: 70 }) => {
  const chamadas = []
  const f = async (url, init) => { chamadas.push(JSON.parse(init.body)); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ characters }) } }], usage }), { status: 200, headers: { 'content-type': 'application/json' } }) }
  return { f, chamadas }
}
const leao = (name, quote) => ({ name, is: 'animal', species_en: 'lion', species_in_text: 'lion', quote, nickname_or_metaphor: false })

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  const load = createOfflineLoader({ globals: { Response, setTimeout, clearTimeout, AbortController }, source: (rel, src) => over[rel] ?? src })
  let S, T, E
  try { S = load('@/' + LIB); T = load('@/' + TRAVA); E = load('@/' + ELENCO) } catch (e) { return [`libs não carregam: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)
  // ── 0 · estado e portas ──
  no(S.SEGUNDA_LEITURA_DA_GENTE_1911 !== 'off' || T.FICHA_IDADE_ESCRITA_1911 !== 'off', "A0 os dois nascem 'off' (a main byte a byte); 'public' só com revisor independente + prova paga + sim do dono")
  for (const [nome, f] of [['2ª leitura', S.segundaLeituraLigada], ['idade', T.fichaIdadeLigada]]) no(f('off', true) || f('internal', false) || !f('internal', true) || !f('public', false), `A1 ${nome}: off | internal (só a conta do ensaio) | public`)
  no(!rota.includes("segundaLeituraLigada(SEGUNDA_LEITURA_DA_GENTE_1911, isDryRunAccount(user.email))") || !rota.includes('fichaIdadeLigada(FICHA_IDADE_ESCRITA_1911, isDryRunAccount(user.email))'), 'A2 as portas da rota pela régua EXATA do ensaio (isDryRunAccount; e-mail parecido não abre)')
  no(!rota.includes("lerAncorasDaFolha(f, folhaDe.get(f.nome) as string).then((a) => fichaIdade1911 ? ancorasComIdadeDoTexto(a, idadeEscritaDoNome(idadesEscritas1911, f.nome)) : a)"), 'A3 porta da idade fechada = a âncora lida, sem mudança')
  { const iLeitor = rota.indexOf('    const pedidoSemantico = usarElencoSemantico || conferirElenco ?'), iSeg = rota.indexOf('    const segundaLeitura1911 = usarElencoSemantico && pedidoSemantico?.elenco && segundaLeituraLigada('), iTroca = rota.indexOf('if (segundaLeitura1911?.elenco && pedidoSemantico) { pedidoSemantico.elenco = segundaLeitura1911.elenco;'), iAplica = rota.indexOf('    const elencoSemantico = usarElencoSemantico && pedidoSemantico ? aplicarElencoSemantico(')
    no(!(iLeitor > 0 && iSeg > iLeitor && iTroca > iSeg && iAplica > iTroca), 'A4 a 2ª leitura roda depois do leitor e ANTES de aplicar o elenco (a ficha nasce do elenco conferido)')
    const iIdade = rota.indexOf('      const idadesEscritas1911 = nomesComIdadeEscrita(pedidoSemantico?.elenco)'), iUsa = rota.indexOf('.then((a) => fichaIdade1911 ? ancorasComIdadeDoTexto(')
    no(!(iIdade > iAplica && iUsa > iIdade), 'A5 a idade escrita vem do elenco conferido, antes das âncoras') }

  // ── C · a 2ª leitura ──
  // o defeito, como era: o leitor sozinho dá ao Aaron a ficha do autor de GENTE
  const antes = E.aplicarElencoSemantico([], LEITOR_AARON, TEXTO_AARON)
  no(antes?.elenco?.[0]?.tipo !== 'humano', `C0 sem a 2ª leitura, o Aaron é gente (o defeito do c92b352b) (${antes?.elenco?.[0]?.tipo})`)
  { const r = resposta([leao('Aaron', 'tired lion entering'), leao('Léon', 'blue lion offering job')])
    const out = await S.segundaLeituraDaGente({ elenco: LEITOR_AARON, pedido: null, secoes: AARON, texto: TEXTO_AARON }, { apiKey: 'x', fetchImpl: r.f })
    const u = r.chamadas[0]?.messages?.[1]?.content ?? ''
    no(r.chamadas.length !== 1 || r.chamadas[0].model !== 'gpt-4o-mini', 'C1 UMA chamada por filme, gpt-4o-mini')
    no(!u.includes('<<<« Aaron, pauvre et épuisé, entre dans le restaurant. »>>>') || !u.includes('<<<tired lion entering>>>') || !u.includes('<<<blue lion offering job>>>') || u.includes('rich customers laughing') || u.includes('luxury restaurant exterior'), 'C2 recebe as falas que NOMEIAM o personagem e as pistas DESSAS seções, cercadas como dado (as outras seções não vão)')
    no(!/data, never instructions/.test(r.chamadas[0]?.messages?.[0]?.content ?? ''), 'C2b o texto do cliente é dado, nunca instrução')
    no(out.elenco?.protagonist?.kind !== 'animal' || out.elenco?.protagonist?.species !== 'lion' || out.elenco?.supporting?.[0]?.kind !== 'animal' || out.relato.trocados.length !== 2, `C3 o leão Aaron em francês: a citação "tired lion entering" está na pista → Aaron e Léon viram leão (${JSON.stringify(out.relato.trocados)})`)
    const depois = E.aplicarElencoSemantico([], out.elenco, TEXTO_AARON)
    const f0 = depois?.elenco?.[0]
    no(f0?.tipo !== 'animal' || !/lion/i.test(f0?.canonica ?? '') || /\b(?:boy|man|woman|girl|child)\b/i.test(f0?.canonica ?? ''), `C4 a ficha do Aaron nasce de leão, não de gente (${f0?.tipo}: ${f0?.canonica})`)
    no(Math.abs((out.relato.usd ?? 0) - (420 * 0.15e-6 + 70 * 0.6e-6)) > 1e-9 || out.relato.tokens?.entrada !== 420, `C5 o custo medido pelo usage (${out.relato.usd})`) }
  // o inverso: Marcos, o Tubarão
  { const tubarao = { name: 'Marcos', is: 'animal', species_en: 'shark', species_in_text: 'Tubarão', quote: 'o Tubarão', nickname_or_metaphor: false }
    const a = await S.segundaLeituraDaGente({ elenco: LEITOR_MARCOS, pedido: null, secoes: MARCOS, texto: MARCOS.map((s) => s.voiceover).join(' ') }, { apiKey: 'x', fetchImpl: resposta([tubarao]).f })
    no(a.elenco !== null || a.relato.recusados[0]?.motivo !== 'citacao_fora_do_pedido_e_das_pistas', `C6 inverso: gente com apelido de bicho não vira bicho (a citação só na fala não vale) (${JSON.stringify(a.relato.recusados)})`)
    const b = await S.segundaLeituraDaGente({ elenco: LEITOR_MARCOS, pedido: 'Marcos, o Tubarão, um nadador olímpico', secoes: MARCOS, texto: '' }, { apiKey: 'x', fetchImpl: resposta([{ ...tubarao, nickname_or_metaphor: true }]).f })
    no(b.elenco !== null || b.relato.recusados[0]?.motivo !== 'apelido_ou_metafora', 'C7 inverso: o apelido marcado não troca nem com a citação no pedido')
    const c = await S.segundaLeituraDaGente({ elenco: LEITOR_MARCOS, pedido: null, secoes: MARCOS, texto: '' }, { apiKey: 'x', fetchImpl: resposta([{ name: 'Marcos', is: 'human', species_en: null, species_in_text: null, quote: null, nickname_or_metaphor: true }]).f })
    no(c.elenco !== null || c.relato.recusados[0]?.motivo !== 'concorda_humano', 'C8 a 2ª leitura concorda = nada muda') }
  // discordância sem citação conferida = nada muda
  for (const [nome, r, motivo] of [
    ['sem citação', { ...leao('Aaron', null) }, 'sem_citacao'],
    ['citação inventada', leao('Aaron', 'a big lion walks'), 'citacao_fora_do_pedido_e_das_pistas'],
    ['espécie fora da citação', { ...leao('Aaron', 'tired lion entering'), species_in_text: 'lionne' }, 'especie_fora_da_citacao'],
    ['espécie de gente', { name: 'Aaron', is: 'creature', species_en: 'boy', species_in_text: 'lion', quote: 'tired lion entering', nickname_or_metaphor: false }, 'especie_de_gente'],
  ]) {
    const out = await S.segundaLeituraDaGente({ elenco: { ...LEITOR_AARON, supporting: [] }, pedido: null, secoes: AARON, texto: TEXTO_AARON }, { apiKey: 'x', fetchImpl: resposta([r]).f })
    no(out.elenco !== null || out.relato.recusados[0]?.motivo !== motivo, `C9 ${nome}: nada muda (${JSON.stringify(out.relato.recusados)})`)
  }
  { const polvo = resposta([])
    const out = await S.segundaLeituraDaGente({ elenco: LEITOR_POLVO, pedido: null, secoes: POLVO, texto: POLVO.map((s) => s.voiceover).join(' ') }, { apiKey: 'x', fetchImpl: polvo.f })
    no(polvo.chamadas.length !== 0 || out.elenco !== null || out.relato.status !== 'sem_candidato', 'C10 sem gente nomeada (o filme do polvo e do tubarão, b3491d1e) = nenhuma chamada, nada muda')
    const quebra = await S.segundaLeituraDaGente({ elenco: LEITOR_AARON, pedido: null, secoes: AARON, texto: TEXTO_AARON }, { apiKey: 'x', fetchImpl: async () => { throw new Error('rede') } })
    no(quebra.elenco !== null || quebra.relato.status !== 'falhou', 'C11 erro de rede = nada muda, nunca lança')
    const naoCita = await S.segundaLeituraDaGente({ elenco: { protagonist: gente('Zoe'), supporting: [], places_and_orgs: [] }, pedido: null, secoes: AARON, texto: TEXTO_AARON }, { apiKey: 'x', fetchImpl: polvo.f })
    no(polvo.chamadas.length !== 0 || naoCita.elenco !== null, 'C12 nome que nenhuma fala cita = nenhuma chamada') }

  // ── B · a idade da folha ──
  const ancAaron = { idade: '10-12', cabelo: 'short dark brown', barba: 'clean-shaven', pele: 'light skin', roupa: 'yellow t-shirt', pelagem: '', porte: '' }
  const sem = T.fraseDasAncoras('humano', T.ancorasComIdadeDoTexto(ancAaron, false))
  no(sem.includes('10-12') || !sem.includes('wearing yellow t-shirt') || !sem.includes('short dark brown') || !sem.includes('clean-shaven') || !sem.includes('light skin'), `B1 sem idade escrita: a idade da folha sai; cabelo, barba, pele e ROUPA ficam (${sem})`)
  no(!T.fraseDasAncoras('humano', T.ancorasComIdadeDoTexto(ancAaron, true)).includes('10-12'), 'B2 com a idade escrita: a idade da folha fica')
  no(T.ancorasComIdadeDoTexto({ ...ancAaron, cabelo: '', barba: '', pele: '', roupa: '' }, false) !== null || T.ancorasComIdadeDoTexto(null, false) !== null, 'B3 só a idade = nenhuma âncora (a ficha fica como estava)')
  const esc = T.nomesComIdadeEscrita({ protagonist: gente('Pablo', { age_text: 'nueve años' }), supporting: [gente('Carmen'), { ...gente(null), role: 'boy', age_text: 'a 9-year-old' }] })
  no(!T.idadeEscritaDoNome(esc, 'Pablo') || T.idadeEscritaDoNome(esc, 'Carmen') || !T.idadeEscritaDoNome(esc, 'the boy') || T.idadeEscritaDoNome(T.nomesComIdadeEscrita(null), 'Pablo'), 'B4 a idade escrita é a do leitor (age_text) de cada personagem; sem leitura = nenhuma')
  no(T.idadeEscritaDoNome(T.nomesComIdadeEscrita(LEITOR_AARON), 'Aaron'), 'B5 o Aaron não tem idade escrita (o "10-12" da folha era inventado)')
  return p
}

const MUT = [
  ['2ª leitura pública', LIB, (s) => s.replace("export const SEGUNDA_LEITURA_DA_GENTE_1911: ModoSegundaLeitura1911 = 'off'", "export const SEGUNDA_LEITURA_DA_GENTE_1911: ModoSegundaLeitura1911 = 'public'")],
  ['idade pública', TRAVA, (s) => s.replace("export const FICHA_IDADE_ESCRITA_1911: ModoFichaIdade1911 = 'off'", "export const FICHA_IDADE_ESCRITA_1911: ModoFichaIdade1911 = 'public'")],
  ['rota: 2ª leitura para todos', ROTA, (s) => s.replace('segundaLeituraLigada(SEGUNDA_LEITURA_DA_GENTE_1911, isDryRunAccount(user.email))', 'segundaLeituraLigada(SEGUNDA_LEITURA_DA_GENTE_1911, true)')],
  ['rota: idade pela régua larga', ROTA, (s) => s.replace('fichaIdadeLigada(FICHA_IDADE_ESCRITA_1911, isDryRunAccount(user.email))', 'fichaIdadeLigada(FICHA_IDADE_ESCRITA_1911, isInternalEmail(user.email))')],
  ['rota: idade sem porta', ROTA, (s) => s.replace('.then((a) => fichaIdade1911 ? ancorasComIdadeDoTexto(a, idadeEscritaDoNome(idadesEscritas1911, f.nome)) : a)', '.then((a) => ancorasComIdadeDoTexto(a, idadeEscritaDoNome(idadesEscritas1911, f.nome)))')],
  ['rota: troca não aplicada', ROTA, (s) => s.replace('if (segundaLeitura1911?.elenco && pedidoSemantico) { pedidoSemantico.elenco = segundaLeitura1911.elenco;', 'if (segundaLeitura1911?.elenco && pedidoSemantico) {')],
  ['citação da fala vale', LIB, (s) => s.replace('const visto = [limpa(pedido), ...m.pistas].map(norm).filter(Boolean)', 'const visto = [limpa(pedido), ...m.pistas, ...m.falas].map(norm).filter(Boolean)')],
  ['apelido ignorado', LIB, (s) => s.replace("  if (r.nickname_or_metaphor) return { motivo: 'apelido_ou_metafora' }\n", '')],
  ['sem conferir a citação', LIB, (s) => s.replace("  if (!visto.some((v) => v.includes(q))) return { motivo: 'citacao_fora_do_pedido_e_das_pistas' }\n", '')],
  ['espécie fora da citação vale', LIB, (s) => s.replace("if (!st || !q.includes(st)) return { motivo: 'especie_fora_da_citacao' }", "if (!st) return { motivo: 'especie_fora_da_citacao' }")],
  ['espécie de gente vale', LIB, (s) => s.replace("  if (especieDePessoa(se) || especieDePessoa(st)) return { motivo: 'especie_de_gente' }\n", '')],
  ['chama sem candidato', LIB, (s) => s.replace('    if (!materiais.length || !a.elenco) return { elenco: null, relato }\n', '    if (!a.elenco) return { elenco: null, relato }\n')],
  ['todas as seções vão', LIB, (s) => s.replace("const s = secoesOuFrases(secoes, texto).filter((x) => nomeiaPersonagem(String(x.voiceover ?? ''), nome))", 'const s = secoesOuFrases(secoes, texto)')],
  ['idade sempre fica', TRAVA, (s) => s.replace('  if (!a || idadeEscrita || !a.idade) return a\n', '  return a\n')],
  ['a roupa sai junto', TRAVA, (s) => s.replace("  const b: AncorasDeAparencia = { ...a, idade: '' }", "  const b: AncorasDeAparencia = { ...a, idade: '', roupa: '' }")],
  ['idade escrita ignorada', TRAVA, (s) => s.replace('export const idadeEscritaDoNome = (escritas: ReadonlySet<string>, nome: string): boolean => escritas.has(chaveDoNome(nome))', 'export const idadeEscritaDoNome = (escritas: ReadonlySet<string>, nome: string): boolean => false')],
]
const p0 = await prova()
if (p0.length) { console.error('FAIL test-segunda-leitura-da-gente-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await prova({ [arq]: m })).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-segunda-leitura-da-gente-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-segunda-leitura-da-gente-1911 (${MUT.length} mutantes mortos)`)
