# AUDITORIA — superfícies que ainda achavam que só existem "grátis" e "pago"

`[KINEO-TRIAL-SURFACES-2026-08-07]` — varredura exaustiva + correção.
Base: `92616df`. Flag: `KINEO_REVERSE_TRIAL_ENABLED`.

## Por que esta varredura existe

Até 06/08 o produto tinha DOIS tipos de conta: grátis e pago. Desde 07/08 existe
um TERCEIRO — **trial** — que o servidor trata como pago em tudo, **exceto** os
motores Studio (Kling / Veo / Hollywood) e o teto de 40 créditos.

O detalhe que causa o defeito: **`maybeActivateReverseTrial` não escreve `plan`
nem `has_paid`**, de propósito (escrever `plan='creator'` numa conta que não
pagou contaminaria MRR, coortes de e-mail, webhook da Stripe e todo painel de
admin). Logo, para o banco, **uma conta em trial ativo é `plan='free'
has_paid=false`** — e toda tela que decide por esses dois campos a lê como free
e afirma coisas falsas sobre ela.

Duas irmãs desse defeito já tinham sido achadas — as duas **pelo fundador
olhando a tela**, nenhuma por teste:

- `f9a4a9b` — o card do Fast dizia `FREE` enquanto o servidor cobrava 1 crédito
  (saldo 20→19 medido no banco). Corrigido com uma etiqueta própria
  (`fastCostsCredit`), **sem alargar `anyPaid`** — destravar Kling/Veo na tela
  daria 402 do servidor.
- `1f1bcd5` — o modal de fim de trial só aparecia depois do cron das :55.

Este documento é a varredura atrás das outras.

## Método

`grep` por todo ponto que decide comportamento OU copy por plano:
`isFreePlan`, `planTier === 'free'`, `hasPaid`/`has_paid`, `anyPaid`,
`isStarter|isCreator|isStudio`, `freeAiUsed`, `watermark`, `isPaidAccount`,
`treatAsPaid`, `trialActive`/`isTrialActive`, `getEffectiveEntitlement`,
`getFreeTierOffer`/`swapFreeTierCopy`/`FreeTierCopy`.

**600 ocorrências em 77 arquivos**, cobrindo `app/(dashboard)/**`,
componentes de crédito/badge/paywall/upsell, e-mails em `app/api/cron/**` e
`lib/**`, `/api/credits`, telas de download/export e `/pricing`.

### Classes

| | classe | significado |
|---|---|---|
| **(a)** | CORRETA | a distinção free/pago é a certa ali |
| **(b)** | MENTE PARA TRIAL | diz grátis / limite / marca d'água que não se aplica |
| **(c)** | MENTE PARA EXPIRADO | afirma ESTADO que não é mais (ou ainda não é) verdade |
| **(d)** | PROMESSA FALSA | destravaria/prometeria o que o servidor recusa (o caso Kling/Veo) |

### Placar

| classe | ocorrências | ação |
|---|---|---|
| (a) CORRETA | 583 | nenhuma — listadas abaixo para não re-auditar |
| (b) MENTE PARA TRIAL | 9 | **corrigidas** |
| (c) MENTE PARA EXPIRADO / afirma estado | 5 | **4 corrigidas, 1 adiada (documentada)** |
| (d) PROMESSA FALSA | 3 | **corrigidas** |

---

## (b) MENTE PARA TRIAL — corrigidas

### B1..B6 — `app/(dashboard)/account/**` — a pior da varredura

`app/(dashboard)/account/page.tsx` selecionava só
`is_pro, has_paid, plan, …` e `AccountClient.tsx` decidia TUDO por
`tier`/`hasPaid`. Uma conta em trial (40 créditos na mão, export limpo, Seedance
liberado) lia, **palavra por palavra**, na única tela onde a pessoa vai conferir
o que tem:

| # | arquivo:linha (HEAD `92616df`) | o que a tela dizia | por que é falso |
|---|---|---|---|
| B1 | `AccountClient.tsx:82` | `🆓 Free Access` | está em trial Creator |
| B2 | `AccountClient.tsx:400` | `Included credits: 0` | recebeu 40 |
| B3 | `AccountClient.tsx:401` | `Purchased credits: 40` | não foram compradas, foram concedidas — e expiram |
| B4 | `AccountClient.tsx:405` | `Never-paid allowance: 1 free Fast video/month` | durante o trial a cota free nem é consultada (`countsAgainstFreeQuota: !treatAsPaid`) |
| B5 | `AccountClient.tsx:498` | `The allowance grants no credits and does not include premium AI Generated video` | o trial dá **as duas** coisas |
| B6 | `AccountClient.tsx:510` | `Unlock clean, watermark-free MP4s →` | o export do trial **já sai limpo** (`watermark: !treatAsPaid`) |

