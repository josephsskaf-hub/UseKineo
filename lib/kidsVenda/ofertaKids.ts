// KINEO-KIDS-SEM-OFERTA-0411 [fundador 05/11: "Não tem esses packs mais, a pessoa escolhe e vamos embora"]
// Interruptor único das OFERTAS novas de piloto e pack: o cartão de KidsVendaCards, a tabela de preços das páginas públicas e os convites nos e-mails do cron.
// Só cala a oferta. Não é KIDS_SALES_LIVE: aquele fecha também a amostra grátis e o painel de quem já comprou.
// Com false, seguem iguais: episódios, e-mail de pronto, cobrança, webhook, checkout e as assinaturas que já existem.
// Guardião: scripts/test-kids-sem-oferta-0411.mjs.
export const KIDS_VENDA_LIVE = false

// KINEO-CARTOON-SO-PLANO-0411 [fundador 05/11: "Sem ep grátis de cartoon, só dentro do plano com crédito (plano comprado)"]
// Com false, nenhum episódio grátis novo começa: o botão some da tela e a rota /api/kids-venda/sample recusa. O que já está na fila termina e é entregue.
export const KIDS_EPISODIO_GRATIS_LIVE = false
