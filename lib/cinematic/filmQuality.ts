// KINEO-QUALIDADE-TODOS-MOTORES-2910 — one engine-independent film contract, no provider calls.
import { aplicarElencoEEpoca, type ModoVisualDoElenco } from '@/lib/cinematic/elencoEpoca'
import { mesmoPersonagem } from '@/lib/cinematic/elencoEpoca' // KINEO-CITADO-NAO-AGE-0311
import { generoDoNome } from '@/lib/cinematic/elencoEpoca' // KINEO-ELENCO-PROVA-DE-GENTE-1211 — a tabela de primeiros nomes vai à folha por injeção
import { elencoDoRoteiro, cenasDoElenco, CLAUSULA_FICHA } from '@/lib/cinematic/personagemAjuste'
import { elencoComFichaLiteral, canonicaComDesenhoFixo, semDescricaoConcorrente } from '@/lib/cinematic/juizFicha' // KINEO-CONSISTENCIA-SER-3010
import { aplicarContrato, montarContrato } from '@/lib/cinematic/sceneTruth'
import { aplicarEixoVisual } from '@/lib/hollywood/varietyAxis'
import { applyStyleAnchor, NO_READABLE_TEXT_SUFFIX, textSafetySuffix, type StyleAnchor, marcaDeEstilo, regrasDeLinguaLigadas } from '@/lib/cinematic/sceneStyle'
import { fraseUnicaDeSuperficie } from '@/lib/cinematic/superficieSemTexto' // KINEO-PESSOA-DO-PEDIDO-1111 (degrau 4)
import { FRASE_PRODUTO_MARCA, EMBALAGEM_COR_LISA, EMBALAGEM_DO_PRODUTO } from '@/lib/cinematic/ideiaNaFicha' // KINEO-IDEIA-FICHA-ASSUNTO-1211 (C)
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { conferirFichaLiteral, type LeituraDaFicha } from '@/lib/cinematic/elencoSemantico' // KINEO-PROTAGONISTA-SEEDANCE-0111
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { kling25ShotAxis } from '@/lib/cinematic/klingShots'

export const FILM_QUALITY_VERSION = 'film_quality_2910_v1' as const

/** Text quality is universal. Paid reference generation retains its existing budget/eligibility. */
export function decidirQualidadeDoFilme(args: { tagFaceless: boolean; estrelaAtiva: boolean; folhaLegada: boolean }) {
  return { ficha: !args.tagFaceless && !args.estrelaAtiva, elenco: !args.tagFaceless,
    estilo: true, contrato: true, seresFieis: true, stillCritic: true, juizFicha: true,
    gerarFolha: args.folhaLegada && !args.tagFaceless && !args.estrelaAtiva }
}

