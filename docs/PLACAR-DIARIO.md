# PLACAR DIÁRIO — Kineo

A tabela que responde "estamos evoluindo?". Uma linha por dia, sempre as mesmas
colunas. Quando o fundador pedir "os números", esta é a tabela que ele recebe,
com o dia novo adicionado e uma linha de leitura.

Colunas:
- **Cadastros** — perfis novos no dia
- **Trials** — quantos desses ganharam trial (desde 07/08, todo cadastro ganha)
- **Gerando** — pessoas distintas que apertaram gerar
- **Vídeos** — vídeos entregues no dia
- **Falhas** — gerações que falharam (o termômetro de saúde)
- **Checkouts** — pessoas que abriram a tela de pagamento
- **Pagos** — pagamentos concluídos

| Dia | Cadastros | Trials | Gerando | Vídeos | Falhas | Checkouts | Pagos | Nota do dia |
|---|---|---|---|---|---|---|---|---|
| 05/08 | 16 | 0 | 20 | 21 | 5 | 2 | 0 | modelo antigo (3 grátis/24h) |
| 06/08 | 4 | 0 | 14 | 21 | 0 | 1 | 0 | véspera do trial |
| 07/08 | 8 | 7 | 11 | 15 | 3 | 2 | 0 | **Reverse Trial ligado** |
| 08/08 | 36 | 36 | 36 | 50 | 1 | 1 | 0 | recorde de cadastros e vídeos |
| 09/08 | 39 | 39 | 35 | 30 | 20 | 5 | 0 | apagão Creatomate começa 17h |
| 10/08 | 22 | 21 | 25 | **0** | **63** | 5 | **1** | apagão o dia todo; 1ª conversão (durante o apagão) |
| 11/08 | 14 | 14 | 20 | 25 | 3 | 4 | 0 | Creatomate 30K; produto normalizado |
| 12/08 | 13 | 13 | 13 | 17 | 0 | 3 | 0 | B2B no ar; roadmap Higgsfield começa |
| 13/08 | 16 | 16 | 14 | 19 | 0 | 4 | 0 | semanas 1-2 do roadmap completas |
| 14/08 | 17 | 17 | 13 | 17 | 0 | 2 | 0 | dia das 12 ondas (113+ tasks); parcial até ~16h |

## Acumulados (em 11/08, fim do dia)

| Métrica | Valor |
|---|---|
| Perfis na história | ~1.080 |
| Trials ativos agora | 107 |
| Convertidos do trial | 1 |
| Pagantes na história | 8 |
| MRR nominal | ~$44,70 (renovações de setembro sobem para preço cheio) |
| E-mails da régua enviados | 186 |

## Como ler a evolução

1. **Cadastros**: antes do trial, média ~9/dia. Depois, ~28/dia. O trial
   triplicou a entrada sem um dólar de mídia.
2. **Falhas** é o termômetro: >10 num dia = fornecedor ou bug. O alarme de
   fornecedor (11/08) agora avisa em 1h.
3. **Checkouts vs Pagos** é o degrau que decide a empresa: 20 checkouts na
   semana, 1 pagamento. É onde o funil mestre mandou atacar.
4. A relação **Gerando/Cadastros** perto de 1 = quem entra, usa. Está saudável
   desde o trial.

## Processo

- Fonte: queries no Supabase (events, profiles, videos). Nunca estimado.
- Dia contaminado por incidente ganha nota — comparar 10/08 com um dia normal
  é se enganar.
- Quando o fundador pedir os números: rodar a query do dia, adicionar a linha,
  responder com a tabela e UMA linha de leitura (o que mudou e por quê).
| 15/08 | 6 signups | 10 videos | 0 falhas | 14 checkouts | dia da VITRINE: home vira showcase de motores, 20 melhores no /examples, previews sem travar |
