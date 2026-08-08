# PRE-LANCAMENTO TAAFT — 08/08/2026

Marcador: `KINEO-PRELAUNCH-PATH-2026-08-08`
Producao no momento da auditoria: `8dd5f915` (deploy READY 08/08 ~09:19Z).
HEAD local: `508d918` + este commit — **nenhum dos dois esta no ar**.

Auditoria de ponta a ponta do caminho de quem chega pelo TAAFT, com evidencia de
producao (curl com User-Agent de iPhone contra `www.usekineo.com`) e evidencia do
banco (Supabase `cqqukkvjjrguayiyjvhh`).

---

## 1. O FUNIL DO TAAFT, MEDIDO — NAO O GERAL

### 1.1 Topo (visitante, antes do cadastro)
Sessoes com `metadata->>'utm_source'='taaft'` a partir de 31/07:

| degrau | n | % da entrada |
|---|---|---|
| sessoes TAAFT | 640 | 100% |
| viram o campo de topico da home | 636 | 99,4% |
| **digitaram alguma coisa** | **218** | **34,1%** |
| chegaram em /generate | 209 | 32,7% |
| cadastros com `signup_utm_source='taaft'` | 210 | 32,8% |

O maior vazamento em NUMERO ABSOLUTO da empresa esta aqui: 422 pessoas viram o
campo e nao digitaram nada. Isso e copy/oferta, nao defeito — e nao se conserta
com seguranca em horas.

### 1.2 Da conta criada para frente (31/07 → 08/08)

| degrau | TAAFT (n=210) | OUTROS (n=41) |
|---|---|---|
| chegou em /generate | 210 (100%) | 41 (100%) |
| `analyze_idea_clicked` | 193 (91,9%) | 37 (90,2%) |
| `generate_started` | 189 (90,0%) | 32 (78,0%) |
| **`generate_completed`** | **115 (54,8%)** | **27 (65,9%)** |
| `generate_failed` | 50 | 6 |
| download concluido | 38 | 16 |
| viu a oferta pos-video | 95 | 19 |
| clicou em comprar | 17 (8,1%) | 4 (9,8%) |
| **pagou** | **2** | — |

**Taxa de sucesso da geracao: TAAFT 115/189 = 60,8% contra OUTROS 27/32 = 84,4%.**
A coorte do TAAFT nao converte pior porque quer menos — ela converte pior porque
o produto falhou mais na cara dela. E o motivo e o item 3 (pico).

### 1.3 Janela limpa (03/08 → 08/08), ja com o instrumento novo
`video_ready_viewed` so existe desde 03/08, entao o funil pos-video acima esta
subcontado. Na janela limpa:

| degrau | TAAFT (n=55) | OUTROS (n=28) |
|---|---|---|
| `generate_started` | 48 (87%) | 22 (79%) |
| `generate_completed` | 39 (81% dos started) | 19 (86%) |
| `video_ready_viewed` | 33 | 16 |
| `video_downloaded` | 17 | 10 |
| `video_download_failed` | 4 | 1 |
| viu a oferta | 31 | 11 |
| clicou em comprar | 6 (19% de quem viu a oferta) | 2 |

**Onde eles vazam HOJE, com o pipeline saudavel: `video_ready_viewed` 33 →
`video_downloaded` 17.** Metade de quem ve o video pronto nao sai com o arquivo.
Os 4 `video_download_failed` sao exatamente a coorte que o resgate de download
de hoje (`8dd5f915`) foi escrito para salvar — e ele so entrou em producao as
09:19Z, ou seja **ainda nao tem um unico caso medido a favor ou contra**.

### 1.4 Mobile
`device` so e gravado nos eventos de download. Entre as contas TAAFT com evento
de device desde 05/08: **9 mobile x 4 desktop = 69% mobile**. Confirma a ordem
"mobile primeiro" — e por isso todo o item 4 e sobre celular.

---

## 2. O QUE QUEBROU NO PICO (31/07) E O QUE QUEBRA DE NOVO HOJE

