# WATCH · missão 6 · Etapa 1 · 13/11/2026

**IMPLEMENTADO, LOCAL — não publicado.** Branch `codex/watch-etapa1-1311`, criada da `origin/main` `7b71edb2d9e966758d7d062ed7ab01310389b326`. Escopo: home do visitante e preenchimento mínimo dos destinos existentes. Etapas 2–5 permanecem separadas.

## O que revisar

Abra `COMPARACAO.html`: HTML autocontido, CSS e 29 capturas incorporados, sem servidor. Há pares antes/depois da home e de quatro entradas em 390×844 e 1920×1080, mais preservação do conteúdo citado e fixtures autenticadas explicitamente identificadas. `CAPTURAS.json` registra dimensões e hashes, sem redimensionar ou montar fotografias.

**FATO CONFIRMADO:** `lib/home/watchRelease.ts:2` mantém `WATCH_HOME_ENABLED=false`. `/` continua usando a home atual; `/watch-preview` mostra WATCH ao visitante e retorna a home completa para usuário autenticado. A prévia possui `noindex,follow`; respostas HTTP locais de sitemap e llms não a incluem (`SEO-HTTP.json`).

**IMPLEMENTADO:** os seis `CLIPES_NO_TOPO` aparecem na ordem canônica, seguidos dos outros clipes do catálogo e dos seis filmes narrados preservados. Janela 5:6, mídia inteira com `contain`, título e CTA sobrepostos, navegação de produtos idêntica em cima no desktop e embaixo no celular. A resposta citável, tabelas, FAQs, faceless e Footer continuam depois da parede. O único ajuste no componente citado foi rótulo móvel de 11 para 12 px.

**TESTADO LOCALMENTE:** Film, Cartoon, Product Ads e UGC Ads abrem suas telas públicas existentes com a ideia do exemplo preenchida. Nenhum Generate foi acionado. ID público viaja em `example`; texto de cliente não é acrescentado às URLs. Rascunho ou ideia explícita existente prevalecem sobre o exemplo. Recreate/efeitos mantêm o caminho atual; a reformulação do feed é a Etapa 3.

## Peso e mídia

**TESTADO LOCALMENTE — 13/11/2026, build de produção, primeira navegação na origem local nova `127.0.0.1:3022`, viewport nativo 390×844:** **1.067.120 bytes de transferência disponíveis no Resource Timing**, 1.046.420 bytes de corpo codificado e 70 requisições antes de rolar (`MOBILE-PESO.json`). Somente `carta-do-front.mp4` tinha `src` e tocava. O cache de terceiros não foi controlado.

**QUESTÃO PENDENTE:** `https://r.wdfl.co/rw.js` não expõe seu tamanho ao Resource Timing. Portanto o número não é o total integral de rede e não comprova sozinho o alvo completo de 4 MB. Confirmar numa captura de rede em celular real na prévia publicada.

**TESTADO LOCALMENTE:** ao rolar o corpo de 0 para 633 px, o primeiro vídeo perde o `src` e apenas os dois então visíveis recebem mídia (`MIDIA-NAVEGADOR.json`). Políticas de movimento reduzido, economia de dados, conexão lenta, aba oculta, rejeição de autoplay e limpeza também têm cenários offline. Os 24 arquivos aprovados em `36f9f2309` foram copiados sem alteração e os hashes são verificados; os filmes narrados antigos usam o mapeamento leve. Inventário em `MIDIA-E-MEDICAO.md`.

## Verificação e limites

- **TESTADO LOCALMENTE:** sem rolagem lateral, `scrollWidth === innerWidth` em 390 e 1920; textos dispostos da home com mínimo de 12 px; menu móvel abre e fecha. Capturas em `prints/`.
- **TESTADO LOCALMENTE:** SSR da home autenticada e da home com interruptor desligado preservado; 17 mutantes do guardião WATCH rejeitados, incluindo perda de conteúdo citado, ID, ordem, navegação e isolamento de usuário logado.
- **TESTADO LOCALMENTE:** entrada, 345 verificações e 6/6 mutantes; mídia, 132 contratos, 9 cenários e hashes dos 24 arquivos. Logs em `validacao/`.
- **QUESTÃO PENDENTE:** não houve sessão autenticada real no navegador. As fotos `logged-*` são fixtures SSR identificadas, sem API ou saldo real. CEO/Div. 1 precisam conferir uma sessão real na prévia antes da troca de `/`.
- **QUESTÃO PENDENTE:** a abertura do HTML comparativo no navegador foi recusada por falha técnica da revisão automática de autorização (`Bad Request`); as fotografias das telas reais e a montagem autocontida foram produzidas. O arquivo deve ser aberto manualmente para a revisão visual conjunta.
- **FATO CONFIRMADO:** o build usa as opções já existentes `ignoreBuildErrors`/lint ignorado. Os tipos de rotas que ele gera exibiram 15 erros em fontes alheias à missão, iguais à base; o log completo foi preservado em `validacao/tsc-gerado-pelo-build.log`. O typecheck bruto é registrado separadamente depois da remoção apenas de `.next/types` gerado localmente, conforme a distinção do AGENTS §6.3. Isso não corrige nem oculta a dívida de tipos gerados.

O gate comparativo e o SHA de entrega ficam em `VALIDACAO.md` após o commit e a execução com árvore limpa. Nenhum guardião antigo é removido. O guardião clips-first foi reancorado para reconhecer a mesma montagem antiga protegida pelo interruptor, com quatro mutantes; seu helper H3 já falhava na base.

## Medição pela CEO

`home_card_clicked` inclui `clip_id`, posição, destino, família, `home_variant`, marcador `preview` e layout responsivo/viewport. `homepage_view` WATCH também inclui layout. `ui_layout` significa breakpoint de interface, não identificação de aparelho físico. Excluir `preview=true`, contar pessoas externas, preservar as janelas e observar ideia, conta e primeiro filme; eventos não equivalem a pessoas.

**FATO CONFIRMADO:** o deduplicador existente de `homepage_view` usa uma chave por aba, comum às variantes (`components/LandingViewTracker.tsx:30`). Uma aba que já viu a home anterior pode não registrar nova exposição após ativar WATCH. Considerar isso na coorte inicial.

**SUGESTÃO — próximo passo:** CEO e Div. 1 revisam as capturas, publicam somente a prévia, conferem aparelho e sessão autenticada reais e completam a medição de rede. Só então ativar a constante em um commit; desligá-la restaura a home atual. O trabalho aqui não publica nem ativa WATCH.
