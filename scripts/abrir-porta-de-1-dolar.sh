#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# KINEO-ABRIR-PORTA-1-DOLAR-2026-09-09 — o lançamento do Product Hunt (10/09
# 00:01 PT) manda TODO mundo para uma porta que hoje devolve erro.
#
# O DEFEITO: app/api/stripe/checkout/route.ts monta a taxa de entrada de $1 em
# `subscription_data.add_invoice_items`. Esse parâmetro NÃO existe na Checkout
# Session da Stripe. Resposta: "Received unknown parameter". Não é
# intermitente — é um objeto montado sempre igual, então TODO clique morre.
# Medido em produção 09/09: 31 `checkout_failed` (5 pessoas) e 0 pagamentos de
# trial na história da porta.
#
# O CONSERTO: commit 0f5a53e4 — a taxa vira um `line_item` avulso (o padrão
# "paid trial" da Stripe). Um arquivo, 27 linhas.
#
# POR QUE ISTO É UM SCRIPT E NÃO UM COMANDO SOLTO: `git cherry-pick 0f5a53e4`
# rodado na pasta C:\kineo cairia na main LOCAL, que está SUJA e parada num
# commit reprovado (727a869). Este script nunca toca a árvore principal: ele
# trabalha numa worktree isolada, exige tsc verde e os dois guardiões verdes
# ANTES de enfileirar, e para com a explicação na tela se algo falhar.
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail
# CONFERIR=1 faz tudo menos enfileirar. E como esta rotina provou o caminho
# inteiro sem publicar uma linha de app/api/ (caminho travado para ela).
CONFERIR="${CONFERIR:-0}"
RAIZ="/c/kineo"
WT_BASE="/c/kineo-wt/porta-1dolar"
FIX="0f5a53e4"

echo ""
echo "=== ABRIR A PORTA DE \$1 ============================================="
echo ""

cd "$RAIZ" || { echo "PAROU: nao achei C:\kineo"; exit 1; }
git fetch origin -q || { echo "PAROU: sem rede para o fetch"; exit 1; }

# ── 1. o conserto ja esta no ar? (rodar duas vezes nao pode fazer estrago)
# NAO usar "| grep -q" aqui. Com pipefail, o grep sai no primeiro acerto, o
# git show (160 KB, maior que o buffer do pipe) morre de SIGPIPE e o status da
# PIPELINE vira 141 — a condicao INVERTE. Medido em 09/09: a mesma main,
# fechada, respondeu "JA ESTA ABERTA" em 5 de 6 rodadas. Um falso "nada a
# fazer" aqui e o pior desfecho possivel: o fundador lanca com a porta trancada.
# grep -c le a entrada inteira e nao gera SIGPIPE.
MARCA="$(git show "origin/main:app/api/stripe/checkout/route.ts" 2>/dev/null | grep -c "add_invoice_items:")"
case "$MARCA" in
  ''|*[!0-9]*) echo "PAROU: nao consegui ler o checkout na origin/main."; exit 1;;
esac
if [ "$MARCA" -eq 0 ]; then
  echo "NADA A FAZER — a porta de \$1 JA ESTA ABERTA na main."
  echo "Confira com: node scripts/test-taxa-de-entrada-chega-na-stripe-2026-09-09.mjs"
  exit 0
fi
echo "[1/5] a porta esta fechada na main de origem. Seguindo."

# ── 2. worktree isolada, sempre do zero, nunca a arvore principal
# ESTE SCRIPT NUNCA APAGA NADA. A worktree e sempre NOVA, com o horario no
# nome. Motivo medido em 09/09: a juncao node_modules dentro de uma worktree
# NAO sai com rm -f, unlink nem find -delete (o Windows a trata como pasta), e
# um rm -rf por cima dela e o jeito conhecido de apagar C:\kineo\node_modules.
# Worktrees velhas em C:\kineo-wt\ sao inofensivas; apague a mao se incomodar.
WT="${WT_BASE}-$(date +%H%M%S)"
git worktree add --detach "$WT" origin/main -q || { echo "PAROU: nao consegui criar a worktree $WT"; exit 1; }
cd "$WT" || exit 1
# node_modules: JUNCAO, nao copia. Medido em 09/09: neste Windows o
# "ln -s" do git-bash nao cria link — ele COPIA 21.296 arquivos (0,31 GB) a
# cada rodada. mklink /J faz a juncao de verdade em um piscar. A copia fica
# como recuo, e o passo so segue depois de PROVAR que o tsc tem o que ler.
if [ ! -e node_modules ]; then
  cmd //c "mklink /J \"$(cygpath -w "$WT")\node_modules\" \"$(cygpath -w "$RAIZ")\node_modules\"" >/dev/null 2>&1
  [ -e node_modules/typescript/package.json ] || { rm -rf node_modules 2>/dev/null; cp -r "$RAIZ/node_modules" node_modules; }
fi
if [ ! -e node_modules/typescript/package.json ]; then
  echo "PAROU: sem node_modules utilizavel em $WT — o typecheck mentiria verde."
  exit 1
fi
echo "[2/5] worktree limpa em $WT sobre $(git rev-parse --short origin/main)"

# ── 3. o conserto
if ! git cherry-pick "$FIX" >/dev/null 2>&1; then
  echo ""
  echo "PAROU NO CONFLITO — o conserto nao aplicou sozinho na main de hoje."
  git status --short | grep '^UU' || true
  echo "Isso e decisao humana: avise no chat e NAO publique."
  git cherry-pick --abort >/dev/null 2>&1
  exit 1
fi
echo "[3/5] conserto aplicado: $(git rev-parse --short HEAD)"

# ── 4. as tres provas. Nenhuma delas e opcional.
echo "[4/5] conferindo (tsc + 2 guardioes) — leva ~2 min..."
if ! npx tsc --noEmit --incremental false; then
  echo ""; echo "PAROU: o typecheck ficou VERMELHO. Nada foi enfileirado."; exit 1
fi
for G in scripts/test-taxa-de-entrada-chega-na-stripe-2026-09-09.mjs \
         scripts/test-ph-kit-2026-09-09.mjs; do
  if ! node "$G" >/tmp/kineo-porta-guard.txt 2>&1; then
    echo ""; echo "PAROU: guardiao VERMELHO -> $G"; tail -12 /tmp/kineo-porta-guard.txt
    echo "Nada foi enfileirado."; exit 1
  fi
  echo "      verde: $(basename "$G")"
done

# -- 5. fila (nunca branch -f; nunca push direto)
if [ "$CONFERIR" = "1" ]; then
  echo ""
  echo "MODO CONFERIR: tudo verde ate aqui, e NADA foi enfileirado."
  echo "O conserto esta em $WT ($(git rev-parse --short HEAD))."
  exit 0
fi
echo "[5/5] enfileirando..."
if ! bash scripts/enfileirar.sh; then
  echo ""; echo "PAROU na fila. Nada foi perdido: o conserto esta em $WT."; exit 1
fi

echo ""
echo "===================================================================="
echo " PRONTO PARA SUBIR. Agora clique em SUBIR-SITE.bat (raiz da pasta)."
echo " Depois de subir, a prova em 5 minutos: nenhum checkout_failed novo"
echo " com 'add_invoice_items', e a porta de \$1 aceitando cartao."
echo "===================================================================="
