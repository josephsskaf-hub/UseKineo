# ATRIBUIÇÃO — o rótulo da nossa própria tela apaga a origem externa

`KINEO-INTERNAL-SURFACE-LABEL-2026-08-11` · sprint 11h · **ESPECIFICADO, NÃO APLICADO — e o motivo de não ter sido aplicado é o achado principal deste documento**

Este documento é a tarefa de aquisição desta sprint. Ele fecha uma pendência
registrada em três lugares (`CAC-POR-CANAL-2026-08-10.md`, `ENGAGEMENT-LOG.md`,
`RELATORIO-22H-2026-08-10.md`) e **derruba a correção óbvia**, que eu escrevi
inteira e depois revertei.

---

## 1. O defeito, medido hoje (30 dias, contas internas fora)

Nossos próprios links carregam `utm_source` para saber qual botão foi clicado.
`signup_utm_source` é first-touch-wins e aceita qualquer token. Resultado: quem
chegou do ChatGPT, clicou num CTA nosso e só então criou a conta é gravado como
`homepage` — e o ChatGPT some.

| rótulo interno | pessoas | últimos 7 dias | sem referrer (irrecuperável) | trials | pagaram |
|---|---|---|---|---|---|
| `homepage` | 45 | **37** | 39 | 35 | 0 |
| `lifecycle` | 3 | 3 | 2 | 2 | 0 |
| `kineo_user` | 3 | 1 | 3 | 1 | 0 |
| `seo` | 2 | 1 | 1 | 1 | 0 |
| `examples` | 1 | 0 | 0 | 0 | 0 |
| `state-of-ai-shorts` | 1 | 1 | 0 | 1 | 0 |
| `sticky_cta` | 1 | 1 | 1 | 1 | **1** |
| **total** | **56** | **44** | **46** | | |

Dois fatos que decidem a prioridade:

1. **Está acelerando.** 44 dos 56 casos são dos últimos 7 dias.
2. **A única conversão paga da história está num rótulo interno** (`sticky_cta`),
   sem referrer. A origem do único cliente que já pagou é irrecuperável.

Comparação de canais externos no mesmo recorte, para dimensionar: `taaft` 257
pessoas / 16 trials / **2 pagaram** · `chatgpt` 48 / 32 trials / 0 · `(null)` 36.

---

## 2. A correção óbvia — escrita, revisada e REVERTIDA

A correção que parece certa é inverter a precedência: rótulo interno cede a vez
ao referrer externo. Escrevi exatamente isso em `lib/acquisitionSource.ts` e
`app/api/track-signup-source/route.ts`, passou no `tsc`, e a revisão adversarial
reprovou com três defeitos bloqueantes. **Todos os três tornariam a atribuição
PIOR do que está hoje.**

### 2.1 Cliente de e-mail vira canal de aquisição

`NON_ACQUISITION_HOSTS` só contém `accounts.google.com` e `checkout.stripe.com`.
Com a precedência invertida, **qualquer** referrer passa a ganhar — inclusive
`android-app://com.google.android.gm/` (→ `gmail`) e `mail.google.com`, que casa
com `.google.com` e vira **`google`**.

Consequência: um perfil com `signup_utm_source='lifecycle'` — que é o nosso
próprio e-mail de ativação — passaria a ser contado como **Google orgânico**.
Nossos e-mails de lifecycle, winback e comeback50 se lavariam dentro do balde de
busca orgânica, que é justamente o número usado para decidir onde gastar. O
código atual não tem essa exposição porque o rótulo explícito sempre vence.

### 2.2 Dois dos rótulos que listei são EXTERNOS

- **`watermark`** — `app/free/route.ts` e `docs/LOOP-DISTRIBUICAO-2026-08-11.md`
  (escrito hoje de manhã) definem a marca d'água como a única superfície própria
  de distribuição, e o KPI do loop é literalmente `signup_utm_source='watermark'`.
  A pessoa veio de FORA; o rótulo **é** a origem. Rebaixá-lo zeraria, no mesmo
  dia, a métrica criada pela sprint anterior.
