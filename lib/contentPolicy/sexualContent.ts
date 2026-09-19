// ═══ KINEO-RECUSA-ANTES-DE-COBRAR-2026-09-18 — conteúdo sexual não vira filme, e nunca com pessoa real ═══
//
// MEDIDO (18/09, painel de coerência, nota 30 "FORA"): pedido em espanhol descrevendo, com um político real
// nomeado, fãs arrancando a roupa, lambendo, massageando "os glúteos nus" e "cara de prazer intenso". O
// reescritor higienizou o texto (por isso "texto 0" no juiz), o filme saiu sem sentido, a pessoa pagou 3
// créditos e o painel registrou como defeito NOSSO. Fundador: "Vai no 4" (recusar antes de cobrar).
//
// REGRA: texto com vocabulário sexual explícito (nas 16 línguas da casa) é recusado na porta — Studio (sem
// navegar) e servidor (/api/generate-script e /api/analyze-idea, antes de qualquer OpenAI) — com a frase que
// diz o que a casa faz e o que não faz. Nada é cobrado: as duas rotas rodam antes de qualquer débito.
// Pessoa real nomeada é sinal a mais para a mensagem, não condição: sexo explícito não entra nem sem nome.
// A lista é curta e forte de propósito: "sexual reproduction of plants" e "sex education" não são pegos por
// palavras de ato/nudez; quem esbarrar num falso positivo tem a mensagem clara e o texto intacto para editar.

export const SEXUAL_CONTENT_REFUSAL_VERSION = 'sexual_content_refusal_v1'
export const SEXUAL_CONTENT_REFUSAL_REASON = 'sexual_content_refused'

const EXPLICIT_PATTERNS: ReadonlyArray<RegExp> = [
  // en
  /\b(naked|nude|nudes|nudity|porn|porno|pornographic|pornography|orgasm|orgasms|erotic|erotica|genitals|genitalia|penis|vagina|blowjob|handjob|masturbat\w*|sex scene|sex tape|having sex|hardcore sex|strip(?:s|ped|ping)? naked|lick(?:s|ing)? (?:his|her|their) (?:body|chest|abs|nipples|butt)|bare (?:butt|buttocks|breasts))\b/i,
  // es
  /\b(desnudos?|desnudas?|desnudar(?:le|se)?|porno|pornograf\w*|orgasmos?|er[óo]ticos?|er[óo]ticas?|pene|vagina|masturb\w*|sexo expl[íi]cito|cara de placer|lamer(?:le)? (?:el|los|las) (?:cuerpo|pectorales|abdominales|gl[úu]teos|pezones)|gl[úu]teos (?:que est[áa]n )?desnudos)\b/i,
  // pt
  /\b(pelad[oa]s?|nu[ae]?s? (?:em|na|no) cena|porn[ôo]|pornogr[áa]f\w*|orgasmos?|er[óo]tic[oa]s?|p[êe]nis|vagina|masturb\w*|sexo expl[íi]cito|cena de sexo|lamber (?:o|os|as) (?:corpo|peito|abd[ôo]men|gl[úu]teos|mamilos))\b/i,
  // fr / de / it / nl / pl / tr
  /\b(nu[es]? (?:int[ée]gral|sc[èe]ne)|porno|pornograph\w*|orgasme|[ée]rotique|p[ée]nis|masturb\w*|sc[èe]ne de sexe)\b/i,
  /\b(nackt|nacktheit|porno|pornograf\w*|orgasmus|erotisch\w*|masturb\w*|sexszene)\b/i,
  /\b(nud[oaie]|porno|pornograf\w*|orgasm[oi]|erotic[oaie]|masturb\w*|scena di sesso)\b/i,
  /\b(naakt|porno|orgasme|erotisch\w*|masturb\w*)\b/i,
  /\b(nag[oaiy]|porno|pornograf\w*|orgazm\w*|erotyczn\w*|masturb\w*)\b/i,
  /\b(çıplak|porno|pornografi\w*|orgazm|erotik|mastürb\w*|seks sahnesi)\b/i,
  // ru / uk / ar / ur / hi / id / vi
  /(голы[йеха]|обнаж[её]нн|порно|оргазм|эротич|мастурб|секс-сцен|сексуальн\w* сцен)/i,
  /(голі|оголен|порно|оргазм|еротич|мастурб)/i,
  /(عاري|عارية|إباحي|اباحي|جنسي صريح|مشهد جنسي|استمناء)/,
  /(ننگی|ننگا|فحش|جنسی منظر|مشت زنی)/,
  /(नग्न|नंगा|नंगी|अश्लील|सेक्स सीन|हस्तमैथुन|यौन दृश्य)/,
  /\b(telanjang|porno|pornografi|orgasme|erotis|masturbasi|adegan seks)\b/i,
  /(khỏa thân|khiêu dâm|cực khoái|thủ dâm|cảnh sex|cảnh nóng)/i,
]

/** Duas palavras capitalizadas seguidas (Jordan Bardella) ou "@nome": um nome próprio no pedido. */
const NAMED_PERSON = /\b[A-ZÀ-Ý][a-zà-ÿ]+ [A-ZÀ-Ý][a-zà-ÿ]+\b|@\w{3,}/

export interface SexualContentDecision {
  refuse: boolean
  reason: typeof SEXUAL_CONTENT_REFUSAL_REASON | 'ok'
  /** O pedido também nomeia alguém (sinal para a mensagem; não é condição). */
  namedPerson: boolean
  version: typeof SEXUAL_CONTENT_REFUSAL_VERSION
}

export function decideSexualContentRefusal(text: string): SexualContentDecision {
  const version = SEXUAL_CONTENT_REFUSAL_VERSION
  const t = (text ?? '').trim()
  if (!t) return { refuse: false, reason: 'ok', namedPerson: false, version }
  const hit = EXPLICIT_PATTERNS.some((re) => re.test(t))
  if (!hit) return { refuse: false, reason: 'ok', namedPerson: false, version }
  return { refuse: true, reason: SEXUAL_CONTENT_REFUSAL_REASON, namedPerson: NAMED_PERSON.test(t), version }
}

export function sexualContentRefusalMessage(namedPerson: boolean): string {
  return namedPerson
    ? 'Kineo doesn’t make sexual or explicit videos — and never about real people. Nothing was charged. Edit the idea and try again.'
    : 'Kineo doesn’t make sexual or explicit videos. Nothing was charged. Edit the idea and try again.'
}
