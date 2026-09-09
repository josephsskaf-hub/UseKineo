#!/usr/bin/env bash
# KINEO-PH-2026-09-10 — baixa os masters da vitrine do fundador e corta os
# quadros usados pela galeria e pelo vídeo do Product Hunt.
#
# Roda: bash scripts/ph-quadros.sh
# Saída: .ph-build/ (não versionado) com os masters e os quadros já sem a
#        faixa da marca antiga "usekineo.com/free" no topo.
#
# O crop é o mesmo em TODO material que sai daqui: crop=1080:1776:0:144.
# Os ids são de lib/publicExamples.ts FOUNDER_SHOWCASE; as URLs são as dos
# masters públicos no bucket `renders` da conta do fundador.
set -euo pipefail
cd "$(dirname "$0")/.."
T=.ph-build
mkdir -p "$T"
B=https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756

baixa() { # nome arquivo-no-bucket
  [ -s "$T/$1.mp4" ] || curl -sS -o "$T/$1.mp4" "$B/$2.mp4"
}
# nome        arquivo                                showcase id / motor
baixa robo      97bc70d7-8304-4ed1-b178-ecceed207db2 # 36a04f7b… Omni Flash
baixa dyatlov   9d2a0570-407b-464b-b0bc-9286ac1c77f4 # f3de57b0… Kling 2.5
baixa celeste   7358f2e6-9b29-40d0-9ea5-02181eb8e18e # cbd676d0… Seedance 1.5
baixa maracaibo af157928-6c82-420a-b23a-b88554246b43 # 4b12925e… Kling 3
baixa tunguska  9d3890f8-d421-4fca-82ed-5c878deb6f62 # 1b8e12f9… Omni Flash

CROP="crop=1080:1776:0:144"
quadro() { ffmpeg -v error -y -ss "$2" -i "$T/$1.mp4" -frames:v 1 -vf "$CROP" "$T/$3"; }
quadro robo      13.6 robo.png
quadro robo      20.4 robo2.png
quadro dyatlov    0.6 dyatlov.png
quadro celeste   30.2 celeste.png
quadro maracaibo 12.2 maracaibo.png

# A tela pública real usada no painel 3: a home, capturada deslogada.
# `pwd -W` porque o Edge é um binário do Windows e não entende /c/kineo-wt/...
W="$(pwd -W)/$T"
powershell -NoProfile -Command "Start-Process -FilePath 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' -ArgumentList '--headless','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1142,860','--virtual-time-budget=15000','--user-data-dir=$W/edge','--screenshot=$W/home.png','https://www.usekineo.com/' -Wait"

ls -la "$T"/*.png
