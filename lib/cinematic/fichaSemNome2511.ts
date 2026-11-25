// KINEO-FICHA-SEM-NOME-2511 [CEO 25/11, Bolt addef2b6: o conferente aprovou um robô com cabeça de cachorro; hipótese H1 = o nome "Bolt" vai ao gerador
// da folha]. O interruptor da folha pedida SEM o nome próprio (lib/cinematic/folhaDePersonagem canonicaSemNome). Servidor só (lê a lista exata da casa).
//   'off'      = byte a byte o de antes (o nome vai à folha, como hoje);
//   'internal' = só a lista exata da casa (contaDaCasaExata) pede a folha sem o nome; cliente = como hoje;
//   'public'   = todo mundo.
// Só a folha (o FLUX da ficha e a folha nova do conferente) muda. As cenas, as imagens-chave, o crítico e o texto do plano ao Kling seguem com o nome.
import { contaDaCasaExata } from '@/lib/internalAccounts'

export type ModoFichaSemNome2511 = 'off' | 'internal' | 'public'
export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'internal'
export const FICHA_SEM_NOME_2511_VERSAO = 'ficha_sem_nome_2511_v1'
export function fichaSemNomeLigada(modo: ModoFichaSemNome2511, email: string | null | undefined): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
}