**Correção.** A verdade é resolvida no **servidor** (`page.tsx`, `isTrialActive`
+ `TRIAL_ENTITLEMENT_COLUMNS`, leitura SEPARADA e best-effort pelo mesmo motivo
de `/api/credits`: um env sem a migration não pode derrubar a página inteira) e
desce como prop `trialActive` / `trialEndsAt`. O bloco de trial mostra
`Trial credits` (o mesmo número do badge do topo — mesma fonte, não podem
divergir), `Trial ends`, `Trial includes: Every engine except Studio · clean
exports` e `After the trial: {OFFER.copy.residual}`.

> ⚠️ `Every engine except Studio` **não é detalhe de copy**: é a invariante 2 de
> `getEffectiveEntitlement` (`allowsStudioEngines = isPaidAccount`, NUNCA
> `treatAsPaid`). Prometer o contrário aqui seria reproduzir o caso Kling.

### B7 — `GenerateClient.tsx:6173` — a irmã de `f9a4a9b`, uma tela ANTES

> "You're in. **Your Fast previews are free to create, watch, share and download
> with a watermark**"

Gate: `showFirstShortNudge` — só "conta nova sem vídeo", **sem nenhum termo de
plano**. É a PRIMEIRA frase que a conta nova lê, e durante o trial ela é falsa
nas duas metades: o Fast **custa 1 crédito** e sai **limpo**. Exatamente o
defeito de `f9a4a9b`, uma tela acima dele.
**Corrigido** com um ramo `trialActive` (sempre false com a flag OFF).

### B8 — `GenerateClient.tsx` — contador do chip de crédito

`freeUsedToday` era medido numa janela de **24h escrita à mão** enquanto o chip
que o exibe já dizia `N of {OFFER.limit} free {OFFER.copy.counterNoun}` e
`Monthly limit reached`. Ver **C3** — a correção acabou sendo outra.

### B9 — `GenerateClient.tsx:9000` (chip, sub-linha) — `Fast previews are free`

Sem contagem conhecida, essa frase lê como afirmação sobre **o saldo desta conta
agora**. **Corrigida** para descrever a regra (`OFFER.copy.residual`) na
variante ON; flag OFF devolve o literal de hoje.

---

## (c) MENTE PARA EXPIRADO / afirma ESTADO

### C1 — `GenerateClient.tsx:7137` — "You can still make…" ✅ corrigida

> `You can still make up to 3 watermarked Fast previews per 24 hours.`
> (ON: `You can still make 1 free watermarked Fast video per month.`)

Isto **afirma disponibilidade**. Para quem já usou o Fast do mês/dia, é falso —
e o clique seguinte leva 402 `free_fast_limit`.

**Correção, na ordem exata da regra de ouro:**
- cota **comprovadamente** esgotada (contagem conhecida ≥ limite) → frase
  verdadeira: *"Your 3 free watermarked Fast previews for this 24h window are
  already used."*
- cota não esgotada / desconhecida → **literal de hoje, byte a byte**;
- variante ON → **forma de REGRA**, sem afirmar disponibilidade: *"The free plan
  includes 1 watermarked Fast video per month."* (idêntica à variante ON da
  linha 7136, que já estava certa).

> Esta é a **única** mudança de copy que também aparece com a flag OFF, e só no
> estado em que a frase antiga era **provadamente falsa**. É o que a instrução 4
> manda: onde a informação de cota consumida existe, usá-la.

### C2 — `GenerateClient.tsx:10807` — `WelcomeBanner` ✅ corrigida (também **(d)**)

Ver **D1**.

### C3 — janela do contador ✅ corrigida — **e a primeira correção foi derrubada pela 2ª passada**

A correção óbvia era trocar o literal `24 * 60 * 60 * 1000` por
`OFFER.windowMs`. Ela foi escrita e **descartada na segunda passada da revisão
adversarial**, porque com a flag ON (janela de 30 dias) ela mente para o **lado
pior — negando acesso a quem tem**:

- `recentVideos` vem de `/api/videos`, que devolve as **últimas 6 linhas**
  (`.limit(6)`) — numa janela de 30 dias o número satura;
- `interface RecentVideo` **não tem `quality_mode` nem `credits_used`**, os dois
  campos pelos quais o SERVIDOR decide o que consome a cota free
  (`app/api/compose`). Num mês, os vídeos **Seedance do próprio trial** seriam
  contados como se fossem o Fast grátis, e a tela diria "monthly limit reached"
  para quem nunca gastou o Fast do mês.

