# Verificação de 13/11/2026

**TESTADO LOCALMENTE.** Nenhuma prova abaixo é pagamento externo ou validação de render em produção.

| Verificação | Resultado |
|---|---|
| TypeScript, sem emitir e sem cache incremental | Passou na árvore final, depois de remover a rota temporária e seus tipos gerados. |
| Tela nova | 226 verificações; 26/26 mutantes. Galeria exata por produto, ações, mídia e CSS legado protegidos. |
| Menu Recreate | 35 verificações; 8/8 mutantes. |
| Vitrine compartilhada | 82 verificações, zero falhas. B/R e mutantes reancorados; âncora ausente agora falha em vez de contar como mutante morto. |
| Mosaico | 20 verificações, zero falhas. |
| Enquadramento | 19 verificações, zero falhas. |
| Extração Ads | 164 contratos em17cenários; execução comparada com a página de1c736d3a6: props, redirects e leituras iguais, exceto apresentação/caminho da moldura aprovados. |
| Opções Ads | 110 contratos; quatro formatos e39idiomas. Handlers reais conservam demais campos; apresentação legada idêntica à anterior. |
| Compartilhamento | 71 verificações offline. |
| Navegador real | A/B/C em1920×1080 e390×844, dezoito cards cada; pares de Ads/Cartoon, Recreate, faixa, rodapé e conector. |

**EVIDÊNCIA LOCAL DO NAVEGADOR:** o botão de exemplo mede44px, fonte15px, cor `rgb(16,19,24)`; vídeo usa contain. Catálogo público tem30cards e play44px. Formulário aceita texto fictício e Unboxing, habilitando Prepare; o botão não foi acionado. Nenhum upload, preparação de fotos ou geração foi iniciado. Rodapé no tema claro: fundo anterior `rgb(16,21,29)`, novo `rgb(255,255,255)`, mesma posição. Hidratação do CSS corrigida e recarga conferida sem novos avisos de hidratação.

**IMPLEMENTADO — CI:** os dois contratos novos de Ads entram em `scripts/ci/diagnostico.txt`, sem alterar o portão. A regra vigente pede cinco verdes na main antes de promovê-los. Não afirmamos que executaram no GitHub.

## Falhas e limites conhecidos

- **CONTRADIÇÃO PREEXISTENTE — test-five-improvements:** falha em `:99`, pois divide workflow em `legacy`, mas a main usa jobs `portao` e `diagnostico`. Lê o continue-on-error do diagnóstico como se fosse crítico. O portão atual não tem essa tolerância (`.github/workflows/guardiao.yml:24–41`); o diagnóstico tem (`:43–58`). Workflow e esse teste não foram alterados nesta entrega. Não anunciar bateria inteira verde.
- **BLOQUEADO — test-ads-simples-2810:** o auxiliar `scripts/test-support/desfaz-ads-simples-2810.mjs` não existe na base consultada. O leitor do guardião foi apontado ao novo servidor compartilhado; execução integral continua pendente.
- **PENDENTE — guardião Ads v2 histórico:** normalizador `semEstreia3110` não aceita a nova camada de apresentação em AdsV2Client. Log em `test-ads-v2-legado.log`. Não enfraquecemos essa asserção; a extração/gates e a preservação do HTML legado foram verificadas pelos contratos reais novos. O guardião histórico precisa de reancoragem da camada visual.
- **DESCONHECIDO:** cadastro/login e render autenticado nesta branch em produção; nenhum deploy feito. A fixture visual usa dados públicos e props de visitante, com os serviços públicos apontados para placeholder. Não demonstra entrega paga.
- **PENDENTE DE OUTROS CONTRATOS:** ordem cronológica de formatos; roteiro manual/gancho da opção A; resgate e acompanhamento antes de retirar Clip. Detalhes em ENTREGA-1311.md e no quadro local.

## Capturas e reprodução

**FATO CONFIRMADO:** `PROPOSTAS-ABC.html` e `ANTES-DEPOIS.html` têm CSS inline e imagens embutidas. Funcionam como documentos sem build/servidor. Fotos foram feitas pelo navegador em Next dev; as propostas usam vídeos/pôsteres existentes, sem vídeo novo.

`preview-fixture-1311.txt` guarda a montagem da rota temporária. Os componentes Before vieram de1c736d3a6; BeforeCreateShell usou BeforeTabs desse mesmo SHA, com imports locais corrigidos. BeforeFooterCss aplica apenas o CSS anterior ao componente real atual. O contêiner da fixture liberou html/body para página completa e fixou o tema claro sem persistir preferência. Essas duas regras não entram na aplicação.

Rota e arquivos temporários removidos; servidor encerrado; viewport restaurado. As propostas ficam apenas em docs. Não colocar a fixture em deploy.
