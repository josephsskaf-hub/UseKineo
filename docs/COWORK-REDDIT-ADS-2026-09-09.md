# Cowork — Reddit Ads $50 (5 dias) para a porta de $1 · 09/09/2026

Decisão do fundador (08/09): investir $50 para comprar SINAL, não assinantes — 50 a 100 pessoas certas passando pela porta de $1 em 48h. Diretório foi descartado (gotejo). Product Hunt de quinta é grátis e segue em paralelo.

## O que a casa já preparou
- Criativos (19 s, sem áudio, filme inteiro no centro com laterais desfocadas): 4:5 `C:kineodocsdskineo-reddit-sep09-4x5.mp4` (recomendado, feed mobile) e 16:9 `kineo-reddit-sep09-16x9-v2.mp4`. Links públicos: https://www.usekineo.com/ads/kineo-reddit-sep09-4x5.mp4 e https://www.usekineo.com/ads/kineo-reddit-sep09-16x9-v2.mp4 (quadros em `kineo-reddit-sep09-quadros.png`).
- Página de pouso: `https://www.usekineo.com/ph?utm_source=reddit&utm_medium=cpc&utm_campaign=reddit_sep09`
  - o utm de primeiro toque vai para `profiles.utm_source` no cadastro;
  - o CTA da /ph passa a carregar `intent_campaign=reddit_sep09` quando a URL traz `utm_campaign` (PhLandingBeacon) → `checkout_started`/`payment_success` separam Reddit de Product Hunt.
- Critério (48h após o ar): ≥5% dos cadastros vindos de `reddit` clicam na porta → escala para $20/dia; 0 de 50 → pausa e o problema é a oferta, não o canal.

## Limites (regras da casa)
- Cowork NÃO cria conta, NÃO digita senha nem cartão, NÃO clica em "Launch/Publish/Pay". Para na revisão final e devolve o resumo; o fundador aperta o botão.
- Conta do Reddit Ads já logada no Chrome do fundador (ele faz o login antes de despachar).

## Instruções para o Cowork (colar como tarefa; ≤ 8000 caracteres)

```
TAREFA: montar (sem lançar) uma campanha no Reddit Ads a partir do Chrome já logado.

1. Abra https://ads.reddit.com e confirme que há uma conta de anunciante logada. Se pedir login, senha, verificação ou cartão: PARE e devolva "precisa de login/cartão do fundador". Nunca digite credenciais nem dados de pagamento.

2. Criar campanha:
   - Objetivo: Traffic (tráfego).
   - Nome: KINEO-REDDIT-SEP09-PORTA1.
   - Sem "Reddit Pixel"/conversões nesta rodada (marque só se for obrigatório para seguir).

3. Grupo de anúncios (ad group):
   - Nome: NewTubers-faceless.
   - Localização: United States, Canada, United Kingdom, Australia, India.
   - Idade: 18–44. Dispositivos: todos. Idioma: English.
   - Comunidades (targeting por community/subreddit): NewTubers, youtubers, ContentCreators, SideProject, artificial, ChatGPT, VideoEditing, Filmmakers. Se alguma não existir no seletor, pule-a.
   - Interesses (se houver): Technology, Content creation, Filmmaking, Artificial intelligence.
   - Orçamento: DAILY $10. Período: começa hoje, termina em 5 dias (data de fim explícita).
   - Lance: automático (Auto bid). Se exigir lance manual, use $0.60 CPC.
   - Otimização de entrega: cliques.

4. Anúncio (ad):
   - Formato: Video ad (upload). Arquivo: C:\kineo\docs\ads\kineo-reddit-sep09-16x9.mp4 (19 s, 1280x720, sem áudio). Se o uploader exigir miniatura, use C:\kineo\docs\ads\kineo-reddit-sep09-frames.png.
   - Headline (título do post): Type an idea. Get a narrated, edited cinematic Short in ~3 minutes.
   - Texto/descrição (se houver campo): Kineo directs, narrates and edits the film for you — 8 engines, no camera, no editing. Try 7 days of Creator for $1.
   - Botão (CTA): Learn More (ou Try Now, se existir).
   - Destination URL: https://www.usekineo.com/ph?utm_source=reddit&utm_medium=cpc&utm_campaign=reddit_sep09
   - Display URL: usekineo.com
   - Comentários: desligados (Disable comments), se a opção existir.
   - Nome do anúncio: robo-19s-v1.

5. Revisão: NÃO clique em Launch/Publish/Submit/Pay. Tire um print da tela de revisão (Review) mostrando orçamento, período, público e URL, e devolva:
   - nome da campanha/ad group/ad,
   - orçamento e datas exatamente como ficaram,
   - o que o Reddit pediu que você não pôde fazer (cartão, verificação, pixel),
   - o botão exato que o fundador precisa apertar para lançar.

Proibido: criar conta, alterar método de pagamento, aceitar termos novos, mexer em outras campanhas, subir mais de um anúncio.
```

**Descrição da ação (≤300 caracteres):** Montar, sem lançar, a campanha KINEO-REDDIT-SEP09-PORTA1 no Reddit Ads (Chrome logado): Traffic, $10/dia por 5 dias, comunidades de criadores de canal sem rosto, vídeo de C:\kineo\docs\ads, destino usekineo.com/ph com utm reddit_sep09. Parar na revisão e devolver print.

## Depois do "reddit no ar" (fundador avisa)
- Claude abre a linha `reddit` no placar: cadastros com `utm_source='reddit'` → `card_entry_banner_clicked` → `checkout_started` (`intent_campaign='reddit_sep09'`) → `payment_success` (`card_trial`).
- Leitura em 24h e 48h nas rotinas das 22:10/09:10.
