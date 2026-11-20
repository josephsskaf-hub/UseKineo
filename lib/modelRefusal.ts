// KINEO1-JUIZ-HONESTO-2026-09-21 — a RECUSA do modelo virou filme (e nota 100).
//
// Diagnóstico de 18/09 (docs/KINEO1-DIAGNOSTICO-2026-09-18.md, filme 33c24d46): o roteirista devolveu
// "I'm sorry, but I can't assist with that request", o Kineo 1 narrou a frase em 6 cenas, o juiz deu texto 100
// ("segue o pedido") e a pessoa pagou 5 créditos por um filme que é um pedido de desculpas. Fonte única para as
// duas portas: o escritor (recusa antes do gasto) e o juiz (nota 0 sem GPT quando o filme antigo já nasceu assim).
//
// KINEO-RECUSA-IA-2011 [CEO 20/11; filme grátis d700489f, DE, 19/11 21:40Z] — a 2ª tentativa do escritor devolveu
// "I'm sorry, I can't assist with that." (SEM o "but" e sem "request") e a régua antiga não reconheceu: a frase virou
// o roteiro, a ideia do servidor, o prompt do motor e a narração em russo ("Извините, но я не могу оказать помощь…").
// 30 dias no banco: a mesma frase em 3 pessoas (24/10, 28/10, 19/11) e "I'm sorry, but I can only provide scripts in
// US English…" entregue como filme em 19/10 (c17d2e78). Agora a régua é a do TEXTO INTEIRO: recusa é quando o texto
// COMEÇA por uma frase de recusa (EN, PT, ES, DE, FR, IT, RU, UK, PL, NL, TR, ZH, JA) e o resto é curto ou é conversa
// do modelo com a pessoa ("However…", "If you…"). Fala de personagem ("I'm sorry, Mom", "Desculpe pelo atraso",
// '"I'm sorry, I can't help you," the doctor said') nunca dispara: o verbo precisa ser o de assistente (assist/help
// WITH THAT, comply, fulfill, provide…), a frase não pode estar entre aspas nem ter vocativo, e a recusa no meio de
// uma história não conta. Este arquivo continua sem import (os guardiões o carregam sozinho num vm).

const FIM = String.raw`(?=[\s.,!?;:…。！？،]|$)`
// o objeto de assistente depois do verbo: "with that", "this request", "that.", fim de frase. "help you" (fala de gente) não casa.
const OBJ_EN = String.raw`(?:\s+(?:you\s+)?(?:with|on|in|for)\s+(?:that|this|your|such|these|any|the(?:\s+\S+)?\s+request)\b|\s+(?:that|this|such|these)(?:\s+(?:kind|type|sort)\s+of\s+\S+|\s+(?:request|content|script|video|story|topic|information|one))?\s*(?:[.!…,]|$)|\s+(?:requests?|content|assistance|information)\b|\s*(?:[.!…]|$))`
// sem make/do/continue/support: "I'm sorry, I can't make it tonight" é fala de gente
const VERBO_EN = String.raw`(?:assist|help|comply|fulfil+|provide|create|generate|write|produce|engage)`
const NAO_POSSO_EN = String.raw`(?:can['’]?t|cannot|can not|am unable to|['’]m unable to|am not able to|['’]m not able to|won['’]?t be able to|will not be able to|must decline to|am not allowed to)`
const OBJ_PT = String.raw`(?:\s+(?:voc[êe]\s+)?(?:com\s+(?:isso|esse|essa|este|esta|seu|sua|tal|o seu|a sua)|nisso|nesse|nessa|neste|nesta)${FIM}[^.!?]{0,40}|\s+(?:isso|esse|essa|este|esta|seu|sua)${FIM}|\s*(?:[.!…]|$))`
const OBJ_ES = String.raw`(?:\s+(?:con|en)\s+(?:eso|esto|esa|esta|ese|este|tu|su)${FIM}[^.!?]{0,40}|\s+(?:eso|esto|esa|esta|tu|su)${FIM}|\s*(?:[.!…]|$))`
const OBJ_IT = String.raw`(?:\s+(?:con|in)\s+(?:questo|questa|ciò|quello|quella|la tua|il tuo)${FIM}[^.!?]{0,40}|\s+(?:questa|questo|la tua|il tuo)${FIM}|\s*(?:[.!…]|$))`
const OBJ_RU = String.raw`(?:\s+(?:с|в|по)\s+(?:этим|этой|этом|данн\S*|ваш\S*|таким\S*|подобн\S*)[^.!?]{0,40}|\s+(?:этот|эту|это|ваш\S*|данн\S*|такой|такое|такую|подобн\S*)${FIM}|\s*(?:[.!…]|$))`

