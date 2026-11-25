// KINEO-FICHA-SEM-NOME-2511 [CEO 25/11, Bolt addef2b6: o conferente aprovou um robô com cabeça de cachorro; hipótese H1 = o nome "Bolt" vai ao gerador
// da folha]. O interruptor da folha pedida SEM o nome próprio (lib/cinematic/folhaDePersonagem canonicaSemNome). Servidor só (lê a lista exata da casa).
//   'off'      = byte a byte o de antes (o nome vai à folha, como hoje);
//   'internal' = só a lista exata da casa (contaDaCasaExata) pede a folha sem o nome; cliente = como hoje;
//   'public'   = todo mundo.
// Só a folha (o FLUX da ficha e a folha nova do conferente) muda. As cenas, as imagens-chave, o crítico e o texto do plano ao Kling seguem com o nome.
import { contaDaCasaExata } from '@/lib/internalAccounts'

export type ModoFichaSemNome2511 = 'off' | 'internal' | 'public'
// [CEO 25/11, volta 4] 'off' neste commit: o texto novo ("this character" / "this male character" / "this female character") ainda não foi provado
// na sonda (o provado foi "a robot"). A CEO roda 4 fichas (Bolt nas 2 sementes, Mara, Elias) e só depois pede o commit que liga 'internal'. A sonda lê
// `sem_nome` do corpo e não depende disto.
export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'off'
export const FICHA_SEM_NOME_2511_VERSAO = 'ficha_sem_nome_2511_v3'
export function fichaSemNomeLigada(modo: ModoFichaSemNome2511, email: string | null | undefined): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
}
