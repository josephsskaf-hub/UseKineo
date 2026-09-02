#!/usr/bin/env bash
# KINEO-ENTREGA-2026-09-01 — enfileira o HEAD de uma worktree na entrega-atual
# SEM atropelar o que outra sessao ja enfileirou. Hoje (01/09) a fila foi
# sobrescrita 4 vezes por `git branch -f entrega-atual <meu hash>` — cada
# sessao apagava os commits da outra. Este script faz o unico jeito seguro:
#   1. le a ponta ATUAL da entrega-atual (o que os outros ja deixaram);
#   2. rebasa os commits novos desta worktree POR CIMA dela;
#   3. so entao move a branch. Nunca joga fora commit alheio.
# Uso (de dentro da worktree): bash scripts/enfileirar.sh
set -e
RAIZ="$(git rev-parse --show-toplevel)"
COMUM="$(git rev-parse --git-common-dir)"
git fetch origin -q
PONTA="$(git -C "$COMUM/.." rev-parse entrega-atual 2>/dev/null || git rev-parse origin/main)"
# v2 (02/09): a base e a merge-base com a PONTA DA FILA, nao com a main. Com a
# main como base, commits que outra sessao ja enfileirou (e talvez reescreveu)
# eram replayados de novo e conflitavam consigo mesmos.
BASE="$(git merge-base HEAD "$PONTA" 2>/dev/null || git merge-base HEAD origin/main)"
NOVOS="$(git rev-list --count "$BASE..HEAD")"
echo "fila atual: $(git rev-list --count origin/main..$PONTA) commit(s) — meus novos: $NOVOS"
git rebase --onto "$PONTA" "$BASE" -q 2>/dev/null || {
  # conflito: arquivos de diario resolvem por uniao; qualquer outro para aqui
  while git status --short | grep -q '^UU'; do
    for f in $(git status --short | grep '^UU' | awk '{print $2}'); do
      case "$f" in docs/*.md)
        git show ":1:$f" > /tmp/b; git show ":2:$f" > /tmp/o; git show ":3:$f" > /tmp/t
        git merge-file -p --union /tmp/o /tmp/b /tmp/t > "$f"; git add "$f";;
      *) echo "CONFLITO REAL em $f — resolver a mao"; exit 1;;
      esac
    done
    GIT_EDITOR=true git rebase --continue -q
  done
}
# sprint-assinaturas #1 (02/09): o rebase pode FALHAR sem conflito (na OneDrive o
# .git recusa apagar .lock/rebase-merge e o git aborta com "could not detach
# HEAD"); o `|| { }` acima engolia isso e a linha abaixo movia a fila para um
# HEAD que NAO continha os commits alheios — foi assim que a fila perdeu 2
# commits às 22:40 de 01/09 (restaurados). Regra: só mover se a ponta atual for
# ancestral do meu HEAD; senão parar e mandar fazer em clone limpo em /tmp.
if ! git merge-base --is-ancestor "$PONTA" HEAD; then
  echo "ABORTADO: o rebase nao aplicou meus commits por cima de $(git rev-parse --short "$PONTA") — a fila NAO foi tocada."
  echo "Saida: git clone --shared --no-checkout <raiz> /tmp/x && cd /tmp/x && git checkout --detach $(git rev-parse --short "$PONTA") && git cherry-pick <meus shas> && git push <raiz> HEAD:refs/heads/entrega-atual --force"
  exit 1
fi
git -C "$COMUM/.." branch -f entrega-atual "$(git rev-parse HEAD)"
echo "enfileirado: entrega-atual = $(git rev-parse --short HEAD) — fila: $(git rev-list --count origin/main..HEAD)"
