#!/usr/bin/env bash
# Safe queue candidate. Reconcile/test the current main and queue explicitly.
set -euo pipefail
die() { printf 'ABORTADO: %s\n' "$*" >&2; exit 1; }
[[ -z "${GIT_INDEX_FILE:-}" ]] || die 'GIT_INDEX_FILE definido'
branch=$(git symbolic-ref --quiet --short HEAD) || die 'HEAD destacado'
[[ "$branch" == codex/* ]] || die 'use uma branch codex propria'
[[ -z "$(git status --porcelain)" ]] || die 'worktree ou indice sujo'
[[ -z "$(git ls-files -u)" ]] || die 'conflitos no indice'
for operation in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
  [[ ! -e "$(git rev-parse --git-path "$operation")" ]] || die 'operacao Git pendente'
done
queue_ref=refs/heads/entrega-atual
git worktree list --porcelain | grep -Fxq "branch $queue_ref" && die 'fila aberta em worktree'
queue=$(git rev-parse --verify "$queue_ref^{commit}") || die 'fila inexistente'
approved=$(git rev-parse --verify HEAD^{commit})
remote=$(git ls-remote --exit-code origin refs/heads/main) || die 'remoto indisponivel'
remote=${remote%%$'\t'*}
[[ "$remote" =~ ^[0-9a-f]{40}$ ]] || die 'SHA remoto invalido'
git cat-file -e "$remote^{commit}" || die 'atualize a base e teste antes de enfileirar'
git merge-base --is-ancestor "$remote" "$approved" || die 'main nao incluida no candidato'
git merge-base --is-ancestor "$queue" "$approved" || die 'fila nao incluida no candidato'
[[ "$queue" != "$approved" ]] || { printf 'NADA PENDENTE: %s\n' "$approved"; exit 0; }
# Atomic compare-and-swap: a concurrent writer wins or this operation aborts.
git update-ref -m 'kineo: enqueue reviewed candidate' "$queue_ref" "$approved" "$queue" \
  || die 'fila mudou; nenhum trabalho alheio foi substituido'
printf 'ENFILEIRADO: %s (base remota conferida: %s)\n' "$approved" "$remote"
