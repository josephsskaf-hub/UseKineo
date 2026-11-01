# Série automática semanal: desenho (01/11/2026)

Marcador: KINEO-SERIE-AUTO-DESENHO-0111 · Só desenho, nenhum código de produto · Base: origin/main 85a82bbe9

**Por que existe:** medido em 13/10, quem continua pagando tem uma série (personagem fixo, curiosidades), usa Seedance de 60 a 90 s e volta nos dias 1 a 7. Quem cancela faz 1 ou 2 filmes avulsos no dia da compra. Hoje 9 de 12 assinantes estão há 14+ dias sem fazer filme, com ~900 créditos parados. A série inverte isso: em vez de o cliente ter de lembrar de voltar, **o canal trabalha sozinho e o episódio chega toda segunda**.

## 1. O que o cliente vê

- **Ligar (1 clique):** na tela do filme pronto (`components/premiere/Premiere.tsx`, que já é a tela única de todas as gerações) aparece um cartão "Transformar em série semanal", e na `/library` aparece o cartão "Minha série". O tema já vem preenchido com o filme que a pessoa acabou de fazer. Ela pode mudar: tema · duração (35/60/90 s) · dia (segunda é o padrão). O motor é fixo no Seedance 1.5 no MVP.
- **A tela mostra o resultado, não a conta:** "Seu plano cobre 4 episódios por mês". O número sai de `creditCostForDuration`, nunca é digitado à mão.
- **Segunda de manhã:** o episódio novo já está na biblioteca, e chega um e-mail "Episódio 4 de *O mistério de Roanoke* está pronto", com o link e um botão "pausar a série".
- **Pausar, retomar, trocar o tema ou cancelar:** tudo pelo cartão da `/library`. Quem cancela a assinatura tem a série pausada sozinha.

## 2. Quem ganha e como cobra

**Recomendação: a série vem incluída em todo plano pago (Starter, Creator e Studio), sem preço novo, e cada episódio gasta créditos do plano.** Trial e conta grátis ficam de fora, porque o custo na fal é real. O Autopilot Lite (US$ 59, já existe) continua sendo o próximo degrau: "agora publica sozinho no seu YouTube".

O padrão é **Seedance 1.5 · 60 s · segunda 10:00 UTC** (07:00 em Brasília, 06:00 em Nova York). A fonte dos números é `lib/credits/engineCost.ts` e `WORST_CASE_FILM_COSTS` em `lib/checkoutPricing.ts`, que dá US$ 3,30 por filme de 60 s (fatura de agosto). Os valores de 35 s e 90 s são esse número proporcional ao tempo.

| Duração | Créditos | Custo fal/ep. | Creator (US$ 0,133/cr) | Studio (US$ 0,183/cr) |
|---|---|---|---|---|
| 35 s | 21 | ~US$ 1,93 | receita US$ 2,79 | US$ 3,84 |
| 60 s | 35 | US$ 3,30 | US$ 4,64 (+29%) | US$ 6,40 (+48%) |
| 90 s | 53 | ~US$ 4,95 | US$ 7,03 | US$ 9,70 |

**Por assinante, por mês (cerca de 4,3 segundas):**
- Creator, 150 cr: 4 episódios de 60 s (140 cr) cabem. Num mês com 5 segundas, o 5º cai em "sem crédito".
- Studio, 300 cr: 5 episódios de 60 s, ou 4 de 90 s.
- Starter, 60 cr: só 2 episódios de 35 s. O 3º vira a oferta de subir de plano. **É a alavanca de upgrade.**

**Teto da casa:** se os 12 assinantes ligarem, são uns 52 episódios por mês, cerca de **US$ 170/mês de fal**. Se os ~900 créditos parados virarem episódios, são uns US$ 85 uma vez só.

**O que o fundador precisa saber:** crédito parado hoje é margem de quase 100%, mas é exatamente o que precede o cancelamento. A série troca essa margem por cerca de US$ 3,30 por semana e por cliente, em troca de um motivo semanal para ele continuar pagando.

## 3. Memória da série

