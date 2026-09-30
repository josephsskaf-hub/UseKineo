import { BlockList, isIP } from 'node:net'
import egress from './openaiEgress.json'

const openaiNetworks = new BlockList()
for (const cidr of egress.prefixes) {
  const [address, prefix] = cidr.split('/')
  openaiNetworks.addSubnet(address, Number(prefix), isIP(address) === 6 ? 'ipv6' : 'ipv4')
}

/** Only Vercel's overwritten proxy header can establish the network source.
 * Metadata is an abuse-limit hint, never authentication or account ownership.
 * A stale egress list safely falls back to the shared IP bucket. */
export function chatgptRateIdentity(
  headers: Headers, meta: Record<string, unknown> | undefined, onVercel: boolean,
): { ip: string | null; key: string } {
  let ip = onVercel ? headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() ?? null : null
  if (ip?.startsWith('::ffff:') && isIP(ip.slice(7)) === 4) ip = ip.slice(7)
  if (!ip || !isIP(ip)) ip = null
  const subject = meta?.['openai/subject']
  const trusted = ip && openaiNetworks.check(ip, isIP(ip) === 6 ? 'ipv6' : 'ipv4')
  if (trusted && typeof subject === 'string' && subject.length > 0 && subject.length <= 256 && !/[\u0000-\u001f]/.test(subject)) {
    return { ip, key: `chatgpt:subject:${subject}` }
  }
  return { ip, key: `chatgpt:ip:${ip ?? 'unknown'}` }
}
