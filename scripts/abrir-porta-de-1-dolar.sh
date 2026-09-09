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
RAIZ="/c/kineo"
WT="/c/kineo-wt/porta-1dolar"
FIX="0f5a53e4"

echo ""
echo "=== ABRIR A PORTA DE \$1 ============================================="
echo ""

cd "$RAIZ" || { echo "PAROU: nao achei C:\kineo"; exit 1; }
git fetch origin -q || { echo "PAROU: sem rede para o fetch"; exit 1; }

# ── 1. o conserto ja esta no ar? (rodar duas vezes nao pode fazer estrago)
if ! git show "origin/main:app/api/stripe/checkout/route.ts" | grep -q "add_invoice_items:"; then
  echo "NADA A FAZER — a porta de \$1 JA ESTA ABERTA na main."
  echo "Confira com: node scripts/test-taxa-de-entrada-chega-na-stripe-2026-09-09.mjs"
  exit 0
fi
echo "[1/5] a porta esta fechada na main de origem. Seguindo."

# ── 2. worktree isolada, sempre do zero, nunca a arvore principal
# ATENCAO: a juncao node_modules sai ANTES do rm -rf. A casa ja perdeu
# C:\kineo\node_modules por um rm -rf que atravessou a juncao de uma worktree.
if [ -e "$WT/node_modules" ]; then
  rm -f "$WT/node_modules" 2>/dev/null || rmdir "$WT/node_modules" 2>/dev/null
fi
if [ -e "$WT/node_modules" ]; then
  echo "PAROU: nao consegui desfazer a juncao $WT/node_modules."
  echo "Apagar assim arriscaria C:\kineo\node_modules. Remova a mao e rode de novo."
  exit 1
fi
git worktree remove --force "$WT" >/dev/null 2>&1
rm -rf "$WT" 2>/dev/null
git worktree add --detach "$WT" origin/main -q || { echo "PAROU: nao consegui criar a worktree $WT"; exit 1; }
cd "$WT" || exit 1
[ -e node_modules ] || ln -s "$RAIZ/node_modules" node_modules
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

# ── 5. fila (nunca branch -f; nunca push direto)
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
