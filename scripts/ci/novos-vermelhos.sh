#!/usr/bin/env bash
# KINEO-FLUXO-1311 — "o que EU quebrei?": roda os guardiões de uma área no ramo atual e, só para os que ficaram vermelhos, roda de novo na
# origin/main. Imprime apenas os vermelhos NOVOS (verdes na main, vermelhos no ramo). Nasceu na madrugada de 13/11: 126 dos 278 guardiões de
# tela já são vermelhos na main (camadas antigas de desfaz), então "rodei e deu vermelho" não diz nada; a entrega do GPT subiu com 9 vermelhos
# novos escondidos nesse ruído e a CEO levou ~40 min para achá-los à mão. Com isto, quem entrega acha em ~10 min, antes de entregar.
#
# Uso (da raiz de uma worktree LIMPA, com o trabalho já commitado):
#   bash scripts/ci/novos-vermelhos.sh 'menu|nav|home|ads|recreate|clip|cartoon|footer|library'
#   bash scripts/ci/novos-vermelhos.sh 'k4|kling4|regua|despacho'        # motores
# Saída 0 = nenhum vermelho novo. Saída 1 = lista dos novos (com o log de cada um em $SAIDA). Saída 2 = não rodou (árvore suja, sem padrão).
# Não conserta nada e não mexe em arquivo: só troca de commit (HEAD → origin/main → HEAD) com a árvore limpa.
set -uo pipefail
padrao=${1:?informe o padrão (regex) dos nomes dos testes, ex.: 'menu|home|ads'}
em_paralelo=${PARALELO:-4}
# KINEO-MOVIMENTO-ANTES-DO-CLIENTE-1411 [CEO 14/11 10:55: sugestão aceita] — era 180: com 4 em paralelo, test-cartoon-tela-0411 (2 min 9 s sozinho)
# passava de 180 s e virava um vermelho falso. 420 s = ~3 vezes o mais lento medido; o teto continua valendo para o teste que trava de verdade.
teto=${TETO_SEGUNDOS:-420}
SAIDA=${SAIDA:-$(mktemp -d)}
mkdir -p "$SAIDA"
if [[ -n "$(git status --porcelain)" ]]; then echo "árvore suja: faça commit (ou um WIP) antes; nada rodou"; exit 2; fi
ramo=$(git symbolic-ref --quiet --short HEAD || git rev-parse HEAD)
git fetch -q origin || { echo "git fetch falhou"; exit 2; }
ls scripts | grep -E '^test' | grep -Ei "$padrao" > "$SAIDA/lista.txt"
total=$(wc -l < "$SAIDA/lista.txt")
(( total > 0 )) || { echo "nenhum teste casa com: $padrao"; exit 2; }
roda() { # roda <lista> <pasta de logs> <arquivo de resultado>
  mkdir -p "$2"
  export SAIDA_LOGS="$2" TETO="$teto"
  # shellcheck disable=SC2016
  xargs -P "$em_paralelo" -I{} bash -c 't="{}"; timeout "$TETO" npx tsx "scripts/$t" > "$SAIDA_LOGS/$t.log" 2>&1; echo "$t $?"' < "$1" | sort > "$3"
}
voltar() { git checkout -q "$ramo" 2>/dev/null; }
trap voltar EXIT
echo "1/2 · $total testes no ramo ($ramo)…"
roda "$SAIDA/lista.txt" "$SAIDA/ramo" "$SAIDA/ramo.txt"
grep -v ' 0$' "$SAIDA/ramo.txt" | cut -d' ' -f1 > "$SAIDA/vermelhos-ramo.txt"
vr=$(wc -l < "$SAIDA/vermelhos-ramo.txt")
if (( vr == 0 )); then echo "tudo verde no ramo: nenhum vermelho novo"; exit 0; fi
echo "2/2 · $vr vermelhos no ramo; rodando esses na origin/main…"
git checkout -q --detach origin/main || { echo "não consegui ir para a origin/main"; exit 2; }
roda "$SAIDA/vermelhos-ramo.txt" "$SAIDA/main" "$SAIDA/main.txt"
voltar
grep -v ' 0$' "$SAIDA/main.txt" | cut -d' ' -f1 > "$SAIDA/vermelhos-main.txt"
comm -23 <(sort "$SAIDA/vermelhos-ramo.txt") <(sort "$SAIDA/vermelhos-main.txt") > "$SAIDA/novos.txt"
novos=$(wc -l < "$SAIDA/novos.txt")
echo "já vermelhos na main: $(wc -l < "$SAIDA/vermelhos-main.txt") · vermelhos NOVOS: $novos"
if (( novos > 0 )); then
  while IFS= read -r t; do echo "  ✗ $t  (log: $SAIDA/ramo/$t.log)"; done < "$SAIDA/novos.txt"
  echo "Reancore sem afrouxar (o teste diz o que protege) ou conserte o código. Entrega com vermelho novo volta."
  exit 1
fi
echo "nenhum vermelho novo"
