# Envio dos 5 anúncios prontos às empresas — 28/09/2026 (madrugada, BRT)

Remetente: Kineo <joseph@usekineo.com> (conferido no campo "De" de cada um). Enviados pelo Gmail web (Chrome), um por vez.

## Por que foi pelo Gmail web e não pelo conector
O conector do Gmail **reembrulha os links em google.com/url ao salvar**. Testei atualizar o rascunho do eCredit pelo conector com links limpos e depois li o MIME bruto: os href continuavam embrulhados (`https://www.google.com/url?q=...&source=gmail&ust=...`). Por isso a troca foi feita direto no editor do Gmail. Em cada rascunho, os 2 links viraram `<a href="URL limpa">URL limpa</a>` (texto e destino iguais), sem mexer em nenhuma outra palavra. Conferido antes de enviar: 0 ocorrências de google.com/url no corpo.
Verificação depois do envio (MIME bruto do enviado para o eCredit): texto e href limpos nas partes text/plain e text/html.

## Enviados
| # | Assunto | Para | Link /v/ (sem login) | Enviado (BRT) |
|---|---|---|---|---|
| 1 | We made the ad you asked for — eCredit.ng | dnelluky@gmail.com | página 200 · MP4 206 video/mp4 | 01:26 |
| 2 | We made the ad you asked for — SmartTender AI (Unnati) | fest.cieszyc.vp@gmail.com | página 200 · MP4 206 video/mp4 | 01:27 |
| 3 | We made the ad you asked for — Help Me Tenerife | johnickcep99@gmail.com | página 200 · MP4 206 video/mp4 | 01:28 |
| 4 | We hebben de promovideo voor RUIS gemaakt | zwijnenberg.wout@gmail.com | página 200 · MP4 206 video/mp4 | 01:28 |
| 5 | We made the ad you asked for — MadLabs | gunjanh90@gmail.com | página 200 · MP4 206 video/mp4 | 01:30 |

- Links usados: exatamente os da tarefa (/v/<id> + /ads/new?utm_source=email&utm_medium=1to1&utm_campaign=empresas_prontos&utm_content=<empresa>).
- "Janela anônima": a página /v/ foi aberta sem cookie nem login (HTTP 200, com `<video>`) e o MP4 respondeu 206 video/mp4 (vídeo transmitindo). /ads/new respondeu 200.
- Erros de entrega: nenhum na checagem logo após o envio (sem mailer-daemon para esses 5 destinatários).
- Nenhum outro rascunho foi enviado.
- Efeito colateral: o rascunho do eCredit foi regravado uma vez pelo conector antes da troca, o que gerou um novo id de conversa (thread 1a0e6406ba99ea27). O conteúdo enviado é o do pedido.
