# Medição do Showcase — contrato v1

**FATO CONFIRMADO — IMPLEMENTADO, 01/10/2026:** `lib/showcaseTelemetry.ts:4` define `showcase_v1`. `components/showcase/ShowcaseTelemetry.tsx:29` grava impressão e primeiro gesto via o sink existente; payload fechado, sem e-mail, URL livre ou ID de usuário enviado pelo navegador. O sink autentica o usuário e acrescenta `is_bot` e `ip_hash` (`app/api/events/route.ts`).

**FATO CONFIRMADO — TESTADO LOCALMENTE, 01/10/2026:** o contrato do navegador está em `browser.json`; respostas de `/api/events` são simuladas nessa prova. Nenhum evento local é receita ou evidência de produção. Eventos da mesma versão são deduplicados no navegador após confirmação de gravação; a análise SEMPRE deduplica de novo por pessoa identificada.

**SUGESTÃO — régua de leitura do sábado:** usar um único snapshot de leitura, com origem e data explícitas, e selecionar pela versão, não pela hora presumida do deploy. Reutilizar os relatórios administrativos/exports existentes; não rodar script de produção ou consultar `.env.local`.

| Medida | Denominador e regra |
|---|---|
| Pessoas identificadas expostas | `count(distinct user_id)` de `showcase_impression` com `metadata.showcase_version = showcase_v1`; excluir bots e contas internas segundo `lib/internalAccounts.ts`. |
| Pessoas com primeiro gesto | Pessoas do denominador acima com `showcase_first_gesture` da MESMA versão. Não somar cliques nem sessões. |
| Visitantes anônimos | Navegadores distintos em `metadata.showcase_browser`, informados separadamente. Não chamar de pessoas e não somar com usuários identificados. Sem identidade disponível, escrever desconhecido. |
| Reconciliação anônimo → cadastro | Associar pelo mesmo `session_id` a evento autenticado de cadastro. Só aceitar vínculo unívoco; sessões que misturem usuários ficam sem atribuição. Unir as aparições da mesma pessoa antes de contar. `showcase_browser` ajuda a deduplicar visitas, sem provar identidade humana. |
| Cadastros vindos do portfólio | Pessoas externas criadas após a sua primeira impressão desta versão e com vínculo inequívoco por sessão/campanha. `rememberSignupCampaign(showcase_v1)` preserva a primeira campanha já existente; portanto ausência dessa campanha NÃO prova ausência de passagem pelo Showcase. Mostrar atribuição estrita e casos não resolvidos. |
| Novos pagantes recorrentes | Pessoas da coorte, sem pagamento recorrente prévio à primeira exposição, com primeira fatura recorrente realmente paga depois dela. Excluir trial, conta interna, compra avulsa, invoice aberta/recusada e teste. Usar fatura/assinatura existente como prova, não evento de clique. |
| MRR atribuído | Receita recorrente atual dos novos pagantes acima, no preço REAL cobrado e por moeda, usando a régua de MRR já existente no administrativo. Não usar tabela de preço anunciada nem converter moedas sem fonte. Refund/cancelamento reduz o resultado conforme o relatório de cobrança real. |
| Conversão | Cadastros ou novos pagantes identificados / pessoas identificadas expostas e elegíveis na mesma coorte. Mostrar contagens e o denominador; não apresentar taxa quando ele estiver ausente. |

**QUESTÃO PENDENTE / DESCONHECIDO — comparabilidade:** esta é a primeira versão da rota. Não existe um “antes” com a mesma instrumentação. `baseline-browser.json` comprova 404 na base, não zero visitas nem zero MRR. Para a primeira entrega, publicar “antes: sem coorte comparável → depois: resultado observado da v1”; nunca atribuir causalidade ao lançamento sem controle. Mudança futura deve usar outra versão e a mesma definição de pessoa/denominador.

**SUGESTÃO — decisão:** manter se a página estiver íntegra e trouxer cadastros identificados/receita real. Corrigir a atribuição antes de concluir que zero registros significa zero resultado. Desligar medição com `SHOWCASE_TELEMETRY_ENABLED=false` se gerar eventos incorretos; desligar página/link com `SHOWCASE_PUBLIC=false` se houver problema real de privacidade, mídia ou acesso. Publicar ambos pelo caminho da casa.

**QUESTÃO PENDENTE / DESCONHECIDO — para o fundador decidir:** ampliar ou mudar a curadoria somente após observar a coorte; nenhuma recomendação de gasto, preço ou campanha depende de contagens locais.
