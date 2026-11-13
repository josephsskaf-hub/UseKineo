# Validação da Etapa 1 — 13/11/2026

**IMPLEMENTADO / TESTADO LOCALMENTE. Não publicado nem ativado em `/`.** Base `7b71edb2d`, branch `codex/watch-etapa1-1311`. Implementação inicial `84c08a460`; os commits seguintes incluem pausa acessível, reancoragens e estas provas.

## Build, tipos e navegador

| Prova | Resultado | Artefato |
|---|---|---|
| Build de produção com o ajuste final | saída 0 | `validacao/build.log` |
| Typecheck bruto `npx tsc --noEmit --incremental false` | saída 0 | `validacao/tsc.log` (vazio) |
| Fontes de produção no checkout de build versus entrega | 19 arquivos idênticos em bytes | `FONTES-BUILD.json` |
| SSR real, paridade da home antiga/autenticada, FAQ/SEO, 32 clipes e 6 no topo, navegação e eventos | verde, 17 mutantes rejeitados | `validacao/watch-home.log` |
| Entradas e precedência de rascunho | 345 verificações, 6/6 mutantes | `validacao/watch-entry.log` |
| Visibilidade, pausa manual, políticas e mídia aprovada | 152 contratos, 11 cenários, 24 hashes | `validacao/watch-media.log` |
| Navegador nativo 390×844 e 1920×1080 | sem rolagem lateral; pares antes/depois | `COMPARACAO.html`, `CAPTURAS.json` |
| Destinos reais Film, Cartoon, Product Ads, UGC Ads | ideia preenchida, sem cadastro antes e sem Generate | `FLUXOS-NAVEGADOR.json` |
| Pausar, rolar e retomar | 0 vídeos com src durante pausa; retoma só elegível | `PAUSA-NAVEGADOR.json` |
| Preview noindex, ausência em sitemap/llms | confirmado no DOM e respostas HTTP locais | `SEO-HTTP.json`, teste WATCH |
| Primeira tela móvel, sem rolar, origem nova/build de produção | **1.067.584 bytes conhecidos**, 70 requisições; só primeiro vídeo | `MOBILE-PESO.json` |

**QUESTÃO PENDENTE:** o script Rewardful não expõe o tamanho. O número conhecido não é total integral e não autoriza declarar o alvo completo de 4 MB aprovado. Conferir rede no aparelho na prévia publicada. Cache externo não controlado.

**QUESTÃO PENDENTE:** a preservação autenticada foi verificada por SSR com sessão fictícia; falta uma sessão real no navegador da CEO/Div. 1. O HTML comparativo é autocontido e contém capturas nativas; sua abertura automatizada foi recusada por falha técnica da revisão automática (`Bad Request`). Abrir manualmente.

**FATO CONFIRMADO:** o build mantém os gates ignorados já presentes no projeto. Após ele gerar `.next/types`, o typecheck encontrou 15 erros em rotas/exports preexistentes não alterados pela missão (`validacao/tsc-gerado-pelo-build.log`). Preservamos o diagnóstico e removemos somente esses artefatos locais antes do typecheck bruto. Portanto build concluído e tipos brutos limpos não significam ausência da dívida de tipos gerados.

## Gate comparativo real

Executado o próprio `scripts/ci/novos-vermelhos.sh`, com Git Bash, árvore limpa e commit feito. Nenhum runner substituto foi usado.

1. **Gate amplo no commit inicial `84c08a460`:** 71 testes, `PARALELO=2`, teto de 300 s. 44 verdes e 27 vermelhos no ramo; repetição dos vermelhos em `origin/main` `057769963ea70279f061e00f5c8d12307a009a1d` encontrou 25 já vermelhos e **2 novos**: Cartoon e FAQ. Logs integrais em `validacao/gate-inicial/`. O resultado inicial foi saída 1 e não é apresentado como aprovação.
2. **Correção:** Cartoon passou 39 verificações (21 mutantes históricos + 5 novos) e FAQ passou 45 verificações + 14 mutantes. Os dois guardiões são reancorados na mesma entrega, preservando suas regras e exigindo mutantes, conforme a missão. Cartoon reconhece a página real com a prop de ideia; FAQ reconhece a segunda home apenas quando mantém FAQ visível e sem duplicação.
3. **Gate final após correções e pausa:** **saída 0, dez testes verdes, nenhum vermelho novo**, no commit `000ad3c68c752e6c9df7a2ddc417530ae1bf5927`, árvore limpa, `PARALELO=2`, teto de 600 s. Logs integrais em `validacao/gate-final/`. A área cobre os três WATCH, os dois guardiões reancorados, navegação e vitrine diretamente afetadas. O log final registra SHA, lista e saídas.

**LIMITE DO GATE AMPLO:** `test-clipes-nos-2-lugares-0411.mjs` atingiu o teto (124) tanto no ramo quanto na main. Isso é timeout em ambos, não aprovação desse teste. A inspeção isolada confirmou que os novos imports de entrada WATCH não entram no grafo dele; nenhuma otimização experimental desse guardião foi integrada. O catálogo WATCH completo e suas entradas foram exercitados pelos novos testes verdes. Outras falhas antigas continuam no log comparativo, sem alegar que foram corrigidas.

**FATO CONFIRMADO:** o helper H3 do guardião clips-first já falha na base. A reancoragem desta missão mantém a montagem antiga protegida e quatro mutantes, mas não altera o helper nem declara o teste completo verde.

## Próximo passo recomendado

CEO/Div. 1 revisam esta entrega local, publicam a rota de prévia sem trocar `/`, conferem celular e sessão real, completam o total de rede e então decidem a ativação por `WATCH_HOME_ENABLED`. Medir pessoas externas, excluir cliques `preview=true` e separar layout móvel; conversão/ativação/pagamento não foram medidos nesta entrega.
