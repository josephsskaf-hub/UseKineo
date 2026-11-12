// KINEO-ULTIMO-PLANO-ACONTECE-1111 [CEO 11/11, alavanca 1 inteira, atrás de 'internal'] — o que separa 7 de 8,5 no revisor: nos filmes 8+ o acontecimento
// central ACONTECE na tela e o fim fecha ("fecho dividindo as frutas", "o ovo racha"); nos 7 o fim é um cartão-postal parado ("o lançamento não
// aparece", "FINAL parado ~6 s"; na prova do 2120f018 = 8,0 o último plano é um céu estrelado com os 2 quadros iguais). O código não inventa o verbo
// quando a fala não tem um ("God's attributes are seen") — isso é do planejador. Aqui: a linha do prompt do planejador (analyze-idea, as duas
// mensagens de cena) que pede que o ÚLTIMO visual_prompt seja um acontecimento físico com verbo de mudança, e o detector desse verbo (para o ensaio e
// o guardião). A frase do plano final do Kling 4 (lib/kling4PlanoFinal.ts) é a outra metade. Puro: sem rede.

/** off = ninguém · internal = só contas da casa (isInternalEmail) · public = todo filme. */
export type ModoUltimoPlano = 'off' | 'internal' | 'public'
export const ULTIMO_PLANO_ACONTECE: ModoUltimoPlano = 'internal' // só a casa até a nota da prova paga (CEO 11/11: "eu rodo UM filme da casa do zero")

export function ultimoPlanoAconteceLigado(modo: ModoUltimoPlano, contaDaCasa: boolean): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasa === true)
}

export const REGRA_ULTIMO_PLANO = 'LAST SCENE (KINEO-ULTIMO-PLANO-ACONTECE-1111): the LAST visual_prompt shows the payoff HAPPENING on screen: one concrete physical event, written with a verb of change (opens, cracks, collapses, lights up, rises, breaks, falls, arrives, turns, transforms, pours, bursts), that starts and completes inside the shot, with the main subject of the story in it; never a still landscape, an empty sky, a static portrait or a symbol.'

// verbo de mudança no presente (3ª pessoa) ou no gerúndio: o fim tem um acontecimento, não um papel de parede
const VERBO_DE_MUDANCA = /\b(?:open(?:s|ing)|crack(?:s|ing)|collaps(?:es|ing)|light(?:s|ing) up|rises|rising|break(?:s|ing)|falls|falling|arriv(?:es|ing)|turn(?:s|ing)|transform(?:s|ing)|pour(?:s|ing)|burst(?:s|ing)|explod(?:es|ing)|shatter(?:s|ing)|erupt(?:s|ing)|crumbl(?:es|ing)|bloom(?:s|ing)|ignit(?:es|ing)|flar(?:es|ing)|lift(?:s|ing)|jump(?:s|ing)|throw(?:s|ing)|catch(?:es|ing)|hug(?:s|ging)|run(?:s|ning)|leap(?:s|ing)|splash(?:es|ing)|spill(?:s|ing)|sweep(?:s|ing)|unfold(?:s|ing)|reveal(?:s|ing)|emerg(?:es|ing)|hatch(?:es|ing)|grab(?:s|bing)|reach(?:es|ing)|clap(?:s|ping)|laugh(?:s|ing)|burst(?:s|ing) into)\b/iu

/** O último visual_prompt tem um acontecimento (verbo de mudança)? */
export function fimAcontece(visualPrompt: unknown): boolean {
  return VERBO_DE_MUDANCA.test(String(visualPrompt ?? ''))
}

/** A mensagem que pede ao planejador SÓ o último plano de novo, como acontecimento (a fala fica fixa). */
export function mensagemDoUltimoPlano(voiceover: string, atual: string): string {
  return `Rewrite ONLY the LAST scene of a short vertical video. The voiceover is FIXED: "${String(voiceover ?? '').trim()}". Current visual_prompt: "${String(atual ?? '').trim()}". Return JSON {"visual_prompt": "..."}: 150-350 characters, cinematic 9:16, the SAME subject, place, era and visual style as the current one, but the shot shows ONE concrete physical event happening and completing on screen, written with a verb of change (opens, cracks, collapses, lights up, rises, breaks, falls, arrives, turns, transforms, pours, bursts, blooms), with the main subject of the story in it; never a still landscape, an empty sky, a static portrait or a symbol. No text, letters or signs in the frame.`
}

/**
 * KINEO-ULTIMO-PLANO-ACONTECE-1111 — a decisão é do CÓDIGO (o ensaio: a linha do prompt sozinha fez o fim acontecer em 6 de 8, contra 5 de 8 sem ela):
 * se o último visual_prompt não tem verbo de mudança, o planejador refaz SÓ esse plano uma vez, e o novo só entra se tiver o verbo e o tamanho certo.
 * `pedir` devolve o texto JSON do modelo; qualquer falha = o plano de antes, intacto. `ajusta` aplica a mesma limpeza das outras cenas (câmera, teto).
 */
export async function ultimoPlanoComAcontecimento(
  cenas: Array<{ voiceover: string; visual_prompt: string }>,
  pedir: (mensagem: string) => Promise<string>,
  ajusta: (visual: string) => string = (v) => v,
): Promise<{ trocou: boolean; motivo: 'sem_cena' | 'ja_acontece' | 'falhou' | 'recusado' | 'refeito' }> {
  const u = cenas[cenas.length - 1]
  if (!u) return { trocou: false, motivo: 'sem_cena' }
  if (fimAcontece(u.visual_prompt)) return { trocou: false, motivo: 'ja_acontece' }
  let novo = ''
  try { novo = String((JSON.parse(await pedir(mensagemDoUltimoPlano(u.voiceover, u.visual_prompt))) as { visual_prompt?: unknown }).visual_prompt ?? '').trim() } catch { return { trocou: false, motivo: 'falhou' } }
  if (!fimAcontece(novo) || novo.length < 80 || novo.length > 450) return { trocou: false, motivo: 'recusado' }
  u.visual_prompt = ajusta(novo)
  return { trocou: true, motivo: 'refeito' }
}
