# TAAFT — pacote de atualização da ficha Kineo

**Preparado em:** 04/09/2026 12:30 BRT · **Destino:** ficha já existente em `https://theresanaiforthat.com/ai/kineo/`

Este material é para o fundador colar no painel do TAAFT. Nada foi submetido, pago ou enviado por esta tarefa.

## 1. Correção factual antes de colar

- **CONTRADIÇÃO:** o programa de 03/09 pediu “50 créditos grátis” e “6 engines” (`docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:280-284`), mas o código atual concede **25 créditos** e apresenta **oito motores de vídeo** ao público (`lib/freeTierOffer.ts:144-150`; `lib/reverseTrial.ts:100-140`; `lib/engineLaunch.ts:20-24`). O texto abaixo segue o código, que prevalece.
- **FATO CONFIRMADO:** os planos mensais vigentes começam em **$9,90 USD** (restauração de 09/09/2026 à noite); a fonte única declara $9.90 / $19.90 / $39.90 (`lib/checkoutPricing.ts:49-98`).
- **FATO CONFIRMADO:** o trial permite começar sem cartão, produz arquivo com marca d’água e o plano pago libera o MP4 limpo (`lib/freeTierOffer.ts:197-240`).
- **QUESTÃO PENDENTE / DESCONHECIDO:** a ficha TAAFT bloqueou a leitura automatizada com HTTP 403 em 04/09/2026; portanto a redação que está no painel hoje não foi reconfirmada. A divergência antiga — `from $9.90/mo`, preços $11.90/$24.90/$37.90 e nenhum trial — foi observada em 08/08/2026 (`docs/TAAFT-RELANCAMENTO-2026-08-08.md`, §4).

## 2. Texto pronto para colar

### Name

`Kineo`

### Tagline

`Turn any topic or script into a ready-to-post vertical video.`

### Short description

`Kineo turns a topic or finished script into a vertical video with voice, captions, music and a downloadable MP4. Choose from eight video engines. Free to start: 30 credits on signup, no card. Plans from $9.90/month.`

### Long description

`Type a topic or paste a finished script. Kineo structures the story, creates the voiceover, builds the visuals, burns in karaoke-style captions, adds a soundtrack and returns a vertical MP4 ready for YouTube Shorts, TikTok or Reels. Choose among eight video engines in one workspace, including Kineo 1, Seedance 1.5, Kling 2.5, Kling 3, Veo 3.1, MiniMax H3, Omni Flash and Avatar. New accounts start free with 30 credits and every engine unlocked, no card. Plans from $9.90/month in USD: Starter and Creator include Kineo 1 and Seedance 1.5, and Studio unlocks every engine. If a render fails, its credits are returned automatically.`

### Pricing field

`Free to start (30 credits, no card) · plans from $9.90/month USD`

### Primary URL

`https://www.usekineo.com/?utm_source=taaft&utm_medium=referral`

### Suggested categories/tags

`AI video generator` · `text to video` · `YouTube Shorts` · `TikTok video` · `vertical video` · `AI captions`

### Feature bullets

1. `Topic or finished script → voice, visuals, captions, music and vertical MP4.`
2. `Eight video engines in one workspace, from Kineo 1 to cinematic AI and Avatar.`
3. `Free to start: 30 credits on signup, every engine unlocked, no card.`
4. `Starter $9.90 · Creator $19.90 · Studio $39.90 — every engine on every plan.`
5. `Credits are returned automatically when a render fails.`

## 3. As três capturas do listing

Use desktop em **1440 × 900**, zoom **100%**, sem barra de favoritos, notificações ou dados pessoais. Salve em PNG. Não use mockup: cada imagem deve ser uma tela real de produção.

### Captura 1 — os motores são reais

- **URL exata:** `https://www.usekineo.com/?utm_source=taaft&utm_medium=referral`
- **Arquivo sugerido:** `kineo-taaft-01-real-engines.png`
- **Precisa estar visível:** headline da home e os quatro cards de vídeo do topo reproduzindo, com os nomes dos motores legíveis.
- **Antes de capturar:** aguarde os quatro previews começarem; não deixe card preto ou poster ainda carregando.

### Captura 2 — escolha e custo antes de gerar

- **URL exata:** `https://www.usekineo.com/studio?engine=seedance&utm_source=taaft&utm_medium=referral`
- **Arquivo sugerido:** `kineo-taaft-02-engine-cost.png`
- **Precisa estar visível:** seletor com `Seedance 1.5`, duração de 35s e botão `Generate · 20 cr →`. O saldo pode aparecer, mas nenhum e-mail, roteiro privado ou nome de conta pode entrar no enquadramento.
- **Antes de capturar:** use uma conta já existente e um texto neutro curto. **Não clique em Generate**; a captura não deve gastar crédito.

### Captura 3 — o resultado é baixável

- **URL exata:** `https://www.usekineo.com/history`
- **Arquivo sugerido:** `kineo-taaft-03-download-result.png`
- **Precisa estar visível:** modal de um filme concluído do próprio fundador, player vertical e botão de download (`Download clean MP4` ou o rótulo verdadeiro do asset). Corte qualquer nome, e-mail ou roteiro sensível.
- **Antes de capturar:** abra um filme concluído já existente; não gere um novo e não torne o vídeo público.

## 4. Ordem de colagem no painel

1. Abra a ficha e escolha `AI Options → Claim AI` caso os controles do dono ainda estejam bloqueados.
2. Substitua tagline, descrições e pricing pelo bloco acima; remova qualquer ocorrência de `Five engines`, `40 credits`, `50 credits`, a oferta de um dolar (trial pago), `80 credits`, `$14`, `$29`, `$59`, `$11.90`, `$24.90` ou `$37.90`.
3. Confirme que a URL final aponta para `www.usekineo.com` e preserva `utm_source=taaft`.
4. Faça upload das três imagens na ordem 1 → 2 → 3.
5. Visualize a ficha antes de salvar. Se o TAAFT cortar texto, use a short description sem resumir números por conta própria.

## 5. Como medir

- **Curto prazo:** pessoas externas com origem TAAFT que chegam à home, geram o roteiro gratuito, cadastram e concluem o primeiro filme.
- **Médio prazo:** pessoas TAAFT com filme que avançam a `checkout_started` e `checkout_success_viewed`.
- **Placar final:** assinatura real e receita; impressão, visita, cadastro, filme e checkout não são venda.
- **Gate de parada:** se a ficha atualizada trouxer visitantes mas não produzir primeiro filme, não comprar destaque; corrigir o gargalo de entrega. Se produzir filme e continuar em 0 pagamento com amostra madura, a restrição é conversão/oferta, não texto da ficha.

## ✅ O QUE VOCÊ PRECISA FAZER

Colar o bloco da seção 2 e capturar/subir as três telas da seção 3. Esta tarefa não acessou o painel nem enviou a atualização.