- **Temas já feitos:** cada episódio fica gravado na própria tabela da série, com título e semente de narração. A lista "já coberto" passa a ser **a série inteira**, e não os 6 últimos filmes da conta, como `/api/next-episode` faz hoje. A âncora de assunto vem de `lib/episodeContinuity.ts` (o conserto do episódio 2 fora do assunto, de 13/10) e é montada com o episódio 1 e o último episódio.
- **Quem escreve:** o escritor de `/api/next-episode` sai da rota para `lib/nextEpisodeServer.ts`, no mesmo padrão de `lib/temporadaServer.ts` (#19: duas cópias do mesmo texto divergem). A rota e o cron chamam a mesma função. Isso também evita o cooldown de 45 s da rota.
- **Régua:** hoje o escritor pede 150 a 165 palavras, que é a régua hollywood de 2,3 pal/s. O Seedance usa outra régua ("uma régua por voz"). Por isso a série escreve **a IDEIA do episódio** (título, personagens e 3 a 4 batidas) e manda como ideia para `/api/generate-video-cinematic`. O escritor do servidor da rota (`escreverIdeiaNoServidor`, KINEO-META95-IDEIA-1910) gera o roteiro marcado no tamanho certo para aquele motor e aquela duração. Nenhuma régua nova é criada.
- **Personagem fixo:** a ficha canônica sai do episódio 1 (`derivarElenco` em `lib/cinematic/folhaDePersonagem.ts` e `elencoDaHistoria.ts`, determinísticas: mesmo roteiro, mesma ficha). Ela fica gravada na série (jsonb) e entra no texto de todo episódio. A **imagem** da folha não é reaproveitada no MVP, porque hoje ela nasce a cada render, é só interna (`PERSONAGEM_PUBLIC=false`) e o Character Lock (`characterId`) só funciona na estrada hollywood. Isso fica para a Etapa 3.

## 4. Falhas

- **Sem crédito:** o episódio da semana é pulado (`skipped: sem_credito`) e sai um e-mail "seu episódio está esperando", com a recarga do pacote avulso. US$ 2,90 = 25 cr cobre 1 episódio de 35 s; US$ 4,99 = 35 cr cobre 1 de 60 s. No Starter, a oferta é subir para o Creator. Depois de 2 pulos seguidos a série pausa e para de mandar e-mail.
- **Render falhou ou o juiz reprovou:** a rota já estorna sozinha (o débito é idempotente pelo `generationId`, e "juiz reprova e sai" devolve o crédito). O cron tenta de novo com outra tentativa (`serie-<id>-<seq>-<tentativa>`), até 3 vezes em 24 h, como em `KIDS_MAX_ATTEMPTS_PER_SEQ`. Se esgotar, sai o e-mail "o episódio desta semana não saiu, seu crédito voltou" e a série segue para a semana seguinte.
- **fal sem saldo:** o passe para por inteiro se aconteceu `fal_balance_exhausted` nas últimas 2 h (é o `kidsFalPaused`, reaproveitado).
- **Render fantasma:** 6 h sem filme conta como falha e o crédito é conferido no `credit_debits`.

## 5. MVP em 3 etapas

**Por que não usar o Autopilot como está:** `autopilot_schedules.channel_id` é NOT NULL (exige YouTube), o motor é travado em Kineo 1 (`clampAutopilotEngine`, que "estraga a entrada", decisão de 29/09) e o acesso é só para os planos autopilot. **O molde certo é o passe 3 dos desenhos infantis** (`lib/kidsVenda/cron.ts`): Seedance pela rota da tela, agindo como a pessoa (`callAsUser`), a montagem feita pela casa (`finish-stranded-renders`), a liquidação pelo débito, o e-mail sem duplicar o da casa e a trava com unique antes de gastar. A única diferença: **não financia crédito**, gasta o saldo do plano.

1. **Etapa 1, motor interno (~1 dia de Claude):**
   - migration com `serie_auto` (tema, duração, idioma, dia/hora, `next_run_at`, fichas, status) e `serie_auto_episodios` (seq, tentativa, `generation_id`, ideia, `video_id`, status, `email_sent_at`, unique(serie, seq, tentativa));
   - `lib/serieAuto/cron.ts` como **passe 4 dentro de `/api/cron/autopilot-generate`**, sem nenhuma entrada nova no `vercel.json`, que já tem uns 50 crons (a Vercel recusa o deploy calada quando o limite estoura);
   - escritor extraído, e-mail via Resend, eventos;
   - interruptor `SERIE_AUTO_LIVE=false`, só contas internas;
   - guardião offline por transpile;
   - canário: série do fundador por 2 semanas, cerca de US$ 7.
2. **Etapa 2, cliente (~1 dia):** cartão no Premiere e na `/library` (ligar, pausar, trocar tema, cancelar), oferta de recarga, link de pausa assinado no e-mail. Abre para assinantes pagos, e o `send-subscriber-idle` ganha o botão "ligue sua série".
3. **Etapa 3, qualidade (~1-2 dias):** folha de personagem do episódio 1 guardada e reaproveitada (precisa de entrada própria na rota cinematic, que é TRAVA 8.2), escolha de motor (H3 para emoção), painel "temas já feitos" e upsell para o Lite.

## 6. Medição

- **Eventos:** `serie_auto_offer_seen`, `_enabled`, `_paused`, `_cancelled`, `_episode_dispatched`, `_delivered`, `_failed`, `_skipped` (com o motivo), `_email_sent`, `_episode_opened`, `_episode_downloaded` (baixar = gostou; a base de 26/10 é 37%).
- **Régua principal:** dos que ligam, **quantos renovam no ciclo seguinte**, contra assinantes do mesmo plano e da mesma época que não ligaram. A base é o churn da Stripe de 13/10: 10 de 15 saem, ou seja, ficam 33%. **Meta: 70% ou mais dos que ligam renovam.**
- **Sinais antecipados:** 50% ou mais dos episódios abertos ou baixados, menos de 30% de pausas em 4 semanas, e upgrades Starter→Creator.
- **Ressalva honesta:** com cerca de 12 assinantes não existe estatística. Nos primeiros 60 dias a leitura é caso a caso, com um placar fixo marcado na data do deploy (a regra do marco zero).

## 7. O que precisa do "vai" do fundador

1. **Gasto:** cada episódio consome créditos do cliente e custa cerca de US$ 3,30 de fal (60 s). Teto de ~US$ 170/mês se os 12 ligarem.
2. **Padrão:** Seedance 1.5 · 60 s · segunda 07:00 BRT.
3. **Preço:** incluído no plano (recomendado) ou um adicional pago. A recarga fica no pacote avulso de US$ 2,90 (35 s) ou US$ 4,99 (60 s).
4. **Ligar para quem:** só por escolha do cliente (recomendado; ligar sozinho gastaria crédito sem pedir). **Jogada opcional:** seguindo a regra "a isca é o filme pronto", a casa paga o episódio 2 dos 9 parados (cerca de US$ 30 no total) e manda "seu episódio 2 está pronto, ligue a série para receber toda segunda".
5. **Canário:** 2 semanas na conta dele antes de abrir.
6. **TRAVA 8.2:** a Etapa 1 mexe em `/api/next-episode` (na extração do escritor) e no cron do Autopilot. A Etapa 3 mexe na rota cinematic.

## 8. Estado da Etapa 1 (KINEO-SERIE-AUTO-ETAPA1-0111, 01/11, commit local, não publicado)

- **Motor pronto e DESLIGADO:** `lib/serieAuto/serieAuto.ts` (regras puras, `SERIE_AUTO_ENABLED=false`, só os e-mails EXATOS da casa) e `lib/serieAuto/cron.ts` (passe 4 dentro de `/api/cron/autopilot-generate`, depois dos desenhos; nenhuma entrada nova no `vercel.json`). Desligado, o passe volta antes de abrir o banco.
- **Migration escrita e NÃO aplicada:** `supabase/migrations/20261101200000_serie_auto_etapa1.sql` (`serie_auto` + `serie_auto_episodios`, unique (série, semana ISO, tentativa), RLS só leitura das próprias linhas). Aplicar antes de ligar o interruptor.
- **Ideia, não roteiro:** o passe monta a IDEIA do episódio (ângulo + ficha preservada + âncora de `lib/episodeContinuity.ts`) e manda com `engine: seedance` e `script_mode: ai`; quem escreve o roteiro na régua do motor é o `escreverIdeiaNoServidor` da rota. O escritor de `/api/next-episode` NÃO foi extraído nesta etapa (fica para quando a série precisar de batidas escritas por modelo).
- **Sem crédito:** linha `skipped` da semana + evento `serie_skipped_no_credits` (uma vez por semana); 2 semanas seguidas = pausa. O passe nunca financia crédito.
- **Ainda falta (Etapa 1b/2):** e-mail próprio da série (hoje vale o "Your video is ready" da casa), e-mail de "episódio esperando" com a recarga, criação da série (nenhuma tela/rota cria linha ainda: o canário nasce por SQL na conta do fundador).
- **Guardião:** `npx tsx scripts/test-serie-auto-etapa1-0111.mts` (banco em memória, sem rede, sem crédito, sem fal).
