# C2 · Cena concreta no caminho A2 · 26/11

**EVIDÊNCIA DE PRODUÇÃO.** A revisão visual de 26/11 registra dois filmes com o assunto concreto ausente. Esses filmes não entraram no ensaio. Sem os despachos históricos não sabemos em qual etapa cada filme perdeu o detalhe.

| Etapa | FATO CONFIRMADO no código e no ensaio sintético |
|---|---|
| Descrição | A rota passa as falas ao descritor por seção em app/api/generate-video-cinematic/route.ts:4553. O ensaio começa com uma descrição genérica já produzida. O trecho concreto permanece disponível na fala. |
| Juiz anterior | Em lib/juizDoPlano.ts:146, o sujeito é considerado presente quando aparece em pelo menos um plano. Um sino presente no primeiro e um desfecho correto no último deixam passar uma sala vazia no lugar da ação intermediária. |
| Seleção e reparo | Em lib/juizDoPlano.ts:206 e :432 cada indicação deve citar literalmente fala e imagem do mesmo plano e conquistar maioria naquele índice. Em lib/kling4PlanoDaFala1911.ts:145 e :184 os índices vão para a reescrita existente por seção. Os demais juízes conservam o contrato anterior. Os dois chamadores A2 estão em app/api/generate-video-cinematic/route.ts:7922 e :8594. |
| Despacho | buildKling4TrialInput em lib/kling4Trial.ts:294 monta o payload real. No ensaio free15 com respostas semânticas simuladas o segundo prompt passa de uma sala vazia ao sino rompendo a mesa de vidro. Primeiro e terceiro planos e durações permanecem idênticos. |

**TESTADO LOCALMENTE.** `node scripts/test-cena-concreta-a2-2611.mjs --base` reproduz o defeito em d098087c3. A mesma chamada sem o argumento passa na candidata. O guardião inclui ausência de evidência, índice de outro plano, índice inválido, voto minoritário e caminho fora do A2. Não usa texto de cliente, rede ou imagens reais.

**QUESTÃO PENDENTE.** A prova demonstra a passagem do veredito para o pedido do motor. Sensibilidade do juiz real, fidelidade da resposta da reescrita e resultado visual exigem avaliação posterior. O schema é maior e pode aumentar tokens; quando o A2 detecta um novo problema, pode acionar a tentativa de reescrita prevista. Sem novo render nem nova categoria de chamada.
