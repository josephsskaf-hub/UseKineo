#!/usr/bin/env bash
# Called by !RODAR-AGORA.bat REVEWED_CANDIDATE_SHA REVIEWED_MAIN_SHA.
# No cleanup, changing local heads, retries, or implicit reconciliation.
set -euo pipefail
die() { printf 'ABORTADO: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 3 ]] || die 'informe raiz e dois SHAs completos revisados'
[[ -z "${GIT_INDEX_FILE:-}" ]] || die 'GIT_INDEX_FILE definido'
cd "$1"
approved=$2
base=$3
[[ "$approved" =~ ^[0-9a-f]{40}$ && "$base" =~ ^[0-9a-f]{40}$ ]] \
  || die 'SHAs completos obrigatorios'
read_main() {
  local line
  line=$(git ls-remote --exit-code origin refs/heads/main) || return 1
  [[ "$line" =~ ^([0-9a-f]{40})[[:space:]]+refs/heads/main$ ]] || return 1
  printf '%s' "${BASH_REMATCH[1]}"
}
queue=$(git rev-parse --verify 'refs/heads/entrega-atual^{commit}') || die 'fila inexistente'
[[ "$queue" == "$approved" ]] || die 'fila mudou ou candidato nao enfileirado'
remote=$(read_main) || die 'remoto indisponivel ou resposta invalida'
[[ "$remote" == "$base" ]] || die 'main mudou; reconciliar e repetir gates'
git merge-base --is-ancestor "$base" "$approved" || die 'candidato nao inclui main'
# Recheck immediately before pushing an immutable object, never a moving ref.
[[ "$(git rev-parse --verify 'refs/heads/entrega-atual^{commit}')" == "$approved" ]] \
  || die 'fila mudou durante verificacao'
remote=$(read_main) || die 'remoto indisponivel'
[[ "$remote" == "$base" ]] || die 'main mudou durante verificacao'
[[ "$approved" != "$base" ]] || { printf 'NADA PENDENTE\n'; exit 0; }
# Normal push retains server FF enforcement. A later queue entry is not sent;
# a divergent concurrent main is rejected, never overwritten or reconciled.
git push origin "$approved:refs/heads/main" || die 'push recusado; sem retry ou reconciliacao'
actual=$(read_main) || die 'push terminou; verificacao indisponivel, estado INCERTO'
[[ "$actual" == "$approved" ]] || die 'ponta apos push difere; estado INCERTO, conferir sem reenviar'
printf 'PUBLICADO NO GIT: %s. Validacao de deploy pendente.\n' "$approved"