/** Lock at the front as well as the tail: provider prompt truncation must not drop the medium. */
export function travarEstiloDoFilme(prompt: string, style: StyleAnchor): string {
  let p = prompt
  const lock = `Film visual medium: ${style.lookPhrase}. `
  if (p.startsWith(lock)) p = p.slice(lock.length)
  const negated = (offset: number) => /(?:not|no|never mix with|never|without)\s+(?:[\w-]+\s+or\s+)?$/i.test(p.slice(Math.max(0, offset - 45), offset))
  if (style.look !== 'photoreal' && style.look !== 'noir') {
    p = p.replace(/\b(?:photorealistic|photoreal|live[- ]action|documentary realism)\b/gi,
      (word, offset: number) => negated(offset) ? word : style.lookPhrase)
  } else {
    p = p.replace(/\b(?:(?:stylized\s+)?3[dD]\s+(?:animated|animation|cartoon)(?:\s+(?:film\s+)?(?:look|style))?|(?:hand[- ]drawn\s+)?anime(?:\s+style)?|(?:storybook\s+)?illustration(?:\s+style)?|cartoon(?:\s+style)?|cel shading)\b/gi,
      (word, offset: number) => negated(offset) ? word : style.lookPhrase)
  }
  const anchored = p.includes(style.suffix) ? p : applyStyleAnchor(p, style)
  return lock + anchored
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — compact multi-shot adapters retain their existing provider character budget.
export function travarEstiloCompactoDoFilme(prompt: string, style: StyleAnchor): string {
  const medium = { photoreal: 'photoreal', animated3d: '3D animated', anime: 'anime', illustration: 'illustrated', noir: 'noir' }[style.look]
  if (prompt.startsWith(`Chosen ${medium} still:`)) return prompt
  if (/^Chosen still:/i.test(prompt)) return prompt.replace(/^Chosen still:/i, `Chosen ${medium} still:`)
  return prompt.startsWith(`Style: ${medium}. `) ? prompt : `Style: ${medium}. ${prompt}`
}

// KINEO-K4-PLANO-DA-SECAO-1111 — corta em fronteira: a última frase (". ") ou oração (", ") que cabe; o pedaço final que começa por
// proibição ("no …", "never …") sai inteiro em vez de ficar decapitado. Sem fronteira útil (raro): o corte antigo, sem a palavra partida.
export function cortaEmFronteira(texto: string, limite: number): string {
  const cps = Array.from(texto)
  if (cps.length <= limite) return texto
  const cabe = cps.slice(0, limite).join('')
  const frase = cabe.lastIndexOf('. ')
  const porFrase = frase >= 0 ? cabe.slice(0, frase + 1) : ''
  const partes = cabe.split(/,\s*/)
  partes.pop()
  while (partes.length > 1 && /^(?:no|not|never|without)\b/i.test(partes[partes.length - 1].trim())) partes.pop()
  const porOracao = partes.join(', ').replace(/[\s,;:—-]+$/u, '')
  const melhor = Array.from(porOracao).length > Array.from(porFrase).length ? porOracao : porFrase
  // KINEO-PESSOA-DO-PEDIDO-1111 (degrau 4) — o corte por palavra não termina em artigo/preposição/conjunção ("… as she gazes into the")
  return Array.from(melhor).length >= limite * 0.6 ? melhor : cabe.replace(/\s+\S*$/u, '').replace(/(?:\s+(?:the|a|an|of|to|into|onto|in|on|at|by|for|from|with|without|and|or|but|as|while|that|which|who|through|over|under|across|toward|towards|behind|near|upon|after|before|her|his|their|its|is|are|was|were))+$/iu, '').replace(/[\s,;:—-]+$/u, '')
}

/** KINEO-LUGAR-CEDE-A-ACAO-1111 — o texto cabe no limite, ou o corte cai em fronteira de frase/oração (a mesma régua de cortaEmFronteira: ≥ 60 % do limite). */
export function caiEmOracao(texto: string, limite: number): boolean {
  const cps = Array.from(texto)
  if (cps.length <= limite) return true
  const cabe = cps.slice(0, limite).join('')
  const frase = cabe.lastIndexOf('. ')
  const porFrase = frase >= 0 ? cabe.slice(0, frase + 1) : ''
  const partes = cabe.split(/,\s*/)
  partes.pop()
  const porOracao = partes.join(', ').replace(/[\s,;:—-]+$/u, '')
  return Math.max(Array.from(porFrase).length, Array.from(porOracao).length) >= limite * 0.6
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — leave room for Kling's keyframe directive inside its 512-code-point limit.
export function promptCurtoDoFilmeKling4(prompt: string, style: StyleAnchor): string {
  const medium = { photoreal: 'Photoreal film', animated3d: '3D animated film', anime: 'Anime film', illustration: 'Illustrated film', noir: 'Black and white noir film' }[style.look]
  const take = (s: string, limit: number) => Array.from(s).slice(0, limit).join('')
  // KINEO-K4-ACAO-INTEIRA-1111 — a cláusula do elenco termina em ", seen from behind or in profile, face not readable. " no filme sem rosto
  // (lib/cinematic/elencoEpoca.ts CLAUSULA_ELENCO). O regex parava antes: o resto ficava na AÇÃO, e o resgate de espaço abaixo tomava
  // esse resto por "a ação" — a ação de verdade era cortada no teto (Pompeia 11/11, plano 3: "crumbling stones falling fr…").
  const cast = /(?:Named )?Characters? in this shot: (.+?) — clearly visible in frame(, seen from behind or in profile, face not readable)?\.?/i.exec(prompt) // KINEO-K4-PLANO-DA-SECAO-1111: era ".?" (qualquer caractere) — o ponto escapado
  const deCostas = !!cast?.[2] // KINEO-K4-ACAO-INTEIRA-1111
  // KINEO-PESSOA-DO-PEDIDO-1111 — a ficha termina no PONTO: "([^\n]+)" levava o sufixo inteiro do prompt clássico (moldura, "no readable
  // text…") para dentro da ficha, e o corte de 140 deixava "Identity: a young blonde woman … no readable text, letters, numbers, l."
  const identity = /The same main character appears in this scene, consistent design: ([^\n]+?)(?:\.(?=\s|$)|$)/i.exec(prompt)
  // KINEO-K4-PLANO-DA-SECAO-1111 — a época em positivo (KINEO-EPOCA-POSITIVA-1111, "period piece set strictly in the year 79 AD") também
  // entra curta na frente; antes só "Period setting:" contava e a época sumia do plano do Kling 4.
  const period = /Period setting: [^.]+|period piece set strictly in [^:.,]+/i.exec(prompt)?.[0]
  const objectSafety = textSafetySuffix(prompt).replace(/^,\s*/, '')
  const noReadableText = NO_READABLE_TEXT_SUFFIX.replace(/^,\s*/, '')
  const originalTextDirections = [
    /\bNo readable text (?:anywhere in the scene:|or lettering anywhere in the frame;)[^.]+\.(?: If a phone appears,[^.]+\.)?/i.exec(prompt)?.[0],
    prompt.includes(noReadableText) ? noReadableText : '',
    objectSafety && prompt.includes(objectSafety) ? objectSafety : '',
  ].filter((s): s is string => !!s)
  let action = prompt.replace(/^Film visual medium: .+?\. /, '').replace(style.suffix, '')
  if (cast) action = action.replace(cast[0], '').replace(/^[,.\s]+/, '')
  action = action.replace(/The same main character appears in this scene, consistent design:[\s\S]*/i, '').trim()
  for (const direction of originalTextDirections) action = action.replace(direction, '').trim()
  // KINEO-PLANO-COM-ACAO-1111 [CEO 11/11, reprise dos 6 filmes] — o argentinossauro (e9418905, 6,5) saiu com os planos 2 e 3 IGUAIS e sem ação:
  // o planejador tinha escrito o gancho ("a measuring tape alongside it showing 35 meters, emphasizing its enormous size"), mas o espaço do
  // plano foi para (1) a ordem do protagonista ("The only person in this shot is the same main character (the dinosaur, …); any other person
  // described below is replaced by this same character.") — que repete a ficha, já dita em "Identity:"/"Visible:" — e (2) o look do meio
  // repetido ("stylized 3D animated film look, …, not photorealistic."). E no vizinho o sujeito obrigatório ("Main subject clearly visible in
  // frame: a new palace.") virava a 1ª frase e a ação de verdade caía no corte. Agora: com ficha no plano, a ordem do protagonista sai; o look
  // do meio sai da ação; o sujeito obrigatório vai DEPOIS da 1ª frase de ação.
  const lookDoMeio = /^Film visual medium: (.+?)\. /.exec(prompt)?.[1]
  if (lookDoMeio) action = action.split(`${lookDoMeio}.`).join(' ').replace(/\s{2,}/g, ' ').trim()
  if (identity || cast) action = action.replace(/The only person in this shot is the same main character \((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\); any other person described below is replaced by this same character\.\s*/gu, '').trim()
  const sujeitoNaFrente = /^(Main subject clearly visible in frame: [^.]+\.)\s+([^.]+[.!?])/u.exec(action)
  if (sujeitoNaFrente && !/^(?:Main subject|Visible|Identity|Named character)/u.test(sujeitoNaFrente[2])) action = `${sujeitoNaFrente[2]} ${sujeitoNaFrente[1]}${action.slice(sujeitoNaFrente[0].length)}`
  // KINEO-QUALIDADE-TODOS-MOTORES-2910 — a long inherited costume must not displace the person/object action.
  const visible = (totalBudget: number) => cast?.[1].split('; ').map((person, _, people) => {
    const relation = /holding the (?:glowing )?teddy bear|beside the bicycle|with the hat/i.exec(person)?.[0]
    const budget = Math.max(0, Math.floor((totalBudget - 2 * (people.length - 1)) / people.length))
    if (!relation || person.length <= budget) return take(person, budget)
    const description = take(person.replace(relation, '').trim(), Math.max(0, budget - relation.length - 2)).replace(/\s+\S*$/, '').replace(/[,; ]+$/, '')
    return `${description}, ${relation}`
  }).join('; ')
  const who = (budget: number) => cast ? `Visible${deCostas ? ', seen from behind' : ''}: ${visible(budget)}. ` : identity ? `Identity: ${cortaEmFronteira(identity[1], budget).replace(/[.,;\s]+$/, '')}. ` : '' // KINEO-PESSOA-DO-PEDIDO-1111: corte em fronteira, era take(identity[1], budget) // KINEO-K4-ACAO-INTEIRA-1111: o "de costas" curto, junto da ficha
  // KINEO-PESSOA-DO-PEDIDO-1111 — 657ad797: a ficha do cliente (pele, olhos, tranças, blusa creme, calça preta, ~170 caracteres) caía no
  // corte de 140 e a roupa sumia; o dono quer cabelo e roupa antes do cenário. A ficha sem elenco vai até 220 (era 140).
  const identityBudget = cast ? 178 : 220
  // KINEO-QUALIDADE-REGRESSOES-2910 — identity compaction removes the old tail.
  // Reserve space for text protection already present, just as for closed mouths;
  // otherwise a previously protected ticket can lose its direction at the provider.
  const compactTextProtection = /no readable text|no legible words/i.test(prompt)
    ? NO_READABLE_TEXT_SUFFIX.replace(' anywhere in the frame', '')
      + (/\bno subtitles\b/i.test(prompt) ? ', no subtitles' : '')
      + (/\bno watermarks?\b/i.test(prompt) ? ', no watermarks' : '')
      + (/screen is off or blurred/i.test(prompt) ? ', phone screen off or blurred' : '')
      + (/out of focus and unreadable/i.test(prompt) ? ', writing out of focus and unreadable' : '') : ''
  // The era is already at the front. Repeating it before the action consumes
  // the room reserved for the original text guard, especially with long casts.
  if (compactTextProtection && period) action = action.replace(period, '').replace(/^[,.\s]+/, '')
  // KINEO-LUGAR-DO-PEDIDO-1111 — a frase longa da época ("…: every person, building, street, vehicle and object belongs to that exact time —
  // period clothing, … as it really looked then") sai INTEIRA da ação: a época curta já vai na frente; tirar só o começo deixava o resto
  // (": every person, building, street…") no plano do 2120f018 refeito.
  action = action.replace(/,?\s*(?:period piece set strictly in [^:]+)?:\s*(?:every person, building, street, vehicle and object belongs to that exact time[^]*?as it really looked then|only the things this shot describes, each exactly as it looked at that time)/giu, '').trim() // KINEO-CENA-SEM-GENTE-1411 (D) — + a trava curta do plano sem gente (lib/cinematic/personagemAjuste EPOCA_SEM_GENTE)
  // KINEO-ORIGEM-DO-ELENCO-0311 — o corte de 140-178 caracteres da ficha jogava a linha da origem fora: ela vai curta, na frente, com a marca que os juízes leem. Sem marca: byte a byte.
  const origensDaCena = [...new Set([...prompt.matchAll(/natural features of ([^.;,]+?) people/g)].map((m) => m[1]))] // KINEO-ORIGEM-DO-ELENCO-0311
  if (origensDaCena.length > 0) action = action.replace(/(?:The main person, if one is shown in this shot, is|The [a-z' -]+ in this shot (?:is|are)) [^.]+?natural features of [^.]+? people\.\s*/g, '').trim() // KINEO-ORIGEM-DO-ELENCO-0311
  // KINEO-PESSOA-DO-PEDIDO-1111 — o look repetido ("photorealistic, ultra-detailed.", já dito no meio) virava a "1ª frase da ação" no
  // corte e tomava o lugar da ação de verdade e da ficha. Sai da frente da ação.
  action = action.replace(/^(?:photorealistic, ultra-detailed\.\s*)+/i, '').trim()
  // KINEO-PESSOA-DO-PEDIDO-1111 (degrau 4) — a ficha do cliente que já diz a origem ("a … South African woman") dispensa a linha repetida
  // no plano do Kling 4 (66 caracteres para a luz e a tela). Os juízes leem a marca nos prompts cheios das cenas (free15GateServer
  // promptsDoClaim0311 = kling4_trial.scene_plan), que continuam com ela.
  const origemNaFicha = !!identity && !cast && origensDaCena.length === 1 && identity[1].includes(origensDaCena[0])
  const origemCurta = origemNaFicha ? '' : origensDaCena.length === 1 ? `Everyone shown has the natural features of ${origensDaCena[0]} people. ` : origensDaCena.length > 1 ? `People: ${origensDaCena.slice(0, 2).join(', ')}. ` : '' // KINEO-ORIGEM-DO-ELENCO-0311 — duas origens: sem a marca (o juiz só pergunta com uma)
  // KINEO-PESSOA-DO-PEDIDO-1111 (degrau 4) — a frase positiva da superfície ("Every screen glows with soft abstract light and colour.")
  // entrava só se sobrasse espaço (cenaKling4) e caiu com a ficha inteira: na prova, a tela do celular mostrou linhas de texto. Ela passa
  // a ser parte da proteção reservada (abaixo), como "no readable text".
  // KINEO-LUZ-DO-PEDIDO-1111 — a luz que o cliente pediu (a rota a põe em toda cena: "Lighting as the customer asked: …") vai curta, na frente,
  // junto do meio; a prova paga do 657ad797 saiu de noite com luminárias num pedido de sol pelas janelas.
  const luzPedida = /Lighting as the customer asked: ([^.]+)\./.exec(prompt)?.[1]?.trim()
  if (luzPedida) action = action.replace(/\s*Lighting as the customer asked: [^.]+\./g, '').trim()
  // KINEO-IDEIA-FICHA-ASSUNTO-1211 (C) — o produto que a ideia descreveu (lib/cinematic/ideiaNaFicha: "The product shown is always this same one: …")
  // vai curto na frente, como o lugar; e, com ele, a frase da embalagem não pede cor lisa (a garrafa de vidro saía laranja/mostarda). Sem a
  // marca no prompt (interruptor desligado): byte a byte o de antes.
  const produtoDaIdeia = new RegExp(`${FRASE_PRODUTO_MARCA} (.+?)\\.(?=\\s|$)`).exec(prompt)?.[1]?.trim()
  if (produtoDaIdeia) action = action.replace(new RegExp(`\\s*${FRASE_PRODUTO_MARCA} .+?\\.(?=\\s|$)`), '').trim()
  const superficie = produtoDaIdeia ? fraseUnicaDeSuperficie(prompt).split(EMBALAGEM_COR_LISA).join(EMBALAGEM_DO_PRODUTO) : fraseUnicaDeSuperficie(prompt) // KINEO-IDEIA-FICHA-ASSUNTO-1211 (C)
  if (superficie) action = action.split(superficie).join('').replace(/\s{2,}/g, ' ').trim()
  // KINEO-LUGAR-DO-PEDIDO-1111 — o lugar que o cliente pediu (a rota o põe em toda cena: "Setting as the customer asked: …") vai curto, na frente
  // KINEO-LUGAR-UNICO-1111 [CEO 11/11] — e o lugar do FILME (sem lugar no pedido, o único que as cenas citam) com o seu rótulo próprio
  const lugarPedido = /(?:Setting as the customer asked|Setting of this film): ([^.]+)\./.exec(prompt)?.[1]?.trim()
  if (lugarPedido) action = action.replace(/\s*(?:Setting as the customer asked|Setting of this film): [^.]+\./g, '').trim()
  // KINEO-LUGAR-DO-PEDIDO-1111 — a época sem época ("…the historical era being narrated", quando o pedido tem cara de época mas não tem ano) não
  // entra no plano, e a época de verdade corta em fronteira: o filme 2120f018 (11/11 17:00) saiu "…the historical era being narrat."
  const periodoUtil = period && !/historical era being narrated/i.test(period) ? cortaEmFronteira(period, 60).replace(/[.,;\s]+$/, '') : ''
  const prefix = `${medium}. ${periodoUtil ? periodoUtil + '. ' : ''}${lugarPedido && !produtoDaIdeia /* KINEO-IDEIA-FICHA-ASSUNTO-1211 (C): com o produto da ideia, o lugar cede (pessoa, produto e ação primeiro; o lugar já está na imagem-chave) */ ? `Place: ${cortaEmFronteira(lugarPedido, 70).replace(/[.,;\s]+$/, '')}. ` : ''}${luzPedida ? `Light: ${cortaEmFronteira(luzPedida, 90).replace(/[.,;\s]+$/, '')}. ` : ''}${produtoDaIdeia ? `Product: ${cortaEmFronteira(produtoDaIdeia, 100).replace(/[.,;\s]+$/, '')}. ` : '' /* KINEO-IDEIA-FICHA-ASSUNTO-1211 (C) */}${origemCurta}` // KINEO-LUZ-DO-PEDIDO-1111
  // KINEO-PONTUACAO-SOLTA-1111 [CEO 11/11, ensaio da alavanca 2] — o que se tira da ação (época, superfície, lugar, luz) deixava pontuação órfã
  // no fim ("…flickering candlelight. , . no readable text" no plano 1 do 2120f018): a ação termina na sua última frase.
  action = action.replace(/([.!?])(?:\s*[,;:.])+\s*$/u, '$1')
  let core = prefix + who(identityBudget) + action
  const fullTextProtection = originalTextDirections.length ? ' ' + originalTextDirections.join(' ') : ''
  const textProtectionBase = fullTextProtection && Array.from(core + fullTextProtection).length <= 410
    ? fullTextProtection : compactTextProtection
  // KINEO-PESSOA-DO-PEDIDO-1111 (degrau 4) — com a frase positiva da superfície, as negativas que ela substitui (", writing out of focus
  // and unreadable", ", phone screen off or blurred") saem: dizem a mesma coisa em negação e tomavam o lugar da roupa da ficha.
  const textProtection = textProtectionBase && superficie && !textProtectionBase.includes(superficie)
    ? `${textProtectionBase.replace(', writing out of focus and unreadable', '').replace(', phone screen off or blurred', '').replace(/[\s,.]+$/, '')}. ${superficie}`
    : textProtectionBase
  let coreBudget = 410 - Array.from(textProtection).length // KINEO-PESSOA-DO-PEDIDO-1111: let — a ficha do cliente sem elenco ganha +14 (abaixo)
  if (textProtection && Array.from(core).length > coreBudget) {
    // Restore safety without displacing the action that the old 410-char core
    // retained: trim verbose costume first, keeping the subject and relation.
    const firstAction = /^[\s\S]*?[.!?](?:\s|$)/.exec(action)?.[0] ?? action
    const actionBudget = Math.min(Array.from(firstAction).length, 150)
    const whoLabel = cast ? `Visible${deCostas ? ', seen from behind' : ''}: . ` : identity ? 'Identity: . ' : '' // KINEO-K4-ACAO-INTEIRA-1111: o orçamento conta o "de costas"
    const reducedIdentity = Math.max(0, Math.min(identityBudget, coreBudget - Array.from(prefix + whoLabel).length - actionBudget))
    // Action comes before the shortened costume on overflow; even a relation
    // clause that exceeds its nominal share cannot cut away the action's object.
    // KINEO-PESSOA-DO-PEDIDO-1111 — sem elenco ("Identity:" = a pessoa que o cliente descreveu), a ficha vem inteira ANTES da ação (o dono:
    // cabelo e roupa antes do cenário; 657ad797 perdeu a roupa) e a ação é que cai em fronteira, com piso de 50 caracteres.
    if (identity && !cast) {
      // o teto seguro do plano: 512 − a referência mais longa do montador ("Scene 5: text-directed shot, no new keyframe for this scene. ",
      // 61) − a cauda da boca (27) = 424 de núcleo + proteção; o 410 de sempre deixava 14 sem uso, e aqui eles vão para a ficha.
      coreBudget += 14
      // KINEO-LUGAR-DO-PEDIDO-1111 — cabelo e roupa antes do cenário (o dono): se a ficha inteira não cabe com o lugar na frente, o lugar sai
      const cabeAFicha = (pre: string) => coreBudget - Array.from(pre + whoLabel).length - 50 >= Array.from(identity[1]).length
      // KINEO-LUGAR-CEDE-A-ACAO-1111 [CEO 11/11: "o lugar cede à ação quando os dois não cabem"] — e cede também à AÇÃO: no plano 3 do 657ad797 o
      // "Place:" ficava e a ação era cortada no meio da oração ("…following a woman's face as her expression,"), sumindo o payoff ("transforms
      // from anticipation to joy"). O lugar só sai quando, com ele, o corte da ação cairia no meio da oração; corte em frase ou vírgula fica.
      const fichaComLugar = who(Math.max(0, Math.min(identityBudget, coreBudget - Array.from(prefix + whoLabel).length - 50)))
      const acaoInteiraComLugar = caiEmOracao(action, Math.max(0, coreBudget - Array.from(prefix + fichaComLugar).length))
      const pre = lugarPedido && (!cabeAFicha(prefix) || !acaoInteiraComLugar) ? prefix.replace(/Place: [^.]+\. /, '') : prefix
      const ficha = who(Math.max(0, Math.min(identityBudget, coreBudget - Array.from(pre + whoLabel).length - 50)))
      core = pre + ficha + cortaEmFronteira(action, Math.max(0, coreBudget - Array.from(pre + ficha).length))
    } else core = prefix + firstAction + ' ' + who(reducedIdentity) + action.slice(firstAction.length)
  }
  // KINEO-K4-PLANO-DA-SECAO-1111 — o corte do núcleo cai em FRONTEIRA (frase ou oração), nunca no meio da palavra: era take(core,
  // coreBudget), que deixava "consistent color g" e decapitava proibição (a lição do "menino da bolha", 27/08).
  return `${cortaEmFronteira(core, coreBudget)}${textProtection} Mouth closed, no speaking.`
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — retain complete tail sentences, including "Mouth closed, no speaking".
function compactarTextoDoFilme(prompt: string, max: number, tailChars: number): string {
  if (prompt.length <= max) return prompt
  const text = prompt.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const tailOffset = Math.max(0, text.length - tailChars)
  const nextSentence = /[.!?] /.exec(text.slice(tailOffset))
  const tailStart = nextSentence ? tailOffset + nextSentence.index + 2 : tailOffset
  const tail = text.slice(tailStart)
  const prefix = text.slice(0, Math.max(0, max - tail.length - 1))
  const end = Math.max(prefix.lastIndexOf('. '), prefix.lastIndexOf('! '), prefix.lastIndexOf('? '))
  return `${end >= 0 ? prefix.slice(0, end + 1) + ' ' : ''}${tail}`
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — quality runs after the old 2.5 limit; enforce it once more on the final vector.
export function limitarPromptDoFilmeKling25(prompt: string, index: number): string {
  if (prompt.length <= 2500) return prompt
  const axis = kling25ShotAxis(index)
  let body = prompt.replace(`${axis}. `, '')
  const period = /Period setting: [^.]+\./i.exec(body)?.[0]
  if (period) body = `${period} ${body.replace(period, '')}`
  return `${axis}. ${compactarTextoDoFilme(body, 2500 - axis.length - 2, 900)}`
}

// KINEO-CENA-ACAO-LADO-3110 — "quase igual": as palavras de conteúdo (≥ 4 letras, fora a moldura comum) de uma cena cobrem ≥ 60%
// das da outra. Plano de abertura e de fecho com o mesmo cenário e o mesmo sujeito = a repetição que o revisor marca.
const MOLDURA_COMUM = new Set(['shot', 'camera', 'slow', 'push', 'tracking', 'cinematic', 'light', 'lighting', 'mood', 'scene', 'frame', 'framing', 'with', 'from', 'into', 'that', 'this', 'their', 'over', 'under', 'film', 'visual', 'medium', 'photorealistic', 'realistic', 'detailed', 'ultra', 'mouth', 'closed', 'speaking', 'lower', 'third', 'clear', 'captions', 'text', 'logo', 'logos', 'vertical'])
function palavrasDoPlano(p: string): Set<string> {
  return new Set(String(p ?? '').toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !MOLDURA_COMUM.has(w)))
}
export function cenaQuaseIgual(a: string, b: string, ignorar: ReadonlyArray<string> = []): boolean {
  const fora = new Set(ignorar)
  const A = new Set([...palavrasDoPlano(a)].filter((w) => !fora.has(w))), B = new Set([...palavrasDoPlano(b)].filter((w) => !fora.has(w)))
  if (A.size < 4 || B.size < 4) return false
  let comuns = 0
  for (const w of A) if (B.has(w)) comuns++
  return comuns / Math.min(A.size, B.size) >= 0.6
}
export const FINAL_DIFERENTE_DA_ABERTURA = 'final moment of the story, a different place and angle from the opening shot, showing how it ends'

export function prepararQualidadeDoFilme(args: {
  prompts: ReadonlyArray<string>; falas: ReadonlyArray<string>; contextoOriginal: string
  contextoFiltro: string | null | undefined; modo: ModoVisualDoElenco; tagFaceless: boolean
  style: StyleAnchor; elenco?: ReadonlyArray<FichaDePersonagem>; preservarElenco?: boolean
  kidsCartoon?: boolean; aplicarContrato?: boolean
  /** KINEO-PROTAGONISTA-SEEDANCE-0111 — repassado à camada elencoEpoca (aplicarElencoEEpoca). */
  elencoSemantico?: { nomes: ReadonlyArray<string>; protagonista: string; leitura?: ReadonlyArray<LeituraDaFicha> } | null
  /** KINEO-ORIGEM-DO-ELENCO-0311 — repassado à camada elencoEpoca (aplicarElencoEEpoca); ausente = byte a byte o de antes. */
  origemDoElenco?: Parameters<typeof aplicarElencoEEpoca>[0]['origemDoElenco']
  /** KINEO-HISTORIA-REAL-1411 — repassado à camada elencoEpoca (aplicarElencoEEpoca); ausente (anúncio, hollywood, herdado) = byte a byte o de antes. */
  historiaReal?: Parameters<typeof aplicarElencoEEpoca>[0]['historiaReal']
  /** KINEO-ELENCO-PROVA-DE-GENTE-1211 — repassado a elencoDoRoteiro e à camada elencoEpoca; ausente = byte a byte o de antes. */
  provaDeGente?: boolean
}) {
  const elenco = args.tagFaceless ? [] : args.preservarElenco
    ? [...(args.elenco ?? [])]
    : (() => { const base = args.elenco ?? elencoDoRoteiro(args.contextoOriginal, args.provaDeGente === true ? { generoDoNome } : false) /* KINEO-ELENCO-PROVA-DE-GENTE-1211 */; return conferirFichaLiteral(elencoComFichaLiteral(args.contextoOriginal, base), base, args.elencoSemantico).elenco })() // KINEO-PROTAGONISTA-SEEDANCE-0111 — a ficha semântica não é apagada por "night Pip"; sem elenco semântico = o juiz
  const contracted = args.prompts.map((prompt, indice) => args.aplicarContrato === false ? prompt
    : aplicarContrato(montarContrato({ indice, falaFinal: args.falas[indice] ?? '', promptFinal: prompt, palavraInteira: true })).promptCorrigido)
  // Only genuinely identical adjacent shots get a new axis; never change speech or scene duration.
  const variedAdj = contracted.map((p, i) => i > 0 && p === contracted[i - 1] && args.falas[i] !== args.falas[i - 1]
    ? aplicarEixoVisual(p, '', 'medium detail shot of the action described in this scene') : p)
  // KINEO-CENA-ACAO-LADO-3110 — revisor 30/10 (fd0a408e, Kling 4, árabe): a ÚLTIMA cena saiu o mesmo plano da primeira (homem na
  // escotilha) e o desfecho ficou só na legenda. A regra do desfecho (comDesfechoDaFala) só lê then/finally/depois — em árabe não
  // dispara. Aqui, em qualquer língua: a última cena quase igual à 1ª (mesmas palavras do plano) ganha o eixo do desfecho.
  // a moldura que TODAS as cenas carregam (estilo, ficha, época) não conta como repetição: só o que é próprio de cada cena (com ≥ 3 cenas).
  const molduraDoFilme = variedAdj.length >= 3 ? [...palavrasDoPlano(variedAdj[0])].filter((w) => variedAdj.every((q) => palavrasDoPlano(q).has(w))) : []
  const varied = variedAdj.map((p, i) => i > 0 && i === variedAdj.length - 1 && args.falas[i] !== args.falas[0] && cenaQuaseIgual(p, variedAdj[0], molduraDoFilme)
    ? aplicarEixoVisual(p, '', FINAL_DIFERENTE_DA_ABERTURA) : p)
  // KINEO-QUALIDADE-TODOS-MOTORES-2910 — reserve room before elencoEpoca's 2500-char insertion gate.
  const withRoom = args.modo === 'presenter' || args.tagFaceless ? varied : varied.map(p => compactarTextoDoFilme(p, 1800, 650))
  const cast = aplicarElencoEEpoca({ ...args, prompts: withRoom })
  const cenas = cenasDoElenco(cast.prompts, args.falas, elenco)
  const prompts = cast.prompts.map((prompt, i) => {
    let p = prompt
    // KINEO-QUALIDADE-TODOS-MOTORES-2910 — an incomplete old snapshot authorizes a role/name, never a newly invented design.
    if (args.preservarElenco) for (const detected of cast.relato.elenco) {
      const frozen = elenco.find(f => f.nome.toLowerCase() === detected.nome.toLowerCase())
      if (detected.nomeado || frozen) p = p.split(detected.descricao).join(frozen?.canonica ?? detected.nome)
    }
    // Reuse the canonical source description, never cast the continuation again.
    for (const ficha of elenco.filter(f => cenas[i]?.nomes.includes(f.nome))) {
      const detected = cast.relato.elenco.find(e => mesmoPersonagem(e.nome, ficha.nome)) // KINEO-CITADO-NAO-AGE-0311 — era nome exato: "the woman" x "the mystery woman" (e "F. Kennedy" x "Kennedy") ficavam com DUAS descrições na mesma cena
      if (detected && detected.descricao !== ficha.canonica) p = p.split(detected.descricao).join(ficha.canonica)
      // KINEO-CONSISTENCIA-SER-3010 — ser não humano: a cena perde a descrição concorrente (fora do texto da ficha) e a ficha literal ganha o desenho fixo
      if (ficha.tipo !== 'humano') p = p.split(ficha.canonica).map((trecho) => semDescricaoConcorrente(trecho, ficha.nucleo)).join(ficha.canonica)
      if (!p.includes(ficha.canonica)) p += CLAUSULA_FICHA(canonicaComDesenhoFixo(ficha))
    }
    // KINEO-SUJEITO-DA-FALA-3010 — o assunto que a fala nomeia (Vênus) entra na cena que não o mostra; gente do elenco fica com a ficha
    if (args.modo !== 'presenter') p = args.provaDeGente === true ? comSujeitoDaFala(p, args.falas[i] ?? '', [...elenco.map(f => f.nome), ...cast.relato.elenco.map(e => e.nome)], true) : comSujeitoDaFala(p, args.falas[i] ?? '', [...elenco.map(f => f.nome), ...cast.relato.elenco.map(e => e.nome)]) // KINEO-IDEIA-FICHA-ASSUNTO-1211 (B) — ligado: o nome de referência ("from Africa") não vira o assunto do plano
    // KINEO-DESFECHO-3010 — a ÚLTIMA cena mostra o último acontecimento da fala (a festa do pijama), nunca volta ao começo
    if (args.modo !== 'presenter' && i === cast.prompts.length - 1) p = comDesfechoDaFala(p, args.falas[i] ?? '')
    p = comUniformeSemMarca(p, args.contextoOriginal) // KINEO-SEM-MARCA-3010
    return travarEstiloDoFilme(p, args.style)
  })
  return { prompts, elenco, style: args.style, cenas, relato: cast.relato }
}

// KINEO-SEM-MARCA-3010 [TRAVA 8.2 — vai do fundador 30/10 "estão todos autorizados"] — revisor 29/10 (Seedance 1.5): "Did
// Guardiola invent the false 9?" saiu com escudo do Barcelona, Rakuten e Adidas nas camisas — marca de terceiro no vídeo do
// cliente. O motor não tem negative_prompt ("no logo" desenha logo): a frase é POSITIVA e curta (cabe no orçamento do Kling 4),
// e só entra quando o pedido fala de clube/uniforme. Marca do PRÓPRIO cliente (anúncio) não dispara: a lista é de futebol/kit.
const CLUBE_OU_UNIFORME_RE = /\b(?:barcelona|bar[çc]a|real madrid|atl[eé]tico de madrid|manchester (?:united|city)|liverpool|chelsea|arsenal|tottenham|juventus|inter de mil[aã]o|milan|psg|paris saint-germain|bayern|borussia|flamengo|corinthians|palmeiras|s[aã]o paulo fc|santos fc|boca juniors|river plate|al[- ]nassr|al[- ]hilal|inter miami|messi|ronaldo|neymar|mbapp[eé]|guardiola|jerseys?|football kits?|soccer kits?|team kits?|camisas? d[eo] (?:time|clube)|camisetas? del (?:equipo|club))\b/i
export const UNIFORME_SEM_MARCA = ' Plain unbranded shirts and kits in solid team colours.'
export function comUniformeSemMarca(prompt: string, contexto: string): string {
  if (prompt.includes(UNIFORME_SEM_MARCA.trim())) return prompt
  return CLUBE_OU_UNIFORME_RE.test(`${contexto ?? ''} ${prompt}`) ? `${prompt.replace(/\s+$/, '')}${UNIFORME_SEM_MARCA}` : prompt
}

// KINEO-SUJEITO-DA-FALA-3010 — revisão de 30/10 (Kling 4, 1º filme, BR): "On Venus, the year ends before a single day does!" saiu
// sobre a etiqueta do cliente "[Pexels: stars and galaxy view]" — galáxia genérica, e Vênus some justo no fecho (FINAL_FRACO).
// Palavra comum que abre frase, pronome e quem já tem ficha não entram; fala com pronome de gente (he/she…) fica de fora
// (pessoa real não ganha "clearly visible" aqui — essa é a regra do elenco).
const NAO_SUJEITO = new Set(['The', 'And', 'But', 'This', 'That', 'These', 'Those', 'Its', 'You', 'Did', 'Does', 'What', 'Why', 'How', 'Who', 'Where', 'When', 'Then', 'Yes', 'Now', 'Here', 'There', 'Just', 'Even', 'Every', 'One', 'Our', 'Your', 'His', 'Her', 'Their', 'Today', 'Tomorrow', 'Yesterday', 'Wow', 'Imagine', 'Meet', 'Look', 'Watch', 'Follow', 'Subscribe', 'Fun', 'Fact', 'Day', 'Year'])
// KINEO-SUJEITO-LIMPO-0411 — claims reais de 01-04/11: "Texas and November", "Northwest and Flight", "Segunda and Guerra", "World and War", "Flannan and Isles", "Wagen and Motor", "São", "Tuesday", "German" na FRENTE do
// prompt do 1º filme. Aqui só se SUBTRAI: nada de reconstruir nome inteiro (reprovou 3 voltas em 04/11). O erro seguro é não inserir nada, porque o sujeito obrigatório semântico (sujeitoTodosMotores.ts) cobre o tema.
const ARTIGO_ANTES_0411 = /^(?:the|an?|os?|as|um|uma|uns|umas|el|la|los|las|un|una|unos|unas|le|les|une|il|lo|gli|der|die|das|den|dem|ein|eine)$/i
const ARTIGO_DEPOIS_0411 = /^(?:the|os?|el|la|los|las|le|les|il|der)\s/ // artigo logo depois prova que a palavra é nome ("In London the"); adjetivo pátrio nunca vem antes de artigo
const PREPOSICAO_INICIAL_0411 = new Set(['On', 'In', 'At', 'From', 'To', 'Near', 'Over', 'Inside', 'Em', 'No', 'Na', 'Nos', 'Nas', 'Para', 'De', 'Do', 'Da', 'En', 'Desde', 'Hacia', 'Dans', 'Sur', 'Vers'])
const DATA_0411 = new Set('january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday janeiro fevereiro marco abril maio junho julho agosto setembro outubro novembro dezembro segunda terca quarta quinta sexta sabado domingo enero febrero marzo mayo junio julio septiembre octubre noviembre diciembre lunes martes miercoles jueves viernes janvier fevrier avril juin juillet aout septembre octobre novembre decembre lundi mardi mercredi jeudi vendredi samedi dimanche gennaio febbraio aprile maggio giugno luglio settembre ottobre dicembre lunedi martedi mercoledi giovedi venerdi sabato domenica januar februar marz juni juli oktober dezember montag dienstag mittwoch donnerstag freitag samstag sonntag jan feb mar apr jun jul aug sep sept oct nov dec fev abr mai ago set out dez ene dic gen sun'.split(' ')) // abreviações de mês; "sun" também é o astro: "the Sun" não disputa com Venus
const ALEMAO_0411 = /\b(?:und|nicht|ist|sind|einer?|einem|einen|eine|dem|auf|mit)\b/i // em alemão todo substantivo tem maiúscula: maiúscula não prova nome próprio ("Wagen and Motor")
/** O único nome próprio limpo e isolado que a fala cita no meio da frase ("On Venus,", "is Venus!"); na dúvida, nenhum. Nunca dois. */
// KINEO-IDEIA-FICHA-ASSUNTO-1211 (B) — filme pago "Jonathan" (12/11, Kling 4): "Jonathan lives on a tiny island, nearly 2,000 kilometres from
// Africa." virou "Africa clearly visible as the subject of this shot." e o plano saiu um mapa da África, sem penhasco nem mar. O nome regido por
// preposição de REFERÊNCIA (distância, comparação, origem: "from X", "away from X", "older than X", "bigger than X", "like X", "via X") é ponto de
// referência, não o assunto do plano: não entra, e por ter sido citado também não deixa outro nome sair sozinho (o assunto e a etiqueta da
// própria cena vencem). Regra pela palavra anterior, sem lista de lugares. Atrás de ELENCO_PROVA_DE_GENTE (o mesmo interruptor que chega aqui).
const REFERENCIA_NAO_SUJEITO_1211 = new Set(['from', 'than', 'like', 'unlike', 'via', 'beyond', 'versus', 'vs']) // KINEO-IDEIA-FICHA-ASSUNTO-1211
export function sujeitosDaFala(fala: string, referenciaNaoESujeito = false): string[] { // KINEO-IDEIA-FICHA-ASSUNTO-1211: referenciaNaoESujeito
  const t = String(fala ?? '')
  if (/\b(?:he|she|his|her|him|hers)\b/i.test(t) || ALEMAO_0411.test(t)) return []
  const out = new Set<string>(), citadas = new Set<string>()
  for (const m of t.matchAll(/(?<![\p{L}\p{N}'’])\p{Lu}[\p{L}\p{N}'’]+/gu)) {
    const crua = t.slice(0, m.index ?? 0), antes = crua.trimEnd(), depois = t.slice((m.index ?? 0) + m[0].length), resto = depois.trimStart()
    if (NAO_SUJEITO.has(m[0]) || DATA_0411.has(m[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase())) continue
    if (regrasDeLinguaLigadas() && marcaDeEstilo(m[0])) continue // KINEO-APARENCIA-DO-PEDIDO-1311 — "В стиле Пиксар" fala do look: "Пиксар clearly visible as the subject of this shot" saía no plano 4 (7f92fe17)
    // antes: só letra, número ou vírgula. Início de frase depois de ponto, emoji, aspas, travessão, hífen ou quebra de linha não conta.
    if (!/[\p{L}\p{N},;]$/u.test(antes) || crua.slice(antes.length).includes('\n')) continue
    // Conta ANTES dos filtros, inclusive o que eles descartam: "In 1912, the Titanic sank near Newfoundland" tem dois nomes, e o coadjuvante não pode sair sozinho como assunto.
    citadas.add(m[0])
    // KINEO-B4-MONTAGEM-1311 [CEO 13/11, fila b4] — Pompeia em russo (42bcd59f, nota 6): "Арену в Помпеях…" virou "Помпеях clearly visible as
    // the subject of this shot." O plano é escrito em inglês; um nome em outra escrita (cirílico, grego…) chega FLEXIONADO ("Помпеях" é o
    // locativo de Помпеи) e o motor não o lê como assunto. Só nome em letra latina vira assunto obrigatório. O de outra escrita CONTA como
    // citado (revisão da CEO, C7): numa fala russa, um nome latino solto não sai sozinho como assunto.
    if (regrasDeLinguaLigadas() && !/^\p{Script=Latin}[\p{Script=Latin}\p{N}'’]*$/u.test(m[0])) continue // KINEO-B4-MONTAGEM-1311
    if (!/^\p{Lu}\p{Ll}{2,}$/u.test(m[0])) continue
    const anterior = antes.split(/\s+/).pop()!.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    if (referenciaNaoESujeito && REFERENCIA_NAO_SUJEITO_1211.has(anterior.toLowerCase())) continue // KINEO-IDEIA-FICHA-ASSUNTO-1211 (B) — "from Africa" é referência
    // artigo antes ("the Roman") e maiúscula antes, por espaço, hífen ou vírgula ("World War", "Sexta-feira Santa", "Dallas, Texas"); preposição que abre a frase ("On Venus") é a única exceção.
    if (ARTIGO_ANTES_0411.test(anterior) || (/^\p{Lu}/u.test(anterior) && !PREPOSICAO_INICIAL_0411.has(anterior))) continue
    // depois: fim, pontuação ou artigo. Palavra minúscula ("Roman army"), maiúscula ("Northwest Flight"), número ("Flight 2501"), hífen ("Sexta-feira"), & ("Achados & Variedades") e vírgula + nome ("Dallas, Texas") não contam.
    if (/^[-‐‑]/.test(depois)) continue
    if (resto && !/^[^\S\n]*\n/.test(depois) && (/^[\p{L}\p{N}]/u.test(resto) ? !ARTIGO_DEPOIS_0411.test(resto) : /^[&+]|^[,;]\s*\p{Lu}/u.test(resto))) continue
    out.add(m[0])
  }
  return out.size === 1 && citadas.size === 1 ? [...out] : [] // outra maiúscula em qualquer ponto da fala = nenhum sai limpo; "X and Y" nunca mais
}
// KINEO-DESFECHO-3010 — revisão de 30/10 (Kling 4, 1º filme, US, nota 7): "At the mall, she buys a puppy and more... then a slumber
// party!" — a última cena seguiu a etiqueta "[Pexels: shopping mall puppy store]" e o filme acabou de volta na cozinha; a festa nunca
// apareceu. Regra do revisor: a última cena mostra o desfecho do pedido, não repete a anterior nem cai em paisagem genérica.
const PALAVRA_VAZIA = new Set(['then', 'that', 'this', 'with', 'from', 'into', 'more', 'some', 'they', 'them', 'their', 'there', 'what', 'when', 'where', 'which', 'while', 'very', 'really', 'just', 'even', 'only', 'also', 'before', 'after', 'does', 'have', 'been', 'will', 'your', 'ends', 'single', 'depois', 'quando', 'muito', 'mais', 'para', 'pela', 'pelo', 'como', 'entonces', 'luego', 'despues', 'después'])
/** O último acontecimento da fala: o trecho depois do último "then / finally / and then / … / depois / então / luego". */
export function desfechoDaFala(fala: string): string | null {
  const frases = String(fala ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  const ultima = frases[frases.length - 1] ?? ''
  const partes = ultima.split(/\.{3}|…|\b(?:and then|then|finally|at last|in the end|e então|então|depois|por fim|no fim|y luego|luego|al final|finalmente)\b/i)
  if (partes.length < 2) return null
  const trecho = partes[partes.length - 1].replace(/^[\s,;:—-]+|[\s.!?…]+$/g, '').trim()
  const palavras = trecho.split(/\s+/).filter(Boolean)
  return palavras.length >= 1 && palavras.length <= 10 ? trecho : null
}
/** A última cena que não mostra o desfecho ganha "Final moment of the story, clearly shown: <desfecho>." na frente. */
export function comDesfechoDaFala(prompt: string, fala: string): string {
  const desfecho = desfechoDaFala(fala)
  if (!desfecho) return prompt
  const chave = desfecho.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !PALAVRA_VAZIA.has(w))
  if (chave.length === 0 || chave.some((w) => new RegExp(`\\b${w}`, 'i').test(prompt))) return prompt
  return `Final moment of the story, clearly shown: ${desfecho}. ${prompt}`
}
/** A cena que não mostra o assunto nomeado pela fala ganha "<assunto> clearly visible as the subject of this shot." na frente. */
export function comSujeitoDaFala(prompt: string, fala: string, ignorar: ReadonlyArray<string>, referenciaNaoESujeito = false): string { // KINEO-IDEIA-FICHA-ASSUNTO-1211: referenciaNaoESujeito
  const ign = new Set(ignorar.flatMap((n) => String(n).split(/\s+/)).map((w) => w.toLowerCase()))
  const sujeitos = (referenciaNaoESujeito ? sujeitosDaFala(fala, true) : sujeitosDaFala(fala)).filter((s) => !ign.has(s.toLowerCase())) // KINEO-IDEIA-FICHA-ASSUNTO-1211 (B)
  const faltando = sujeitos.filter((s) => !new RegExp(`\\b${s}\\b`, 'i').test(prompt))
  // a cena já mostra um dos assuntos ("A close-up of Venus" com fala "…orbit the Sun"): fica como está
  return faltando.length && faltando.length === sujeitos.length ?`${faltando.join(' and ')} clearly visible as the subject of this shot. ${prompt}` : prompt
}

/** Reuse a source still only for matching speech/action, not merely because the same person appears. */
export function stillHerdadoDaCena(source: FilmQualitySnapshot | null, fala: string, prompt: string): string | null {
  const normalized = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const speech = normalized(fala), visual = normalized(prompt)
  return source?.approvedStills.find(s => (speech.length > 12 && normalized(s.voiceover) === speech)
    || (visual.length > 30 && normalized(s.prompt) === visual))?.url ?? null
}

/** A reference is selected by character identity; a girl's sheet cannot judge a robot scene. */
export function referenciaDaCena(source: FilmQualitySnapshot | null, fichas: ReadonlyArray<FichaDePersonagem>) {
  for (const ficha of fichas) {
    const url = source?.characterReferences.find(r => r.nome === ficha.nome)?.url
      ?? source?.approvedStills.find(s => s.characterNames.includes(ficha.nome))?.url
    if (url) return { url, descricao: ficha.canonica }
  }
  return undefined
}
