# 10 anúncios das empresas — produzidos em 27/09/2026 (noite, BRT)

- **Conta:** josephskaf@hotmail.com (conferida no menu). Saldo 43 → 13. **Gastos: 30 créditos. Saíram OK: 10 de 10.**
- **Config de todos:** /studio · 📝 Use my script as is · Kineo 1 · 35s · 9:16 · narração EN (o nº 7 em NL). O custo mostrado foi 3 cr em todos.
- **Roteiros:** colados byte a byte de ANUNCIOS-PRONTOS-11-EMPRESAS-2026-09-26.md. As contagens de palavras batem com o arquivo (102/103/104/105/100/103/103/102/101/106).
- **Marca d'água "usekineo.com/free":** NÃO aparece em nenhum (conferido em quadros de cada vídeo e no HTML da página /v/).
- **Páginas públicas:** as 10 publicadas pelo /history ("Publish a public page"). Abertas sem login (sem cookie, equivalente a janela anônima): HTTP 200, com `<video>` e o MP4 do nosso bucket.
- **Quadros de cada filme:** docs/cowork-10-anuncios-2026-09-27/NN-quadros.jpg (1 quadro a cada 4 s).

| # | Empresa | Idioma | Pronto (BRT) | Saldo depois | Duração | Link | Marca d'água | Nota | O que estranhou |
|---|---|---|---|---|---|---|---|---|---|
| 1 | eCredit.ng | EN | 00:25 | 40 | 36,3 s | https://www.usekineo.com/v/4375f641-164e-4f66-936b-8bf5fd95e915 | não | 6 | Abre e fecha com um homem num computador antigo (fora do tema); celulares com interface em chinês |
| 2 | ADMITIY | EN | 00:32 | 37 | 34,1 s | https://www.usekineo.com/v/8c13ccf5-d122-435a-b50a-b7ec52e63e8b | não | 5,5 | Legenda escreve a marca errado: "VISIT ADMITI IN"; o fim mostra uma fábrica de garrafas |
| 3 | Restaurante em Amã | EN | 00:37 | 34 | 32,4 s | https://www.usekineo.com/v/fe2c3f99-2961-4b92-a0c4-00b5ed145ec7 | não | 4 | Aparece a fachada de OUTRO restaurante real ("THAI SQUARE at Tudor Tavern", pub inglês); nada lembra Amã; abaixo de 35 s |
| 4 | SmartTender AI — Unnati | EN | 00:41 | 31 | 41,7 s | https://www.usekineo.com/v/33b343e6-9ab6-4fdf-a9f6-9b84b45d6ea4 | não | 6 | 2 cenas de carne grelhada com flor roxa (fora do tema); o resto são pessoas avaliando papéis, coerente |
| 5 | Help Me Tenerife | EN | 00:45 | 28 | 43,0 s | https://www.usekineo.com/v/ddebd142-2353-41b1-9c72-0f05def385eb | não | 6,5 | Visual coerente (ilha, obra, piscina, equipe). "Marketing" mostra um homem de boné sem relação |
| 6 | Ascend AI | EN | 00:49 | 25 | 37,6 s | https://www.usekineo.com/v/0c84d122-dbfb-4083-8ed4-e8a99a8d2eba | não | 5,5 | 2 buracos PRETOS no meio (7,0–7,5 s e 13,8–14,4 s); relógio de pulso e estrutura de obra fora do tema |
| 7 | RUIS (livro) | NL | 00:53 | 22 | 32,6 s | https://www.usekineo.com/v/fb441168-44b6-4ce5-b8f8-e83dc9554240 | não | 7 | O melhor clima (sala de controle, verde, noite). Mas a "Nadia" vira um homem de barba em 3 cenas; legendas NL certas; abaixo de 35 s; áudio mais baixo (-27 LUFS) |
| 8 | MadLabs | EN | 00:57 | 19 | 35,0 s | https://www.usekineo.com/v/a414e137-4fc3-44fa-948d-156a4303d3b1 | não | 6,5 | Coerente (pessoas com notebook). Logo da Apple visível; 1,6 s de preto no fim |
| 9 | Shivshankar Press | EN | 01:01 | 16 | 40,9 s | https://www.usekineo.com/v/e23d3419-5e0f-4182-b2bc-d43d596ce909 | não | 6 | Visual bom (sacolas, impressão offset), mas a legenda escreve a marca errado duas vezes: "SHIVSHANKER" |
| 10 | eQMS AI Assistant | EN | 01:06 | 13 | 38,2 s | https://www.usekineo.com/v/f0c832e3-f7bd-42de-871b-59121aa81712 | não | 5,5 | "Meet the eQMS AI" mostra uma câmera de cinema; "get the answer" mostra 2 mulheres de hijab lendo um livro religioso (fora do tema e sensível) |

Média ≈ 5,9/10. Todos parecem vídeo de banco de imagens com narração, não anúncio de marca: não há logo, cartão final nem contato em nenhum (os roteiros também não têm contato).

## Defeitos para o Code
1. **Legenda erra nome de marca** (2 de 10): ADMITIY → "ADMITI", Shivshankar → "SHIVSHANKER". A narração é verbatim, mas a legenda parece vir da transcrição do áudio. No modo "Use my script as is", a legenda deveria usar o texto do roteiro.
2. **Cena com marca de terceiro:** o nº 3 mostra "THAI SQUARE at Tudor Tavern", um restaurante real. Para anúncio de restaurante, isso é propaganda do concorrente.
3. **Buracos pretos** no nº 6 (2 trechos de ~0,5 s no meio do vídeo).
4. **Prompt de cena = frase da narração + "no recognizable human faces"** (fast_ai_clips_pending), mas os clipes vêm cheios de rostos. A regra não está sendo seguida, e o sujeito muda de gênero de uma cena para outra (nº 7).
5. **Duração abaixo de 35 s** em 3 de 10 (32,4 / 32,6 / 34,1 s), mesmo com a tela dizendo "about 33 s of narration for a 35 s video".
6. **Loudness** -23,7 a -27 LUFS (redes pedem cerca de -14).
7. **Copy da tela de pronto:** "You have 37 credits left — about 1 more 60-second AI video" (37 cr pagam ~7 filmes Kineo 1 de 60 s).
8. **Aba em segundo plano congela o render:** com a aba escondida, o progresso parava em 87–88% e só avançava quando algo "acordava" a aba (uma captura de tela). A finalização depende de polling do cliente, e o Chrome estrangula timers de abas ocultas. Um cliente que troca de aba enquanto espera fica com o filme preso.
