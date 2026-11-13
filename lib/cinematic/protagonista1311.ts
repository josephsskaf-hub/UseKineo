// ═══ KINEO-PROTAGONISTA-1311 [CEO 13/11, "vai na regra do protagonista"] — pedido COM protagonista não vira filme sem rosto ═══════════════
//
// O ACHADO (47 filmes grátis do Kling 4, 14 dias, visual_mode do claim × nota do revisor): 28 saíram documentary_faceless — e o modo sem rosto
// não tem ficha nem folha de personagem. Neles estão 8 dos 11 PERSONAGEM_TROCOU (todos sem folha) e 13 das 23 CENA_FORA; nota 8 em 1 de 28.
// Entre os 28 há 10 HISTÓRIAS com protagonista (Maung Hlaing, Vance, Léo, Daniel, Lucas, Luca, Gabriel, Harry Potter, o gato ninja, a moça do
// anúncio MIARA) — o resto é documentário (bunker, ilha, álcool, polvo, Everest, café…).
//
// A REGRA (decide o CÓDIGO, com sinais estruturados que a rota já lê — nenhuma pergunta "isto é história?" ao GPT, regra da casa de 11/11):
//   · o protagonista do elenco semântico (lib/cinematic/elencoSemantico: lê o roteiro em qualquer língua) é gente, bicho ou criatura; OU
//   · a leitura do sujeito do pedido (lib/cinematic/sujeitoObrigatorio) é válida e o sujeito é criatura ou pessoa genérica.
// Com um dos dois, o filme que ia sem rosto vai para character_story (ficha e folha). Só ACRESCENTA: filme que já era história, apresentador,
// [faceless] escrito, desenho infantil ou qualidade herdada ficam como estão.
// ENSAIO OFFLINE (13/11, os roteiros reais dos 47): dos 28 sem rosto, 9 de 10 histórias mudam (falta a MIARA: anúncio em 1ª pessoa, sem
// sinal), 0 de 16 documentários mudam, 0 de 2 ambíguos mudam; os 18 character_story e o presenter não mudam (por construção).
//
// FICHA DO SUJEITO VIVO (pacote, item 1): história sem elenco (o extrator determinístico só lê inglês; o elenco semântico pode falhar — o gato
// ninja em russo deu json_invalido) ganha a ficha do sujeito lido: a espécie + a aparência do pedido; o LUGAR (item 2) entra só quando o
// pedido é uma ideia de uma linha (o subject_visual inteiro: "a ninja cat jumping across rooftops (ginger)").
// Interruptor PROTAGONISTA_1311: 'off' = byte a byte o de antes. Guardião: scripts/test-protagonista-1311.mjs.
import type { ElencoSemantico } from '@/lib/cinematic/elencoSemantico'
import type { LeituraDoSujeito } from '@/lib/cinematic/sujeitoObrigatorio'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'

export type ModoProtagonista = 'off' | 'all'
export const PROTAGONISTA_1311: ModoProtagonista = 'all'
export const protagonistaLigado = (modo: ModoProtagonista = PROTAGONISTA_1311): boolean => modo === 'all'
export const PROTAGONISTA_1311_VERSAO = 'protagonista_1311_v1'
export const PROTAGONISTA_1311_EVENTO = 'cinematic_protagonist_mode'

const KINDS_DO_ELENCO = new Set(['human', 'animal', 'creature'])
const KINDS_DO_SUJEITO = new Set(['creature', 'person_generic'])

/** A leitura do sujeito vale como sinal: válida (não descartada), não é pessoa real, tem o visual e é criatura ou pessoa genérica. */
export function sujeitoVivo(l: LeituraDoSujeito | null | undefined): boolean {
  return !!l && !l.descartado && !l.real_person && !!l.subject_visual && !!l.head_noun && KINDS_DO_SUJEITO.has(l.kind)
}

