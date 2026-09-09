#!/usr/bin/env bash
# KINEO-PH-2026-09-10 — os pôsteres da grade da /ph, sem a marca antiga.
#
# Roda: bash scripts/ph-posters.sh
# Saída: public/posters/ph/<id>.webp — os 12 primeiros de FOUNDER_SHOWCASE,
#        com a faixa `usekineo.com/free` do topo cortada.
#
# POR QUÊ: os pôsteres de `public/posters/ex-<id>.webp` (480x854) foram tirados
# dos masters ANTES do corte, então trazem a marca do free tier no topo. A /ph
# diz, no mesmo scroll, "There is no free tier" — e mostrava a marca do free
# tier em doze cards. A proporção do corte é a mesma de todo material do kit:
# 144/1920 = 7,5% da altura, que em 854 dá 64 px.
#
# Os originais NÃO são tocados: outras telas (home, /examples) continuam com
# os arquivos de sempre, que são curadoria do fundador.
set -euo pipefail
cd "$(dirname "$0")/.."
D=public/posters/ph
mkdir -p "$D"

IDS=$(node -e "
const fs=require('fs');
const s=fs.readFileSync('lib/publicExamples.ts','utf8');
const i=s.indexOf('export const FOUNDER_SHOWCASE');
const bloco=s.slice(i, s.indexOf('] as const', i));
console.log([...bloco.matchAll(/id: '([0-9a-f-]{36})'/g)].map(m=>m[1]).slice(0,12).join('\n'));
")

n=0
for id in $IDS; do
  origem="public/posters/ex-$id.webp"
  if [ ! -s "$origem" ]; then echo "SEM POSTER: $id"; continue; fi
  ffmpeg -v error -y -i "$origem" -vf "crop=iw:ih-64:0:64" -quality 88 "$D/$id.webp"
  n=$((n + 1))
done
echo "$n posteres cortados em $D"
