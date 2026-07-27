# PROJECT_STATE.md — Estado real do projeto

**Data deste snapshot:** 2026-07-27 · **Base:** commit `a517879` (PUSH #103, 26/07/2026) · **Fonte:** Ciclo 1 de auditoria, 4 especialistas, somente leitura.

Tudo aqui é FATO CONFIRMADO no código ou EVIDÊNCIA DE PRODUÇÃO com data. O que não se sabe está em `OPEN_QUESTIONS.md`.

---

## 1. IDENTIFICAÇÃO

| Campo | Valor |
|---|---|
| Pasta local | `C:\Users\josep\OneDrive\Área de Trabalho\Usekineo` |
| GitHub | `https://github.com/josephsskaf-hub/UseKineo` (remoto único, `origin`) |
| **Supabase de PRODUÇÃO** | **`cqqukkvjjrguayiyjvhh`** — projeto "josephsskaf-hub's Project" |
| Branch | `main` |
| HEAD em 27/07/2026 | `a517879` — local e GitHub idênticos, 0 à frente / 0 atrás |
| Marca na UI | **Kineo** |
| Domínio de produção | **`www.usekineo.com`** — ver `AGENTS.md` §2.1 |
| Domínio legado | `shortsforgeai.com` (308 permanente) |
| `package.json` name | `shortsforgeai` (legado, não corrigido) |
| Deploy | Vercel |
| Fundador | Joseph Skaf · josephsskaf@gmail.com |

---

## 2. O QUE O PRODUTO É

Gerador de YouTube Shorts com IA. O usuário digita um tópico; o sistema produz roteiro, voiceover, B-roll, legendas queimadas e entrega um MP4 vertical 9:16.

**Escala do código:** Next.js 14.2.5 App Router · ~78 páginas · **116 rotas de API** · TypeScript · Tailwind (mas ver `AGENTS.md` §6.2) · Supabase · Stripe.

---

## 3. O NEGÓCIO — números reais

### 3.0 Contagem direta em produção — 27/07/2026, a evidência mais fresca que existe

Lida no SQL Editor do projeto `cqqukkvjjrguayiyjvhh` (rotulado PRODUCTION pelo Supabase):

| Tabela | Linhas |
|---|---:|
| `profiles` | **716** |
| `videos` | **572** |
| **`channels`** | **0** |

**`channels = 0` medido DEPOIS do PUSH #103**, que consertou o `redirect_uri_mismatch` em 26/07. Isso confirma o diagnóstico de §3.2: o OAuth não era o único bloqueio. O paywall da página `/autopilot` impede qualquer pessoa — inclusive o fundador — de chegar ao botão de conectar. Consertar o OAuth não podia produzir uma única conexão, e não produziu.

Como identificar o banco de produção sem adivinhar: `NEXT_PUBLIC_SUPABASE_URL` é variável pública e aparece no bundle do site. Lida de `www.usekineo.com` em 27/07 = `https://cqqukkvjjrguayiyjvhh.supabase.co`. O projeto chamado `shortsforgeai-staging` (`quaurrzawdmjmzuzkhqo`) **não** é produção, apesar do nome parecer o do domínio antigo.

### 3.1 O placar (EVIDÊNCIA DE PRODUÇÃO, `push_102_msg.txt`, 26/07/2026)

| Métrica | Valor |
|---|---:|
| Cadastros, história inteira | **713** |
| Terminaram um vídeo | **128** ⚠️ contestado, ver §3.3 |
| "Abriram o Stripe" | 48 **sessões** ≈ ~10 pessoas |
| **Pagaram, história inteira** | **4 pessoas** |
| **Assinantes recorrentes ativos** | **0 — jamais houve** |
| **Receita total, história inteira** | **~$40–60** |
| LTV por cadastro | $0,07 |
| Recompras | 0 |

**Leitura correta, que nenhum documento anterior fez:** foram **4 compras avulsas** (packs), **zero assinatura recorrente**, em ~3 meses. `PUSH-32-RELEASE.md:14` (16/07) confirma independentemente: 0 assinante recorrente externo válido, sobre 665 perfis externos.

### 3.2 Autopilot — o SKU de $299 nunca entregou o passo 1

EVIDÊNCIA DE PRODUÇÃO, `push_103_msg.txt` (26/07/2026):
- `public.channels` = **0 linhas**
- `profiles.youtube_tokens` = **0**
- **Zero** eventos `youtube_*` em dois dias inteiros de tráfego
- ⇒ conectar canal tinha **0% de sucesso**. Causa: `redirect_uri_mismatch` da migração de domínio.

O PUSH #103 corrigiu o OAuth. **Não existe nenhuma conexão bem-sucedida comprovada depois do fix.**

### 🔴 A CAUSA RAIZ REAL — descoberta em 27/07/2026, verificada no navegador

O `redirect_uri_mismatch` **não era o único motivo** de `channels = 0`. Há um segundo bloqueio, anterior a ele:

**A página `/autopilot` está atrás de paywall, e nem a conta do fundador passa.** Verificado ao vivo em `www.usekineo.com/autopilot` logado como `josephsskaf@gmail.com` (694 créditos): a tela mostra *"Autopilot is part of the paid plans"* e um botão "See plans and unlock Autopilot". **Não existe botão de conectar canal para clicar.**

A regra exata, em `lib/autopilot/config.ts:143-163`:
```
AUTOPILOT_PAID_PLANS = { 'autopilot', 'autopilot_trial', 'autopilot_pilot' }
```
- `has_paid` e `is_pro` são **deliberadamente ignorados** — comprar um pack de $2,90 não destrava
- só `profiles.plan` decide
- plano com prazo (o piloto) exige `plan_expires_at` no futuro, **fail-closed**
- **não existe bypass de admin.** O `admin` naquela rota é o client do Supabase, não um privilégio de usuário

**O laço fechado que isso cria:**

> Não se pode vender o Autopilot porque ele nunca foi provado.
> Não se pode provar porque provar exige **já ser cliente do Autopilot**.

Ninguém jamais poderia ter conectado um canal: quem não paga bate no paywall, e os únicos planos que passam são `autopilot` (0 assinantes na história), `autopilot_trial` (ninguém concede) e `autopilot_pilot` (SKU inerte — ver `OPEN_QUESTIONS.md` Q-A2).

### ✅ LAÇO QUEBRADO EM 27/07/2026 — e o que apareceu depois

O fundador rodou `update public.profiles set plan='autopilot_trial'` na sua própria linha. Verificado via `/api/autopilot/schedules`: **`entitled: true`, `plan: 'autopilot_trial'`, `plan_expires_at: NULL`**. Como `autopilot_trial` não está em `AUTOPILOT_TIME_BOXED_PLANS`, o NULL não bloqueia. A página `/autopilot` destravou e o botão de conectar canal apareceu — pela primeira vez na história do produto.

**Primeira conexão de canal da história:** `channels` saiu de 0 para 1 linha em 27/07 15:10 UTC.

#### 🔴 Dois achados imediatos, ambos ainda abertos

**1. O canal conectado NÃO é o pretendido.** O fundador apontou o canal **Curiosityvaultlab** (`UCffjyZHeIPGjbwHTQQIF-dA`, **12.641 inscritos**, nicho de mistério/curiosidade). O que ficou gravado foi o canal pessoal, título **"Joseph Skaf"**.

Causa: no seletor do Google ele escolheu a conta `josephsskaf@gmail.com`, que resolve para o canal pessoal. **Curiosityvaultlab é brand account** e precisa ser escolhido como entidade separada no consentimento.

**2. O upload vai PÚBLICO por padrão.** `app/api/youtube/upload/route.ts:124` — `privacyStatus: body.privacyStatus ?? 'public'`. A UI confirma: *"Videos go up as public Shorts."* Não há caminho na UI para publicar como `private` ou `unlisted`, embora o tipo aceite ambos.

**Consequência de risco:** ligar o Autopilot publica Short **público** diário, sem supervisão, com um pipeline que **nunca completou uma vez** de ponta a ponta. Num canal de 12,6 mil inscritos isso expõe audiência real a duplicata, lixo ou falha no meio.

**Recomendação registrada:** provar os 7 dias no canal **sem audiência** primeiro (o pessoal, já conectado, é o canal controlado que o EXP-1 pedia), e só depois trocar para o Curiosityvaultlab. Uma opção de `privacyStatus: 'unlisted'` na UI do Autopilot tornaria o teste seguro em qualquer canal — **SUGESTÃO, não implementado.**

#### ✅ RESOLVIDO E LIGADO — 27/07/2026

**A causa da conexão errada: nome de conta de marca ≠ nome de canal.**

O Google, no consentimento OAuth, lista **contas de marca**, não canais. A conta de marca chama-se **"Zona Invisível"**; o canal dentro dela chama-se **"Curiosityvaultlab"**. O YouTube mostra o nome do canal; o Google mostra o nome da marca. São a mesma coisa com dois nomes, e nada na tela liga um ao outro.

Selecionando "Zona Invisível" no consentimento, o app gravou corretamente **Curiosityvaultlab**.

⚠️ **Isto é uma armadilha para todo cliente, não só para o fundador.** Quem tem canal em conta de marca renomeada não tem como saber qual opção escolher — e o app conecta em silêncio o que vier.

**Estado final:** Autopilot **LIGADO** em 27/07. Canal `Curiosityvaultlab`, nicho `Mysteries & unexplained`, 1 Short/dia às 18:00 local. Primeira publicação agendada para 27/07 18:00. **Primeiro `autopilot_schedule` da história do produto.**

---

#### 🔴 TERCEIRA CAUSA-RAIZ DE `channels = 0` — o app OAuth NÃO é verificado pelo Google

Descoberto ao percorrer o fluxo em 27/07. Antes do consentimento, o Google exibe tela vermelha de alerta:

> **"O Google não verificou este app."** — *"O app está solicitando acesso a informações confidenciais na sua Conta do Google. Não é recomendado usá-lo até que o desenvolvedor (`support@shortsforgeai.com`) faça a verificação com o Google."*

Para prosseguir é preciso clicar em **"Avançado"** e depois em **"Acessar Kineo (não seguro)"**.

**Consequências comerciais:**
1. **Todo cliente** que tentar conectar um canal vê essa tela. Num produto de $299/mês cuja promessa central é conectar o YouTube, essa é uma barreira de conversão brutal — e é candidata forte a explicar por que `channels` ficou em 0 mesmo depois do #103.
2. App não verificado com escopos sensíveis tem **limite de usuários** e o token pode expirar cedo. Escalar o Autopilot sem verificar é impossível.
3. O e-mail do desenvolvedor exibido ao cliente é `support@shortsforgeai.com` — **a marca antiga**, o que reforça a incoerência de domínio da §2.1 do `AGENTS.md`.

**Ação necessária (fora do escopo do CEO):** submeter o app à verificação OAuth do Google no Google Cloud Console. Exige tela de consentimento completa, domínio verificado, política de privacidade e demonstração em vídeo. **QUESTÃO PENDENTE — bloqueia a venda do Autopilot em escala.**

---

**Como sair do laço — três caminhos, um só é limpo (histórico, resolvido acima):**

| Caminho | Custo | Problema |
|---|---|---|
| `UPDATE profiles SET plan='autopilot_trial' WHERE id=<fundador>` | 1 query | **Escrita em banco — exige autorização do fundador.** É o caminho recomendado: `autopilot_trial` não é time-boxed, logo não depende da migration pendente |
| Fundador compra o $299 ou o piloto de $99 | dinheiro real | O piloto está inerte; e pagar a si mesmo suja a métrica de receita |
| Adicionar bypass de admin no código | 1 PR | Cria caminho privilegiado permanente em código de entitlement. Não recomendo |

### 3.3 ⚠️ CONTRADIÇÃO ABERTA — ativação difere por 2×

| Fonte | Afirma | Data |
|---|---|---|
| `PUSH-28-RELEASE.md:12` | **194** usuários com ≥1 vídeo concluído | 16/07/2026 |
| `push_102_msg.txt:5` | **128** pessoas terminaram um vídeo, história inteira | 26/07/2026 |

Um acumulado histórico não pode cair 66 em 10 dias. **Causa provável identificada no código:** `app/api/admin/ceo/route.ts:144-147` conta ativação a partir de `videos` **sem filtro de `status`** — render falho conta como ativação. Os scripts filtram `status='completed'`.

Consequência: a empresa reporta **"criou vídeo" (≈38%)** e **"concluiu vídeo" (≈18%)** com o mesmo nome. É a métrica que decide se o dinheiro vai para produto ou para aquisição. **Ver `OPEN_QUESTIONS.md` Q1.**

### 3.4 Funil 7d de 21/07/2026 (`KINEO-GROWTH-100-PAID-WEEKLY-21-07.md`)

215 atores qualificados → 15 submits → 24 cadastros → 6 primeiros vídeos → 3 pricing → 2 checkouts → **0 pagantes**.

### 3.5 Por fonte de aquisição (23/07/2026, `docs/growth/`)

| Fonte | Cadastros 7d | Vídeos | Checkouts | Pagos |
|---|---:|---:|---:|---:|
| TAAFT | 17 de 23 | 3 | **0** | 0 |
| ChatGPT | 4 | 2 | **2** | 0 |

**O ChatGPT manda menos tráfego e converte melhor.** `lib/kineoFacts.ts:6-9`: Google = 1 sessão, ChatGPT = 4 sessões em 11 dias.

### 3.6 Afiliados — baseline zero verificado (30d, 23/07/2026)
0 visitas a `/partners` · 0 aplicações · 0 afiliados · 0 cliques · 0 comissões.

### 3.7 Produto funciona (isto é o lado bom)
- Render Fast: mediana **2,30 min**, p90 3,50 min (n=12, 7d encerrando 23/07)
- Conclusão de render: **15 de 19** jobs maduros (78,9%)
- Crédito devolvido automaticamente quando o render falha

---

## 4. ESTADO DAS FRENTES

| Frente | Estado | Evidência |
|---|---|---|
| Geração de vídeo (Fast) | **VALIDADO EM PRODUÇÃO** | latência e taxa de conclusão medidas |
| Stripe (assinatura + avulso) | **VALIDADO EM PRODUÇÃO** | assinatura verificada, dedupe por `event.id` |
| PayPal | **IMPLEMENTADO, caminho VIVO** | botão em `PricingClient.tsx:621` |
| MercadoPago / Hotmart | **ÓRFÃO** — código completo, zero chamador, fail-closed | — |
| Autopilot ($299) | **IMPLEMENTADO, NUNCA VALIDADO** | 0 canais conectados |
| Piloto $99 | **BLOQUEADO ou VIVO — contradição** | ver `OPEN_QUESTIONS.md` Q-D1 |
| `/revive` | **BLOQUEADO** — migration não aplicada; e metade do canal não existe | `migrations_pending/022_revive.sql:17` |
| E-mails de ciclo de vida | **PARCIALMENTE MORTO** — 3 de 4 crons nunca agendados, todos atrás de flag | `vercel.json` vs `app/api/cron/` |
| Afiliados | IMPLEMENTADO, tráfego zero | — |
| Monitoramento de erro | **NÃO EXISTE** | sem Sentry, sem alerta de falha de render |
| CI / testes | **NÃO EXISTE** | sem `.github/`, zero `*.test.*` |

---

## 5. O GARGALO, CONSOLIDADO

**Não há oferta viva para o público que já chega.**

1. O produto de maior margem (Autopilot $299 / piloto $99) **não é vendido em nenhuma superfície de aquisição**. A home (`app/KineoLanding.tsx`) não menciona Autopilot — vende $9,90/$24,90/$37,90.
2. As ~106 URLs do sitemap apontam **todas** para o funil self-serve, cujo histórico é 4 pagantes em 713 cadastros.
3. Diagnóstico do próprio fundador (`push_102_msg.txt`): *"o problema nunca foi o tráfego nem o preço: é que a Kineo vende uma FERRAMENTA para pessoas que não querem operar ferramenta nenhuma"*.

**Descartado como gargalo principal:** falta de tráfego (o cluster de aquisição é grande) e ativação (18% concluem vídeo, latência de 2,3 min não bloqueia).

---

## 6. TRÊS ICPs INCOMPATÍVEIS CONVIVENDO

| # | ICP | Onde vive | Paga |
|---|---|---|---|
| **A** | Iniciante querendo testar de graça | 28 páginas `/free-ai-shorts/*`, home | $0–9,90 — **é a fonte dos 713 cadastros e dos ~$50** |
| **B** | Comprador comparativo, já usa ferramenta paga | 24 `/alternatives/*` + 12 `/vs/*` | $24,90–37,90 |
| **C** | Dono de canal que parou de exaustão — quer **serviço**, não ferramenta | só `/pricing` e `/revive` (noindex, 0 prospects) | **$99–299** |

O ICP C é declarado explicitamente em `app/revive/[handle]/page.tsx:25-30`. **Nenhuma das ~106 URLs indexadas fala com ele.** Os ICPs A e C se anulam comercialmente.

---

## 7. HISTÓRICO DE SISTEMAS QUE FICARAM MORTOS SEM NINGUÉM PERCEBER

Padrão recorrente e caro. Registrado para não se repetir:

| O quê | Morto de → até | Prova |
|---|---|---|
| `homepage_view` / qualquer pageview | 30/06 → ~25/07 (~4 semanas) | `components/LandingViewTracker.tsx:3-10` |
| `checkout_failed` (motivo de abandono) | declarado 15/07 → 26/07, nunca emitido | `app/api/stripe/checkout/route.ts:493` |
| E-mail de ativação D+1 (erro 42703) | 16/06 → 26/07 | `push_102_msg.txt:32` |
| Grade cinematográfica (nunca desenhou 1 pixel) | desde que foi escrita → 25/07 | `push_96_log.txt:57` |
| Conexão de canal YouTube | sempre → 26/07 | `push_103_msg.txt:7` |
| 3 crons de recuperação de receita | desde que foram escritos → **hoje** | `vercel.json` |

**Lição:** escrever o código não coloca nada no ar. Ver `AGENTS.md` §6.4.
