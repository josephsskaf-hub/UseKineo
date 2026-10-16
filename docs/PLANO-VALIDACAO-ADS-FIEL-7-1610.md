# Plano de validação paga: Ads Fiel 7 (KINEO-ADS-FIEL-7-1610, 16/10/2026)

**Nada disto foi rodado.** O render pago depende do "vai" do fundador. O último saldo da fal lido foi **US$ 9,75** (16/10 11:58 UTC, depois
do reteste da Fiel 6): recarregar ao menos US$ 10 antes, ler o saldo antes e depois, e lembrar que os clientes vêm primeiro.
A trava continua em `ADS_V2_PRODUCT_LOCK_MODE = 'internal'` (lib/ads/v2ShotLists.ts). Só as contas da casa passam pelo canto reservado.
Este conserto **não** religa a trava para os clientes.

## O que o reteste da Fiel 6 mostrou e o que mudou

Resultado completo: `docs/RESULTADO-VALIDACAO-ADS-FIEL-6-2026-10-16.md` (pedido **96fbb38f**-9b4a-450e-9567-7ff7cf096389; quadros e brutos
em `C:\kineo-wt\prints-1610\fiel6-*` e `fiel6-raw\`). As cenas 2 e 4 ficaram com o produto no canto, mas a 4 boiou e a 3 virou a foto da caixa.

| # | Defeito visto | Conserto | Onde |
|---|---|---|---|
| A | Cena 4: a conferência respondeu borda 0,675, passou em todos os filtros e a base foi ao "tampo" em 0,6814; o tampo real ia de ~0,715 a ~0,78. **Produto boiando** | A base do produto é **SEMPRE a fixa** (`ADS_V2_LOCK_RESERVE_BASE`, 85% no 9:16), qualquer que seja a borda lida. A borda fica só como registro: `check.top_edge_raw` (crua), `placement.top_edge_y` (no quadro) e `placement.top_edge_why` (`'tampo_desligado'` quando a borda seria aceita; `'copied'`/`'repeated'`/`'round'`/… quando nem a fiel-6 aceitaria; `'conferencia_suspeita'`). Medir a borda por pixel fica para depois | `lib/ads/v2ProductLockServer.ts` (`adsV2FinishReservedScene`), `adsV2LockTopEdgeWhy7` |
| B | Cena 3: descartada 2 vezes por `face_in_rect` com o canto esquerdo **vazio**. As caixas de rosto eram chute: na 2ª tentativa, duas caixas **idênticas** 0,388–0,612; o x0 0,388 em 3 de 4 respostas | Caixa de rosto ou de corpo **não confiável** (chute) quando: (i) **duplicada** na mesma resposta (mesmas 4 coordenadas, tolerância 0,005); (ii) **simétrica** em torno de 0,5 no eixo x (\|0,5 − x0\| ≈ \|x1 − 0,5\|, tolerância 0,01); (iii) x0 ou x1 **igual** (0,005) ao de uma caixa de **outra cena** do pedido (os registros `-check-t<n>.json` que a fiel-6 já lê + o `seen` dos lock.json). Chute não corrobora "gente no canto", não vai às frases de tela e **não descarta cena**. O evento ganha `check.guess` (quantas caixas eram chute) | `adsV2LockBoxGuessWhy`, `adsV2LockReliableBoxes7`, `adsV2LockGuessCount`, `ADS_V2_LOCK_GUESS_SAME`, `ADS_V2_LOCK_GUESS_SYM`; `lib/ads/v2Advance.ts` (`check.guess`) |
| C | — | Tudo o que a fiel-6 fazia continua: eco 0,637 e número da pergunta = `'copied'`, borda repetida = `'repeated'`, `corner_person` sem caixa não descarta (`'corner_person_sem_caixa'`), limite global (`'conferencia_suspeita'`) | (inalterado) |

Com as 4 respostas reais do 96fbb38f, o guardião (`node scripts/test-ads-fiel-7-1610.mjs`) prova: com o código de antes, a cena 4 vai ao
"tampo" 0,6814 (1308 px) e a cena 3 é descartada nas 2 tentativas (no avanço executado, vira a foto da caixa); com o de agora, a cena 4 fica na
base fixa (1632 px) e a cena 3 fica no canto esquerdo.

Limitação conhecida: a 1ª conferência da cena 3 no reteste veio **antes** de qualquer outra cena responder. Sem outra cena para comparar, o
x0 0,388 ainda não é "repetido", então essa resposta sozinha ainda descartaria a cena e a refaria 1 vez (~US$ 0,15); a 2ª fica. Quando
outra cena já respondeu (o caso do avanço executado), a cena 3 fica de primeira.

O que **não** mudou: cobrança, preço, acesso, recorte, lado alternado, a pergunta da conferência, a refação por canto ocupado (uma só por
plano), closes, frases e duração.

Guardião: `node scripts/test-ads-fiel-7-1610.mjs` (provas com os números reais + mutantes). Os guardiões antigos da trava leem os arquivos
sem este conserto pelo desfaz encadeado `scripts/test-support/desfaz-ads-fiel-7-1610.mjs`, chamado primeiro por `semFiel6_1610` e
`desfazFiel6_1610` (e, por estes, pela fiel-5, pelo rollback e pelo liga). O guardião da fiel-6 foi reancorado para ler o texto sem a fiel-7.

## Render de validação: Só o T1, na conta da casa

| # | Pedido | Créditos | fal (estimado) | O que olhar |
|---|---|---|---|---|
| 1 | **Refazer o T1**: a mesma foto Atheeri (`prints-1610\atheeri-produto.jpg`), "Perfume Atheeri", "num hotel com chuva", **Automático** (se a tela sugerir "Close do produto", trocar antes do plano final), **Comercial 15 s 9:16**, PT, Um produto | **41 cr** | ~US$ 2,40 + ~US$ 0,02 de conferência; ~US$ 0,15 a mais por cena refeita | 3 cenas de gente com o produto no canto (direita · esquerda · direita), produto apoiado sem boiar, nenhum rosto coberto |

### Dry-run antes (US$ 0)
O `/plan` e o dry-run do `/start` de sempre, com os mesmos parâmetros. Tem de dar **41 cr** e `charged:false`. Ler o saldo da fal antes e
depois. Só seguir para o pago com o dry-run certo na mão.

### Como conferir (SQL só de leitura, projeto `cqqukkvjjrguayiyjvhh`)
```sql
-- as cenas que ficaram: onde a base pousou, o que a conferência disse e quantas caixas eram chute
select metadata->>'idx' idx, metadata->'placement'->>'side' lado,
       metadata->'placement'->>'base_source' base_source, metadata->'placement'->>'base' base,
       metadata->'placement'->>'top_edge_y' top_edge_y, metadata->'placement'->>'top_edge_why' top_edge_why,
       metadata->'check'->>'top_edge_raw' borda_crua, metadata->'check'->>'corner' canto,
       metadata->'check'->>'guess' chute, metadata->'check'->>'why' conferencia
from events where name = 'ads_v2_product_locked' and metadata->>'order_id' = '<pedido>' order by created_at;
-- refações e quedas para a foto real
select metadata->>'idx' idx, metadata->>'to' para, metadata->>'reason' motivo, metadata->>'problem' problema,
       metadata->'check'->>'corner' canto, metadata->'check'->>'guess' chute
from events where name = 'ads_v2_shot_fallback' and metadata->>'order_id' = '<pedido>' order by created_at;
```
Baixar as imagens de cena e as travadas (`…-lock.png`) e os registros `…-check-t1.json`/`…-check-t2.json`; conferir à mão a base do
produto contra o móvel e o canto em cada uma.

### Critérios de aprovação
- **3 cenas de gente:** as 3 cenas travadas chegam como `ads_v2_product_locked` (`placement.source = 'reserved'`), lados direita · esquerda ·
  direita. Nenhuma `product_photo` com `lock_corner_busy` quando o canto está vazio na imagem.
- **Produto apoiado, sem boiar:** em todas, `base_source = 'fixed'` e `base = 0.85` (a caixa termina em 1632 px no quadro 1080×1920). Olhando o
  quadro: a base da caixa encosta no tampo/chão, ou fica na frente do móvel (defeito menor, aceitável); **reprovado se boiar** sobre vão,
  parede ou janela.
- **Nenhum rosto coberto:** conferir rosto por rosto no `-lock.png`. Como o chute não protege mais nada, este é o critério que mais importa.
- **Canto:** `check.corner` é `null` ou `'corner_person_sem_caixa'` nas cenas com canto vazio; `'face_in_rect'`/`'body_in_rect'` só onde a
  imagem tem de fato rosto ou mãos no canto. Anotar `check.guess` de cada cena (chute visto).
- **Registro:** `top_edge_why` = `'tampo_desligado'` (ou `'copied'`/`'repeated'`/`'round'`) e `top_edge_y` preenchido quando a conferência
  respondeu borda.
- **Sem regressão:** nada inventado nas mãos, o lado direito termina em x ≤ 0,84, teto de 28%, nada no terço de cima, frases na zona segura,
  MP4 ≤ 15,5 s, cartão ≤ 3 s, `ads_v2_failed` nenhum.
- **Reprovado** se: uma cena de gente vira a foto da caixa com o canto vazio, um rosto é coberto, ou o produto boia.

### Riscos conhecidos (olhar no T1)
- **Base fixa na frente do móvel:** se o Nano Banana desenhar o tampo alto (59–71%, como na Fiel 5), a caixa fica na frente do móvel, não em
  cima. É o defeito menor escolhido; o pedido da imagem continua mirando o tampo em ~78%.
- **Rosto real tratado como chute:** uma pessoa de fato centrada no quadro (caixa simétrica) ou com o x coincidindo com o de outra cena (até
  0,005) deixa de proteger o retângulo e as frases. O pedido da imagem põe as pessoas na metade oposta, então o risco é pequeno, mas é por isso
  que o critério "nenhum rosto coberto" é olhado à mão.
- A 1ª conferência da cena que responde antes de todas não tem com o que comparar o x: pode refazer 1 vez.

## Virada para `'all'`
Só com o T1 aprovado e o "vai" do fundador: `ADS_V2_PRODUCT_LOCK_MODE = 'all'` (uma linha, lib/ads/v2ShotLists.ts), com os guardiões da
trava ajustados junto (o rollback e os guardiões da fiel-6 e da fiel-7 conferem `'internal'`).
