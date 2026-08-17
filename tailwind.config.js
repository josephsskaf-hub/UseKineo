/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* KINEO-UI-DIARIO-2026-08-17 — item 22 do roadmap Higgsfield.
         A SEGUNDA LINGUAGEM DE RAIO NAO ESTAVA NOS ARQUIVOS, ESTAVA AQUI.
         `app/globals.css` da `font-size:14px` para html/body, entao 1rem = 14px
         e a escala inteira do Tailwind roda a 87,5%: medido no DOM de producao
         em 17/08, `rounded-lg` pinta 7px, `rounded-xl` 10.5px, `rounded-2xl` 14px,
         `rounded-3xl` 21px, `rounded-md` 5.25px — NENHUM deles existe na escala de
         tokens (8/13/18/22/999). Tokenizar arquivo por arquivo (item 11) nunca ia
         alcancar essas classes porque elas nao passam por `border-radius:` nenhum:
         passam por ESTE config. Sao 546 ocorrencias no HEAD de hoje (236 xl +
         172 2xl + 111 lg + 18 md + 9 3xl); `rounded-full` (107) ja concorda com
         --r-pill e fica FORA deste mapa, de proposito.
         Deltas medidos: 2xl 14→13 e 3xl 21→22 sao invisiveis; o balde grande e
         xl 10.5→13. Verificado antes/depois no DOM de producao com a mesma regra
         injetada: em /pricing os elementos FORA da escala caem de 17 para 3
         (os 3 que sobram sao 14px literais em CSS, nao Tailwind) e o numero de
         raios distintos cai de 5 para 4, sem diferenca visivel na pagina.
         O fallback dentro do var() e proposital: se um dia o :root perder o token,
         `border-radius: var(--r-sm)` seria invalido e colapsaria para 0px em
         centenas de elementos — com fallback o pior caso e voltar ao valor de hoje.
         NAO mexer no `font-size:14px` do html sem item dedicado: subir para 16px
         re-escalaria espacamento e tipografia do app inteiro de uma vez. */
      borderRadius: {
        md: 'var(--r-xs, 8px)',
        lg: 'var(--r-xs, 8px)',
        xl: 'var(--r-sm, 13px)',
        '2xl': 'var(--r-sm, 13px)',
        '3xl': 'var(--r-lg, 22px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bg: '#05070D',
        bg2: '#0B1020',
        bg3: '#0B1020',
        card: '#151C2F',
        card2: '#151C2F',
        sidebar: '#0B1020',
        cyberBlue: {
          bg: '#05070D',
          bgSecondary: '#0B1020',
          card: '#151C2F',
          accent: '#3B82F6',
          glow: '#22D3EE',
          cta: '#2563EB',
        },
        indigo: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#1D4ED8',
        },
        purple: {
          DEFAULT: '#3B82F6',
          light: '#22D3EE',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #2563EB 0%, #3B82F6 55%, #22D3EE 100%)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(34,211,238,.18)',
        'glow-lg': '0 0 80px rgba(59,130,246,.25), 0 0 160px rgba(34,211,238,.08)',
      },
      animation: {
        'btn-pulse': 'btn-pulse 2.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.35s ease forwards',
        'spin-slow': 'spin 1.1s linear infinite reverse',
      },
      keyframes: {
        'btn-pulse': {
          '0%, 100%': { boxShadow: '0 4px 22px rgba(59,130,246,.28), 0 0 0px rgba(34,211,238,0)' },
          '50%': { boxShadow: '0 4px 38px rgba(59,130,246,.6), 0 0 32px rgba(34,211,238,.38)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
