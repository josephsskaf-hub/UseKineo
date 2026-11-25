## Volta 2 de 25/11 · prova sem render

**TESTADO LOCALMENTE.** Base c76e0badc, produto 0d09c9252. Os cinco recibos deste diretório e a comparação por plano foram regravados contra essas duas pontas. O guardião da rota captura o corpo enviado ao transporte simulado com uma e duas fotos. Retirar toda a reserva M5 ou apenas a segunda frase faz a asserção de preservação do texto falhar. A reserva usa o comprimento em pontos de código das frases disponíveis, cada qual com seu separador. É conservadora em planos onde o montador decide omitir uma referência. Nessa fronteira a indicação adicional de época pode ficar de fora.

**TESTADO LOCALMENTE.** 23 controles e 30 mutantes do helper, incluindo datas ligadas a objetos, calendário por extenso e eras. A data histórica da cena continua prevalecendo quando declarada. O teste da ficha sem nome matou os seus 54 mutantes e o do juiz matou os seus 56. TypeScript retornou 0. O comparativo da área passou em 17 de 19 guardiões; os outros dois, meta95-personagem e meta95-personagem-ajuste, falharam também na base. Zero vermelho novo. O ensaio usa roteiros da casa ou sintéticos. A aparência final requer prova visual separada.

# Prova offline de época em ficha, imagem e clipe — 24/11/2026

**TESTADO LOCALMENTE.** Base `96299a66b523e2f5e03e2e26f27d5ca69cad7e91`, candidata de código `be8e21e70b16430c21590fc11d71d8b9001112fd`, carregador original em `codex/nota9-replay-2311` (`7af247b9d006517b91791bf5261f69a7d5219404`).

## Devolução da CEO de 20h48

**TESTADO LOCALMENTE, 24/11.** A pista de Cooper com 408 caracteres perdeu a frase final dos motores na ponta rebaseada 317f81b9e. O novo guardião da rota reproduziu antes de corrigir. Agora a montagem completa superfície, escala e movimento da última cena antes de calcular espaço para a época. Preserva a frase de referência ou de continuidade que o provedor acrescentará. Quando o descritor completo ultrapassa o espaço, tenta só a data. Se nem a data couber, cede todo o espaço ao texto já montado. A contagem usa pontos de código Unicode.

A função separa ano corrente e futuro, museu atual e data do objeto. Airplane e jet recebem a cabine do período. No ensaio offline, nenhum papel humano foi acrescentado a um quadro vazio. O guardião de função matou os 20 mutantes designados em 19 controles. O de rota matou os cinco mutantes de acesso, ficha e épocas por seção e comparou as frases enviadas nos três caminhos. O comparativo do CI teve 21 testes, 19 verdes e dois vermelhos herdados da main (meta95-personagem e meta95-personagem-ajuste), nenhum novo. A primeira rodada encontrou um vermelho novo no guardião da última cena. Restabelecemos a montagem original e os seus sete mutantes voltaram ao verde. TypeScript saiu zero na ponta be8e21e70.

**QUESTÃO PENDENTE.** Cabine, terno e identidade são pedidos ao motor conferidos antes do transporte. O resultado visual segue para ensaio da CEO.

## Reproduzir

Requer Node 22+ (execução local em 24.18.0), Git com a base, o carregador e as três revisões de código e o TypeScript já instalado da Kineo. Execute de qualquer diretório. O primeiro argumento pode ser qualquer checkout deste repositório. Se a instalação de dependências estiver em outro, informe `KINEO_TS_ROOT`.

```powershell
$repo = 'C:/kineo'
$env:KINEO_TS_ROOT = $repo
node ./run-suite.mjs $repo
```

`versoes.mjs` é a única fonte da base, da candidata padrão, do carregador e dos dois commits de contraprova. Todos os comparativos de produto usam a mesma base `96299a66b`. Os dois commits históricos são usados apenas quando o teste exige reproduzir um defeito antigo. A conferência de entrega lê somente blobs do Git. Para testar mudanças antes do commit, passe `working=C:/caminho/da/worktree` no segundo argumento. Nesse modo, somente a rota e o helper da época são lidos da cópia indicada, com as outras dependências obtidas de seu HEAD. As saídas são exibidas no terminal. `REPLAY_SAVE=1` atualiza os arquivos JSON desta pasta.