31/07 foi o maior dia da historia da empresa: 66 cadastros TAAFT, 163
`generate_started`. **116 falharam. Taxa de sucesso do dia: 26/163 = 16%.**

| dia | started | completed | failed | causa dominante |
|---|---|---|---|---|
| 31/07 | 163 | 26 | 116 | 71 `ENGINE_CAPACITY` (OpenAI sem credito, 11:07Z) + 45 "Failed to plan scenes" |
| 01/08 | 128 | 57 | 44 | 35 "Render service rejected the job" (502 do provedor de render) + 8 capacidade |
| 02/08 | 42 | 27 | 4 | residual |
| 03–08/08 | 181 | 111 | 5 | saudavel |

Traducao: **no dia em que o dinheiro do TAAFT chegou, 84% das tentativas
morreram, e nenhuma das duas causas foi codigo — as duas foram SALDO DE
PROVEDOR** (OpenAI em 31/07, render em 01/08). `lib/openaiAlert.ts` foi escrito
POR CAUSA desse incidente e hoje avisa o fundador por e-mail em 30 min; o
equivalente para o fal existe em `lib/falAlert.ts`. **O alarme avisa; ele nao
recarrega.** Se o volume de 31/07 voltar hoje a tarde com o saldo baixo, o
resultado e identico.

Nao ha limite de concorrencia proprio no caminho de geracao — o teto e o do
provedor. Ou seja: nao existe nada para "ajustar" no repo antes do trafego; o
que existe e uma conta para conferir. Esta na checklist.

---

## 3. PONTOS DE ENTRADA ALTERNATIVOS — CONFERIDOS EM PRODUCAO

Todos com UA de iPhone, contra `www.usekineo.com`:

| URL | HTTP | copy nova do trial | CTA |
|---|---|---|---|
| `/?utm_source=taaft` | 200 | sim | `/signup?...` |
| `usekineo.com` (sem www) | 308 → www | — | ok |
| `/start` | 308 → `/signup?utm_source=start` | — | ok |
| `/generate` (deslogado) | 307 → `/signup?redirect=%2Fgenerate` | — | ok |
| `/signup?utm_source=taaft` | 200 | **sim, visivel no mobile** | — |
| `/pricing` | 200 | — | ok |
| `/free-ai-shorts` | 200 | 23 ocorrencias "Creator trial", 0 da copy velha | `/signup?...` |
| `/free-ai-shorts/motivation` | 200 | 21 / 0 | `/signup?...&create_intent=fast&prompt=...` |
| `/alternatives` | 200 | 17 / 0 | `/signup?...` |
| `/alternatives/opusclip` | 200 | 23 / 0 | `/signup?...` |
| `/vs` | 200 | 15 / 0 | `/signup?create_intent=fast...` |
| `/free` | 307 → home com utm de watermark | — | ok |

**Nenhuma pagina de entrada alternativa esta com copy velha e nenhuma tem CTA
quebrado.** Se o anuncio apontar para qualquer uma delas, o caminho esta inteiro.

Unico 404 encontrado: `/auth/signup` — mas essa rota nunca existiu e nada no
site aponta para ela. Nao e regressao.

---

## 4. O QUE FOI CORRIGIDO NESTE COMMIT

Criterio: so entra o que e (a) do caminho do TAAFT, (b) mobile, (c) reversivel
por copy ou por um numero de layout, (d) com a copy nova gateada pela MESMA flag
`KINEO_REVERSE_TRIAL_ENABLED` que ja governa o resto — **flag OFF devolve o texto
de hoje byte a byte**.

### 4.1 A home prometia MENOS do que o produto entrega, e o servidor recusava a promessa
`app/KineoLanding.tsx:666` — a celula "Free videos, no credit card → **3 / day**"
da tabela comparativa era o **unico literal de free tier da pagina que nunca
passou por `ft()`**. Verificado no HTML servido agora. Com a flag ON o free tier
real e **1 Fast/mes** (`lib/freeTierOffer.ts` `ON_OFFER.limit = 1`,
`windowMs = 30d`) e a conta nova recebe **trial Creator de 40 creditos**. Ou
seja: a celula anunciava uma oferta que nao existe, e menor que a real, na
primeira tela que 640 sessoes do TAAFT viram. Agora: `ft(OFFER, '3 / day',
'40-credit trial')`.

