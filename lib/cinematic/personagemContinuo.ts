// KINEO-LUGAR-UNICO-PLANEJADOR-1111 [CEO 11/11: "Se a regra achatar um documentário, reescreva-a para valer só em história de UM personagem
// contínuo"] — o ensaio do planejador (gpt-4o-mini, 4 rodadas) mostrou que a regra "ONE PLACE" sempre ligada achata documentário (Veteranos:
// "In the same tranquil French countryside"… "Back in the same forest"), e que pedir ao GPT para decidir sozinho "é história de um personagem?"
// não funciona (o boneco ficou sem lugar). E o decidirFormato chama os Veteranos de character_story ("a soldier"). Aqui a decisão é do CÓDIGO:
// o MESMO personagem (um substantivo de gente/bicho/criatura) aparece em pelo menos metade das falas, e em pelo menos duas. Nome próprio não
// conta ("Vesuvius" está em 3 das 4 falas da Pompeia). Puro: sem rede.

// KINEO-LUGAR-UNICO-PLANEJADOR-1111 (ajuste da CEO, 11/11 20:50) — gente só no SINGULAR: "the men marched… the men waited…" num documentário de
// guerra contava como "man" em metade das falas e a linha ONE PLACE achataria o filme (o defeito da v1). Personagem contínuo é singular; "two
// kids" fica sem a linha (como antes, sem regressão). Bicho no plural pode ficar.
const CABECA = '(?:stick (?:man|figure)|man|woman|boy|girl|kid|child|baby|guy|lady|grandma|grandpa|grandmother|grandfather|mom|dad|mother|father|teen|teenager|cat|cats|kitten|kittens|dog|dogs|puppy|puppies|robot|robots|alien|aliens|dragon|dragons|monster|monsters|bear|bears|rabbit|rabbits|bunny|fox|bird|birds|dinosaur|dinosaurs|penguin|penguins|panda|pandas|monkey|monkeys|duck|ducks|frog|frogs|unicorn|unicorns|princess|prince|knight|wizard|witch|pirate|astronaut|chef|farmer)'
const CABECA_RE = new RegExp(`(?<![\\p{L}])${CABECA}(?![\\p{L}])`, 'giu')
const SINGULAR: Record<string, string> = { puppies: 'puppy', kittens: 'kitten' }
const base = (w: string) => { const l = w.toLowerCase().replace(/\s+/gu, ' '); return SINGULAR[l] ?? l.replace(/s$/u, '') }

/** O personagem que atravessa o roteiro ("stick man"), ou null quando nenhum aparece em ≥ metade das falas (e em ≥ 2). */
export function personagemContinuo(falas: readonly unknown[]): string | null {
  const linhas = falas.map((f) => String(f ?? '')).filter((t) => t.trim())
  if (linhas.length < 2) return null
  const conta = new Map<string, number>()
  for (const t of linhas) {
    // "stick man" vence "man" na mesma fala
    const achados = new Set([...t.matchAll(CABECA_RE)].map((m) => base(m[0])))
    if (achados.has('stick man') || achados.has('stick figure')) { achados.delete('man'); achados.delete('stick figure'); achados.add('stick man') }
    for (const a of achados) conta.set(a, (conta.get(a) ?? 0) + 1)
  }
  let melhor: [string, number] | null = null
  for (const par of conta) if (!melhor || par[1] > melhor[1]) melhor = par
  if (melhor && melhor[1] >= 2 && melhor[1] * 2 >= linhas.length) return melhor[0]
  return nomeContinuo(linhas)
}

// KINEO-LUGAR-UNICO-NOME-1211 [CEO 12/11 madrugada] — o protagonista com NOME próprio (o Leo do /kids-cartoon, o único pagante de 11/11) não contava: só
// substantivo comum contava, porque "Vesuvius" está em 3 das 4 falas da Pompeia. Agora o nome próprio conta quando (1) está em ≥ metade das falas e em
// ≥ 2, (2) FAZ coisa de gente em pelo menos uma ("Leo clapped", "asked Leo") — o Vesuvius só "erupts" —, e (3) o roteiro não tem ANO (documentário e
// biografia têm data: Veteranos 1918, Mona Lisa 1913 — a linha do lugar único achataria esses filmes).
const VERBO_DE_GENTE = '(?:said|says|asked|asks|laughed|laughs|cheered|cheers|smiled|smiles|looked|looks|covered|covers|clapped|claps|whispered|whispers|cried|cries|ran|runs|walked|walks|jumped|jumps|played|plays|counted|counts|found|finds|waited|waits|thought|thinks|felt|feels|squinted|squints|giggled|giggles|shouted|shouts|hugged|hugs|opened|opens|picked|picks|wondered|wonders|decided|decides|sat|sits|stood|stands|woke|wakes|sang|sings|danced|dances|hid|hides|peeked|peeks)'
const ANO_RE = /\b1[5-9]\d\d\b|\b20\d\d\b|\b(?:eighteen|nineteen|seventeen|sixteen|twenty)[- ](?:hundred|oh|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/iu
function nomeContinuo(linhas: readonly string[]): string | null {
  const tudo = linhas.join(' ')
  if (ANO_RE.test(tudo)) return null
  const nomes = new Map<string, number>()
  for (const t of linhas) for (const n of new Set([...t.matchAll(/(?<![\p{L}])(\p{Lu}[\p{Ll}]{2,})(?![\p{L}])/gu)].map((m) => m[1]))) nomes.set(n, (nomes.get(n) ?? 0) + 1)
  let melhor: [string, number] | null = null
  for (const [n, c] of nomes) {
    if (c < 2 || c * 2 < linhas.length) continue
    // nome de verdade aparece com maiúscula no MEIO da frase ("asked Leo"); "She", "The", "Every" só no começo
    if (!new RegExp(`(?<=[\\p{Ll}\\p{N},;:]\\s)${n}(?![\\p{L}])`, 'u').test(tudo)) continue
    const age = new RegExp(`(?<![\\p{L}])${n}(?:'s)?\\s+(?:\\p{Ll}+ly\\s+)?${VERBO_DE_GENTE}(?![\\p{L}])|(?<![\\p{L}])(?:said|asked|cried|whispered|shouted)\\s+${n}(?![\\p{L}])`, 'u')
    if (!age.test(tudo)) continue
    if (!melhor || c > melhor[1]) melhor = [n, c]
  }
  return melhor ? melhor[0] : null
}

/** A linha do prompt do planejador — a v1 do ensaio, a única que deixou o boneco num lugar só. */
export const REGRA_UM_LUGAR = 'ONE PLACE (KINEO-LUGAR-UNICO-1111): unless a voiceover line itself moves the story somewhere else, every visual_prompt happens in the SAME place and names it in words at the start ("In the same <that place>, …" — the place this story needs, never a stock example); if the idea names no place, choose ONE place that fits it and repeat it in every scene — never let a scene drift to a new location.'
