// KINEO-ADMIN-PESSOA-1910 — o nome/e-mail de uma pessoa em qualquer lista do /admin vira o link da TELA DA PESSOA
// (/admin/people/<id>; sem id, o e-mail também abre). Só apresentação; o portão continua na página, no servidor.
// Escrever e-mail virou o botão pequeno ✉ ao lado (EmailBotao), para o clique no nome não abrir o Gmail.
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { hrefPessoa } from '@/lib/admin/pessoaTelaRegras'

export function PessoaLink({ id, email, children, style, title }: { id?: string | null; email?: string | null; children?: ReactNode; style?: CSSProperties; title?: string }) {
  const chave = (id ?? '').trim() || (email ?? '').trim()
  if (!chave) return <>{children ?? '—'}</>
  return (
    <Link href={hrefPessoa(chave)} prefetch={false} data-kineo="pessoa-link" title={title ?? 'Abrir a tela desta pessoa'} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(141,180,255,.45)', textUnderlineOffset: 3, ...style }}>
      {children ?? email ?? chave}
    </Link>
  )
}

export function EmailBotao({ email, assunto, title }: { email: string | null | undefined; assunto?: string; title?: string }) {
  const e = (email ?? '').trim()
  if (!e || !e.includes('@')) return null
  return (
    <a href={`mailto:${e}${assunto ? `?subject=${encodeURIComponent(assunto)}` : ''}`} data-kineo="email-botao" title={title ?? 'Escrever e-mail'} aria-label={`Escrever e-mail para ${e}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 20, padding: '0 5px', marginLeft: 6, borderRadius: 5, border: '1px solid rgba(141,180,255,.35)', color: '#8DB4FF', fontSize: 11, textDecoration: 'none', lineHeight: 1 }}>
      ✉
    </a>
  )
}

export default PessoaLink