- **`kineo_user`** — `lib/videoShare.ts`: link que o usuário posta numa rede
  social. Também é origem externa, e `app/api/admin/funnel/route.ts` filtra o
  creator-loop por esse token cru.

### 2.3 A block-list nasce incompleta e vai derivar

Enumerei 8 rótulos à mão. A varredura por `utm_source=` no repositório achou
**~38**: `404`, `start`, `checkout_success`, `case_study`, `example_watch`,
`clipping-page`, `affiliate_dashboard`, `partners`, `revive`, `best-roundup`,
`monetize-policy`, `money-calc`, `niche-picker`, `payout-page`, `rpm-hub`,
`tiktok-vs-shorts`, `avatar_landing`, `hot_upsell`, `dfy_email`,
`winback_email`, `feature_email`, `launch_email`, `lead_magnet`, entre outros.
Consertaria 45 casos e deixaria o mesmo bug aberto para ~26 rótulos — dois
regimes invisíveis convivendo na mesma coluna. **Toda landing page nova
reintroduz o defeito.**

### 2.4 Dois defeitos de processo, também pegos na revisão

- **O relatório passaria a se contradizer.** `app/api/admin/funnel/route.ts`
  chama `acquisitionSource()` em um ponto e lê a **coluna crua** em dois outros.
  Hoje concordam; depois da mudança discordariam sobre o mesmo perfil dentro do
  mesmo relatório. E a reclassificação é retroativa na leitura: os números já
  publicados em `CAC-POR-CANAL-2026-08-10.md` mudariam sem marcador de versão.
- **Meu editor converteu `lib/acquisitionSource.ts` inteiro para CRLF**, gerando
  um diff de 117 linhas para uma mudança de 15. O repo não tem `.gitattributes`.

---

## 3. O desenho correto (decisão do fundador — 3 itens)

A ordem importa: fazer 3 sem 1 e 2 é o que produz o dano da seção 2.

1. **Inverter a política: allow-list de fontes EXTERNAS**, não block-list de
   internas. Externo conhecido = `taaft`, `chatgpt`, `google`, `producthunt`,
   `reddit`, `youtube`, `badge`, `widget`, `watermark`, `video_desc`,
   `kineo_user`. Todo o resto é superfície interna, por padrão. Assim uma landing
   page nova nasce classificada certo em vez de errado.
2. **Apertar `NON_ACQUISITION_HOSTS`** com os clientes de e-mail e redirecionadores
   antes de qualquer inversão: `mail.google.com`, `com.google.android.gm`,
   `outlook.live.com`, `outlook.office.com`, `mail.yahoo.com`, `l.facebook.com`,
   `t.co`, `out.reddit.com`.
3. **Coluna `signup_surface`** (migração — não existe hoje; conferido no console
   do Supabase em 11/08, e nenhuma migração do repo a cria). Sem ela, qualquer
   correção de precedência TROCA um dado por outro: a origem passa a ser gravada
   e o nome da superfície se perde. Com ela, os dois convivem e nada é destruído.

Complementos que a revisão cobrou e que valem junto: aplicar a regra em UM lugar
só (hoje há 3 leituras divergentes no mesmo endpoint); carimbar o relatório com
"atribuição recalculada em <data> — números anteriores não são comparáveis"; e
uma tabela de teste (o repositório **não tem um único `*.test.ts`**, e isto é o
número que decide gasto de anúncio).

---

## 4. Por que isto não virou commit meu

Três guardrails do fundador convergem no mesmo lugar: não mudar o que decide
gasto sem medir, não deployar meia-correção no que já está registrado como
bloqueio de investimento pago, e não destruir uma métrica criada na sprint
anterior. A correção parcial atribuiria os nossos próprios e-mails ao Google
orgânico — **um erro pior do que o que ela conserta**, e mais difícil de
detectar depois, porque `google` é um balde plausível.

Fica como a decisão nº 1 de aquisição para o fundador. O gate de tráfego pago
(TAAFT $347) continua fechado, e agora com a razão precisa: não é falta de
volume, é que **nenhum dólar gasto seria avaliável depois**.
