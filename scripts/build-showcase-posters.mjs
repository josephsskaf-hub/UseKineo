// Offline, deterministic frame extraction from versioned public previews only.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const { trending } = JSON.parse(execFileSync(process.execPath, ['scripts/test-home-curation.mjs', '--data'], { encoding: 'utf8' }))
const root = path.resolve('public')
const output = path.join(root, 'posters', 'showcase-sep07')
fs.mkdirSync(output, { recursive: true })
for (const video of trending) {
  if (!/^[a-f0-9-]{36}$/.test(video.id) || !video.videoUrl.startsWith('/previews/')) throw Error('Unapproved source')
  const input = path.resolve(root, '.' + video.videoUrl)
  if (!input.startsWith(root + path.sep) || !fs.existsSync(input)) throw Error('Missing local preview')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-frames:v', '1', '-vf', 'scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2:color=0x11151c', '-quality', '82', path.join(output, video.id + '.webp')])
}
console.log(trending.length + ' posters generated; no network, database, or original-video writes.')