Numa janela de 24h (a de hoje, flag OFF) as duas fontes de erro são
desprezíveis. **Correção final:** com a flag ON o contador vira `null` de
propósito, e a copy descreve a REGRA em vez de afirmar disponibilidade. Trocar
uma afirmação falsa por outra, só que na direção de recusar, não é correção.

### C4 — `app/pricing/PricingClient.tsx:529` — ⚠️ **ADIADA, de propósito**

> "Not sure yet? **Start free — your first video is on us** — no card; new
> accounts get a 40-credit Creator trial." → link para `/signup`

`PricingClient` **não tem nenhuma consciência de sessão** (nenhum `getUser`,
nenhuma prop de auth). Um usuário logado — em trial, pagante, ou já
**downgraded** — lê um convite para criar uma conta que ele já tem; se clicar,
bate no `User already registered` (o mesmo muro de `920f50f`).

**Por que não foi corrigida agora, explicitamente:**
1. a correção honesta exige estado de auth numa página hoje **100% estática
   (SSG)** — as ~28 páginas de SEO dependem desse SSG (ver a decisão registrada
   em `lib/freeTierOffer.ts`, bloco "SSG / CACHE");
2. um `getUser()` client-side resolveria, mas esconder o bloco muda o render
   **com a flag OFF também** — e isso quebraria a prova de "flag OFF =
   comportamento e copy idênticos", que é o critério de rollback desta feature;
3. pela regra de ouro ela é a de **menor** prioridade das quatro: não promete
   motor que o servidor recusa, e não chama de grátis o que é cobrado — é um
   convite endereçado errado.

**Próxima sprint**, junto com o item de `/api/free-quota` abaixo.

---

## (d) PROMESSA FALSA — corrigidas

### D1 — `GenerateClient.tsx:10807` — `WelcomeBanner`

Com a flag ON, a copy **afirma**:

> "**Your Creator trial is live — 40 free credits, every engine except Studio.**"

A **única** guarda do banner é `credits >= 1` (+ `sf_welcomed` não dispensado).
Leem essa frase, hoje:

- quem **assinou** (Starter/Creator/Studio) e nunca dispensou o banner;
- quem comprou **pacote avulso** (`plan='free' has_paid=true`);
- quem teve o trial **NEGADO** (e-mail descartável / fingerprint —
  `isDisposableEmail`, `lib/trialFingerprint.ts`) e mesmo assim tem saldo.

E "every engine except Studio" é **justamente o que o servidor recusaria com
402** para os dois últimos. É o caso Kling/Veo, de novo, agora na primeira tela
da sessão.

**Correção:** `trialLive` (do `trialActive` + `trial.phase` de `/api/credits`,
`trialUiState` no servidor). Com a flag ON e sem trial vivo, um "Welcome to
Kineo" neutro que não promete nada. Com `OFFER.reverseTrial === false` (flag OFF)
o ramo é o de hoje, inalterado.

### D2 / D3 — os dois ramos do mesmo banner

O texto neutro e o `FreeTierCopy` original — contados separadamente porque são
dois caminhos de render distintos com veredictos distintos.

---

## (a) CORRETAS — verificadas, **não re-auditar**

### Servidor: já passaram pelo `getEffectiveEntitlement` / `isTrialActive`

| arquivo | veredito |
|---|---|
| `app/api/compose/route.ts:1091,1132,1168,1196` | ✅ `ent.isTrial` nos 4 pontos (motor, watermark, clamp, cota). É a fonte. |
| `app/api/generate-video-cinematic/route.ts:685` | ✅ `isTrialActive` + `trialUiState` |
| `app/api/footage/route.ts:115` | ✅ `getEffectiveEntitlement(...).treatAsPaid`, com `isPaidAccount` LOCAL (invariante 1) |
| `app/api/characters/route.ts:116` | ✅ `isTrialActive`, **não** `treatAsPaid` — decisão certa e comentada no arquivo |
| `app/api/video-summary/route.ts:166` | ✅ `!isTrialActive(planRow)` na descrição marcada |
| `app/api/youtube/upload/route.ts:139` | ✅ idem |
| `app/api/credits/route.ts` | ✅ é quem **serializa** `trialActive` + `trial` para o cliente |
| `lib/videoDescription.ts:44,102` | ✅ recebe `isFreePlan` já resolvido pelo chamador |