### 4.2 O mesmo bloco de FAQ se contradizia tres vezes seguidas
`app/KineoLanding.tsx:808-809`. Duas respostas eram literais fixos:

- *"Yes. Never-paid free users can download, share and post the watermarked MP4."*
- *"Free downloads carry a watermark; paid plans unlock the clean MP4."*

...e a terceira, logo abaixo, **ja era `ft()`** e dizia *"New accounts get a
Creator trial with clean exports"*. Com a flag ON o visitante lia, em tres
paragrafos consecutivos, que o download gratis TEM e NAO TEM marca d'agua.
Ambas passaram a `ft()`.

### 4.3 O JSON-LD do FAQ (achado da revisao adversarial — defeito que EU criei)
`components/StructuredData.tsx:99` traz o aviso *"Mirrors app/KineoLanding.tsx
#faq verbatim. If the visible FAQ changes, change this too — JSON-LD that does
not match the page is a spam signal."* A correcao 4.2, sozinha, teria deixado o
Google indexando a frase antiga enquanto a pagina mostra a nova. As mesmas duas
trocas foram aplicadas ao schema, com os mesmos dois argumentos.

### 4.4 O primeiro botao que uma conta nova toca mentia para a coorte do trial
`components/NicheOnboarding.tsx:185` — **"Create this free watermarked video →"**.
Com a flag ON a conta esta em trial Creator e o MP4 sai LIMPO — o proprio
`GenerateClient` afirma isso duas vezes na tela seguinte (`:6744` *"your exports
come out clean"*). 448 impressoes de `viral_onboarding_viewed` nos ultimos 20
dias. A versao ON **nao troca uma promessa por outra**: ela para de afirmar a
marca d'agua ("Create this video free →") porque a mesma tela tambem e vista por
quem ja saiu do trial, e ai o Fast gratis realmente carimba.

### 4.5 O rodape do dashboard comia 32px de toda tela no celular
`app/(dashboard)/DashboardShell.tsx:115` — `pb-16` (64px) era **menor que a barra
que ele existe para compensar**. `MobileNav` e `fixed bottom:0` com uma fileira
de 62px MAIS `paddingBottom: max(env(safe-area-inset-bottom), 6px)` = 68px sem
notch e ~96px num iPhone com home indicator. Os ultimos ~32px de toda tela do
dashboard ficavam permanentemente embaixo da nav — incluindo a borda de baixo do
botao de download e a ultima linha do card de oferta. Agora `pb-28` (112px):
**classe padrao do Tailwind, nao valor arbitrario**, entao nao depende do JIT
gerar nada novo (um `bottom-[calc(...)]` que nao fosse gerado zeraria o padding e
seria PIOR que hoje). `md:pb-0` intacto — no desktop a `MobileNav` e `md:hidden`.

### 4.6 O banner de instalar app tapava 2/3 da navegacao (inclusive "Pricing")
`components/InstallAppBanner.tsx` estava em `bottom:12` com `zIndex:70`, e a
`MobileNav` esta em `zIndex:50` **no mesmo contexto de empilhamento** (os dois
moram dentro do wrapper `relative z-10` do `DashboardShell`). O banner ocupava
de 12 a ~76px; a fileira tocavel da nav comeca ~34px acima do chao num iPhone.
Resultado: Generator / Viral Now / My Videos / Invite / Affiliate / **Pricing**
inclicaveis enquanto o banner estivesse no ar. Novo piso:
`calc(74px + env(safe-area-inset-bottom))` = 62 da nav + 12 de respiro + safe
area. `components/EnablePushBanner.tsx` subiu junto para
`calc(150px + env(safe-area-inset-bottom))`, senao os dois se sobreporiam.
**Preco aceito e documentado:** no desktop (onde a `MobileNav` e `md:hidden`) os
dois banners passam a flutuar ~74px/~150px acima do rodape em vez de 12/76 —
efeito puramente cosmetico em cards dispensaveis, e o preco de nao usar valor
arbitrario de Tailwind.

### 4.7 Dois modais de venda com o CTA inalcancavel no celular
`GenerateClient.tsx` — `UrgencyModal` (`zIndex:1100`) e o exit-intent do
/generate (`zIndex:9000`) usavam `alignItems:'center'` **sem `overflow`**. Um
flex item mais alto que o container centralizado tem o topo E o rodape cortados,
e sem overflow nao ha scroll: no Safari do iPhone (com a barra de URL a area util
fica ~660px de 844) o botao de comprar desses modais ficava inalcancavel.
`NicheOnboarding` e `TrialDowngradeModal` **ja usam `flex-start` +
`overflowY:auto` exatamente por isso** — este e o mesmo padrao da casa, nao um
padrao novo.

---

## 5. O QUE DECIDI **NAO** MEXER HOJE

1. **`GenerateClient.tsx:5374` — o `e.preventDefault()` do download.** E a causa
   raiz de todo o aparato de resgate: ele desliga a navegacao nativa do browser
   (gesto real, nunca bloqueado) e forca o caminho `fetch → blob`, cuja falha
   medida no mobile e 10/41. **Mas trocar isso conserta 10 casos e arrisca os 31
   que funcionam**, e o resgate que cobre exatamente esses 10 subiu em producao
   HOJE as 09:19Z sem um unico caso medido ainda. Mexer nas duas pontas no mesmo
   dia destroi a leitura. **Reavaliar com os numeros de amanha.**
2. **`CheckoutResumeBanner` / `CheckoutStalledCta`** (`bottom:16` sem safe-area,
   z 10050/10060, cobrindo a nav inteira). Sao superficies de CHECKOUT. A regra
   e nao tocar em preco/credito/checkout sem necessidade comprovada, e o defeito
   e cosmetico (a barra cobre a nav, nao o botao de pagar).
3. **A pagina de cadastro (`hidden md:flex`).** A auditoria interna apontou que
   toda a proposta de valor e desktop-only. **Falso em producao:** o HTML servido
   com UA de iPhone traz, logo abaixo do H1, *"Start free — your first video is
   on us. New accounts get a full Creator trial: 40 credits, every engine except
   Studio."* O que e desktop-only sao os 3 bullets e a garantia — melhoria, nao
   defeito. **Nao se mexe na pagina de conversao horas antes do trafego.**
4. **O topo do funil (66% que nao digitam).** E o maior vazamento absoluto e e
   uma decisao de oferta do fundador, nao um defeito.
5. **Qualquer coisa de preco, credito, checkout ou flag.** Zero migracoes, zero
   SKU, zero `lib/flags.ts` neste commit.
6. **`components/StickyUpgradeBar.tsx`, `UpgradeModal.tsx`, `SocialProofToast.tsx`
   sao codigo MORTO** (zero imports). Nao removi — remocao antes de lancamento e
   risco sem retorno. Fica registrado para nao serem revividos como estao (o
   `StickyUpgradeBar` vende um plano "Pro" que nao existe).

---

## 6. CHECKLIST — O QUE O FUNDADOR TEM QUE VER FUNCIONANDO ANTES DE PAGAR OS $347

Ordem deliberada: os tres primeiros sao os que fizeram o dinheiro de 31/07
evaporar. Nenhum deles e codigo.

- [ ] **1. SALDO DA OPENAI.** https://platform.openai.com/settings/organization/billing/
      — em 31/07 a conta zerou as 11:07Z e 71 geracoes morreram com
      "Kineo is at full capacity". **Isto sozinho custou o dia inteiro de trafego.**
- [ ] **2. SALDO DO PROVEDOR DE RENDER (fal.ai).** Em 01/08 foram 35
      "Render service rejected the job" (502). Mesma classe de incidente, outro
      provedor.
- [ ] **3. O e-mail de alarme chega.** `RESEND_API_KEY` valido em producao — o
      alarme de 31/07 (`lib/openaiAlert.ts`) so serve se o e-mail sair. Se os
      itens 1 e 2 estiverem cheios, este e o unico aviso de que quebrou.
- [ ] **4. ESTE COMMIT ESTA NO AR.** Producao esta em `8dd5f915`. Este commit e
      o de cima dele mais o `508d918` **nao subiram**. Deploy do HEAD — nunca
      "Redeploy" de um commit antigo.
- [ ] **5. No CELULAR, `www.usekineo.com/?utm_source=taaft`:** a linha da tabela
      "Free videos, no credit card" diz **"40-credit trial"** (e nao "3 / day"),
      e o FAQ nao se contradiz sobre marca d'agua.
- [ ] **6. No CELULAR, criar uma conta nova de verdade** e conferir: o botao do
      onboarding **nao** diz "watermarked", e a conta nasce com
      `trial_status='active'` e 40 creditos. (Nos ultimos 2 dias: 12 cadastros,
      12 com trial. O motor esta ligado — confirme que continua.)
- [ ] **7. Gerar 1 video ate o fim no celular** e conferir que o botao verde de
      download **aparece inteiro** (nao cortado pela barra de baixo) e que o
      arquivo chega. Se nao chegar, o painel de resgate tem que aparecer com um
      link tocavel — ele subiu hoje as 09:19Z e ainda nao tem nenhum caso medido.
- [ ] **8. Ver a oferta pos-video e clicar em comprar** — o checkout tem que
      abrir. Na janela limpa, so 6 de 31 que viram a oferta clicaram; se o clique
      tambem falhar, nao sobra nada do funil.
- [ ] **9. Confirmar para onde o anuncio do TAAFT aponta.** Se nao for a home,
      confirmar que e uma das paginas da tabela do item 3 (todas conferidas,
      todas 200, todas com a copy nova).
- [ ] **10. Deixar o painel de eventos aberto na primeira hora.** O sinal de que
      o pico esta quebrando de novo e `generate_failed` subindo — em 31/07 ele
      passou de 0 para 116 no mesmo dia. Se aparecer, o problema quase certamente
      esta nos itens 1 ou 2, nao no codigo.

---

## 7. RIGOR

- `npx tsc --noEmit` → **EXITCODE=0**, e o tsc foi **FALSIFICADO**: um
  `const x: number = "not a number"` injetado em `StructuredData.tsx` produziu
  1 erro TS e exit 2; arquivo restaurado e reconferido.
- **EOL conferido no HEAD, por arquivo** (`git show HEAD:<path> | file -`): os 7
  arquivos tocados sao LF no repo. Nenhuma normalizacao de linha no diff.
- **Equivalencia com a flag OFF provada literal a literal**: para cada `ft()`
  novo, o argumento `legacy` (ou o `legacy=` do `<FreeTierCopy>`) foi comparado
  contra o texto de `git show HEAD:<path>` — 6/6 OK. As duas respostas de FAQ que
  foram partidas em `{ft(...)} + cauda` reconstroem a frase original com o espaco
  unico preservado (JSX preserva espaco inline na mesma linha).
- **Revisao adversarial 2x.** A primeira passada derrubou 1 defeito MEU e ele era
  criado pela propria correcao: o JSON-LD do FAQ (item 4.3) teria ficado
  contradizendo a pagina — exatamente o "spam signal" que o comentario do arquivo
  adverte. A segunda passada verificou que (a) nao existe outro espelho de
  "3 / day" no repo, (b) os dois banners so sao montados no layout do dashboard,
  (c) `tailwind.config.js` nao sobrescreve o spacing, entao `pb-28` = 7rem
  garantido, (d) a proposta de valor do /signup no mobile e um FALSO POSITIVO da
  auditoria (item 5.3).
- **Nada de dinheiro:** zero migracoes, zero mudanca de preco, credito, SKU,
  checkout ou flag.
