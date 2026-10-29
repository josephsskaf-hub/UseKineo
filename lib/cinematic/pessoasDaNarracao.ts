// KINEO-ELENCO-MARCADOR-2910 — gramática pura compartilhada pelo elenco e pela ficha; nenhuma chamada de rede.
const ROTULOS = String.raw`(?:HOOK|MICRO\s+REWARD|ESCALATION|RHYTHM|PAYOFF|ENDING|TWIST|SUPER\s+FINAL|CTA|OUTRO|INTRO|SCENE\s+\d+|BEAT\s+\d+)`
const TEMPO = String.raw`\(\s*\d+(?:[.,]\d+)?\s*(?:s|sec)?\s*[-–—]\s*\d+(?:[.,]\d+)?\s*(?:s|sec)?\s*\)`

// KINEO-ELENCO-MARCADOR-2910 — só o cabeçalho sai; "TWIST: Amna finds..." conserva Amna e a ação.
export function semRotulosDeSecao(texto: string): string {
  return String(texto ?? '').replace(new RegExp(String.raw`(?<![\p{L}\p{N}])(?:\d+\s*[.)-]\s*)?${ROTULOS}(?![\p{L}\p{N}])(?:\s+\d+)?(?:\s*${TEMPO}\s*:?|\s*(?::|(?=\r?\n|$)))`, 'giu'), ' ')
}

