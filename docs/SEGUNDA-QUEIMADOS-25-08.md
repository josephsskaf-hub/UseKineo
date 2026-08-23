# Segunda-feira 25/08 — os 21 queimados do incidente

## O contexto em três linhas

Em 21/08, um cron com deduplicação quebrada mandou **8 e-mails idênticos** para
29 pessoas — os leads mais quentes do banco. 21 delas também estão na coorte
FIRST50. Seguramos o e-mail delas de propósito: **o valor da desculpa depende
do silêncio antes dela**. Segunda completa 4 dias de silêncio.

## O que o e-mail delas tem de diferente

A rota já cuida de tudo (`segment=queimados`):

- **Assunto:** "Sorry about the repeated emails — and 50% off if you still want it"
- **Primeira linha é a desculpa**, antes de qualquer venda: *"A bug on our
  side sent you the same email several times. That was our mistake, not a
  marketing choice, and it's fixed."*
- Depois a mesma oferta dos limpos: conta de $/filme + FIRST50.

Por que desculpa primeiro: ordem invertida ("oferta... aliás, desculpa") lê
como desculpa de conveniência. E o único e-mail que já converteu na história
das nossas campanhas foi justamente o que pedia desculpa sem vender
(blackout winback, 1 venda em 46 — todas as outras campanhas: 0).

## Seus dois cliques (logado como admin)

**1º — dry-run (não envia nada, lista quem receberia):**
```
https://www.usekineo.com/api/admin/send-first50-quentes?segment=queimados
```
Esperado: `eligible` em torno de **21** (pode variar um pouco — a janela de
10 dias anda, e quem já recebeu qualquer FIRST50 é excluído automaticamente).

**2º — se a lista fizer sentido, disparar:**
```
https://www.usekineo.com/api/admin/send-first50-quentes?segment=queimados&confirm=SEND
```

Depois me avisa — eu confirmo os carimbos no banco (um por pessoa, zero
duplicata), igual fizemos com os limpos.

## Salvaguardas já embutidas (nada a fazer)

- Coorte calculada **no banco** (a lição do truncamento de sábado)
- Dedupe fail-closed: erro em qualquer leitura → aborta, não manda
- Quem já recebeu o e-mail dos limpos não recebe este
- Sem cron: só dispara quando VOCÊ clicar