/** O pedido tem protagonista? Só sinais estruturados; nenhum = { sim: false } (o filme fica como estava). Pura. */
export function temProtagonista(a: { elenco: ElencoSemantico | null | undefined; leitura: LeituraDoSujeito | null | undefined }): { sim: boolean; motivo: string } {
  const p = a.elenco?.protagonist ?? null
  if (p && KINDS_DO_ELENCO.has(p.kind)) return { sim: true, motivo: `elenco:${p.kind}` }
  if (sujeitoVivo(a.leitura)) return { sim: true, motivo: `sujeito:${a.leitura!.kind}` }
  return { sim: false, motivo: 'sem_sinal' }
}

/** O texto que a leitura do sujeito lê: o pedido do cliente, ou o roteiro sem as pistas [..] e sem os rótulos de seção. */
export function textoParaOSujeito(pedidoDoCliente: string | null | undefined, roteiro: string): string {
  const base = String(pedidoDoCliente ?? '').trim() || String(roteiro ?? '')
  return base.replace(/\[[^\]]*\]/g, ' ').replace(/^(?:HOOK|MICRO REWARD(?: \d)?|PAYOFF|ESCALATION|RHYTHM)[^:\n]*:\s*/gim, '').replace(/\s+/g, ' ').trim()
}
type ResultadoLeitura = { ok: true; valor: LeituraDoSujeito } | { ok: false; erro: string }
/** As duas leituras em paralelo (rede injetada). Nunca lança: erro = sinal ausente. As respostas cruas voltam para a rota reaproveitar. */
export async function lerSinaisDoProtagonista(roteiro: string, textoDoSujeito: string, ler: {
  elenco: (t: string) => Promise<{ elenco: ElencoSemantico | null }>
  sujeito: (t: string) => Promise<ResultadoLeitura>
}): Promise<{ elenco: ElencoSemantico | null; elencoBruto: { elenco: ElencoSemantico | null } | null; leitura: LeituraDoSujeito | null; leituraBruta: ResultadoLeitura | null }> {
  const [e, s] = await Promise.all([ler.elenco(roteiro).catch(() => null), textoDoSujeito ? ler.sujeito(textoDoSujeito).catch(() => null) : Promise.resolve(null)])
  return { elenco: e?.elenco ?? null, elencoBruto: e, leitura: s && s.ok ? s.valor : null, leituraBruta: s }
}

/** Ideia de uma linha: uma frase só, curta (o lugar dela vale para o filme inteiro). */
export function ideiaDeUmaLinha(pedido: string | null | undefined): boolean {
  const t = String(pedido ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return false
  const frases = t.split(/(?<=[.!?…])\s+/u).filter(Boolean)
  return frases.length === 1 && t.split(' ').length <= 25
}

/**
 * A ficha do sujeito vivo quando a história ficou sem elenco: nome "the <núcleo>", a espécie (ou o papel) e a aparência do pedido; com ideia de
 * uma linha, o visual inteiro (com o lugar). null = a leitura não é de sujeito vivo. Pura.
 */
export function fichaDoSujeitoVivo(l: LeituraDoSujeito | null | undefined, pedido: string | null | undefined): FichaDePersonagem | null {
  if (!sujeitoVivo(l)) return null
  const nucleo = String(l!.head_noun).toLowerCase()
  const visual = String(l!.subject_visual).replace(/[.\s]+$/u, '')
  // sem ideia de uma linha: só até o núcleo ("a ninja cat jumping across rooftops" → "a ninja cat"); a ação e o lugar ficam com cada cena
  const i = visual.toLowerCase().search(new RegExp(`(?<![a-z])${nucleo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`))
  const base = ideiaDeUmaLinha(pedido) || i < 0 ? visual : visual.slice(0, i + nucleo.length)
  const aparencia = l!.appearance && !base.toLowerCase().includes(String(l!.appearance).toLowerCase()) ? ` (${l!.appearance})` : ''
  return {
    nome: `the ${nucleo}`, nucleo, tipo: l!.kind === 'person_generic' ? 'humano' : 'animal',
    canonica: `the ${nucleo}, ${base}${aparencia}`, origem: 'modelo', protagonista: true, genero: null,
  }
}
