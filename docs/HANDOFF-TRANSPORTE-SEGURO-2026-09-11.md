# Candidato local de transporte seguro — Board

**Estado: IMPLEMENTADO / TESTADO LOCALMENTE; SEM COMMIT, ENFILEIRAMENTO OU PUBLICACAO.**

Snapshot: 10/09/2026 23:29 BRT (11/09 02:29 UTC). Preparacao limitada autorizada pelo Board apos renovacao do fundador. Worktree exclusiva `C:/kineo-wt/transport-safe-20260911`, branch `codex/transport-safe-20260911`, base `7827f2e07f89b55e2a020b266a48ec98247e5bd4`. Nenhum script foi executado contra fila ou remoto real. Nenhuma alteracao de produto, checkout, preco ou render.

## Diff proposto

- `scripts/enfileirar.sh`: exige worktree codex limpa e sem operacao Git pendente; fila nao pode estar aberta em worktree; main e fila devem ser ancestrais do candidato; atualizacao da fila por compare-and-swap com SHA anterior explicito. Nao faz rebase, limpeza, force ou resolucao automatica de conflitos.
- `scripts/!RODAR-AGORA.bat`: wrapper minimo do Git Bash, com dois SHAs completos obrigatorios.
- `scripts/publish-reviewed-queue.sh`: exige candidato enfileirado e main iguais aos SHAs revisados; reconfere antes do push; envia o objeto imutavel por push normal fast-forward; confirma a ponta remota depois. Falha nao inicia retry, limpeza nem reconciliacao.
- `scripts/.gitattributes`: fixa LF somente para os dois arquivos Bash. BAT preserva CRLF conforme regra existente do repositorio.
- `scripts/test-safe-transport-offline.mjs`: fixtures novas, bare repos locais, somente protocolo `file`, configuracao global/sistema desabilitada para as fixtures. Nenhuma fixture e apagada.

## Teste REAL executado

Na worktree acima: `node scripts/test-safe-transport-offline.mjs`.

Resultado final: **13 cenarios aprovados, exit 0**, encerrado `2026-09-11T02:29:10.022Z`.

Artefato privado: `C:/Users/josep/AppData/Local/Temp/kineo-transport-offline-WR6ia6/result.json`.

1. Fila CAS e publicacao feliz.
2. Entrega identica repetida retorna sem novo push.
3. Fila alterada depois da revisao impede publicacao.
4. Remoto alterado desde a revisao impede publicacao.
5. Arquivos sujos, staged, untracked, indice e locks preexistentes preservados.
6. Rejeicao do remoto nao causa segunda tentativa, limpeza ou reconciliacao.
7. Fila aberta em outra worktree nao e movida.
8. SHAs completos e branch codex exigidos.
9. Dois enfileiramentos concorrentes: vencedor preservado e perdedor recusado.
10. Wrapper BAT real, copiado para fixture com espacos no caminho, publica pelo mesmo Bash.
11. Hook pre-push da fixture avanca a fila DEPOIS das rechecagens: remoto recebe somente SHA revisado e nova fila permanece intacta.
12. Lock preexistente da fila bloqueia e nao e removido.
13. GIT_INDEX_FILE alternativo bloqueia antes de qualquer escrita.

`node --check` e `bash -n` passaram. `git -c core.whitespace=cr-at-eol diff --check` limpo. O `git diff --check` sem essa configuracao aponta os CRLF do BAT como trailing whitespace; isso foi preservado deliberadamente, sem normalizar BATs alheios.

## Limites obrigatorios antes de uso real

- **NAO e drop-in sem argumentos.** A interface de nomes foi preservada, mas o BAT agora exige `CANDIDATE_SHA REVIEWED_MAIN_SHA`. `SUBIR-SITE.bat` e outros callers atuais sem argumentos falharao de forma fechada. Integrador precisa aprovar o novo contrato e preparar o clique/comando com os dois SHAs apos gates; nenhum caller alheio foi modificado aqui.
- Caminho do Git Bash no BAT foi confirmado nesta maquina. Nao e garantia de portabilidade para outro host.
- O integrador deve conferir repo, origin/pushurl, hooks/config Git, SHA, dono da fila e diff completo antes de qualquer uso. O script e generico para permitir testes offline; nao representa protecao global contra configuracao Git hostil ou remoto errado.
- CAS e **local da fila**. O push remoto e fast-forward normal, nao compare-and-swap remoto absoluto: movimento concorrente da main para outro ancestral do candidato apos a ultima leitura pode ser aceito sem perder commit. Movimento divergente sera recusado pelo Git. Ponta diferente apos push vira INCERTO e nao autoriza reenvio.
- O teste concorrente reproduziu uma corrida CAS real, mas nao demonstra todos os interleavings possiveis. O hook do cenario 11 prova especificamente que avancar a fila apos as rechecagens nao injeta conteudo no SHA publicado.
- Locks e operacoes pendentes param o fluxo; o candidato nao tenta decidir que lock e orfao.
- Testes de transporte nao substituem typecheck, guardioes, preview, privacidade dos documentos, aprovacao de conteudo ou deploy dos pacotes comerciais. Publicado no Git nao significa Vercel READY nem efeito comercial.
- A tentativa inicial de publisher PowerShell falhou por ExecutionPolicy do Windows. Nao houve mudanca da politica nem bypass. Esse candidato foi retirado e o publisher foi implementado no Bash ja usado pela fila; a versao PowerShell nao faz parte da entrega.

## Estado preservado e proximo dono

Ao fim, `origin/main` e `entrega-atual` reais continuam em `7827f2e07f89b55e2a020b266a48ec98247e5bd4`. A arvore principal nao foi editada; sua versao suja/staged do BAT deve permanecer intocada.

**Proximo passo: revisao independente por Citacoes e decisao do Board sobre compatibilidade de callers e contrato de uso.** Nao rodar este candidato real antes disso. Se aprovado, integrar as tres paginas/kit/pedidos na worktree adequada, verificar diff e gates finais, enfileirar e publicar um SHA fixo, depois validar producao. Pedido no Git ainda precisa de ACK do Claude; publicacao do documento nao comprova leitura nem libera contato.
