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
// US English…" entregue como filme em 19/10 (c17d2e78).
// Régua de hoje, em 3 camadas:
//   (1) PISO = a régua de antes (REGUA_DE_ANTES, byte a byte): tudo o que ela pegava continua pego, com UMA exceção —
//       a frase que é fala de personagem com atribuição ("…, le dijo el policía", "— disse o médico", aspas + "she said",
//       "Those were the last words…" na frase seguinte) e "As an AI, I can't feel…" (verbo que não é de assistente);
//   (2) o texto COMEÇA por uma frase de recusa de assistente (EN, PT, ES, DE, FR, IT, RU, UK, PL, NL, TR, ZH, JA) e é curto
//       (até 60 palavras), ou metade das palavras é recusa/explicação/conversa do modelo (guidelines, policy, "If you'd
//       like", "let me know", "instead"…), ou a frase seguinte é o modelo falando com a pessoa;
//   (3) recusa disfarçada: "…, but here is a fictional version: …" / "Here's a script about … instead: …" = recusa (barra);
//   + JSON ({"error": "I'm sorry…"}): vale cada texto dentro dele; rótulos na frente ("Scene 1:", "Here is your script:",
//   "**Note:**", "NARRATION:") e emoji saem antes. VOLTA 3 [correção da CEO 20/11]: a régua só julga SAÍDA de modelo; o texto do
//   cliente em "Use my script as is" passa como veio (a guarda de entrada do cinematic e o pedido fiel não a aplicam ao verbatim).
//   A fala de personagem do planejador (dialogueLine) usa recusaNaFalaDePersonagem; os reescritores usam reescritaSemRecusa.
// Este arquivo continua sem import (os guardiões o carregam sozinho num vm).

