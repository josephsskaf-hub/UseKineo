// KINEO-ADMIN-JORNADA-1510 — as abas do topo da página principal do /admin (fundador 15/10: a jornada dos clientes
// como ABA NOVA da tela que ele abre ao entrar). "Visão geral" = /admin, intocada; "Clientes" = /admin/clientes
// (também /admin?aba=clientes). Cada aba é uma rota própria: a Visão geral não carrega nada da aba Clientes e vice-versa.
// Só apresentação; o portão de acesso continua em cada página, no servidor.
import Link from 'next/link'
import type { CSSProperties } from 'react'

export type AbaAdmin = 'visao' | 'clientes'
export const ADMIN_ABAS: ReadonlyArray<readonly [AbaAdmin, string, string]> = [
  ['visao', '/admin', 'Visão geral'],
  ['clientes', '/admin/clientes', 'Clientes'],
]

const aba: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '8px 14px', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', color: 'var(--muted)', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' }
const abaOn: CSSProperties = { ...aba, color: 'var(--accent)', borderBottomColor: 'var(--accent)' }

export default function AdminAbas({ atual }: { atual: AbaAdmin }) {
  return (
    <nav aria-label="Abas do painel" data-kineo="admin-abas" style={{ display: 'flex', gap: 4, padding: '10px clamp(16px, 3vw, 28px) 0', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {ADMIN_ABAS.map(([chave, href, rotulo]) => (
        <Link key={chave} href={href} prefetch={false} aria-current={atual === chave ? 'page' : undefined} style={atual === chave ? abaOn : aba}>{rotulo}</Link>
      ))}
    </nav>
  )
}