// KINEO-ELENCO-MARCADOR-2910 — os rótulos soltos também não podem ser candidatos a nome.
export const PALAVRAS_DE_SECAO = ['hook', 'micro', 'reward', 'escalation', 'rhythm', 'payoff', 'ending', 'twist', 'super', 'final', 'cta', 'outro', 'intro', 'scene', 'beat'] as const
const normaliza = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// KINEO-ELENCO-MARCADOR-2910 — termos do papel, não nomes inventados. A tradução já existente cobre as demais línguas.
const PAPEIS: ReadonlyArray<{ nucleo: string; genero: 'man' | 'woman' | null; termos: readonly string[] }> = [
  { nucleo: 'girl', genero: 'woman', termos: ['girl', 'menina', 'menininha', 'nina', 'fille', 'ragazza', 'bambina', 'fata', 'fetita', 'fetei', 'fetitei', 'madchen', 'madchens', 'لڑکی', 'लड़की', 'الفتاة'] },
  { nucleo: 'boy', genero: 'man', termos: ['boy', 'menino', 'menininho', 'nino', 'garcon', 'ragazzo', 'bambino', 'baiat', 'junge', 'jungen', 'لڑکا', 'लड़का', 'الولد'] },
  { nucleo: 'daughter', genero: 'woman', termos: ['daughter', 'filha', 'hija', 'figlia', 'fiica', 'fiicei', 'tochter', 'بیٹی', 'बेटी', 'الابنة'] },
  { nucleo: 'son', genero: 'man', termos: ['son', 'filho', 'hijo', 'fils', 'figlio', 'fiu', 'sohn', 'sohnes', 'بیٹا', 'बेटा', 'الابن'] },
  { nucleo: 'man', genero: 'man', termos: ['man', 'homem', 'hombre', 'homme', 'uomo', 'barbat', 'mann', 'mannes', 'آدمی', 'आदमी', 'الرجل'] },
  { nucleo: 'woman', genero: 'woman', termos: ['woman', 'mulher', 'mujer', 'femme', 'donna', 'femeie', 'frau', 'عورت', 'औरत', 'المرأة'] },
  { nucleo: 'child', genero: null, termos: ['child', 'kid', 'crianca', 'enfant', 'bambino', 'copil', 'kind', 'kindes', 'بچہ', 'बच्चा', 'الطفل'] },
  { nucleo: 'father', genero: 'man', termos: ['father', 'pai', 'padre', 'pere', 'tata', 'vater', 'vaters'] },
  { nucleo: 'mother', genero: 'woman', termos: ['mother', 'mae', 'madre', 'mere', 'mama', 'mutter'] },
  { nucleo: 'grandfather', genero: 'man', termos: ['grandfather', 'grandpa', 'avo', 'abuelo', 'grand-pere', 'nonno', 'bunic', 'grossvater'] },
  { nucleo: 'grandmother', genero: 'woman', termos: ['grandmother', 'grandma', 'abuela', 'grand-mere', 'nonna', 'bunica', 'grossmutter'] },
]
const TERMOS = PAPEIS.flatMap((p) => p.termos).sort((a, b) => b.length - a.length).map(escapa).join('|')
// KINEO-ELENCO-MARCADOR-2910 — a tradução inglesa já extrai o papel; aliases flexionados ligam esse papel à FALA original.
// Só identificação lexical, sem supor posição proporcional nem inventar gramática possessiva para outra língua.
const ALIASES_DA_FALA: Readonly<Record<string, readonly string[]>> = {
  girl: ['девочка', 'девочки', 'девочку', 'девочке', 'девочкой', 'девушка', 'девушки', 'девушку', 'дівчинка', 'дівчинки', 'дівчинку', 'дівчинці', 'дівчинкою', 'kız', 'kızın', 'kızı', 'kızının', 'kıza', 'meisje', 'meisjes', 'dziewczynka', 'dziewczynki', 'dziewczynkę', 'dziewczynce', 'dziewczynką', 'gadis', 'anak perempuan', 'cô bé', 'bé gái', 'cô gái'],
  boy: ['мальчик', 'мальчика', 'мальчику', 'мальчиком', 'хлопчик', 'хлопчика', 'хлопчику', 'хлопчиком', 'oğlan', 'oğlanın', 'oğlanı', 'jongen', 'jongens', 'chłopiec', 'chłopca', 'chłopcu', 'chłopcem', 'anak laki-laki', 'bocah lelaki', 'cậu bé', 'bé trai'],
  daughter: ['fille', 'дочь', 'дочери', 'дочку', 'дочка', 'дочке', 'донька', 'доньки', 'доньку', 'доньці', 'дочки', 'kızı', 'kızının', 'kızına', 'dochter', 'dochters', 'córka', 'córki', 'córkę', 'córce', 'córką', 'putri', 'putrinya', 'anak perempuannya', 'con gái'],
  son: ['сын', 'сына', 'сыну', 'сыном', 'син', 'сина', 'сину', 'сином', 'oğul', 'oğlu', 'oğlunun', 'oğluna', 'zoon', 'zoons', 'syn', 'syna', 'synowi', 'synem', 'putra', 'putranya', 'anak laki-lakinya', 'con trai'],
  man: ['мужчина', 'мужчины', 'мужчину', 'старик', 'старика', 'чоловік', 'чоловіка', 'чоловіку', 'adam', 'adamın', 'adamı', 'mannen', 'mężczyzna', 'mężczyzny', 'mężczyznę', 'pria', 'lelaki', 'laki-laki', 'người đàn ông', 'ông lão'],
  woman: ['женщина', 'женщины', 'женщину', 'жінка', 'жінки', 'жінку', 'kadın', 'kadının', 'kadını', 'vrouw', 'vrouwen', 'kobieta', 'kobiety', 'kobietę', 'wanita', 'perempuan', 'người phụ nữ', 'bà lão'],
  child: ['ребёнок', 'ребенка', 'ребёнка', 'ребенку', 'ребёнку', 'дитина', 'дитини', 'дитину', 'çocuk', 'çocuğun', 'çocuğu', 'kinderen', 'dziecko', 'dziecka', 'dziecku', 'anak', 'đứa trẻ'],
  father: ['отец', 'отца', 'отцу', 'батько', 'батька', 'батьку', 'baba', 'babanın', 'babası', 'vader', 'vaders', 'ojciec', 'ojca', 'ojcu', 'ayah', 'ayahnya', 'người cha'],
  mother: ['мать', 'матери', 'маму', 'мати', 'матір', 'матері', 'anne', 'annenin', 'annesi', 'moeder', 'moeders', 'matka', 'matki', 'matkę', 'ibu', 'ibunya', 'người mẹ'],
  grandfather: ['дедушка', 'дедушки', 'дедушку', 'дідусь', 'дідуся', 'дідусю', 'dede', 'dedenin', 'dedesi', 'grootvader', 'opa', 'dziadek', 'dziadka', 'dziadku', 'kakek', 'kakeknya', 'ông nội', 'ông ngoại'],
  grandmother: ['бабушка', 'бабушки', 'бабушку', 'бабуся', 'бабусі', 'бабусю', 'babaanne', 'babaannenin', 'anneanne', 'anneannenin', 'grootmoeder', 'oma', 'babcia', 'babci', 'babcię', 'nenek', 'neneknya', 'bà nội', 'bà ngoại'],
}
const QUALIS = 'little|tiny|small|young|old|elderly|sad|happy|lonely|poor|rich|tired|pequen[ao]|petite?|piccol[ao]|mic[ao]?|kleinen?|alten?|velh[oa]|ancian[oa]|vieux|vieille|vieil|vecchi[oa]|batran[a]?|chica|chico|چھوٹی|چھوٹا|بوڑھے|छोटी|छोटे|बूढ़े'
const PAPEL = String.raw`(?:(?:${QUALIS})\s+){0,3}(?:${TERMOS})`
const EN = new RegExp(String.raw`(?<!\p{L})(?:(?:a|an|the|his|her|their|our|my|your)\s+)?(${PAPEL})['’]s\b`, 'giu')
const ROMANCE = new RegExp(String.raw`(?<!\p{L})(?:de\s+(?:la|el|los|las|mi|su|sa|ma|mon|son|notre|leur)|de\s+l['’]|de|do|da|du|des|del|della|dello|dell'|di|al|ale|lui|der|seiner|seines)\s*(?:(?:sua|seu|minha|meu|suo|sua)\s+)?(${PAPEL})(?!\p{L})`, 'giu')
const SUL_ASIA = new RegExp(String.raw`(${PAPEL})\s+(?:کا|کی|کے|का|की|के)(?!\p{L})`, 'giu')
const ROMENO = /(?<!\p{L})(fetei|fetitei|fiicei)(?!\p{L})/giu

