# Roteiro para o Cowork — conferir o marco B/B2/B3 da sprint de 16 h (27/09/2026)

Só percursos de tela. **Zero render, zero crédito, zero compra** (crédito de OpenAI curto hoje). Relatório de volta em
`C:\kineo\docs\COWORK-MARCO-B-2026-09-27.md` com prints em `C:\kineo\docs\cowork-marco-b-2026-09-27\`.

Bloco para colar no Cowork:

```
KINEO — CONFERIR MARCO B (27/09). Só olhar e clicar; NÃO gerar vídeo, NÃO comprar, NÃO digitar cartão, NÃO mexer em Stripe/Vercel. Relatório em C:\kineo\docs\COWORK-MARCO-B-2026-09-27.md (prints numerados em C:\kineo\docs\cowork-marco-b-2026-09-27\). Para cada percurso: o que apareceu, print, nota 0-10 e o que estranhou.

P1 · /ads/new DESLOGADO (janela anônima do Chrome): abrir https://www.usekineo.com/ads/new. Esperado: NÃO manda para /login; mostra o painel "AI makes it" com caixa de texto, campo de link, botões de logo/fotos. Digitar "Padaria Brasa, pão na chapa, rua X, aberta 6h às 20h" e colar o link https://www.usekineo.com. Clicar em "Make the plan". Esperado: vai para /login com redirect=/ads/new. Entrar com a conta josephsskaf (já logada no navegador normal? se a anônima não tiver senha salva, pule o login e diga). Esperado ao voltar: o texto digitado reaparece com a linha "Welcome back — your text is here". Print antes e depois.

P2 · /ads/new LOGADO (josephsskaf): abrir. Esperado: se já houver anúncio entregue, abre a lista "Your ads" com miniatura, negócio · modelo · data com hora · idioma e botão "Open · more versions"; se não houver, abre o painel. Subir logo + 2 fotos AO MESMO TEMPO (C:\kineo-teste-anuncio\logo-brasa.png, foto-1-salao.jpg, foto-2-prato.jpg). Esperado: nenhuma mensagem "Wait for the current upload"; os 3 entram em fila e aparecem. NÃO clicar em Make the plan / Render. Print.

P3 · /pricing: abrir logado e deslogado. Rolar até "Compare plans". Esperado: linhas Kling 2.5 e H3 na coluna Starter mostram "1 film" (não "—"); Kling 3 mostra "1/mo" no Creator e "2/mo" no Studio; nenhuma célula diz "1080p"; "Saved characters" mostra 0/3/3/10; suporte = "Email support" em todas; nenhum bloco "Ads for business" nem "Autopilot". Print da tabela inteira.

P4 · /terms: procurar (Ctrl+F) "introductory" e "first-month". Esperado: 0 ocorrências.

P5 · Exit-intent deslogado: janela anônima em https://www.usekineo.com, esperar 5 s, mover o mouse rápido para fora da janela (para a barra de abas). Esperado: painel aparece dizendo "10 free credits = 2 Kineo 1 films" e "AI engines (Seedance, Veo, Kling) from Starter"; NÃO diz "$1", "7 days of Creator", "Kling 3 included". Botão "Sign up and make my first video". Print.

P6 · Exit-intent logado: mesma coisa na janela normal (josephsskaf). Esperado: o botão vira "Back to Studio" e leva a /studio. Print.

P7 · Páginas novas (deslogado): abrir uma a uma e dizer se carrega, se o texto faz sentido e se há número estranho:
  https://www.usekineo.com/ads/for/restaurants
  https://www.usekineo.com/ads/for/dentists-and-clinics
  https://www.usekineo.com/vs/creatify-alternative
  https://www.usekineo.com/vs/topview-alternative
  https://www.usekineo.com/ai-video-generator/seedance (procurar o bloco "Starter $9.90 USD/month = 2 films of 60 s")
  https://www.usekineo.com/ai-video-generator/veo (bloco "Creator $19.90 USD/month = 1 film of 60 s")
  Esperado em todas: 200, sem "Opens soon", sem preço diferente de $9.90/$19.90/$39.90, sem "1080p", CTA leva a /ads ou /studio. Print de cada.

P8 · /ads deslogado: abrir https://www.usekineo.com/ads. Esperado: hero "Your photos. Your logo. A narrated video ad, made by you.", seção "A person checks your first ad" SEM "24 hours" nem "corrected version"; FAQ "Do I need a subscription?" fala que qualquer plano pago inclui o Studio Ads (3 credits per ad). Print.

P9 · Idioma e tema: no /studio logado, trocar o idioma da interface para Español e o tema para claro; abrir /pricing. Esperado: tabela em espanhol com os MESMOS números; menu nativo (select) não nasce branco no tema escuro. Voltar para English/escuro. Print.

Ao final: tabela P1–P9 com OK/FALHA, notas e o que você mudaria. Não conserte nada; só relate.
```
