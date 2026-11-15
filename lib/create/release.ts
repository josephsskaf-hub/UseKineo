// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// Interruptor ÚNICO da tela nova (/create/film, /create/cartoon, /create/ads e as abas na tela do Recreate).
// 'off' = ninguém vê (404) · 'internal' = só a allowlist exata da casa (lib/recreate/access.ts → releaseVisible) · 'public' = toda conta
// logada; visitante vai ao cadastro e volta para a aba. Módulo puro e seguro no cliente: a lista de e-mails NÃO mora aqui.
import type { InternalRelease } from '@/lib/recreate/release'

// KINEO-TELA-NOVA-ABRE-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"] — aberto ao público em 10/11/2026,
// depois da conferência logada em produção (e76afc095). VOLTA: 'internal' fecha de novo (só a casa); 'off' tira de todos.
export const CREATE_SHELL_RELEASE: InternalRelease = 'public'

// KINEO-STUDIO-NA-MOLDURA-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"] — a aba Film É o Studio:
// a caixa única real (components/studio/StudioSimples.tsx, mesmo estado, mesmo Generate, mesmo pedido) dentro da moldura nova.
// 'off' = ninguém · 'internal' = só a allowlist exata da casa · 'public' = toda conta que já vê /create/film. Fora dele: o "Continue" de sempre.
// KINEO-STUDIO-NA-MOLDURA-ABRE-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"] — aberto ao público em 10/11/2026,
// depois da conferência logada em produção (91ef32dd9). VOLTA: 'internal' fecha de novo (só a casa); 'off' tira de todos.
export const CREATE_FILM_INPLACE: InternalRelease = 'public'

// KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — as ENTRADAS de criação do site (menu do topo,
// lateral e celular; cartões e botões da home; caixa de presente) abrem a tela nova em vez do Studio
// antigo / /ads/new / /kids-cartoon. Quem decide cada destino é lib/create/entry.ts (createEntryHref), e só quando a tela nova recebe o
// mesmo dado. 'public' = toda entrada elegível vai para /create/<aba> PARA QUEM ESTÁ LOGADO; o visitante fica no destino de hoje (KINEO-ENTRADAS-SO-LOGADO-1011).
// VOLTA: 'off' (ou 'internal') devolve TODAS as entradas ao destino antigo, byte a byte. Desligar CREATE_SHELL_RELEASE ou
// CREATE_FILM_INPLACE também devolve (nenhuma entrada aponta para uma tela fechada).
export const CREATE_ENTRY_RELEASE: InternalRelease = 'public'

// KINEO-CAIXA-NOVA-1511 [dono 15/11: "o mais importante é o fluxo onde a pessoa faz a magia acontecer… deixar um lugar mais confortável, que mais
// pessoas olhem e confiem… olhar todos os líderes de mercado e repetir igual"] — a CAIXA DE CRIAR no padrão dos líderes (docs/DESENHO-CAIXA-DE-CRIAR-1511.md):
// uma caixa grande com o texto, o "+" dentro, ajustes em chips e o Generate com o custo; linha de confiança; exemplos reais embaixo.
// Só muda a CASCA da aba Film: estado, recusas, gerar() e pedido continuam os do StudioSimples (components/studio/StudioSimples.tsx).
// 'off' = ninguém · 'internal' = só a allowlist exata da casa · 'public' = toda conta que já vê o Studio na moldura (CREATE_FILM_INPLACE).
// Fora dele, a tela de 3 passos de hoje, byte a byte. Guardião: scripts/test-caixa-nova-1511.mjs.
export const CAIXA_NOVA_RELEASE: InternalRelease = 'internal'
