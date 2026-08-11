# A COORTE INVISÍVEL: 52 pessoas de alta intenção que o funil não vê

**Sprint 10h de 11/08 · tarefa de aquisição (trilha Analytics/Funil)**
Medido em produção (`cqqukkvjjrguayiyjvhh`), não estimado.

---

## O achado em uma frase

A empresa gasta o funil inteiro perseguindo **signups novos** (1.072 acumulados,
~15/dia) enquanto **52 pessoas que já provaram que querem o produto estão
paradas dentro de casa, batendo numa parede, sem nenhuma oferta chegando nelas.**

---

## Como apareceu

Fui atrás da maior perda de ativação do funil (139 pessoas iniciam uma geração,
92 completam — 47 somem no meio) e abri os `generation_stage_error` dos últimos
7 dias. A causa nº 1 era o apagão do Creatomate (30 pessoas, `compose_not_ok`),
**que já acabou** — último caso 10/08 22:25Z, renders normalizados desde 11/08
02:00Z.

O que sobrou foi mais interessante, porque **continua acontecendo agora**
(último: hoje, 13:26Z): `compose_daily_free_limit`, HTTP 402 — o teto de
3 Fast/24h do plano free.

Quem bate nessa parede, em 10 dias:

| conta | vídeos já entregues | vezes que bateu | tem trial? |
|---|---|---|---|
| `b61881d5` | 18 | 1 | sim (ativo) |
| `612b0b05` | 8 | 4 | **não** |
| `3dee8ee7` | 9 | 1 | **não** |
| `6f9a7503` | 9 | 2 | **não** |
| `cfb4c7b4` | 8 | 1 | **não** |
| `acf6fd1c` | 2 | **5** (hoje) | **não** |
| … mais 12 contas | 1–5 | 1–3 | **não** |

**16 das 17 não têm trial nenhum.** E todas têm vídeo entregue — não são
curiosos, são usuários recorrentes que voltaram até esbarrar no teto.

## Por que elas não têm trial (e não é bug)

`maybeActivateReverseTrial` ativa **no signup**, com guarda de perfil novo
(`user.created_at < 24h`). Quem se cadastrou antes da flag ser ligada nunca
recebeu os 40 créditos, e nunca vai receber pelo caminho normal. Está correto
— a guarda existe para impedir que ligar a flag concedesse trial retroativo à
base inteira de uma vez. O efeito colateral é que **o grupo com maior intenção
demonstrada do produto é justamente o único sem oferta.**

## Tamanho real da coorte

```
free, sem trial, nunca pagou, com vídeo entregue ........... 342
  └ com 2+ vídeos ........................................... 83
      └ ativos nos últimos 30 dias ......................... 52   ← a coorte
          └ ativos nos últimos 14 dias ..................... 50
  └ com 5+ vídeos ........................................... 10
vídeos já produzidos por esse grupo ....................... 240
```

**50 das 52 estão ativas nos últimos 14 dias.** A coorte não é um cemitério
de contas velhas: é gente usando o produto esta semana.

Query reutilizável (roda direto, sem parâmetro):

```sql
SELECT p.id, p.created_at,
       (SELECT count(*) FROM videos v WHERE v.user_id=p.id) AS vids,
       (SELECT max(v.created_at) FROM videos v WHERE v.user_id=p.id) AS ultimo_video
FROM profiles p
WHERE p.trial_status IS NULL
  AND COALESCE(p.has_paid,false) = false
  AND COALESCE(p.plan,'free') = 'free'
  AND (SELECT count(*) FROM videos v WHERE v.user_id=p.id) >= 2
  AND (SELECT max(v.created_at) FROM videos v WHERE v.user_id=p.id) > now() - interval '30 days'
ORDER BY vids DESC;
```

## O que NÃO fazer (e por que estou registrando em vez de executar)

**Não dar trial retroativo.** A ordem do fundador no item 6 da Fase 2 é
explícita: free existentes migram com aviso de 7 dias e **"sem trial
retroativo (entram no 50% off POR E-MAIL)"**. A tentação aqui é grande —
seriam 52 trials instantâneos de gente comprovadamente engajada — e é
exatamente por ser tentador que fica registrado como decisão do fundador, não
executado por mim.

**Não criar superfície de desconto.** COMEBACK50 existe só nos e-mails D5/D10
pós-trial. Esta coorte não é pós-trial. Enfiar 50% off numa tela para eles
violaria a regra de que desconto não aparece em página, card ou modal.

## O que a UI já faz certo (Regra Zero — conferido, não suposto)

Conferi antes de propor conserto: `GenerateClient.tsx:3472-3485` já trata o 402
corretamente desde 09/07 — não mostra "Generation failed", abre o modal de
upgrade sobre a tela de opções e preserva o roteiro. **Não há nada a consertar
na tela.** O buraco não é de UX, é de alcance: o modal só fala com quem está
no site naquele segundo. Ninguém volta para essas pessoas depois.

## A recomendação, em uma linha

Quando o item 6 (troca atômica do free tier) for executado, **esta coorte é a
primeira lista de e-mail que deve sair** — antes de qualquer investimento em
tráfego pago. São 52 pessoas com 240 vídeos de uso comprovado contra os 89
signups pagos que o TAAFT ($347) compraria sem nenhum histórico.

O argumento não é sentimental, é de CAC: essa lista custa R$ 0 e já passou
pelo teste que o tráfego pago ainda vai ter que fazer.

## Ligação com o gate de tráfego pago

Isto **reforça** o gate já aberto (TAAFT $347 só depois do QA do trial): não
faz sentido pagar por topo de funil enquanto 52 pessoas de fundo de funil não
receberam uma única oferta. Ordem correta: item 6 → e-mail para esta coorte →
medir conversão → só então tráfego pago.

---

**Próxima medição:** rodar a query acima na sprint das 19h e comparar. Se a
coorte crescer sem que nenhuma oferta tenha saído, o custo de oportunidade
está aumentando — e vira número de relatório, não observação.
