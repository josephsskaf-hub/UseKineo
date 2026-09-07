$ErrorActionPreference = 'Stop'
$repoPath = Split-Path $PSScriptRoot -Parent
$entries = Get-Content -LiteralPath (Join-Path $repoPath 'docs/curation-approved-2026-09-07.json') -Raw | ConvertFrom-Json
$outputPath = Join-Path $repoPath 'public/previews/curation-sep07'
$sheetPath = Join-Path $repoPath 'docs/previews/curation-frames'
New-Item -ItemType Directory -Force -Path $outputPath,$sheetPath | Out-Null
foreach ($entry in $entries) {
  $id = $entry.id
  $vertical = Join-Path $outputPath "$id-v.mp4"
  if (-not (Test-Path -LiteralPath $vertical)) {
    & ffmpeg -hide_banner -loglevel error -nostdin -ss $entry.startSeconds -i $entry.source -t $entry.durationSeconds -an -vf 'scale=540:-2:flags=lanczos,fps=24,setsar=1' -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -movflags +faststart -threads 2 $vertical
    if ($LASTEXITCODE -ne 0) { throw "Video extraction failed: $id" }
  }
  & ffmpeg -hide_banner -loglevel error -nostdin -y -i $vertical -vf 'fps=1/2,scale=180:-2,tile=3x1' -frames:v 1 (Join-Path $sheetPath "$id.jpg")
  if ($LASTEXITCODE -ne 0) { throw "Contact sheet failed: $id" }
  Write-Output "Prepared $id"
  # Preserve the portrait subject in a 16:9 card. Only the side fill is
  # blurred; the foreground is a sharp upper-body crop, not an upscale.
  $horizontal = Join-Path $outputPath "$id-h.mp4"
  & ffmpeg -hide_banner -loglevel error -nostdin -y -i $vertical -filter_complex '[0:v]split=2[bg][fg];[bg]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,boxblur=30:2,eq=brightness=-0.15[back];[fg]crop=iw:648:0:0,scale=-2:540:flags=lanczos[front];[back][front]overlay=(W-w)/2:0,setsar=1[out]' -map '[out]' -an -c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p -movflags +faststart -threads 2 $horizontal
  if ($LASTEXITCODE -ne 0) { throw "Horizontal extraction failed: $id" }
  & ffmpeg -hide_banner -loglevel error -nostdin -y -i $horizontal -frames:v 1 -quality 85 (Join-Path $outputPath "$id-h.webp")
  if ($LASTEXITCODE -ne 0) { throw "Poster failed: $id" }
}
