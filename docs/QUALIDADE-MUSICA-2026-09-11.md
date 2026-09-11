# Música por emoção — implementação isolada

Data: 11/09/2026. Base `f6e4e3e6`. Escopo autorizado: auditoria de motores, seção C.

## Resultado e limites

**IMPLEMENTADO:** `lib/musicDirection.ts` separa emoção musical do classificador de tema usado pela voz. Direção explicitamente rotulada pelo autor tem prioridade; depois luto/celebração/tensão/calma do texto original; tema é apenas fallback. Vocabulário limitado, com casos EN/ES/HI e negações; não é compreensão universal de qualquer idioma, metáfora ou arco narrativo. Histórias que misturam luto e alegria recebem tratamento sóbrio salvo direção explícita do autor.

**IMPLEMENTADO:** clássico, Hollywood e unlock chamam `lib/musicScore.ts`, com narração anterior ao scaling e diretivas no roteiro/tópico. Lyria recebe instruções controladas por emoção, instrumentais, subordinadas à voz. Nenhuma chamada de IA adicional: máximo uma tentativa de geração musical, como antes. `Music: none`, `[No music]` e equivalentes ES/HI não chamam fornecedor.

**IMPLEMENTADO:** a busca opcional Openverse não pode substituir um mood explícito. Fallback permanece no catálogo daquele mood. Como o catálogo `emotional` não comprova quais faixas são tristes versus alegres, falha da geração em luto/celebração resulta em silêncio, não roleta musical. Não foram criadas, baixadas ou aprovadas faixas novas.

**IMPLEMENTADO:** unlock usa o mesmo contrato e seed de narração e não compra outra trilha. **QUESTÃO PENDENTE:** não há identidade garantida do MP3 original gerado por Lyria; o fluxo atual não fornece essa URL para o rebuild. Em luto/celebração, rebuild pode ficar sem trilha em vez de adotar suspense. Preservar a faixa exata exige persistência/forward autorizado separado. Não declarei esse problema resolvido.

**QUESTÃO PENDENTE:** o cliente ainda não propaga o campo estruturado `analysis.music_mood`. O resolver aceita esse tipo de hint, mas os callers atuais usam texto e diretivas existentes; esta entrega não modificou GenerateClient nem promete ligar um campo que ele não envia.

**PRESERVADO:** vozes, classificador de nicho, motor, duração, mix/volumes do compositor, preços, créditos e contratos financeiros. Nenhuma escrita em banco/ambiente ou render de validação foi executado. Nenhum log musical novo inclui roteiro ou erro livre de fornecedor.

## Verificação offline

`scripts/test-music-direction-2026-09-11.mjs` executa módulos TypeScript reais em memória; fetch simulado captura o JSON efetivamente enviado por Lyria. Também extrai via AST e executa os três blocos musicais reais das rotas, sem executar autenticação, TTS, pagamento ou banco. Testa emoção, negação, silêncio, limite de chamadas, catálogo, logs e direção igual no rebuild.

**TESTADO LOCALMENTE:** 112/112 verificações, exit 0; `tsc --noEmit --incremental false`, exit 0; `git diff --check` limpo. Nenhuma chamada externa. Sem browser: esta entrega altera decisão server-side e a audição exige canário autorizado, não um clique de render escondido.

O teste legado D1 teve cinco âncoras musicais atualizadas porque a geração passou pelo seletor compartilhado, o argumento interno mudou e o catch deixou de registrar texto livre. O teste executável novo prova o comportamento em vez de apenas essas strings. Nenhuma asserção de motor, preço ou vídeo foi modificada.

**CONTRADIÇÃO LEGADA CONFIRMADA:** D1 permanece 34/35, exit 1, na asserção literal de S25 `aspect_ratio: '9:16'`. O mesmo teste e seus arquivos executados da base `f6e4e3e6` via `git show` produzem exatamente 34/35 e a mesma falha. A rota já usa o resolvedor de formato. Não alterei essa asserção de outra pista para disfarçar o resultado.

**NÃO VALIDADO EM PRODUÇÃO:** nenhuma audição de vídeo novo ocorreu. O contrato enviado melhora; só audição de mídia autorizada pode confirmar a faixa produzida e seu equilíbrio real com a voz. Este commit não promete que todos os resultados audiovisuais estejam aprovados.
