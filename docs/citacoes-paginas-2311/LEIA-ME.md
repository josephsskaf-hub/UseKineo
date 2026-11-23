# Quatro páginas · VOLTA 1 · 23/11/2026

**FATO CONFIRMADO · IMPLEMENTADO.** codex/pronto-citacoes-paginas-2311, de origin/main 4ba8c750c. Só os três formatos d09 (/ai-video-generator/for/cartoon-videos, animated-story-videos, animal-story-videos) e /ai-ugc-ads/product-photo-ads d11. Sem caixa nas leituras: aquela é candidata própria em 0885b6d3a.

**FATO CONFIRMADO.** lib/growth/citationPagesAccess.ts:5 nasce off. Rotas fechadas devolvem notFound; metadados de rascunho têm noindex/nofollow; catálogo, páginas relacionadas, generateStaticParams e sitemap só incluem novas URLs em public. internal mantém os índices sem as novas URLs e verifica getUser no servidor, e-mail confirmado e contaDaCasaExata. Erro, sessão ausente, e-mail não confirmado ou parecido com teste são recusados.

**FATO CONFIRMADO.** components/seo/InternalCitationPreview.tsx:6 carrega autenticação só no caminho privado; nenhuma credencial no cliente. O catálogo usa dynamic=auto/dynamicParams=true porque a prévia privada depende de cookies por requisição; as páginas públicas existentes continuam em generateStaticParams. Não há recurso financeiro novo. Todos os endpoints de criação continuam com suas próprias permissões.

**FATO CONFIRMADO.** Só as três páginas ainda não publicadas mostram o nome do filme padrão atual também no selo, texto de trial e metadados, usando STANDARD_FILM_NAME. Vídeos históricos mantêm nome do motor original. As três novas URLs levam a data da revisão substantiva de hoje no sitemap; URLs antigas mantêm suas datas. O anúncio usa os fatos calculados de adsV2Credits, TIER_CREDITS e planCreditSpendUsd; não há preço literal novo em JSX.

**FATO CONFIRMADO · TESTADO LOCALMENTE.** Guardião test-citacoes-paginas-2311 executa as quatro rotas, metadados, catálogo e sitemap reais, cinco intenções antigas como controles, getUser por dublê e custo por anúncio contra o cobrador. Doze mutantes exigem a asserção prevista (ERR_ASSERTION e mensagem exata). Off reproduz o sitemap e catálogo anteriores; internal não enumera rascunhos; public inclui exatamente as quatro URLs novas.

**QUESTÃO PENDENTE / DESCONHECIDO.** Revisão independente e aprovação explícita do dono pelas fotos para página nova. Fotos não validam criação de anúncio/filme, custo real de fornecedor, resultado comercial ou autorização de abrir public. Não criar conta nem renderizar para fechar esta revisão.

**SUGESTÃO · checklist quando a CEO ativar.**
- off: as quatro URLs são 404/noindex, ausentes do sitemap e do hub. URLs antigas e seus metadados/tabelas funcionam.
- internal: só conta exata confirmada abre 200/noindex; visitante, cliente externo, alias e test% continuam 404. Alternar casa/externo na mesma URL e conferir Cache-Control: não servir HTML privado ao externo.
- public, apenas depois do sim do dono: quatro URLs 200, canonical próprio e índices com uma ocorrência; lastmod novo só para novas URLs. Responsividade e tabela do anúncio em 1920/390 claro/escuro.
- Conferir CTA e o formulário seguinte com conta real autorizada, sem Generate automático; exemplos históricos preservados; custos seguem checkoutPricing/adsV2Credits. Nenhum teste pago foi feito.
- Medir sessões externas → novos cadastros vinculados → primeiro filme e país do cadastro após exposição real; não atribuir ganho à preparação local.

**FATO CONFIRMADO / SUGESTÃO APLICADA.** O molde compartilhado das páginas de intenção usa a paleta clara PAGINA_CLARA (lib/seo/paginasIaClaras2110.ts:14) nas duas preferências; o 404 também mantém sua apresentação herdada. As fotos registram a preferência e a aparência real, sem alterar o tema compartilhado. Na página inédita de cartoon, a frase garante cenas ligadas à narração, sem garantir uma cena por linha do texto. Os limites sobre pequenas variações de personagem e continuidade não garantida foram preservados.
