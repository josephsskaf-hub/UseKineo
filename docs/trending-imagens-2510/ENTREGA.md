# Trending: capas nos temas de filme

25/10/2026, 18h33 BRT. Branch: `codex/trending-imagens-2510`.

**IMPLEMENTADO / TESTADO LOCALMENTE.** Os temas sem filme agora têm capas editoriais próprias por assunto. Filmes reais continuam com seu vídeo, pôster e motor originais. A entrega não está publicada.

## Evidência e correção

**FATO CONFIRMADO:** na base `7ab62db2b10bea45b0c550879c7353f03caf3a6a`, `lib/trending/trendingNow.ts:73` associa somente `mys-02` ao filme Dyatlov em `TOPIC_HOUSE_FILMS`. Os demais temas saem de `filmTopicCards` com `video:null` e `poster:null` (`:239`). `app/trending/TrendingCard.tsx:47` mostrava somente o gancho textual nesses casos. Portanto, os sete quadros do screenshot eram roteiros sem capa, e não sete URLs de imagem quebradas.

**EVIDÊNCIA DE PRODUÇÃO — 25/10/2026, nesta sessão:** leitura do DOM público de `https://www.usekineo.com/trending#film-topics` confirmou `bill-02`, `mon-01`, `tech-01`, `mys-02`, `cou-03`, `ai-01`, `space-01`, `psy-02`; apenas Dyatlov tinha vídeo/pôster. Essa inspeção não comprova funcionamento de geração ou conversão.

**IMPLEMENTADO:** `lib/trending/topicCovers.ts:9` escolhe entre 13 capas por categoria e uma capa genérica para categoria desconhecida. Arquivos locais em `public/trending/topics/`, sem recurso externo. `lib/trending/trendingNow.ts:258` fornece `illustration` separadamente de `video` e `poster`; a ilustração nunca recebe selo de filme gerado ou motor. `app/trending/TrendingCard.tsx:35` mostra a imagem com rótulo traduzido e mantém “Script ready”. Se a capa falhar, remove a imagem quebrada e recupera o gancho textual, preservando roteiro, botão e seleção do dia.

**IMPLEMENTADO:** CSS mantém proporção 9:16 e os tamanhos da grade existente; imagem com carregamento preguiçoso em `TrendingCard.tsx:41`. Uma faixa com quebra de linha impede colisão entre “Illustrative image” e “Today’s pick” (`app/trending/trending.css:33`). Rótulos novos traduzidos nas 16 línguas do dicionário, verificação no guardião existente. A descrição deixou de afirmar que todos os cartões têm vídeo real (`app/trending/page.tsx:24`).

**FATO CONFIRMADO:** os 14 SVGs somam 36.571 bytes. São ilustrações vetoriais autorais, não frames de filmes. Origem e inventário em `../trending-capas-2510.md`. Nenhuma geração paga foi necessária.

## Conferência

**TESTADO LOCALMENTE — 25/10/2026:**

| Verificação | Resultado |
|---|---|
| `node scripts/test-trending-1310.mjs` | 34 verificações, 0 falhas; inclui destinos, mídia real, motor, idiomas e mutantes em memória |
| `node scripts/test-trending-capas-2510.mjs` | 6 grupos, 0 falhas; executa builder e TSX reais com shim de hooks; cobre os 35 temas, arquivos, fallback, troca de capa, seleção e dois mutantes |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` | Saída 0, sem erro |
| Browser no SSR real, larguras 320, 390, 768 e 1440 px | Sem rolagem horizontal ou colisão de selos; imagens visíveis carregadas; proporção 9:16 e botões de pelo menos 42 px |
| Galeria no browser | As 14 imagens carregaram e foram inspecionadas visualmente |
| Revisão independente | Encontrou colisão entre selos; corrigida e confirmada por nova leitura |

**TESTADO LOCALMENTE:** abrir `PREVIEW.html` sem build ou conexão externa. Contém o TSX/CSS reais de antes e depois em desktop e celular, os oito temas do screenshot e galeria das capas. A primeira seleção “Today’s pick” é fixture explícita para testar os selos. Capturas: `antes-depois-desktop.jpg`, `antes-depois-mobile.jpg`, `capas.jpg`. Medições: `responsive-qa.json`.

**QUESTÃO PENDENTE / DESCONHECIDO:** o HTML é SSR estático com idioma inglês e fonte local Arial; não executa hidratação, autenticação, clique, reprodução ou geração. O teste de falha de imagem executa o TSX com shim de hooks, não uma falha real de rede em produção. Não há publicação ou validação de pessoas externas desta mudança.

## Integração

**IMPLEMENTADO — commits na ordem:**

1. Capas: `75a7e05e70afe8517698a814973780a380f26cde`.
2. Código e guardião: `d9d11fc68671de4a83017fb1a64cb5ddadadb53a`.
3. Evidência visual e este documento: commit seguinte nesta mesma branch.

**SUGESTÃO:** integrar a alteração isolada a uma cópia atualizada e limpa de `origin/main`, rodar os dois guardiões e TypeScript, publicar pelo fluxo do fundador e conferir `/trending#film-topics` em desktop/celular. Conferir também um tema escolhido por `today.json` e o vídeo Dyatlov. A worktree principal suja não foi usada para editar ou publicar.

**FATO CONFIRMADO:** não houve mudança de preços, ofertas, cobrança, créditos, banco, login, motores, destinos de compra, home ou `/viral-now`. Na preparação local registrada às 18h33 não houve push, deploy, mensagem externa ou uso de credenciais. Esta entrega trata a ausência de capas do screenshot; resultados comerciais permanecem desconhecidos.

## Integração autorizada em 25/10

**DECISÃO DO FUNDADOR NESTA CONVERSA:** “pode dar merge”, após a entrega da correção visual. A integração usa a worktree isolada; a `main` local com arquivos de outras tarefas permanece intacta.

**EVIDÊNCIA DO CI — 25/10/2026:** o primeiro [run do GitHub](https://github.com/josephsskaf-hub/UseKineo/actions/runs/40237664958) passou no TypeScript e nos contratos funcionais dos cards, mas rejeitou os arquivos de Trending na verificação de inventário de uma entrega anterior (`scripts/test-cards-giro-undo-2410.mjs:31`). Nenhum defeito funcional das capas foi indicado nessa falha.

**IMPLEMENTADO:** os inventários históricos de Cards e Idiomas agora usam o limite imutável `7ab62db2b10bea45b0c550879c7353f03caf3a6a`, onde ambas as entregas já estavam publicadas. A leitura e conferência dos hashes dos arquivos protegidos continuam usando os arquivos atuais. Os manifestos e hashes originais não foram reescritos. Um adaptador de uma linha exata em `scripts/test-support/desfaz-trending-inventario-2510.mjs` preserva a cadeia anterior de restauração do teste de Idiomas. Isso evita atribuir arquivos de todas as tarefas futuras ao inventário de 24/10.

**TESTADO LOCALMENTE — 25/10/2026:** Cards undo passou com os oito fontes exatos; Idiomas undo passou com 104 fontes exatos; Traffic undo passou com 196 verificações. O adaptador passou em idempotência, CRLF, caminhos Windows, rejeição de linha alterada/duplicada e preservação de arquivo alheio. O resultado do novo CI e o SHA remoto final devem ser conferidos na conclusão da integração, sem confundir branch enviada com merge ou publicação.
