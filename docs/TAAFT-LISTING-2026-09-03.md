# TAAFT — pacote ATUAL da ficha Kineo

**Revisado em:** 16/09/2026 · **Estado:** LOCAL, correção TRIAL-10-R1 · **Destino:** ficha existente em `https://theresanaiforthat.com/ai/kineo/`

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador via Board, 16/09/2026:** a descrição externa já foi atualizada por ele para o trial atual. Esta tarefa não acessou o painel e não repetiu submissão. **QUESTÃO PENDENTE / DESCONHECIDO:** leitura independente da ficha atual bloqueada; não declarar validação pública. A release **v3.3.3** com a oferta anterior é histórico imutável, não oferta ativa e não deve ser reescrita nem republicada.

## 1. Fontes e limites da oferta atual

- **FATO CONFIRMADO — IMPLEMENTADO:** cadastro novo recebe 10 créditos, sem cartão (`lib/entryPolicy.ts:33-36`, `lib/reverseTrial.ts:142`); o teto das concessões anteriores usa `trial_credits_granted`, preservando saldos concedidos antes (`lib/reverseTrial.ts:361-364`).
- **FATO CONFIRMADO — IMPLEMENTADO:** Kineo 1 custa 5 créditos por 60 segundos no caminho com créditos; Seedance 1.5 custa 25 no mesmo referencial (`lib/credits/engineCost.ts`, `creditCostFor` e `creditCostForDuration`). Os 10 iniciais cobrem dois filmes Kineo 1 de 60 segundos; não anunciam um Seedance gratuito de 60 segundos.
- **FATO CONFIRMADO — IMPLEMENTADO:** primeiro filme premium desabilitado por padrão (`lib/primeiroFilme.ts:29`). **EVIDÊNCIA DE PRODUÇÃO — relato do fundador, 16/09/2026:** iniciativa pausada. Não anunciar o primeiro filme como premium gratuito.
- **FATO CONFIRMADO — IMPLEMENTADO:** H3, Omni e S25 estão pausados (`lib/engineLaunch.ts:28`). **CONTRADIÇÃO:** as constantes desse arquivo ainda incluem Avatar na contagem, enquanto o handoff TRIAL10 do fundador manda anunciar apenas Kineo 1, Seedance 1.5, Kling 2.5, Kling 3 e Veo 3.1. O texto atual abaixo limita-se a esses motores e explicita disponibilidade, acesso e saldo.
- **FATO CONFIRMADO — IMPLEMENTADO:** a data do gate por plano está no futuro (`lib/enginePlanGate.ts:19`); isso não substitui os controles de manutenção nem o saldo necessário. Não dizer que Studio é o único acesso aos motores caros, nem que Starter paga toda combinação de motor e duração.
- **FATO CONFIRMADO — IMPLEMENTADO:** preços mensais USD e créditos vêm de `lib/checkoutPricing.ts`, `TIER_PRICES` e `TIER_CREDITS`; a revisão não altera preço, plano, concessão nem termos. A oferta de teste tem marca d'água (`lib/freeTierOffer.ts`).
- **EVIDÊNCIA DE PRODUÇÃO — histórico versionado:** o pacote preparado em 04/09 está preservado no Git, incluindo suas alegações então vigentes. Não usar o snapshot anterior como texto atual.

## 2. Texto pronto para colar

**SUGESTÃO — TEXTO ATUAL CORRIGIDO, LOCAL:** usar somente numa edição necessária da ficha existente, após conferir o conteúdo e os controles do dono. O relato de atualização do fundador não autoriza duplicar essa edição.

### Name

`Kineo`

### Tagline

`Turn ideas and scripts into narrated videos.`

### Short description

`Create videos with narration, visuals, captions and music. Free to start: 10 credits, no card — enough for two Kineo 1 films of 60 seconds. Trial videos are watermarked.`

### Long description

`Turn a topic or script into a video with narration, visuals, captions and music. Free to start: 10 credits, no card — enough for two Kineo 1 films of 60 seconds. Trial videos are watermarked. Available video options include Kineo 1, Seedance 1.5, Kling 2.5, Kling 3 and Veo 3.1. Credit use varies by engine and duration; generation requires an available engine, account access and sufficient credits. Plans start at $9.90/month USD. Check the displayed credit cost before generating.`

### Pricing field

`Free to start (10 credits, no card) · plans from $9.90/month USD`

### Primary URL

`https://www.usekineo.com/?utm_source=taaft&utm_medium=referral`

### Suggested categories/tags

`AI video generator` · `text to video` · `YouTube Shorts` · `TikTok video` · `vertical video` · `AI captions`

### Feature bullets

1. `Topics or scripts to videos with narration, visuals, captions and music.`
2. `Kineo 1, Seedance 1.5, Kling 2.5, Kling 3 and Veo 3.1.`
3. `Free to start: 10 credits, no card; two Kineo 1 films of 60 seconds.`
4. `Trial videos are watermarked. Credit use varies by engine and duration.`
5. `Check engine availability, account access and sufficient credits before generating.`

## 3. As três capturas — referência, sem novos uploads

**SUGESTÃO:** preservar a home e as capturas aprovadas pelo fundador. Só substituir uma imagem se ela contiver oferta atual comprovadamente falsa e houver controle de edição disponível; esta tarefa não capturou, publicou nem gerou filmes.

- Home: `https://www.usekineo.com/?utm_source=taaft&utm_medium=referral`. **Precisa estar visível:** a vitrine aprovada, com nomes reais dos motores e sem promessa antiga de trial.
- Seletor: `https://www.usekineo.com/studio?engine=seedance&utm_source=taaft&utm_medium=referral`. **Precisa estar visível:** duração escolhida, custo real exibido, acesso da conta e saldo. Não fixar um custo a partir de um roteiro de captura antigo. **Não clique em Generate**.
- Resultado: `https://www.usekineo.com/history`. Usar apenas filme concluído do fundador, preservando privacidade e o rótulo real do download. Não tornar um filme público para esta correção.

## 4. Estado externo e histórico

| Superfície | Classificação e estado em 16/09/2026 | Ação |
|---|---|---|
| Este pacote de comunicação | SUGESTÃO — LOCAL, atualizado para TRIAL10 | Fonte atual de copy; valores conferidos pelo teste do pacote |
| Descrição pública TAAFT | EVIDÊNCIA DE PRODUÇÃO — atualização relatada pelo fundador; validação independente DESCONHECIDA | Não repetir submissão; não contornar bloqueio de leitura |
| Release TAAFT v3.3.3 | EVIDÊNCIA DE PRODUÇÃO — histórico imutável informado pelo fundador | Preservar a oferta da época; não criar release paga |
| Modelos, USP e galeria externos | QUESTÃO PENDENTE / DESCONHECIDO — sem leitura atual independente | Não afirmar que estão todos corrigidos |

## 5. Como medir

**SUGESTÃO:** reutilizar atribuição e eventos canônicos por pessoa externa: chegada TAAFT → cadastro → filme → checkout → pagamento confirmado. `checkout_success_viewed` é um sinal de navegação, não prova financeira.

**SUGESTÃO:** separar a coorte de novos cadastros após TRIAL10 da exposição anterior a TAAFT e ao experimento premium; sem controle não atribuir causalidade à copy. O placar final é novos compradores e dinheiro recebido, excluindo testes, contas internas e duplicação de transações.

**Gate de parada — SUGESTÃO:** oferta incoerente requer correção; ausência de pagamento numa amostra pequena é inconclusiva. Pacote LOCAL e visita não contam como venda. Não comprar destaque nem reiniciar campanha por esta revisão.

