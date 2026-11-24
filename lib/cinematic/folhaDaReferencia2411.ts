// KINEO-FOLHA-DA-REFERENCIA-2411 [CEO 24/11, etapa 1 · a ficha descartada] — na casa, a referência única ligou em 3 de 3 de manhã e em 0 de 4 à tarde.
// Em 3 dos 4 a causa foi a mesma: as imagens-chave feitas COM a folha (nano-banana-pro/edit) reprovaram no crítico contra ela por identidade E estilo,
// regeraram, reprovaram de novo, e a rota apagou a folha do retrato (route.ts: folhaDescartada → characterReferences = []; e, mesmo sem descarte, só fica a
// folha de quem tem imagem-chave APROVADA). Sem folha no retrato, referenciaUnicaDoFilme devolve null.
// O caminho da referência única (kling/v4/reference-to-video) manda ao motor SÓ image_urls: [folha]; as imagens-chave não vão. A reprovação delas
// não diz nada da imagem que o motor recebe, salvo quando a folha mesma está errada (o caso Krishna de 27/10: o personagem errado em toda cena).
// NÃO existe juiz da folha: juiz_ficha_v1 (lib/cinematic/juizFicha) julga as IMAGENS-CHAVE com e sem a folha; folhaErrada é "identidade reprovada
// em 2+ cenas". O único sinal que separa "a imagem-chave saiu em outro meio" de "a folha é de outro personagem" é a categoria do próprio crítico:
// 'estilo' junto com a identidade. Nos 35 filmes com folha de 14 dias (3 da casa, 32 de cliente), TODA reprovação de identidade veio com 'estilo';
// então, hoje, esta regra não filtra nenhum: ela só barra a reprovação de identidade SEM estilo (a folha de outro personagem).
// O conserto: atrás de FOLHA_DA_REFERENCIA_2411 ('internal' = só a lista exata da casa; cliente = byte a byte a main), a folha que a rota gerou volta
// ao retrato que a ADMISSÃO da referência única lê (só ela; o retrato do filme, a herança e o claim não mudam). As imagens-chave reprovadas não são
// usadas pela referência (nunca foram). O caminho sem referência (image-to-video / text-to-video) fica como é.
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { decidirSemFolha, falhouNaIdentidade } from '@/lib/cinematic/juizFicha'
import type { RelatoCriticoStill } from '@/lib/cinematic/criticoStill'

export const FOLHA_DA_REFERENCIA_2411_VERSAO = 'KINEO-FOLHA-DA-REFERENCIA-2411'
export type ModoFolhaDaReferencia2411 = 'off' | 'internal' | 'public'
/** 'off' = a admissão lê o retrato de hoje, byte a byte. 'internal' = só a lista EXATA da casa. 'public' só com prova paga na casa e o sim do dono. */
export const FOLHA_DA_REFERENCIA_2411: ModoFolhaDaReferencia2411 = 'internal'
export const folhaDaReferenciaLigada = (modo: ModoFolhaDaReferencia2411, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))

type RelatoDaFolha = Pick<RelatoCriticoStill, 'veredito' | 'problemas' | 'regerou' | 'regeracao_ok' | 'veredito_regerada' | 'problemas_regerada' | 'nota' | 'nota_regerada' | 'escolhida'>
/** A folha serve à referência única? Não, se alguma cena reprovou a IDENTIDADE sem 'estilo' (em qualquer das duas fotos que a decisão do juiz leu):
 *  aí a folha pode ser de outro personagem. Cena aprovada, não julgada ou reprovada por outro motivo não pesa. */
export function folhaServeAReferencia2411(relatos: ReadonlyArray<RelatoDaFolha>): boolean {
  return relatos.every((r) => {
    if (!decidirSemFolha(r).precisa) return true
    const reprovadas = [r.veredito === 'FAIL' ? r.problemas : null, r.veredito_regerada === 'FAIL' ? r.problemas_regerada : null]
    return reprovadas.every((p) => !falhouNaIdentidade(p) || (Array.isArray(p) && p.includes('estilo')))
  })
}

/** O retrato que a admissão da referência única lê: desligado, sem folha a devolver ou retrato torto = o MESMO objeto (byte a byte). Ligado: as folhas
 *  https que a rota gerou e tirou do retrato voltam, marcadas (mantida), atrás das que ficaram; a referência que sair delas tem origem 'folha_mantida'. */
export function retratoDaReferencia2411(snapshot: FilmQualitySnapshot | null, folhas: ReadonlyArray<{ nome: string; url: string }> | null | undefined, ligada: boolean): FilmQualitySnapshot | null {
  if (!ligada || !snapshot || !Array.isArray(snapshot.characterReferences) || !Array.isArray(folhas)) return snapshot
  const voltam = folhas.filter((f) => !!f && typeof f.nome === 'string' && typeof f.url === 'string' && /^https:\/\/[^\s]+$/i.test(f.url)
    && !snapshot.characterReferences.some((r) => r?.nome === f.nome))
  if (!voltam.length) return snapshot
  return { ...snapshot, characterReferences: [...snapshot.characterReferences, ...voltam.map((f) => ({ nome: f.nome, url: f.url, mantida: true }))] }
}
