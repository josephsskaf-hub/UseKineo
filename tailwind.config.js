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
      /* KINEO-UI-DIARIO-2026-08-18 — item 24 do roadmap Higgsfield.
         A QUARTA LINGUAGEM DE TIMING NAO ESTAVA EM ARQUIVO NENHUM, ESTAVA
         NO DEFAULT DESTE CONFIG. As classes Tailwind (`transition*`,
         `duration-*`, `ease-*`) sao 289 ocorrencias em `app/`+`components/`
         e NAO passam por `transition:` em CSS nenhum — grep por token nunca
         as alcanca, exatamente como o raio do item 22. Sem estas duas chaves
         elas rodavam no default do Tailwind: 150ms e cubic-bezier(.4,0,.2,1),
         uma TERCEIRA curva que nao existe em arquivo nosso.
         Medido no DOM de producao em 18/08, antes da mudanca: /pricing tem
         31 elementos animados e **31 de 31 na curva do Tailwind**, zero nos
         nossos tokens; /studio tem 10. Ou seja o teste 4 do dia 20
         ("<=3 duracoes + 2 easings nomeados") podia dar VERDE com a pagina de
         precos inteira rodando numa curva de terceiro.
         O MAPA, e por que ele nao e o que o backlog escreveu em 15/08:
         - DEFAULT 150ms -> --dur-fast (150ms): DELTA ZERO. E o balde grande
           (todo `transition`/`transition-all`/`transition-colors` sem
           `duration-*`), entao a mudanca de maior alcance do roadmap nao move
           um milissegundo. O ganho e de acoplamento: no dia em que --dur-fast
           mudar, estes 289 lugares mudam junto em vez de rachar a UI em duas
           velocidades.
         - 200 -> --dur-fast (150ms, -50ms) e 300 -> --dur-base (250ms, -50ms)
           pela REGRA DETERMINISTICA da casa (globals.css, 15/08): <=0.2s vira
           fast, 0.22-0.3s vira base, >=0.35s vira slow. O backlog propunha
           200->base (+50ms); a regra e posterior e vence — e o teto de 50ms
           por colagem e respeitado nos dois.
         - 700 FICA DE FORA, de proposito: `duration-700` tem 1 uso
           (ViralScore.tsx:208, a barra que cresce na frente da pessoa) e
           mapea-lo para --dur-slow seria -300ms, seis vezes o teto de 50ms.
           Isso nao e consolidacao, e redesign — decisao do fundador, nao de
           sprint.
         - `out` -> --ease-out-expo alcanca as 22 `ease-out` do repo. `in-out`
           (18 usos) FICA no default porque a casa nao tem token de in-out:
           forcar --ease-swift (que e curva de saida) seria trocar o
           comportamento de 18 elementos sem token que justifique. Fica
           registrado no backlog como o resto medido deste item.
         Fallback dentro do var() pelo mesmo motivo do item 22: se o :root
         perder o token, `transition-duration: var(--dur-fast)` seria invalido
         e a declaracao cairia — com fallback o pior caso e o valor de hoje. */
      transitionDuration: {
        DEFAULT: 'var(--dur-fast, 150ms)',
        200: 'var(--dur-fast, 150ms)',
        300: 'var(--dur-base, 250ms)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease-swift, cubic-bezier(.2,0,0,1))',
        out: 'var(--ease-out-expo, cubic-bezier(.16,1,.3,1))',
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
