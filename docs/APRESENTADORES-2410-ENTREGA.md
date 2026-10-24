# KINEO-APRESENTADORES-2410

24/10/2026 · branch `codex/apresentadores-2410` · base `1c078ed013302ac47c42f783305df688c4e97cfd`.

**IMPLEMENTADO / FATO CONFIRMADO:** 12 candidatos novos, dos 20 aos 65 anos, seis mulheres e seis homens, com estudantes, atletas, executivos, mães/pais, criadores e idosos ativos. Todos estão pendentes; a escolha continua com Sofia, Amara, Rahul, Kenji, Jade e Robert. Fontes: `lib/ads/presenterCandidates2410.json:1`, `lib/ads/presenterCandidates2410.ts:18` e `lib/ads/cena/escolhaCatalog.ts:11`.

**IMPLEMENTADO / FATO CONFIRMADO:** `scripts/apresentadores-2410.mjs` prepara os pedidos e serve um admin local para aprovar, recusar e desfazer por pessoa. A aprovação exige os dois retratos WebP, MP3, cinco verificações e confirmação pessoal de Joseph. Os hashes devem ser os mesmos das prévias vistas; substituir arquivos invalida a aprovação, e uma aba antiga recebe 409. A confirmação local do fundador não constitui autenticação online. Fontes: `scripts/lib/apresentadores-admin2410.mjs:97`, `:115`, `:189` e `:299`.

**IMPLEMENTADO / FATO CONFIRMADO:** somente os aprovados completos entram nos catálogos público e legado. O plano futuro usa o gerador existente `/api/images/generate`: um corpo inteiro em luz natural, olhos abertos e mãos naturais; o rosto é recortado localmente da mesma imagem. Os retratos seguem 9:16 e até 120 KiB; a amostra MP3 também respeita 120 KiB. Fontes: `lib/ads/presenterCandidates2410.ts:28`, `scripts/lib/apresentadores-admin2410.mjs:57`, `:137`, `:189` e `:233`.

**IMPLEMENTADO / FATO CONFIRMADO:** a voz dos novos candidatos chega à síntese com MiniMax explícita por gênero, faixa etária e idioma, inclusive nos estilos legados sem plano v2. EN/PT/ES usam os perfis nativos existentes; os outros 34 idiomas usam os perfis ingleses multilíngues com o boost solicitado. A geração não substitui uma falha por voz padrão. A amostra preparada no plano é PT; deve ser sintetizada pelo helper indicado e importada, pois `/api/audio/generate` usa a voz padrão. Fontes: `lib/ads/presenterVoice2410.ts:21`, `lib/ads/cena/runtime.ts:64`, `lib/ads/v2Advance.ts:1035` e `scripts/lib/apresentadores-admin2410.mjs:137`.

**TESTADO LOCALMENTE:** `tsc --noEmit --incremental false` verde; cinco guardiões novos verdes, incluindo 16 casos do admin, vozes, promoção e desfaz exato em memória. Entre as 60 execuções comparáveis, 59 passaram em ambas as árvores. A única falha restante já existe na base: tradução Hindi ausente em `scripts/test-locale-readiness.mjs:14`. Nenhum vermelho novo. Evidência de 24/10: [matriz e comandos](qa/apresentadores-2410/validation.json), [falha da base](qa/apresentadores-2410/baseline-locale-readiness.log), [falha da branch](qa/apresentadores-2410/candidate-locale-readiness.log).

**FATO CONFIRMADO:** nesta execução não houve geração paga, leitura de `.env`, escrita em banco, build, deploy ou alteração de `main`. O comando futuro de geração exige `--generate --allow-paid`; ele não é executado pelo admin. O custo por imagem do plano é a estimativa fornecida pelo fundador em 24/10, sem alegar preço comercial verificado; voz e repetições ficam fora dessa estimativa.

**QUESTÃO PENDENTE / DESCONHECIDO:** retratos, amostras ouvidas e animações dos novos candidatos ainda não foram validados em produção. Olhos abertos em uma foto não comprovam olhos abertos durante a fala.

**SUGESTÃO — próximo passo recomendado:** executar a geração em uma etapa com gasto autorizado, importar corpo/rosto e amostras MiniMax corretas, revisar as pessoas e aprovar seis. Após revisão e publicação do catálogo, a escolha passa de seis para doze. O catálogo e o admin aceitam lotes adicionais para as etapas seguintes.

**IMPLEMENTADO / FATO CONFIRMADO:** [prévia antes/depois desktop e mobile](previews/apresentadores-2410.html), [imagem completa](previews/apresentadores-2410.png), [imagem de abertura](previews/apresentadores-2410-desktop.png) e [operação do admin](APRESENTADORES-2410-ADMIN.md).

Para abrir o admin nesta worktree, a partir de qualquer pasta:

```powershell
node "C:\Users\josep\OneDrive\Área de Trabalho\Usekineo\.claude\worktrees\apresentadores-2410\scripts\apresentadores-2410.mjs" --serve
```