### Cliente: já corrigidos em `f9a4a9b` / `KINEO-TRIAL-BLOCKERS`

| arquivo:linha | veredito |
|---|---|
| `GenerateClient.tsx:9762` `anyPaid` | ✅ **NÃO** recebe `trialActive` — é o que impede destravar Kling/Veo |
| `GenerateClient.tsx:9767` `fastCostsCredit` | ✅ etiqueta própria (`anyPaid \|\| trialActive`) |
| `GenerateClient.tsx:9776` `seedanceUnlocked` | ✅ `anyPaid \|\| trialActive` — espelha o servidor |
| `GenerateClient.tsx:9777-9778` `klingUnlocked` / `cinematicUnlocked` | ✅ `anyPaid` puro (invariante 2) |
| `GenerateClient.tsx:9890` | ✅ `trialActive ? '🔒 Studio' : '🔒'` |
| `GenerateClient.tsx:5518` `isPaidAccount` | ✅ inclui `trialActive` |
| `GenerateClient.tsx:2824,2842,4958,5569,7136,7515,7534,7925` | ✅ `!trialActive` em todos |
| `HistoryClient.tsx:180` `cleanAccess` | ✅ `d.trialActive === true` |
| `MyVideosClient.tsx:149` | ✅ idem |
| `components/TrialDowngradeModal.tsx:359` | ✅ `FreeTierCopy` swap; gate 100% servidor (`showDowngradeModal`) |

### Cliente: distinção free/pago legitimamente certa

| arquivo:linha | veredito |
|---|---|
| `LowCreditsUpsell.tsx:60` | ✅ "You're almost out of videos — N left" é **verdade** para um trial com ≤5 créditos; não afirma plano nem marca d'água |
| `Offer290Banner.tsx:74` | ✅ gate `hasPaid`; conta em trial é alvo legítimo da oferta de 1ª compra |
| `AutopilotClient.tsx:829,846,867` | ✅ trial **não** tem direito a Autopilot (`AUTOPILOT_PAID_PLANS`, sem trial) e a tela diz exatamente isso — nenhuma promessa falsa |
| `DashboardClient.tsx:648` | ✅ dentro de `{!isLoggedIn && …}` — a promessa de trial é verdadeira para quem vai se cadastrar |
| `components/Sidebar.tsx:568` | ✅ dentro de `{!isLoggedIn ? … : null}` |
| `components/AuthModal.tsx:256` | ✅ superfície de cadastro |
| `HistoryClient.tsx:455,540` | ✅ gated por `cleanExportLocked === true`, que já exclui o trial |
| `ThumbnailGeneratorClient.tsx` | ✅ os badges "N free today" foram removidos em `KINEO-DL-PAYWALL-2026-07-09`; não anuncia cota |
| `components/SocialProofToast.tsx:16,48` | ✅ passa pelo swap; a variante ON fala de "on signup" (regra), não do estado do leitor |
| `components/StickyFreeShortCTA.tsx:41`, `Footer.tsx:183`, `NicheOnboarding.tsx:157`, `StructuredData.tsx:124` | ✅ swap por `ft`/`FreeTierCopy` |
| `app/(dashboard)/account/page.tsx:44` `normalizePlanTier` | ✅ `.replace(/_trial$/,'')` trata `*_trial` como o plano PAGO correspondente — são planos de teste da Stripe, coisa diferente do reverse trial |

### E-mails (`app/api/cron/**`, `app/api/send-welcome`)

| arquivo | veredito |
|---|---|
| `send-credits-back/route.ts:237` | ✅ **curto-circuito explícito** com a flag ON (`reverse_trial_free_tier`) — o e-mail "seus 3 Shorts voltaram" não faz sentido com 1/mês |
| `send-cap-hit/route.ts` | ✅ a coorte é `videos.credits_used = 0 AND quality_mode='fast'` + evento `free_fast_limit`. **O Fast do trial custa 1 crédito** e não gera esse 402 ⇒ conta em trial nunca entra na coorte. Copy toda por `ft`/`OFFER`. |
| `send-reminders/route.ts:196,215,263,265` | ✅ swap por `ft`; coorte `plan in ('free', null)`, 20–28h — trial ainda vivo nas duas variantes (3d e 7d) |
| `send-activation-nudge/route.ts:65,77` | ✅ swap por `ft`; coorte 1–6h |
| `send-welcome/route.ts:72,121` | ✅ swap por `ft` |