/** Frase (já sem aspas e espaço sobrando) que ABRE uma recusa de assistente. */
const RECUSA_DA_FRASE: ReadonlyArray<RegExp> = [
  // EN — "I'm sorry, (but) I can't assist with that." · "Sorry, I cannot help with this request." · "Unfortunately, I can't…"
  new RegExp(String.raw`^(?:(?:I['’]?m|I am)\s+)?(?:so\s+|very\s+|really\s+|truly\s+)?(?:sorry|afraid|apologi[sz]e)[,!.]?\s*(?:but\s*,?\s*)?(?:I|we)\s*${NAO_POSSO_EN}\s+(?:\S+\s+){0,2}?${VERBO_EN}${OBJ_EN}`, 'i'),
  new RegExp(String.raw`^(?:Unfortunately|Regrettably|Apologies|My apologies)[,!.]?\s*(?:but\s+)?(?:I|we)\s*${NAO_POSSO_EN}\s+(?:\S+\s+){0,2}?${VERBO_EN}${OBJ_EN}`, 'i'),
  new RegExp(String.raw`^I\s*${NAO_POSSO_EN}\s+(?:\S+\s+){0,1}?${VERBO_EN}${OBJ_EN}`, 'i'),
  // "I'm sorry, but I can only provide scripts in US English." (c17d2e78, 19/10)
  /^(?:(?:I['’]?m|I am)\s+)?sorry[,!.]?\s*(?:but\s+)?I\s+(?:can|am able to)\s+only\s+(?:provide|write|create|help|assist|generate)\b/i,
  /^I\s+(?:must|have to|need to|will have to)\s+(?:respectfully\s+)?(?:decline|refuse)\b/i,
  /^(?:Your|This|That)\s+request\s+(?:violates|goes against|is against|breaches)\b/i,
  /^As an AI(?:\s+(?:language model|model|assistant))?[^.!?]{0,40}?,?\s*I\s+(?:can['’]?t|cannot|don['’]?t|do not|am (?:not able|unable)|won['’]?t|must not|am not allowed)\b/i,
  // PT
  new RegExp(String.raw`^(?:Desculpe|Desculpa|Sinto muito|Lamento|Infelizmente|Perd[ãa]o|Me desculpe)[,!.]?\s*(?:mas\s+)?(?:eu\s+)?n[ãa]o\s+(?:posso|consigo|sou capaz de|tenho como|vou poder)\s+(?:te\s+|lhe\s+)?(?:ajudar|atender|criar|escrever|gerar|fazer|cumprir|fornecer|produzir|prosseguir|auxiliar|colaborar|realizar)${OBJ_PT}`, 'iu'),
  new RegExp(String.raw`^(?:Eu\s+)?n[ãa]o\s+(?:posso|consigo)\s+(?:ajudar|atender|auxiliar)\s+com\s+(?:isso|esse|essa|este|esta|seu|sua)${FIM}`, 'iu'),
  /^Como\s+(?:uma\s+|um\s+)?(?:IA|intelig[êe]ncia artificial|modelo de linguagem|assistente(?: virtual)?)\b[^.!?]{0,40}?,?\s*(?:eu\s+)?n[ãa]o\s+(?:posso|consigo|tenho)/iu,
  // ES
  new RegExp(String.raw`^(?:Lo siento(?: mucho)?|Disculpa|Disculpe|Perd[óo]n|Lamentablemente|Lo lamento)[,!.]?\s*(?:pero\s+)?(?:yo\s+)?no\s+(?:puedo|soy capaz de|me es posible|podr[ée])\s+(?:te\s+|le\s+)?(?:ayudar|asistir|crear|escribir|generar|hacer|cumplir|proporcionar|producir|atender|realizar|colaborar)${OBJ_ES}`, 'iu'),
  new RegExp(String.raw`^No\s+puedo\s+(?:ayudar|asistir)(?:te|le)?\s+con\s+(?:eso|esto|esa|esta|ese|este|tu|su)${FIM}`, 'iu'),
  /^Como\s+(?:una?\s+)?(?:IA|inteligencia artificial|modelo de lenguaje|asistente(?: virtual)?)\b[^.!?]{0,40}?,?\s*(?:yo\s+)?no\s+(?:puedo|tengo)/iu,
  // DE — "Es tut mir leid, aber ich kann dabei nicht helfen." · "Leider kann ich bei dieser Anfrage nicht helfen."
  /^(?:(?:Es\s+)?tut\s+mir\s+leid|Entschuldigung|Entschuldige|Leider)[,!.]?\s*(?:aber\s+)?(?:ich\s+kann|kann\s+ich)\s+(?:(?:Ihnen|dir|euch)\s+)?(?:(?:dabei|damit|hierbei|hiermit|bei\s+(?:dieser|deiner|Ihrer|einer\s+solchen)\s+Anfrage|diese(?:r|n)?\s+Anfrage)\s+)?(?:leider\s+)?(?:nicht|keine\s+Hilfe)\s+(?:(?:weiter|be)?helfen|behilflich\s+sein|unterst[üu]tzen|erf[üu]llen|nachkommen|erstellen|schreiben|leisten|anbieten|bearbeiten)\s*(?:[.!…]|$)/iu,
  /^Ich\s+kann\s+(?:(?:Ihnen|dir|euch)\s+)?(?:dabei|damit|hierbei|bei\s+(?:dieser|deiner|Ihrer)\s+Anfrage)\s+(?:leider\s+)?nicht\s+(?:helfen|behilflich\s+sein|unterst[üu]tzen)/iu,
  /^Als\s+(?:eine?\s+)?(?:KI|k[üu]nstliche\s+Intelligenz|Sprachmodell|KI-Assistent)\b[^.!?]{0,40}?,?\s*(?:kann|darf)\s+ich\b[^.!?]{0,40}?\bnicht\b/iu,
  // FR
  /^(?:Je\s+suis\s+d[ée]sol[ée]e?|D[ée]sol[ée]e?|Malheureusement|Je\s+regrette|Navr[ée]e?)[,!.]?\s*(?:mais\s+)?je\s+ne\s+(?:peux|puis|suis\s+pas\s+en\s+mesure\s+d['’e]|vais\s+pas\s+pouvoir)\s*(?:pas\s+)?(?:vous\s+|t['’]\s*|te\s+)?(?:aider|assister|r[ée]pondre|cr[ée]er|[ée]crire|g[ée]n[ée]rer|fournir|satisfaire|donner\s+suite|r[ée]aliser|accomplir|traiter)(?:\s+(?:avec|à|a|pour|sur|dans)\s+(?:cela|ça|ceci|cette|ce|votre|ta|ton|une\s+telle)\b[^.!?]{0,40}|\s+(?:cette|votre|ta)\s+demande|\s*(?:[.!…]|$))/iu,
  /^Je\s+ne\s+peux\s+pas\s+(?:vous\s+|t['’]\s*)?aider\s+(?:avec|à|a|pour|sur)\s+(?:cela|ça|ceci|cette|ce)\b/iu,
  /^En\s+tant\s+qu['’]\s*(?:IA|intelligence\s+artificielle|mod[èe]le\s+de\s+langage|assistant)\b[^.!?]{0,40}?,?\s*je\s+ne\s+(?:peux|suis)/iu,
  // IT
  new RegExp(String.raw`^(?:Mi\s+dispiace|Mi\s+spiace|Spiacente|Purtroppo|Scusa(?:mi)?|Mi\s+scuso)[,!.]?\s*(?:ma\s+)?(?:io\s+)?non\s+(?:posso|sono\s+in\s+grado\s+di|riesco\s+a)\s+(?:aiutar\S*|assister\S*|creare|scrivere|generare|soddisfare|fornire|esaudire|realizzare|procedere)${OBJ_IT}`, 'iu'),
  /^Come\s+(?:un['’]\s*|una\s+)?(?:IA|intelligenza\s+artificiale|modello\s+linguistico|assistente)\b[^.!?]{0,40}?,?\s*non\s+(?:posso|sono)/iu,
  // RU — "Извините, но я не могу оказать помощь с данным конкретным запросом." (d700489f, 19/11)
  new RegExp(String.raw`^(?:Извините|Простите|Прошу\s+прощения|К\s+сожалению|Мне\s+(?:очень\s+)?жаль|Сожалею)[,!.]?\s*(?:но\s+)?(?:я\s+)?не\s+(?:могу|в\s+состоянии|имею\s+возможности|смогу)\s+(?:(?:с|в)\s+этим\s+)?(?:вам\s+)?(?:помочь|оказать\s+(?:вам\s+)?помощь|выполнить|создать|написать|сгенерировать|предоставить|удовлетворить|содействовать|ответить)${OBJ_RU}`, 'iu'),
  new RegExp(String.raw`^Я\s+не\s+могу\s+(?:(?:с|в)\s+этим\s+)?(?:вам\s+)?(?:помочь|оказать\s+помощь|выполнить)${OBJ_RU}`, 'iu'),
  /^Как\s+(?:ИИ|искусственный\s+интеллект|языковая\s+модель|ассистент)\S*[^.!?]{0,40}?,?\s*я\s+не\s+(?:могу|имею)/iu,
  // UK
  /^(?:Вибачте|На\s+жаль|Перепрошую|Мені\s+шкода)[,!.]?\s*(?:але\s+)?(?:я\s+)?не\s+(?:можу|зможу)\s+(?:вам\s+)?(?:допомогти|виконати|створити|написати|надати)(?:\s+(?:з|в|у)\s+(?:цим|цією|цим\s+запитом|таким)\S*|\s+(?:цей|цю|це|ваш\S*)(?=[\s.,!?]|$)|\s*(?:[.!…]|$))/iu,
  // PL
  /^(?:Przepraszam|Niestety|Przykro\s+mi)[,!.]?\s*(?:ale\s+)?nie\s+(?:mogę|jestem\s+w\s+stanie)\s+(?:w\s+tym\s+)?(?:pomóc|spełnić|stworzyć|napisać|wykonać|zrealizować)(?:\s+(?:w\s+tym|z\s+tym|tej|tego|twojej|takiej)\S*|\s*(?:[.!…]|$))/iu,
  // NL
  /^(?:Het\s+spijt\s+me|Sorry|Helaas)[,!.]?\s*(?:maar\s+)?(?:ik\s+kan|kan\s+ik)\s+(?:je\s+|u\s+)?(?:daar|hier|hiermee|daarmee|niet)\s*(?:niet\s+)?(?:mee\s+)?(?:helpen|assisteren|voldoen|aan\s+voldoen)\b/iu,
  // TR
  /^(?:Üzgünüm|Maalesef|Özür\s+dilerim)[,!.]?\s*(?:ama\s+)?(?:bu\s+(?:konuda|isteğe|talebe|istekle|talebinize|isteğinize)\s+)?(?:size\s+)?(?:yardımcı\s+olamam|yardım\s+edemem|yerine\s+getiremem|destek\s+olamam)/iu,
  // ZH / JA
  /^(?:抱歉|对不起|很抱歉|非常抱歉|不好意思)[，,。！!]?\s*(?:但(?:是)?)?\s*我(?:无法|不能|没法|不可以)(?:协助|帮助|帮忙|提供|满足|完成|生成|创作|处理)/u,
  /^(?:申し訳(?:ありません|ございません)(?:が)?|すみません(?:が)?)[、,。]?\s*(?:その|この|ご)?[^。]{0,24}?(?:お手伝い|対応|お応え|作成|ご要望|ご依頼)[^。]{0,12}?(?:でき(?:ません|かねます)|いたしかねます)/u,
]

// depois da frase de recusa, o modelo CONVERSA com a pessoa ("However, I can…", "If you have…", "Se quiser…")
const CONVERSA_DO_MODELO = /^(?:However|Instead|But I (?:can|could|would)|If you(?:['’]d| would| have| want| like|['’]re)|Please|Feel free|Let me know|Here(?:['’]s| is) (?:a|an|some)|I(?:['’]d| would) be happy|I can (?:help|offer|suggest|provide|write)|Is there|Would you|Can I|No entanto|Por[ée]m|Entretanto|Se (?:voc[êe]|quiser|preferir|tiver)|Posso (?:ajudar|sugerir|oferecer|escrever)|Fico feliz|Sin embargo|Si (?:quieres|deseas|tienes|lo prefieres)|Puedo (?:ayudar|sugerir|ofrecer|escribir)|Estar[ée] encantad|Allerdings|Stattdessen|Wenn (?:du|Sie)|Gerne (?:helfe|kann)|Ich kann (?:dir|Ihnen) (?:gerne|aber)|Cependant|Toutefois|Si vous|Je peux (?:vous )?(?:aider|proposer|sugg[ée]rer)|Tuttavia|Se (?:vuoi|desideri|hai)|Posso (?:aiutarti|suggerirti|offrirti)|Однако|Если (?:вы|у вас|хотите)|Я могу (?:помочь|предложить)|Буду рад)/iu

// fala de personagem: aspas de abertura, "…," disse ela, vocativo no fim da frase
const ASPA_DE_ABERTURA = /^["“”«»„'‘’「『]/u
const ETIQUETA_DE_FALA = /["”»'’」』]\s*,?\s*(?:\S+\s+){0,3}?(?:said|says|asked|whispered|replied|told|cried|shouted|muttered|sighed|disse|diz|respondeu|sussurrou|perguntou|gritou|dijo|respondi[óo]|susurr[óo]|pregunt[óo]|grit[óo]|sagte|fl[üu]sterte|antwortete|rief|dit|r[ée]pondit|murmura|cria|disse|rispose|sussurr[òo]|сказал\S*|ответил\S*|прошептал\S*|спросил\S*)(?=[\s.,!?;:]|$)/iu
const VOCATIVO_NO_FIM = /,\s*(?:mom|mum|mommy|dad|daddy|mother|father|son|kid|honey|sweetie|darling|buddy|sir|ma['’]am|m[ãa]e|m[ãa]ezinha|pai|filho|filha|querid[oa]|mam[áa]|pap[áa]|hijo|hija|cari[ñn]o|mama|papa|maman|chéri|chérie|мама|папа|сынок|дочка|[A-ZÀ-ÖØ-ÞА-ЯЁ][\p{Ll}]+)\s*[.!?…]*$/u

function semEmbrulho(text: string): string {
  let t = text.replace(/```[a-z]*\s*/gi, ' ').replace(/```/g, ' ').replace(/\s+/g, ' ').trim()
  t = t.replace(/^(?:[*_#>\-•\s]+)/, '').replace(/[*_]+$/, '').trim()
  // "HOOK:" / "Narration:" / "[Pexels: …]" na frente — o modelo às vezes embrulha a recusa no formato do roteiro
  for (let i = 0; i < 3; i++) {
    const antes = t
    t = t.replace(/^\[(?:Pexels|Pixabay|B-?roll)\s*:[^\]]*\]\s*/i, '')
      .replace(/^(?:HOOK|SCRIPT|NARRATION|NARRATOR|VOICEOVER|VOICE-OVER|NARRA[ÇC][ÃA]O|ROTEIRO|GUION|NARRACI[ÓO]N)\s*(?:\([^)]{0,20}\))?\s*:\s*/i, '')
      .trim()
    if (t === antes) break
  }
  // o texto INTEIRO entre aspas é a resposta embrulhada, não uma fala com etiqueta
  const par = t.match(/^["“«„'‘「『]([\s\S]*)["”»'’」』]$/u)
  if (par && !/["“”«»„]/u.test(par[1])) t = par[1].trim()
  return t
}

function frases(t: string): string[] {
  return t.split(/(?<=[.!?…。！？])\s+|(?<=[。！？])/u).map((s) => s.trim()).filter(Boolean)
}

function palavras(t: string): number {
  const p = t.split(/\s+/).filter(Boolean).length
  // chinês e japonês sem espaço: cada 2 caracteres contam como uma palavra
  return /[぀-ヿ一-鿿]/u.test(t) ? Math.max(p, Math.ceil(t.replace(/\s+/g, '').length / 2)) : p
}

/** A frase sozinha é uma recusa de assistente (não fala de personagem)? */
export function fraseDeRecusa(frase: string | null | undefined): boolean {
  const f = String(frase ?? '').trim()
  if (!f) return false
  if (ASPA_DE_ABERTURA.test(f) || ETIQUETA_DE_FALA.test(f) || VOCATIVO_NO_FIM.test(f)) return false
  return RECUSA_DA_FRASE.some((re) => re.test(f))
}

/**
 * O texto é uma recusa do modelo, não um roteiro: COMEÇA por uma frase de recusa e (a) é curto (até 60 palavras),
 * ou (b) metade ou mais das palavras são recusa/conversa do modelo, ou (c) a frase seguinte é o modelo falando
 * com a pessoa. Uma recusa no meio de uma história, ou dita por um personagem, não conta.
 */
export function looksLikeModelRefusal(text: string | null | undefined): boolean {
  const t = semEmbrulho(String(text ?? ''))
  if (!t) return false
  const fs = frases(t)
  if (!fs.length || !fraseDeRecusa(fs[0])) return false
  const total = palavras(t)
  if (total <= 60) return true
  let doModelo = 0
  for (const f of fs) { if (fraseDeRecusa(f) || CONVERSA_DO_MODELO.test(f)) doModelo += palavras(f); else break }
  if (doModelo / total >= 0.5) return true
  return fs.length > 1 && CONVERSA_DO_MODELO.test(fs[1])
}

/** Algum dos textos (as falas das cenas, os campos de um JSON) é uma recusa do modelo? */
export function algumaRecusaDoModelo(textos: ReadonlyArray<string | null | undefined>): boolean {
  return textos.some((x) => typeof x === 'string' && looksLikeModelRefusal(x))
}

export const MODEL_REFUSAL_MESSAGE =
  'The writer could not turn this idea into a script (the AI declined the topic). Nothing was charged — try rewording the idea, or paste your own script with "Use my script as is".'
