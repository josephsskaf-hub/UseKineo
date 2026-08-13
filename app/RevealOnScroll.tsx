'use client'

// KINEO-HIGGSFIELD-20D dia 5 (13/08) — fade-up das secoes ao rolar.
// Progressive enhancement de verdade: o HTML chega 100% visivel; este
// componente so esconde (classe .rv) o que esta ABAIXO da dobra no momento do
// mount, e o IntersectionObserver revela (.rv-in) uma unica vez por secao.
// Sem JS, sem observer, com reduced-motion: nada muda, tudo visivel.
// So opacity/transform → CLS zero. Rollback: remover <RevealOnScroll /> do
// KineoLanding + 2 regras CSS.
import { useEffect } from 'react'

const SELECTORS =
  '.klp .sec-h, .klp .steps, .klp .cmp, .klp .tools, .klp .price, .klp .snote, .klp .faq, .klp .final'

export default function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS)).filter(
      // O que ja esta na tela (ou quase) nao pisca — so anima o que ainda vem.
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.85,
    )
    if (els.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).classList.add('rv-in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    els.forEach((el) => {
      el.classList.add('rv')
      io.observe(el)
    })
    return () => io.disconnect()
  }, [])
  return null
}