> ⚠️ **Ressalva medida, não corrigida** (não é mentira, é envio perdido):
> `send-cap-hit` monta a coorte numa janela `since = agora − 24h` fixa, enquanto
> com a flag ON a janela da oferta é de 30 dias. Quem gastou o Fast do mês há
> mais de 24h **não recebe** o e-mail. Erra por omissão, nunca por afirmação
> falsa — por isso ficou fora desta correção.

### Marketing / SEO (~28 páginas, logged-out, SSG)

`app/free-ai-shorts*`, `app/alternatives/**`, `app/vs/**`, `app/compare`,
`app/scripts/**`, `app/faceless-*`, `app/youtube-*`, `app/how-*`,
`app/best-ai-shorts-generators`, `app/cheapest-ai-shorts-maker`,
`app/brainrot-video-generator`, `app/reddit-story-video-generator`,
`app/text-to-video-shorts`, `app/state-of-ai-shorts-2026`,
`app/can-you-monetize-ai-videos`, `app/make-money-clipping-with-ai`,
`app/tiktok-vs-youtube-shorts-monetization`, `app/examples`, `app/widget`,
`app/v/[id]`, `lib/comparisons.ts`, `lib/kineoFacts.ts`, `lib/characters.ts`.

✅ **CORRETAS por construção**: são superfícies de visitante **não logado**, e
todas passam pelo `swapFreeTierCopy` / `FreeTierCopy`. Para quem ainda não tem
conta, "todo signup novo ganha trial Creator" é a verdade literal. Não têm — e
não devem ter — noção de trial de um usuário específico.

---

## Prova de que a flag OFF não muda nada

Toda alteração é gated por um predicado que é **constante-false / constante-'none'
com `KINEO_REVERSE_TRIAL_ENABLED` diferente de `'true'`**:

| gate usado | valor com a flag OFF | por quê |
|---|---|---|
| `trialActive` (prop / estado) | `false` | `isTrialActive()` retorna false para qualquer entrada — 1ª linha da função |
| `trialPhase` | `'none'` | `trialUiState()` devolve `empty` com a flag OFF |
| `OFFER.reverseTrial` | `false` | `buildFreeTierOffer(false)` |
| `OFFER.windowMs` | `24h` | `OFF_OFFER.windowMs === FREE_FAST_WINDOW_MS` |
| `OFFER.limit` | `3` | `OFF_OFFER.limit === FREE_FAST_PREVIEW_LIMIT` |
| `ft(OFFER, legacy, on)` | `legacy` byte a byte | `swapFreeTierCopy` |

`app/(dashboard)/account/page.tsx` sequer executa a query nova
(`if (REVERSE_TRIAL_ENABLED)`), então com a flag OFF a página não muda nem em
número de queries.

**Única exceção, deliberada e ordenada pela instrução 4:** C1 troca a frase
quando a cota está **comprovadamente** esgotada (com a flag OFF isso é
`recentVideos` conhecido e ≥ 3 nas últimas 24h) — o único estado em que a frase
antiga era falsa. Em todo outro estado o literal é devolvido byte a byte.

---

## Pendências abertas (com o motivo de não terem sido feitas agora)

1. **`/pricing` logado** (C4) — precisa de estado de auth numa página SSG, e
   escondê-la mudaria o render com a flag OFF. Ver C4.
2. **Cota consumida tem que vir do SERVIDOR** — a raiz de C3/B8. O servidor já
   sabe a resposta (`lib/freeFastQuota.countFreeFastUsage`, a MESMA função que o
   `/api/compose` usa para recusar); falta expô-la (em `/api/credits` ou uma
   rota nova). Enquanto isso, nenhuma tela pode afirmar disponibilidade com a
   flag ON. Improvisar a contagem no cliente foi tentado nesta sprint e
   **derrubado pela própria revisão** — ver C3.
3. **`send-cap-hit`, janela de coorte de 24h** com oferta de 30 dias — erra por
   omissão (ver ressalva acima).
4. **Não tocado por ordem explícita da sprint:** `lib/reverseTrial.ts` e
   `app/api/cron/trial-downgrade/**` (outro agente em paralelo). Nada aqui edita
   esses dois — só os **importa**.

## Rigor

- `tsc --noEmit --incremental` → **EXIT=0**
- EOL conferido por arquivo contra o blob do HEAD (os três são LF puro; o
  `AccountClient.tsx` chegou CRLF do checkout Windows e foi normalizado de volta
  para o EOL do HEAD antes do commit).
- Revisão adversarial 2×. A 2ª passada — a que procura defeito nas **próprias**
  correções — derrubou a primeira versão de C3 inteira. Está registrada acima em
  vez de apagada, porque a próxima pessoa vai ter a mesma ideia.
