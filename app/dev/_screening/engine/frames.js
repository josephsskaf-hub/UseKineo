import { BufferGeometry, Float32BufferAttribute, MeshBasicNodeMaterial } from 'three/webgpu'
import {
  abs,
  attribute,
  color,
  float,
  fract,
  max,
  mix,
  positionLocal,
  sin,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl'

// Each tile has independent vertices so the image can disassemble without stretching its neighbours.
export function mosaicGeometry(cols = 24, rows = 38) {
  const positions = [],
    centers = [],
    uvs = [],
    origins = []
  const corners = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
    [1, 1],
    [0, 1],
  ]
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      for (const [dx, dy] of corners) {
        const u = (x + dx) / cols,
          v = (y + dy) / rows
        positions.push(u - 0.5, v - 0.5, 0)
        centers.push((x + 0.5) / cols - 0.5, (y + 0.5) / rows - 0.5, 0)
        uvs.push(u, v)
        origins.push(0, 0, 0)
      }
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(positions, 3))
  g.setAttribute('centerTile', new Float32BufferAttribute(centers, 3))
  g.setAttribute('glyph', new Float32BufferAttribute(origins, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  g.computeBoundingSphere()
  return g
}

export function setWords(geometry, phrase) {
  const surface = document.createElement('canvas')
  surface.width = 640
  surface.height = 160
  const ctx = surface.getContext('2d', { willReadFrequently: true })
  const words = Array.from(phrase.trim() || 'First light')
    .slice(0, 27)
    .join('')
  ctx.fillStyle = '#fff'
  ctx.font = '700 94px Georgia'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(words, 320, 80, 600)
  const data = ctx.getImageData(0, 0, 640, 160).data
  const points = []
  for (let y = 0; y < 160; y += 2)
    for (let x = 0; x < 640; x += 2) {
      if (data[(640 * y + x) * 4 + 3] > 100) points.push([(x - 320) / 620, (80 - y) / 245])
    }
  if (!points.length) points.push([0, 0])
  const attr = geometry.getAttribute('glyph')
  const tiles = attr.count / 6
  for (let tile = 0; tile < tiles; tile++) {
    const [x, y] = points[Math.floor((tile * points.length) / tiles)]
    for (let v = 0; v < 6; v++) attr.setXYZ(tile * 6 + v, x, y, 0)
  }
  attr.needsUpdate = true
}

export function filmStock(map, tiled) {
  const material = new MeshBasicNodeMaterial({ toneMapped: false })
  const frame = uv()
  // Dark film rebate with warm perforations and a thin highlight along the aperture.
  const edge = abs(frame.sub(0.5))
  const opening = max(edge.x.div(0.43), edge.y.div(0.455))
  const gate = float(1).sub(smoothstep(0.993, 1, opening))
  const perforation = smoothstep(0.453, 0.458, edge.x)
    .mul(float(1).sub(smoothstep(0.477, 0.481, edge.x)))
    .mul(float(1).sub(smoothstep(0.2, 0.28, abs(fract(frame.y.mul(17)).sub(0.5)))))
  const border = mix(color('#222825'), color('#e3d8b6'), perforation)
  const imageUV = frame.sub(vec2(0.07, 0.045)).div(vec2(0.86, 0.91)).clamp(0.001, 0.999)
  // A landscape contact print uses the middle of the portrait reel.
  const sample = texture(map, tiled ? imageUV.mul(vec2(1, 0.34)).add(vec2(0, 0.33)) : imageUV)
  const print = mix(border, sample.rgb, gate)
  const progress = uniform(1)
  if (tiled) {
    const center = attribute('centerTile', 'vec3')
    const from = attribute('glyph', 'vec3').add(positionLocal.sub(center).mul(vec3(0.38, 0.32, 1)))
    const arc = sin(progress.mul(Math.PI))
      .mul(sin(center.x.mul(41).add(center.y.mul(73))))
      .mul(0.33)
    const curl = positionLocal.x.mul(positionLocal.x).mul(1.3).mul(progress)
    material.positionNode = mix(from, positionLocal, progress).add(vec3(0, 0, arc.add(curl)))
    material.colorNode = mix(color('#fff0bc'), print, smoothstep(0.13, 0.88, progress))
  } else material.colorNode = print
  return { material, progress }
}
