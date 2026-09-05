# Home — baseline de preservação para o lote visual

**FATO CONFIRMADO / leitura local em 05/09/2026, checkpoint 12:45 BRT.** Base: `origin/main = 2ca9a06c4f128f936468b117ba0a7f194cff2411`. Nenhuma edição da home ou mídia neste checkpoint. Não é validação de reprodução em produção.

## O que o próximo preview não pode trocar

**FATO CONFIRMADO:** `app/page.tsx:134` obtém `getEngineHero()` e `getTrending()` e entrega os dois vetores à landing. `lib/engineWall.ts:271,394` usa a allowlist do fundador quando a política pública está fechada (`lib/publicSurfacePolicy.ts:11`). A implementação antiga de catálogo de clientes continua no arquivo, mas não é a fonte ativa nesse ramo. Comentários antigos que dizem “recentes do banco” não descrevem esse ramo.

**FATO CONFIRMADO:** o catálogo contém 26 clipes de oito famílias (`lib/publicExamples.ts:135`). A home não tem 26 cards no topo: `app/KineoLanding.tsx:1030` seleciona quatro motores e limita cada carrossel a quatro clipes. A lista de Kling 3 tem um quinto clipe reservado ao miolo.

| Superfície | Baseline que deve sobreviver ao refinamento |
|---|---|
| Primeiro card | Veo 3.1: quatro clipes; abre com Runit (`9bbd5d98-33e5-423f-b9cb-82f7af6c67ba`). |
| Segundo card | Kling 3: quatro clipes no hero; abre com Maracaibo (`4b12925e-16e6-4b56-af5a-7047f9ae7a28`). |
| Terceiro card | MiniMax H3: três clipes; abre com Shazam (`8aabb05a-2492-48de-a96a-0a7875c0c8d3`). |
| Quarto card | Omni Flash: quatro clipes; abre com robô no porto (`36a04f7b-65f7-42d9-a2ab-198b5a7f115e`), seguido por Mariana, Flight 19 e Earth stopped spinning. |
| Miolo | Seis tiles: Kineo 1, Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3 e Avatar. Kling 3 usa o último clipe, Lituya (`e487a011-8781-482f-913e-445ef5ad22bf`), não o primeiro do hero. |
| Terceira fileira | 14 entradas intercaladas entre motores. Não substituir por seis exemplos genéricos nem por consulta de vídeos de clientes. |

**Fontes da tabela:** `lib/publicExamples.ts:138–172`, `app/KineoLanding.tsx:1030–1035,1124–1262` e `lib/engineWall.ts:394–420`, lidos nesta data. Contagem de arquivos/clipes é inventário técnico, não pessoas ou resultado comercial.

**FATO CONFIRMADO / pares obrigatórios:** `EngineCycleCard.tsx:30,47,55,134` define nomes/destinos, escolha de URL e alternância. Preservar o vetor com vários clipes; não passar apenas o primeiro elemento durante uma extração visual. `TrendingRow.tsx:22–24` recebe o vetor inteiro, preserva `href` explícito e usa `videoUrl`. Nenhum desses componentes foi editado nesta rodada.

## Gate reutilizado, sem criar outra bateria igual

**TESTADO LOCALMENTE em 05/09/2026:** `node scripts/test-home-curation-restore.mjs` → **247/247**, exit 0. O teste já existia; foi lido antes da execução e não modificado. Executa as funções reais de curadoria com fábrica de banco mockada, verifica os assets locais, variedade e destinos. Zero acesso real ao Supabase, zero download ou geração de mídia.

**LIMITES:** trechos da integração JSX são checados por texto, não renderizados nesse teste. Tamanho/existência do MP4 não prova playback. URLs remotas não foram requisitadas. Teste verde não equivale a comparação visual, aprovação do fundador ou deploy validado. Não ampliar uma asserção para contornar falha sem examinar a causa.

**FATO CONFIRMADO:** diff desta branch contra a base vazio para `app/page.tsx`, `app/KineoLanding.tsx`, `lib/engineWall.ts`, `lib/publicExamples.ts`, `lib/publicSurfacePolicy.ts`, `components/EngineCycleCard.tsx` e `components/TrendingRow.tsx`.

## Próxima intervenção mínima

**SUGESTÃO, ainda sem implementação:** refinar hierarquia e organização ao redor dessas três fileiras, mantendo ordem, identidade, multiplicidade, destinos e política de privacidade. Primeiro preview precisa mostrar topo, miolo e terceira fileira, desktop e mobile, com mídia real preservada. Não “limpar” a home retirando prova visual nem remover campanha por impressão de redundância.

**FATO CONFIRMADO / pendência de navegação:** CTA do bento para logado continua em `/studio/create?src=engine_bento` (`app/KineoLanding.tsx:1161`); não foi consertado pelo L2, que cobre apenas dois botões do Studio. Tratar em lote próprio com contrato de duração/estado, não substituição global de URL.

**QUESTÃO PENDENTE:** apresentação visual no navegador e aprovação do fundador. Este baseline não certifica todo o site nem autoriza publicar L1/L2/L3 pendentes.
