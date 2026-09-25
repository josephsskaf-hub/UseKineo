# O que falta para pôr de pé — 25/09/2026 (madrugada)

Pergunta do fundador: "veja o que precisamos pra pôr de pé, o que falta?". Levantamento por 58 agentes (8 verificadores
por peça no código das 3 refs + banco, síntese, 2 céticos por afirmação, crítico de completude); 4 afirmações
derrubadas e corrigidas abaixo. Estado às ~01:00 BRT.

## Já está de pé (no ar)

- **A fila da Kineo Ads subiu às 00:24 BRT** (21 commits, 64 arquivos): as 5 peças de fluxo — 3 saídas do filme pronto,
  Imagem → "Turn into video" (leva a imagem ao Animate), briefing depois do Express/Pro
  (/business-video-ads/brief), /pricing com 3 blocos e seletor Mensal/Anual, /admin/ads — mais o alerta de pedido pago
  ao fundador, a telemetria do menu (ouvinte pronto) e a moderação de conteúdo em 16 pontos de entrada de imagem/upload.
- **Copy "credits never expire" retirada** de 9 pontos (b6ab321d) e **renovação preserva crédito comprado** (4fdd83ce):
  a cota do plano zera, o que passa de uma cota sobrevive.
- **Kineo 1 entregando depois dos consertos de 24/09:** 4 contas externas apertaram Gerar, 8 despachos, 6 filmes
  completos em 4,3–8,5 min; "narração curta" 0 em 30 h. Tráfego baixo (~5 sessões/h): ainda não prova muito.
- **Studio Ads** à venda (passe US$19,90 = 60 cr); pelo código o anúncio de quem compra sai sem marca d'água.

## Preso ou faltando — caminho crítico, na ordem

| # | Item | Dono | Esforço | O que destrava |
|---|---|---|---|---|
| 1 | Stripe → Webhooks: inscrever `checkout.session.async_payment_succeeded/failed` no endpoint we_1TTmlF… | fundador | 3 min | Pix/Boleto nunca entregar sem receber |
| 2 | Stripe → Payment Links Express e Pro: After payment = Redirect para `usekineo.com/business-video-ads/brief#session_id={CHECKOUT_SESSION_ID}`; conferir recibo ligado | fundador (ou Cowork) | 5–20 min | Sem isso ninguém chega ao briefing que já está no ar. Testar se a Stripe troca o placeholder depois do `#`; senão usar `?session_id=` |
| 3 | Alerta de pedido pago: `KINEO_ALERT_WEBHOOK_URL` (ntfy/Telegram) na Vercel + deploy novo | fundador | 10 min | O alerta hoje tenta UMA vez e o webhook responde 200 mesmo se falhar; filtro no Gmail não substitui (o e-mail pode nem sair) |
| 4 | Alerta com reenvio (fila `founderAlert` state failed/timeout) | Kineo Ads | 1–2 h | Pedido pago nunca some |
| 5 | Conta de produção limpa (hotmail ou nova) — a conta josephsskaf força "usekineo.com/free" | fundador | 5 min | Refazer os 3 anúncios de vitrine (feitos na conta errada, com marca) e produzir Express/Pro |
| 6 | Refazer os 3 anúncios de vitrine na conta limpa (≈9 cr) e pôr nas páginas /ads e /business-video-ads | Kineo Ads + Codex | 45 min + 2 h | Prova real de anúncio |
| 7 | Lote do menu real: topo Vídeo · Imagem · Para empresas · Preços + Entrar, hambúrguer igual, lateral com Anúncios/Preços, mobile igual, `data-nav-item` nos links, "Preços" → /pricing (hoje `#pricing`) | Codex | 7–12 h | Sem a marcação, a medição de 14 dias não começa (nav_item_clicked nasceu em 3ab57ba7 e grava 0) |
| 8 | Guardião que confere a marcação dos 4 menus | Kineo Ads | 45 min | depois do lote do Codex |
| 9 | Incidente: a quarentena cobriu 9 de 22 arquivos públicos das 2 contas suspensas; faltam 13 (avatars 1, renders 3, user-footage 7, voiceovers 2) em buckets públicos | Kineo Ads (mover é operação; apagar é do fundador) | 25 min | Nada do incidente acessível |
| 10 | Studio Ads: a promessa "a human editor reviews your first ad within 24 hours" não tem caixa confirmada (hello@usekineo.com), procedimento nem dono | fundador decide o dono; Kineo Ads escreve a rotina | 1 h | Promessa que a casa cumpre |
| 11 | Empresas: não existe rotina de entrega do 1º pedido (o plano "MP4 + /v/ privada + cartão por ffmpeg local" não funciona: /v/ só abre publicada; compose não faz cartão) | Claude-CEO + Kineo Ads | 2–4 h | Receber o 1º pedido sem improviso |
| 12 | Teto de 3 pedidos abertos (decidido, não existe no código) e botão "entregue/reembolsado" no /admin/ads | Kineo Ads | 2 h | Operação sem planilha |
| 13 | Reparar 2 pessoas afetadas antes do conserto do "apertou e não saiu" (trial intacto, nenhum filme) | Claude-CEO | 30 min | — |
| 14 | Teste real do Imagem → vídeo (1 cr) e o mesmo botão na /library | Claude-CEO | 45 min | — |

## Decisões de uma palavra que travam pistas (fundador)

1. "Semana das pistas": o mandato fechou 25/09 02:10 BRT; sem renovação nenhuma pista abre código novo — e 5 itens do
   caminho crítico são do Codex. Renovar (e com quê)?
2. Vídeo no menu: com submenu (Exemplos dentro) ou link simples? O que vai para "Mais"?
3. Pode apagar os mega-menus de motor do topo (curadoria de 17/08)?
4. Imagem → vídeo: manter o clipe de 5–10 s no Animate (texto honesto) ou construir "imagem de referência no Studio"
   como a prévia v5 sugere?
5. O que fica abaixo dos 3 blocos no /pricing?
6. Moderação também nos motores do Studio (trava 8.2)?
7. Compra de teste real (Studio Ads e/ou Express) com conta não interna, seguida de estorno.

## Riscos

- Entrega grande sem prova de cliente externo: 0 pagamentos em 28 h; se o webhook quebrou, só aparece na próxima venda.
- Moderação depende da OpenAI: se cair, imagem, animate, avatar, upload e Studio Ads param (o Kineo 1 continua);
  calibrada com 14 textos e 36 fotos — medir bloqueios nas primeiras 48 h.
- Regressão escondida em 3 guardiões que já eram vermelhos (test-interface-language e 2 outros) — a ponta criou
  falhas novas dentro deles; o Codex precisa olhar antes do lote do menu.
- O passe de US$19,90 perde para o Starter de US$9,90/mês, que já inclui o Studio Ads (congelado até 09/10; a
  B-ajustada resolve).
- Main andou 2× em 14 min: quem age com retrato velho enfileira em base desatualizada.

## Correções dos céticos (aplicadas acima)

- "4 de 4 pessoas receberam filme" → 4 contas (provavelmente 3 pessoas), 8 despachos, 6 filmes; 2 tentativas falharam.
- "nav_item_clicked 0 porque falta atributo" → 0 porque o evento nasceu em 3ab57ba7 (00:14 BRT); continua 0 até a marcação.
- "never expire não entrou na fila" → entrou (56bf113b) e foi publicado com 4fdd83ce.
- "129 vermelhos = mesmos da base" → por arquivo sim; por checagem há regressão escondida em 3 arquivos já vermelhos.