export interface PessoaPossessiva { // KINEO-ELENCO-MARCADOR-2910
  nucleo: string
  papel: string
  descricao: string
  genero: 'man' | 'woman' | null
  posicao: number
  objeto: string | null
}

// KINEO-ELENCO-MARCADOR-2910 — relação visível pedida pelo próprio texto, sem inventar um objeto que não foi citado.
function objetoDaFrase(texto: string, pos: number): string | null {
  const inicio = Math.max(texto.lastIndexOf('.', pos - 1), texto.lastIndexOf('\n', pos - 1), texto.lastIndexOf('/', pos - 1)) + 1
  const cauda = texto.slice(pos)
  const fim = cauda.search(/[.!?\n/]/)
  const frase = normaliza(texto.slice(inicio, fim < 0 ? texto.length : pos + fim))
  if (/teddy\s+bear|ursinho|oso\s+de\s+peluche|ours\s+en\s+peluche|orsacchiotto|ursulet|teddybar/.test(frase)) return /glow|lights?\s+up|acend|brilh|illumin|enciend|leucht/.test(frase) ? 'holding the glowing teddy bear' : 'holding the teddy bear'
  if (/\bbike\b|bicycle|bicicleta|bicicletta|velo|fahrrad/.test(frase)) return 'beside the bicycle'
  if (/\bhat\b|chapeu|sombrero|chapeau|cappello|palarie|\bhut\b/.test(frase)) return 'with the hat'
  return null
}

// KINEO-ELENCO-MARCADOR-2910 — o possessivo torna o dono parte do elenco, mesmo sem verbo ou nome próprio.
export function pessoasPossessivas(texto: string): PessoaPossessiva[] {
  const limpo = normaliza(semRotulosDeSecao(String(texto ?? '').replace(/\[[^\]]*\]/g, ' ')))
  const saida: PessoaPossessiva[] = []
  for (const re of [EN, ROMANCE, SUL_ASIA, ROMENO]) {
    for (const m of limpo.matchAll(re)) {
      const literal = m[1]
      const tipo = PAPEIS.find((p) => p.termos.some((t) => new RegExp(String.raw`(?<!\p{L})${escapa(t)}$`, 'u').test(literal)))
      if (!tipo) continue
      const velho = /old|elderly|velh|ancian|vieux|vieille|vecchi|batran|alten|بوڑھے|बूढ़े/.test(literal)
      const pequeno = /little|tiny|small|pequen|petit|piccol|mic|klein|چھوٹ|छोटी|छोटे/.test(literal)
      const papel = `${velho ? 'elderly ' : pequeno ? 'little ' : ''}${tipo.nucleo}`
      const posicao = (m.index ?? 0) / Math.max(1, limpo.length)
      if (saida.some((p) => p.nucleo === tipo.nucleo && p.posicao === posicao)) continue
      saida.push({ nucleo: tipo.nucleo, papel, descricao: `${/^[aeiou]/.test(papel) ? 'an' : 'a'} ${papel}`, genero: tipo.genero, posicao, objeto: objetoDaFrase(limpo, m.index ?? 0) })
    }
  }
  return saida.sort((a, b) => a.posicao - b.posicao)
}

// KINEO-ELENCO-MARCADOR-2910 — a fala original é a autoridade da posição; nunca se usa a posição relativa do roteiro traduzido.
export function falaCitaPessoa(fala: string, nucleo: string): boolean {
  const tipo = PAPEIS.find((p) => p.nucleo === nucleo)
  const texto = normaliza(semRotulosDeSecao(String(fala ?? '').replace(/\[[^\]]*\]/g, ' ')))
  return !!tipo && [...tipo.termos, ...(ALIASES_DA_FALA[nucleo] ?? [])].some((t) => new RegExp(String.raw`(?<!\p{L})${escapa(normaliza(t))}(?!\p{L})`, 'u').test(texto)) // KINEO-ELENCO-MARCADOR-2910
}

// KINEO-ELENCO-MARCADOR-2910 — "girl's teddy" não é menina visível; "girl holding her teddy" é. Idempotente no prompt corrigido.
export function cenaMostraPessoa(prompt: string, nucleo: string): boolean {
  // KINEO-ELENCO-MARCADOR-2910 — ficha colada ao prompt não comprova presença na ação (o ursinho da menina tinha essa ficha).
  // Os construtores clássicos colocam a ação ANTES dessas cláusulas; a inserção "Character in this shot" fica na frente e conserva idempotência.
  let texto = normaliza(prompt.split(/The same main character appears in this scene, consistent design:|Recurring characters, identical face, hair and costume in every scene where they appear:|Character in this scene:/i)[0])
  for (const re of [EN, ROMANCE, SUL_ASIA, ROMENO]) texto = texto.replace(re, ' ')
  return falaCitaPessoa(texto, nucleo)
}
