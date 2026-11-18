import assert from 'node:assert/strict'
import { clipPhotoProblem } from '../lib/clips/clipPhotoInput.ts'

let dimensions = [0, 0]
let revoked = 0
const revoke = URL.revokeObjectURL
URL.revokeObjectURL = (url) => {
  revoked++
  revoke(url)
}
globalThis.Image = class {
  async decode() {
    if (!dimensions) throw new Error('Invalid image')
    ;[this.naturalWidth, this.naturalHeight] = dimensions
  }
}

const file = new File(['test bytes'], 'test.jpg', { type: 'image/jpeg' })
const cases = [
  [[720, 1280], null],
  [[1280, 720], null],
  [[400, 1000], null],
  [[1000, 400], null],
  [[399, 1000], 'aspect'],
  [[1000, 399], 'aspect'],
  [[0, 1000], 'unreadable'],
  [null, 'unreadable'],
]
for (const [size, expected] of cases) {
  dimensions = size
  assert.equal(await clipPhotoProblem(file), expected, JSON.stringify(size))
}
dimensions = [1000, 399]
assert.equal(await clipPhotoProblem(file, false), null)
dimensions = null
assert.equal(await clipPhotoProblem(file, false), 'unreadable')
assert.equal(revoked, cases.length + 2)
console.log('PASS: landscape, portrait, inclusive limits, extreme ratios, corrupt input and URL cleanup.')
