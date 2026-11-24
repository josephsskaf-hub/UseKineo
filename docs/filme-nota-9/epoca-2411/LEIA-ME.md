# Prova offline de época em ficha, imagem e clipe — 24/11/2026

**TESTADO LOCALMENTE.** Base `c4fd957e65c2c9ec309d3acb562e35febb218c36`, candidata de código `97d562ea92df1cb2ea1851b57c3dc367aad523e6`, carregador original em `codex/nota9-replay-2311` (`7af247b9d006517b91791bf5261f69a7d5219404`).

## Reproduzir

Requer Node 22+ (execução local em 24.18.0), Git com a base, o carregador e as três revisões de código e o TypeScript já instalado da Kineo. Execute de qualquer diretório. O primeiro argumento pode ser qualquer checkout deste repositório. Se a instalação de dependências estiver em outro, informe `KINEO_TS_ROOT`.

```powershell
$repo = 'C:/kineo'
$env:KINEO_TS_ROOT = $repo
node ./run-suite.mjs $repo 97d562ea92df1cb2ea1851b57c3dc367aad523e6
```

A conferência de entrega lê somente blobs do Git. Para testar mudanças antes do commit, passe `working=C:/caminho/da/worktree` no segundo argumento. Nesse modo, somente a rota e o helper da época são lidos da cópia indicada, com as outras dependências obtidas de seu HEAD. As saídas são exibidas no terminal. `REPLAY_SAVE=1` atualiza os arquivos JSON desta pasta.

## O que é real e o que é simulado

**FATO CONFIRMADO.** A prova compila trechos da árvore sintática da rota candidata. A preparação e o gate estão em `app/api/generate-video-cinematic/route.ts:7549`, o ajuste dos stills em `:7566`, o ajuste após a separação de planos em `:7688` e o prompt entregue à geração da folha em `:8167`. Executa também o montador final e o envio de Kling usado pela rota em `:8535`. O carregador histórico tem apenas a resolução de TypeScript e as duas leituras de arquivos substituídas por dependências locais e blobs de Git. Preserva a vedação a rede, SDK e armazenamento. O `fetchImpl` passado ao envio captura o corpo e responde em memória.

**TESTADO LOCALMENTE.** Cooper, Le Prince e Slocum usam os quatro trechos literais de `docs/canais/2026-11-24/SHORTS-PERSONAGEM-UNICO.md`. Três controles sem época usam roteiros de ensaio do fundador (Bolt, Juno, Ember). Os outros dois são controles escritos para o teste, com dinheiro e número de modelo. Casting, aprovação de imagem, identidade da conta e respostas de fornecedores são representados por entradas de teste. Nenhuma URL de cliente, banco de produção, modelo de linguagem ou render integra o processo. A simulação mede tempo histórico, presença da ação e forma dos pedidos. Qualidade da imagem e reconhecimento de identidade exigem outra prova.

**TESTADO LOCALMENTE.** `conferir.mjs` executa oito roteiros em três contextos, casa/internal, casa/OFF e externo/internal. Cada combinação captura a folha, quatro prompts de still sem folha, quatro prompts com folha e três pedidos de vídeo em texto, com quadros e com referência única. Confere igualdade serializada com a base nos controles sem época e nos caminhos externos/OFF, preservação da fala, tempos e limite de 512. Nos históricos verifica o ano de cada plano e o objeto ou a ação visível. No Slocum, o identificador dos dois primeiros planos diz “before 1909”.

**TESTADO LOCALMENTE.** `fusao.mjs` verifica nove distribuições de quatro seções em três cenas e 108 planos no transporte. `pressao.mjs` usa variações sintéticas de plano longo do Cooper para constatar quando a base preserva a maleta e a candidata a perde. Na primeira candidata isso ocorreu em 17 de 27 combinações de comprimento e modelo. Na ponta entregue, zero. `hoje.mjs` confronta os cinco primeiros fechos de Le Prince com `da221631e5571db63c77b159fe14f1a605220df4`. Mais cinco casos verificam a segunda revisão, usando `f420898505fa225b4381bc7772758c84d4f7fc7f` como contraprova. Numa visita atual ao museu, a fabricação da câmera em 1888 pertence à fala e o plano mostra o presente. Na oficina histórica, a fala começa em “Today” e a imagem mostra o homem operando a câmera em 1888. Executa os dois produtores de still e os três despachos de vídeo e confere a fala inteira. A segunda rodada inclui o cenário de 1920 com uma câmera de 1888 na fala, o cenário de 1935 com a idade da câmera na descrição visual, o traje da década de 1880 compatível com a fala de 1888, e um roteiro sem data de cena em que só o objeto é datado. A suíte exige a reprodução dos dois defeitos nas respectivas revisões anteriores. O comparativo `PLANOS-ANTES-DEPOIS.md` mostra os textos.

**QUESTÃO PENDENTE.** Este kit observa produtores de prompts e o corpo de vídeo, com o adaptador `acoplar.mjs` executando as expressões reais da rota e uma resposta simulada à verificação do público. Resolução real de conta pelo autenticador HTTP, saída do gerador de imagens, resposta da fal e resultado visual não são medidos. Os oito casos não constituem estimativa de ganho de nota de cliente.