## O que é real e o que é simulado

**FATO CONFIRMADO.** A prova compila trechos da árvore sintática da rota candidata. A preparação e o gate estão em `app/api/generate-video-cinematic/route.ts:7549`, o ajuste dos stills em `:7566`, o ajuste após a separação de planos em `:7688` e o prompt entregue à geração da folha em `:8167`. Executa também o montador final e o envio de Kling usado pela rota em `:8535`. O carregador histórico tem apenas a resolução de TypeScript e as duas leituras de arquivos substituídas por dependências locais e blobs de Git. Preserva a vedação a rede, SDK e armazenamento. O `fetchImpl` passado ao envio captura o corpo e responde em memória.

**TESTADO LOCALMENTE.** Cooper, Le Prince e Slocum usam os quatro trechos literais de `docs/canais/2026-11-24/SHORTS-PERSONAGEM-UNICO.md`. Três controles sem época usam roteiros de ensaio do fundador (Bolt, Juno, Ember). Os outros dois são controles escritos para o teste, com dinheiro e número de modelo. Casting, aprovação de imagem, identidade da conta e respostas de fornecedores são representados por entradas de teste. Nenhuma URL de cliente, banco de produção, modelo de linguagem ou render integra o processo. A revisão após o rebase passa uma ficha com um protagonista nomeado, sua descrição canônica e uma referência HTTPS sintética com o mesmo nome à expressão de admissão usada na rota. A admissão real determina a origem, a frase do personagem e a recusa quando aplicável. Com público externo, o modelo de referência admite os cinco humanos fotorreais dos controles e recusa os três animais/criaturas com `nao_humano`; nessa terceira sondagem o envio efetivo cai no modelo de texto. O modo de filme de época e a admissão da folha são decisões separadas. A base é executada para cada público. A simulação mede tempo histórico, presença da ação e forma dos pedidos. Qualidade da imagem e reconhecimento de identidade exigem outra prova.

**TESTADO LOCALMENTE.** `conferir.mjs` executa oito roteiros em três contextos, casa/internal, casa/OFF e externo/internal. Cada combinação captura a folha, quatro prompts de still sem folha, quatro prompts com folha e três pedidos de vídeo em texto, com quadros e com referência única. Confere igualdade serializada com a base nos controles sem época e nos caminhos externos/OFF, preservação da fala, tempos e limite de 512. Nos históricos verifica o ano de cada plano e o objeto ou a ação visível. No Slocum, o identificador dos dois primeiros planos diz “before 1909”.

**TESTADO LOCALMENTE.** `fusao.mjs` verifica nove distribuições de quatro seções em três cenas e 108 planos no transporte. `pressao.mjs` usa variações sintéticas de plano longo do Cooper para constatar quando a base preserva a maleta e a candidata a perde. Na primeira candidata isso ocorreu em 17 de 27 combinações de comprimento e modelo. Na ponta entregue, zero. `hoje.mjs` confronta os cinco primeiros fechos de Le Prince com `da221631e5571db63c77b159fe14f1a605220df4`. Mais cinco casos verificam a segunda revisão, usando `f420898505fa225b4381bc7772758c84d4f7fc7f` como contraprova. Numa visita atual ao museu, a fabricação da câmera em 1888 pertence à fala e o plano mostra o presente. Na oficina histórica, a fala começa em “Today” e a imagem mostra o homem operando a câmera em 1888. Executa os dois produtores de still e os três despachos de vídeo e confere a fala inteira. A segunda rodada inclui o cenário de 1920 com uma câmera de 1888 na fala, o cenário de 1935 com a idade da câmera na descrição visual, o traje da década de 1880 compatível com a fala de 1888, e um roteiro sem data de cena em que só o objeto é datado. A suíte exige a reprodução dos dois defeitos nas respectivas revisões anteriores. O comparativo `PLANOS-ANTES-DEPOIS.md` mostra os textos.

**QUESTÃO PENDENTE.** Este kit observa produtores de prompts e o corpo de vídeo, com o adaptador `acoplar.mjs` executando as expressões reais da rota e uma resposta simulada à verificação do público. Resolução real de conta pelo autenticador HTTP, saída do gerador de imagens, resposta da fal e resultado visual não são medidos. Os oito casos não constituem estimativa de ganho de nota de cliente.
