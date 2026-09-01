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
BASE="$(git merge-base HEAD origin/main)"
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
git -C "$COMUM/.." branch -f entrega-atual "$(git rev-parse HEAD)"
echo "enfileirado: entrega-atual = $(git rev-parse --short HEAD) — fila: $(git rev-list --count origin/main..HEAD)"
