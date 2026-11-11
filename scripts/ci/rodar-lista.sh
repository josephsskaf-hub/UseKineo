#!/usr/bin/env bash
# PLATAFORMA-PORTAO-1111 — roda uma lista de comandos de teste, um por vez, SEM parar no primeiro vermelho.
# Uso: bash scripts/ci/rodar-lista.sh scripts/ci/portao.txt
# Teto por comando: TETO_SEGUNDOS (padrão 300). Cada linha da lista é um comando (linhas vazias e # são ignoradas). Linha que termina em "  # MUTANTE-DEVE-FALHAR"
# passa só se o comando FALHAR (o mutante foi pego). No fim: tabela no resumo do GitHub e saída 1 se algum falhou.
set -uo pipefail
lista=${1:?informe a lista}
falhas=0; total=0
resumo=${GITHUB_STEP_SUMMARY:-/dev/null}
printf '### %s\n\n| Resultado | Segundos | Comando |\n|---|---|---|\n' "$lista" >> "$resumo"
while IFS= read -r linha || [[ -n "$linha" ]]; do
  linha=${linha%$'\r'}
  [[ -z "${linha// }" || "$linha" == \#* ]] && continue
  inverte=0
  if [[ "$linha" == *"# MUTANTE-DEVE-FALHAR" ]]; then inverte=1; linha=${linha%%  # MUTANTE-DEVE-FALHAR}; fi
  total=$((total+1))
  inicio=$(date +%s)
  echo "::group::$linha"
  timeout "${TETO_SEGUNDOS:-300}" bash -c "$linha"; codigo=$?
  echo "::endgroup::"
  dur=$(( $(date +%s) - inicio ))
  if (( inverte )); then (( codigo != 0 )) && codigo=0 || codigo=1; fi
  if (( codigo == 0 )); then
    printf '| ✅ | %s | `%s` |\n' "$dur" "$linha" >> "$resumo"
  else
    falhas=$((falhas+1))
    echo "::error::FALHOU ($dur s): $linha"
    printf '| ❌ | %s | `%s` |\n' "$dur" "$linha" >> "$resumo"
  fi
done < "$lista"
printf '\n%s de %s passaram.\n' "$((total-falhas))" "$total" | tee -a "$resumo"
(( falhas == 0 ))