/** A régua de origin/main (7fda4c7d2), intacta: é o PISO. */
const REGUA_DE_ANTES: ReadonlyArray<RegExp> = [
  /\bI['’]?m sorry,? but I (?:can['’]?t|cannot|am unable to) (?:assist|help|comply|create|write|do that)/i,
  /\bI (?:can['’]?t|cannot|am unable to) (?:assist|help) with (?:that|this) request/i,
  /\bI (?:can['’]?t|cannot) (?:create|write|generate|produce) (?:that|this|content)/i,
  /\bas an AI(?: language model)?,? I (?:can['’]?t|cannot)/i,
  /\b(?:desculpe|sinto muito),? (?:mas )?n[ãa]o posso (?:ajudar|criar|escrever)/i,
  /\blo siento,? (?:pero )?no puedo (?:ayudar|crear|escribir)/i,
]
const AS_AN_AI_DE_ANTES = 3 // o índice do "as an AI" na régua de antes (a única exceção de verbo)

const FIM = String.raw`(?=[\s.,!?;:…。！？،]|$)`
// o objeto de assistente depois do verbo: "with that", "this request", "a script about…", "about that person", fim de frase.
// "help you" (fala de gente), "the full story in 30 seconds" e "this anymore" não casam.
const OBJ_EN = String.raw`(?:\s+(?:you\s+)?(?:with|on|in|for)\s+(?:that|this|your|such|these|any|requests?|content|creating|writing|generating|making|producing|the(?:\s+\S+)?\s+request)\b|\s+(?:that|this|such|these)(?:\s+(?:kind|type|sort)\s+of\s+\S+|\s+(?:specific\s+)?(?:request|content|script|video|story|topic|information|one|person|people|individual))?\s*(?:[.!…,;:]|$)|\s+(?:requests?|content|assistance|information)\b|\s+(?:a|an|any|such)\s+(?:\S+\s+){0,2}?(?:script|video|story|content|post|text|essay|piece|film|clip|image|response|narration|ad)s?\b|\s+about\s+(?:that|this|these|those|real|the|a|an|him|her|them|it|such|specific|any)\b|\s*(?:[.!…]|$))`
// "do"/"continue" só com o objeto acima ("I can't do that." · "continue with this request"); "make" fica fora ("I can't make it tonight")
const VERBO_EN = String.raw`(?:assist|help|comply|fulfil+|provide|create|generate|write|produce|engage|continue|do)`
const NAO_POSSO_EN = String.raw`(?:can['’]?t|cannot|can not|am unable to|['’]m unable to|am not able to|['’]m not able to|won['’]?t be able to|will not be able to|won['’]?t|will not|must decline to|am not allowed to)`
const OBJ_PT = String.raw`(?:\s+(?:voc[êe]\s+)?(?:com\s+(?:isso|esse|essa|este|esta|seu|sua|tal|o seu|a sua)|nisso|nesse|nessa|neste|nesta)${FIM}[^.!?]{0,40}|\s+(?:isso|esse|essa|este|esta|seu|sua)${FIM}|\s+(?:a|ao|à)\s+(?:esse|essa|este|esta|seu|sua|tal)${FIM}|\s+conte[úu]do${FIM}|\s+(?:um|uma)\s+(?:roteiro|v[íi]deo|hist[óo]ria|conte[úu]do|texto)${FIM}|\s*(?:[.!…]|$))`
const OBJ_ES = String.raw`(?:\s+(?:con|en)\s+(?:eso|esto|esa|esta|ese|este|tu|su)${FIM}[^.!?]{0,40}|\s+(?:eso|esto|esa|esta|ese|este|tu|su)${FIM}|\s+contenido${FIM}|\s+(?:un|una)\s+(?:gui[óo]n|v[íi]deo|historia|contenido|texto)${FIM}|\s*(?:[.!…]|$))`
const OBJ_IT = String.raw`(?:\s+(?:con|in)\s+(?:questo|questa|ciò|quello|quella|la tua|il tuo)${FIM}[^.!?]{0,40}|\s+(?:questa|questo|la tua|il tuo)${FIM}|\s*(?:[.!…]|$))`
const OBJ_RU = String.raw`(?:\s+(?:с|в|по)\s+(?:этим|этой|этом|данн\S*|ваш\S*|таким\S*|подобн\S*)[^.!?]{0,40}|\s+(?:этот|эту|это|ваш\S*|данн\S*|такой|такое|такую|подобн\S*)${FIM}|\s*(?:[.!…]|$))`
const VERBO_PT = String.raw`(?:ajudar|atender|criar|escrever|gerar|fazer|cumprir|fornecer|produzir|prosseguir|auxiliar|colaborar|realizar)`
const VERBO_ES = String.raw`(?:ayudar|asistir|crear|escribir|generar|hacer|cumplir|proporcionar|producir|atender|realizar|colaborar)`

/** "As an AI, I can't feel fear" é um narrador; "As an AI, I can't help with that" é o modelo. */
const AS_AN_AI = new RegExp(String.raw`^As an AI(?:\s+(?:language model|model|assistant))?[^.!?]{0,60}?,?\s*I\s*(?:${NAO_POSSO_EN}|do not|don['’]?t|must not)\s+\S|^As an AI language model\b`, 'i')
// KINEO-RECUSA-IA-2011 VOLTA 3 — "As an AI, I can't feel fear" é narrador: a exceção vale SÓ para verbo de sentimento ou experiência (13 línguas)
const ABRE_COMO_IA = /^(?:As an AI|Como\s+(?:uma?\s+|um\s+)?(?:IA|intelig[êe]ncia artificial|inteligencia artificial)|Als\s+(?:eine?\s+)?KI|En\s+tant\s+qu['’]\s*IA|Come\s+(?:un['’]\s*|una\s+)?(?:IA|intelligenza\s+artificiale)|Как\s+ИИ|Як\s+ШІ|Jako\s+(?:SI|AI)|Als\s+(?:een\s+)?AI|Bir\s+yapay\s+zeka\s+olarak|作为(?:一个)?(?:AI|人工智能)|AIとして)/iu
// o verbo de sentimento é o que vem LOGO depois da negação ("can't feel", "kann keine Angst fühlen"); "cannot promote hate speech" não é narrador
const NEGACAO_DA_IA = String.raw`(?:can['’]?t|cannot|can not|unable to|not able to|do not|don['’]?t|won['’]?t|never|n[ãa]o\s+(?:posso|consigo|vou|sei)|nunca|no\s+(?:puedo|s[ée])|nicht|keine?n?|ne\s+(?:peux|sais)\s+pas|non\s+(?:posso|so)|не\s+(?:могу|умею)|не\s+можу|nie\s+(?:mogę|umiem)|kan\s+(?:niet|geen)|无法|不能|不会|でき)`
const SENTIMENTO_DA_IA = new RegExp(NEGACAO_DA_IA + String.raw`\s*(?:(?:really|truly|actually|even|ever|wirklich|realmente|vraiment|davvero|действительно|Angst|Liebe|Schmerz|Trauer|miedo|medo|peur|paura|страх)\s+){0,2}?(?<!\p{L})(?:feel|dream|love|sleep|imagine|taste|cry|hope|smell|touch|breathe|eat|drink|hate|fear|laugh|remember|forget|see|hear|suffer|die|age|bleed|wish|miss|hug|grieve|experience|sentir|sonhar|amar|dormir|imaginar|provar|chorar|esperar|tocar|respirar|comer|beber|odiar|temer|rir|lembrar|esquecer|sofrer|morrer|envelhecer|desejar|so[ñn]ar|probar|llorar|re[íi]r|recordar|olvidar|sufrir|morir|envejecer|desear|f[üu]hlen|tr[äa]umen|lieben|schlafen|weinen|hoffen|schmecken|riechen|atmen|essen|trinken|hassen|lachen|sterben|vermissen|ressentir|r[êe]ver|aimer|imaginer|go[ûu]ter|pleurer|esp[ée]rer|manger|boire|rire|mourir|sentire|provare|sognare|amare|dormire|immaginare|piangere|sperare|mangiare|bere|ridere|morire|чувствовать|мечтать|любить|спать|плакать|надеяться|дышать|бояться|смеяться|умирать|відчувати|мріяти|кохати|czuć|marzyć|kochać|spać|płakać|voelen|dromen|slapen|huilen|hissedemem|hissetmek|rüya|uyuyamam|感受|感觉|做梦|梦想|爱|哭|感じ|夢を見|眠|泣)(?!\p{L})`, 'iu')
const narradorIA = (f: string): boolean => ABRE_COMO_IA.test(f) && SENTIMENTO_DA_IA.test(f)

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
  AS_AN_AI,
  // PT
  new RegExp(String.raw`^(?:Desculpe|Desculpa|Sinto muito|Lamento|Infelizmente|Perd[ãa]o|Me desculpe)[,!.]?\s*(?:mas\s+)?(?:eu\s+)?n[ãa]o\s+(?:posso|consigo|sou capaz de|tenho como|vou poder)\s+(?:te\s+|lhe\s+)?${VERBO_PT}${OBJ_PT}`, 'iu'),
  new RegExp(String.raw`^(?:Eu\s+)?n[ãa]o\s+(?:posso|consigo)\s+(?:ajudar|atender|auxiliar)\s+com\s+(?:isso|esse|essa|este|esta|seu|sua)${FIM}`, 'iu'),
  new RegExp(String.raw`^Como\s+(?:uma\s+|um\s+)?(?:IA|intelig[êe]ncia artificial|modelo de linguagem|assistente(?: virtual)?)\b[^.!?]{0,60}?,?\s*(?:eu\s+)?n[ãa]o\s+(?:posso|consigo|tenho como|vou)\s+\S`, 'iu'),
  // ES
  new RegExp(String.raw`^(?:Lo siento(?: mucho)?|Disculpa|Disculpe|Perd[óo]n|Lamentablemente|Lo lamento)[,!.]?\s*(?:pero\s+)?(?:yo\s+)?no\s+(?:puedo|soy capaz de|me es posible|podr[ée])\s+(?:te\s+|le\s+)?${VERBO_ES}${OBJ_ES}`, 'iu'),
  new RegExp(String.raw`^No\s+puedo\s+(?:ayudar|asistir)(?:te|le)?\s+con\s+(?:eso|esto|esa|esta|ese|este|tu|su)${FIM}`, 'iu'),
  new RegExp(String.raw`^Como\s+(?:una?\s+)?(?:IA|inteligencia artificial|modelo de lenguaje|asistente(?: virtual)?)\b[^.!?]{0,60}?,?\s*(?:yo\s+)?no\s+(?:puedo|voy\s+a)\s+\S`, 'iu'),
  // DE — "Es tut mir leid, aber ich kann dabei nicht helfen." · "Leider kann ich bei dieser Anfrage nicht helfen." · "…keine Inhalte … erstellen."
  /^(?:(?:Es\s+)?tut\s+mir\s+leid|Entschuldigung|Entschuldige|Leider)[,!.]?\s*(?:aber\s+)?(?:ich\s+kann|kann\s+ich)\s+(?:(?:Ihnen|dir|euch)\s+)?(?:(?:dabei|damit|hierbei|hiermit|bei\s+(?:dieser|deiner|Ihrer|einer\s+solchen)\s+Anfrage|diese(?:r|n)?\s+Anfrage)\s+)?(?:leider\s+)?(?:nicht|keine\s+Hilfe)\s+(?:(?:weiter|be)?helfen|behilflich\s+sein|unterst[üu]tzen|erf[üu]llen|nachkommen|erstellen|schreiben|leisten|anbieten|bearbeiten)\s*(?:[.!…]|$)/iu,
  /^(?:(?:(?:Es\s+)?tut\s+mir\s+leid|Entschuldigung|Entschuldige|Leider)[,!.]?\s*(?:aber\s+)?)?(?:ich\s+kann|kann\s+ich)\s+(?:(?:Ihnen|dir|euch)\s+)?(?:leider\s+)?keine?n?\s+(?:Inhalte|Skripte?|Videos?|Geschichten?|Texte?|Drehb[üu]cher|Beitr[äa]ge)\b[^.!?]{0,60}?\b(?:erstellen|schreiben|generieren|produzieren|liefern|verfassen)\b/iu,
  /^Ich\s+kann\s+(?:(?:Ihnen|dir|euch)\s+)?(?:dabei|damit|hierbei|bei\s+(?:dieser|deiner|Ihrer)\s+Anfrage)\s+(?:leider\s+)?nicht\s+(?:helfen|behilflich\s+sein|unterst[üu]tzen)/iu,
  /^Als\s+(?:eine?\s+)?(?:KI|k[üu]nstliche\s+Intelligenz|Sprachmodell|KI-Assistent)\b[^.!?]{0,40}?,?\s*(?:kann|darf|werde)\s+ich\b[^.!?]{0,60}?(?:\bnicht\b|\bkeine?n?\b)/iu,
  // FR
  /^(?:Je\s+suis\s+d[ée]sol[ée]e?|D[ée]sol[ée]e?|Malheureusement|Je\s+regrette|Navr[ée]e?)[,!.]?\s*(?:mais\s+)?je\s+ne\s+(?:peux|puis|suis\s+pas\s+en\s+mesure\s+d['’e]|vais\s+pas\s+pouvoir)\s*(?:pas\s+)?(?:vous\s+|t['’]\s*|te\s+)?(?:aider|assister|r[ée]pondre|cr[ée]er|[ée]crire|g[ée]n[ée]rer|fournir|satisfaire|donner\s+suite|r[ée]aliser|accomplir|traiter)(?:\s+(?:avec|à|a|pour|sur|dans)\s+(?:cela|ça|ceci|cette|ce|votre|ta|ton|une\s+telle)\b[^.!?]{0,40}|\s+(?:cette|votre|ta)\s+demande|\s+(?:ce|ces)\s+contenus?\b|\s*(?:[.!…]|$))/iu,
  /^Je\s+ne\s+peux\s+pas\s+(?:vous\s+|t['’]\s*)?aider\s+(?:avec|à|a|pour|sur)\s+(?:cela|ça|ceci|cette|ce)\b/iu,
  /^En\s+tant\s+qu['’]\s*(?:IA|intelligence\s+artificielle|mod[èe]le\s+de\s+langage|assistant)\b[^.!?]{0,40}?,?\s*je\s+ne\s+(?:peux|suis|vais)\s+pas\b/iu,
  // IT
  new RegExp(String.raw`^(?:Mi\s+dispiace|Mi\s+spiace|Spiacente|Purtroppo|Scusa(?:mi)?|Mi\s+scuso)[,!.]?\s*(?:ma\s+)?(?:io\s+)?non\s+(?:posso|sono\s+in\s+grado\s+di|riesco\s+a)\s+(?:aiutar\S*|assister\S*|creare|scrivere|generare|soddisfare|fornire|esaudire|realizzare|procedere)${OBJ_IT}`, 'iu'),
  /^Come\s+(?:un['’]\s*|una\s+)?(?:IA|intelligenza\s+artificiale|modello\s+linguistico|assistente)\b[^.!?]{0,40}?,?\s*non\s+(?:posso|sono\s+in\s+grado\s+di|riesco\s+a)\s+\S/iu,
  // RU — "Извините, но я не могу оказать помощь с данным конкретным запросом." (d700489f, 19/11)
  new RegExp(String.raw`^(?:Извините|Простите|Прошу\s+прощения|К\s+сожалению|Мне\s+(?:очень\s+)?жаль|Сожалею)[,!.]?\s*(?:но\s+)?(?:я\s+)?не\s+(?:могу|в\s+состоянии|имею\s+возможности|смогу)\s+(?:(?:с|в)\s+этим\s+)?(?:вам\s+)?(?:помочь|оказать\s+(?:вам\s+)?помощь|выполнить|создать|написать|сгенерировать|предоставить|удовлетворить|содействовать|ответить)${OBJ_RU}`, 'iu'),
  new RegExp(String.raw`^Я\s+не\s+могу\s+(?:(?:с|в)\s+этим\s+)?(?:вам\s+)?(?:помочь|оказать\s+помощь|выполнить)${OBJ_RU}`, 'iu'),
  /^Как\s+(?:ИИ|искусственный\s+интеллект|языковая\s+модель|ассистент)\S*[^.!?]{0,40}?,?\s*я\s+не\s+(?:могу|имею\s+возможности|буду)\s+\S/iu,
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
const CONVERSA_DO_MODELO = /^(?:However|Instead|But I (?:can|could|would)|If you(?:['’]d| would| have| want| like|['’]re)|Please|Feel free|Let me know|Just let me know|Here(?:['’]s| is) (?:a|an|some)|I(?:['’]d| would) be happy|I can (?:help|offer|suggest|provide|write)|Is there|Would you|Can I|No entanto|Por[ée]m|Entretanto|Se (?:voc[êe]|quiser|preferir|tiver)|Posso (?:ajudar|sugerir|oferecer|escrever)|Fico feliz|Sin embargo|Si (?:quieres|deseas|tienes|lo prefieres)|Puedo (?:ayudar|sugerir|ofrecer|escribir)|Estar[ée] encantad|Allerdings|Stattdessen|Wenn (?:du|Sie)|Gerne (?:helfe|kann)|Ich kann (?:dir|Ihnen) (?:gerne|aber)|Cependant|Toutefois|Si vous|Je peux (?:vous )?(?:aider|proposer|sugg[ée]rer)|Tuttavia|Se (?:vuoi|desideri|hai)|Posso (?:aiutarti|suggerirti|offrirti)|Однако|Если (?:вы|у вас|хотите)|Я могу (?:помочь|предложить)|Буду рад)/iu
// a EXPLICAÇÃO do modelo sobre a própria recusa (conta como recusa na régua da metade)
const EXPLICACAO_DO_MODELO = /\b(?:guidelines?|polic(?:y|ies)|harmful|misinformation|misleading|violat\w*|goes against|against (?:the|my|our) (?:rules|guidelines|policies)|not (?:appropriate|allowed|permitted)|inappropriate|I(?:['’]d| would) be (?:happy|glad)|let me know|if you(?:['’]d| would)? like|I can help you|I can help with|so that I can|please consider|feel free|instead|diretrizes|pol[ií]ticas? de conte[úu]do|directrices|pol[ií]ticas? de contenido|Richtlinien|правила\S*|правил)\b/iu
// recusa disfarçada: a recusa e, em seguida, "outra versão" — barra (não dá para separar com segurança o que é do cliente)
const DISFARCE_NA_FRASE = /(?:,|;|—|-)?\s*(?:but|however)\s*,?\s*here(?:['’]s| is| are)\b|\bmas\s+aqui\s+(?:est[áa]|vai)\b|\bpero\s+aqu[íi]\s+(?:tienes|est[áa]|va)\b/i
const DISFARCE_NA_SEGUINTE = /^(?:Instead,?\s*)?(?:Here(?:['’]s| is| are)|Below is)\b[^.!?]{0,100}?(?:instead|version|alternative|example)\b|^Instead,\s*here\b|^(?:Em vez disso|Em vez|Aqui est[áa]\s+uma\s+vers[ãa]o|En su lugar|Aqu[íi] tienes una versi[óo]n)\b/i

// fala de personagem: aspas de abertura, "…," disse ela / "— disse o médico" / ", le dijo el policía", vocativo no fim
const ASPA_DE_ABERTURA = /^["“”«»„'‘’「『]/u
const VERBO_DE_FALA = String.raw`(?:said|says|asked|whispered|replied|told|cried|shouted|muttered|sighed|radioed|wrote|texted|disse|diz|dizia|respondeu|sussurrou|perguntou|gritou|escreveu|dijo|dec[íi]a|respondi[óo]|susurr[óo]|pregunt[óo]|grit[óo]|escribi[óo]|sagte|fl[üu]sterte|antwortete|rief|schrieb|dit|r[ée]pondit|murmura|cria|[ée]crivit|rispose|sussurr[òo]|scrisse|сказал\S*|ответил\S*|прошептал\S*|спросил\S*|написал\S*)`
const ETIQUETA_DE_FALA = new RegExp(String.raw`(?:["”»'’」』]\s*,?|\s[—–]|,)\s*(?:\S+\s+){0,3}?${VERBO_DE_FALA}(?=[\s.,!?;:]|$)`, 'iu')
const VOCATIVO_NO_FIM = /,\s*(?:mom|mum|mommy|dad|daddy|mother|father|son|kid|honey|sweetie|darling|buddy|sir|ma['’]am|m[ãa]e|m[ãa]ezinha|pai|filho|filha|querid[oa]|mam[áa]|pap[áa]|hijo|hija|cari[ñn]o|mama|papa|maman|chéri|chérie|мама|папа|сынок|дочка|[A-ZÀ-ÖØ-ÞА-ЯЁ][\p{Ll}]+)\s*[.!?…]*$/u
// a frase SEGUINTE diz quem falou: "Those were the last words the pilot radioed…", "Foi o que o piloto disse…", "Fue lo último que…"
const ATRIBUICAO_NA_SEGUINTE = /^(?:(?:That['’]s|That is|That was|Those were|These were|This was|It was|Such were)\s+(?:what|the\s+(?:last|only|first|final)\b|all\s+(?:he|she|they|it))|(?:Foi|Essa foi|Essas foram|Era|Isso foi|Esse foi)\s+(?:o que|a [úu]ltima|as [úu]ltimas|tudo o que|a resposta|a frase)|(?:Fue|Eso fue|Esa fue|Esas fueron|Era)\s+(?:lo (?:[úu]ltimo|que)|la [úu]ltima|las [úu]ltimas|todo lo que|la respuesta|la frase)|(?:Das|Dies|Es)\s+(?:war|waren)\s+(?:das|die|alles|was)|(?:Это|Так)\s+(?:были|был|было|сказал\S*))/iu

function semEmbrulho(text: string): string {
  let t = text.replace(/```[a-z]*\s*/gi, ' ').replace(/```/g, ' ')
  t = t.replace(/\p{Extended_Pictographic}️?/gu, ' ').replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim()
  t = t.replace(/^(?:[*_#>\-•\s]+)/, '').replace(/[*_]+$/, '').trim()
  // KINEO-RECUSA-IA-2011 VOLTA 3 — saudação curta na frente da 1ª frase sai antes da leitura ("Hi! Unfortunately…", "Olá! Infelizmente…")
  t = t.replace(/^(?:Hi|Hello|Hey|Hi there|Hey there|Hello there|Ol[áa]|Oi|Hola|Hallo|Bonjour|Salut|Ciao|Привет|Здравствуйте|Cześć|Merhaba|你好|こんにちは)[!,.]\s+/iu, '')
  // "HOOK:" / "Narration:" / "Scene 1:" / "**Note:**" / "Here is your script:" / "[Pexels: …]" na frente — o modelo embrulha a recusa
  for (let i = 0; i < 4; i++) {
    const antes = t
    t = t.replace(/^\[(?:Pexels|Pixabay|B-?roll)\s*:[^\]]*\]\s*/i, '')
      .replace(/^(?:HOOK|SCRIPT|NARRATION|NARRATOR|VOICEOVER|VOICE-OVER|NARRA[ÇC][ÃA]O|ROTEIRO|GUION|NARRACI[ÓO]N|NOTE|NOTA|RESPONSE|ANSWER|(?:SCENE|CENA|ESCENA|SZENE|СЦЕНА)\s*\d{0,2})\s*(?:\([^)]{0,20}\))?\s*[:：]\s*[*_]*\s*/iu, '')
      .replace(/^(?:Sure[!,.]?\s*)?(?:Here(?:['’]s| is)|Below is)\s+(?:your|the|my|a)?\s*(?:\S+\s+){0,3}?(?:script|narration|text|response|answer|story|video)\s*:\s*/i, '')
      .replace(/^[*_]+\s*/, '')
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

/** Fala de personagem (aspas, "— disse o médico", ", le dijo", vocativo, ou a frase seguinte diz quem falou)? */
function falaDePersonagem(frase: string, seguinte: string | undefined): boolean {
  return ASPA_DE_ABERTURA.test(frase) || ETIQUETA_DE_FALA.test(frase) || VOCATIVO_NO_FIM.test(frase) || (!!seguinte && ATRIBUICAO_NA_SEGUINTE.test(seguinte))
}

/** A frase sozinha é uma recusa de assistente (não fala de personagem)? */
export function fraseDeRecusa(frase: string | null | undefined, seguinte?: string): boolean {
  const f = String(frase ?? '').trim()
  if (!f || falaDePersonagem(f, seguinte) || narradorIA(f)) return false
  return RECUSA_DA_FRASE.some((re) => re.test(f))
}

/** PISO: a régua de antes, em qualquer frase dos primeiros 400 caracteres — salvo fala de personagem e "As an AI" de narrador. */
function pegaPelaReguaDeAntes(t: string): boolean {
  const fs = frases(t)
  let lido = 0
  for (let i = 0; i < fs.length && lido < 400; i++) {
    const f = fs[i]
    lido += f.length + 1
    const casou = REGUA_DE_ANTES.map((re) => re.test(f))
    if (!casou.some(Boolean)) continue
    if (falaDePersonagem(f, fs[i + 1])) continue
    if (casou.every((c, k) => !c || k === AS_AN_AI_DE_ANTES) && narradorIA(f.slice(Math.max(0, f.search(/as an AI/i))))) continue // VOLTA 3: só o narrador (verbo de sentimento)
    return true
  }
  return false
}

/** Os textos de dentro de um JSON ({"error": "…"}, {"script": "…"}, ["…"]), ou null quando não é JSON. */
function textosDoJson(raw: string): string[] | null {
  const t = raw.replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (!/^[[{]/.test(t)) return null
  let v: unknown
  try { v = JSON.parse(t) } catch { return null }
  const out: string[] = []
  const andar = (x: unknown, fundo: number): void => {
    if (fundo > 6 || out.length > 200) return
    if (typeof x === 'string') { if (x.trim()) out.push(x) } else if (Array.isArray(x)) { for (const y of x) andar(y, fundo + 1) } else if (x && typeof x === 'object') { for (const y of Object.values(x as Record<string, unknown>)) andar(y, fundo + 1) }
  }
  andar(v, 0)
  return out
}

/**
 * O texto é uma recusa do modelo, não um roteiro. (1) PISO: o que a régua de antes pegava. (2) COMEÇA por uma frase de
 * recusa e é curto (até 60 palavras), ou metade ou mais das palavras é recusa/explicação/conversa do modelo, ou a frase
 * seguinte é o modelo falando com a pessoa. (3) Recusa disfarçada ("…, but here is a fictional version: …"). Fala de
 * personagem nunca conta. JSON: vale cada texto de dentro.
 */
export function looksLikeModelRefusal(text: string | null | undefined): boolean {
  const raw = String(text ?? '')
  const doJson = textosDoJson(raw)
  if (doJson) return doJson.some((s) => looksLikeModelRefusal(s))
  const t = semEmbrulho(raw)
  if (!t) return false
  if (pegaPelaReguaDeAntes(t)) return true
  const fs = frases(t)
  if (!fs.length || !fraseDeRecusa(fs[0], fs[1])) return false
  if (DISFARCE_NA_FRASE.test(fs[0]) || (fs[1] && DISFARCE_NA_SEGUINTE.test(fs[1]))) return true
  const total = palavras(t)
  if (total <= 60) return true
  let doModelo = 0
  for (let i = 0; i < fs.length; i++) if (fraseDeRecusa(fs[i], fs[i + 1]) || CONVERSA_DO_MODELO.test(fs[i]) || EXPLICACAO_DO_MODELO.test(fs[i])) doModelo += palavras(fs[i])
  if (doModelo / total >= 0.5) return true
  return fs.length > 1 && CONVERSA_DO_MODELO.test(fs[1])
}

/** Algum dos textos (as falas das cenas, os campos de um JSON) é uma recusa do modelo? */
export function algumaRecusaDoModelo(textos: ReadonlyArray<string | null | undefined>): boolean {
  return textos.some((x) => typeof x === 'string' && looksLikeModelRefusal(x))
}

// KINEO-RECUSA-IA-2011 VOLTA 3 — a FALA de um personagem (dialogueLine do planejador hollywood) pode dizer "I'm afraid I can't do that.",
// "Desculpe, não posso fazer isso."; só é recusa quando a fala inteira é recusa de assistente sobre o pedido ou o conteúdo.
const ASSUNTO_DE_ASSISTENTE = /(?<!\p{L})(?:assist\w*|requests?|content|guidelines?|polic(?:y|ies)|as an AI|AI language model|language model|solicitud|petici[óo]n|pedido|solicita[çc][ãa]o|conte[úu]do|contenido|diretrizes|directrices|pol[ií]ticas?|Anfrage|Inhalte?|Richtlinien|demande|contenu|richiesta|contenuto|запрос\S*|контент\S*|правил\S*)(?!\p{L})/iu
/** A fala de personagem é, inteira, a recusa do modelo sobre o pedido/conteúdo? (só para a dialogueLine) */
export function recusaNaFalaDePersonagem(fala: string | null | undefined): boolean {
  const t = String(fala ?? '').trim()
  return !!t && looksLikeModelRefusal(t) && ASSUNTO_DE_ASSISTENTE.test(t)
}

/**
 * KINEO-RECUSA-IA-2011 VOLTA 3 — a saída de um REESCRITOR (expandir/acrescentar fala, alinhar plano à fala) que é recusa, ou que
 * ANEXOU uma recusa ao texto de antes, não vale: devolve '' (o chamador fica com o texto de antes, sem 422 e sem cobrar).
 */
export function reescritaSemRecusa(antes: string | null | undefined, depois: string | null | undefined): string {
  if (typeof depois !== 'string') return ''
  if (looksLikeModelRefusal(depois)) return ''
  const base = String(antes ?? '').trim().replace(/[.!?…]$/, '')
  const resto = base && depois.startsWith(base) ? depois.slice(base.length).replace(/^[.!?…]?\s*/, '') : ''
  if (resto && looksLikeModelRefusal(resto)) return ''
  const fs = frases(semEmbrulho(depois)), ja = String(antes ?? '')
  for (let i = 0; i < fs.length; i++) if (!ja.includes(fs[i]) && fraseDeRecusa(fs[i], fs[i + 1])) return ''
  return depois
}

export const MODEL_REFUSAL_MESSAGE =
  'The writer could not turn this idea into a script (the AI declined the topic). Nothing was charged — try rewording the idea, or paste your own script with "Use my script as is".'
