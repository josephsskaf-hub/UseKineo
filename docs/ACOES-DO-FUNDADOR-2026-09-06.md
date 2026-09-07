# O QUE SÓ VOCÊ PODE FAZER — ciclo de aquisição de 06/09 (madrugada)

> Em ordem de valor **medido**, não de esforço. Cada item diz **por que** ele
> está nessa posição, com o número que o coloca lá. Nada aqui é opinião de
> sessão: tudo saiu de consulta ao banco ou de `curl` na produção desta noite.

---

## 1. 🔴 MANDAR O CODEX MONTAR A CAIXA DO PACOTE — é o item nº 1 da empresa

**Por que é o primeiro.** A casa entrega **~20 filmes/dia**. Em 14 dias, **217
pessoas** ficaram com um filme pronto na mão e **199 delas nunca cruzaram uma
superfície com preço** — 6,5% chegaram ao checkout, e **desses, 14% pagaram**.
O checkout **fecha**. O que não acontece é **o convite**.

E o convite já tem lugar provado: o mesmo pedido ("faça o próximo episódio")
convence **24% na tela** e **0,8% no e-mail** (22 pessoas contra 1, em 7 dias).

O servidor está pronto (`/api/publish-pack`), com contrato escrito e custo zero
na leitura. **Falta a caixa.** Spec completa em
`docs/PEDIDOS-CODEX-2026-09-06.md`, Pedido 1.

**Script para o Cowork:**
```
Leia docs/PEDIDOS-CODEX-2026-09-06.md e implemente o Pedido 1: a caixa "Post it"
na tela de filme pronto, consumindo GET/POST /api/publish-pack. Siga os quatro
detalhes obrigatórios da spec, em especial: nao reescrever os textos no cliente,
e emitir publish_pack_shown na montagem e publish_pack_copied no clique de
copiar. Depois implemente o Pedido 3 (instrumentar os quatro return silenciosos
do SeasonStrip).
```

---

## 2. 🟠 DECIDIR: o e-mail de resgate deve ganhar precedência?

**O que eu achei e NÃO mexi.** O cron `send-video-ready` — o único e-mail que
carrega o pacote — está sendo **suprimido em todas as execuções**:

```
00:40  [lifecycle-suppression] 18/18 suprimido(s)
00:10  [lifecycle-suppression] 19/19 suprimido(s)
23:40  [lifecycle-suppression] 19/19 suprimido(s)
```

Quem ganha a colisão é a máquina de trial: **118 e-mails em 24 h**
(`ending_soon` 28, `d0_welcome` 26, `downgraded_loss` 24, `expired_lastcall_d10`
20, `expired_offer_d5` 20), de hora em hora, contra um resgate que fala com
**27 pessoas por semana**.

A casa **já tem o remédio pronto**: `HOT_LEAD_SUPPRESSION_HOURS = 4` em
`lib/lifecycle/suppression.ts`, uma janela curta para jobs cuja coorte é sinal
de compra. Nunca foi aplicada ao video-ready.

**Por que não fiz sozinho:** mudar precedência **aumenta o volume de e-mail que
sai para clientes reais**, de madrugada, sem você. E o ganho é pequeno de
qualquer forma — o resgate fala com quem **não** baixou, a coorte menos
interessada. **Sua decisão, não de sessão autônoma.**

**Se você disser "vai", é uma linha:** passar `HOT_LEAD_SUPPRESSION_HOURS` como
`windowHours` na chamada de `loadLifecycleSuppression` do `send-video-ready`.

---

## 3. 🟡 SEARCH CONSOLE — o que checar (eu não tenho acesso)

**Contexto que economiza seu tempo:** eu já auditei tudo o que é **servidor** e
está **limpo**. Não procure defeito técnico:

| checagem | resultado |
|---|---|
| 186 URLs do sitemap | **todas 200**, zero 404 |
| `noindex` acidental | **0 em 186** |
| `rel=canonical` | presente nas 20 páginas de aquisição |
| `<title>` / `description` | presentes, **zero duplicados** |
| conteúdo no HTML | server-rendered, 5.870–8.909 caracteres |
| structured data | JSON-LD presente |
| `robots.txt` | válido, bots de IA nomeados, 2 sitemaps |

**A causa é externa:** buscando *"best free AI faceless YouTube Shorts generator
2026"* — o tema da nossa página mais citada pelo ChatGPT — os 7 primeiros são
HeyGen, Fliki, InVideo (2×), ReframeX, Pexo e um blog de listas. **Três dos sete
são listas de terceiros.** A categoria é ganha por **estar dentro das listas dos
outros**, não por página própria.

**O que olhar no Search Console (3 minutos):**
1. **Cobertura** → quantas das 186 estão *Indexadas* vs *Descobertas – não
   indexadas*. Se muitas estiverem "descobertas e não indexadas", é orçamento de
   rastreio/autoridade, e confirma o diagnóstico acima.
2. **Desempenho** → impressões dos últimos 28 dias. Se as impressões existem e
   os cliques não, é **título/descrição**; se nem impressão existe, é
   **indexação**.
3. Enviar novamente o `sitemap.xml` (custa um clique e reativa o rastreio).

---

## 4. 🟢 TAAFT — só ATUALIZAR, e a expectativa correta

Você já está corrigindo a listagem. **Só um alerta de expectativa:** o TAAFT
mandou **99 pessoas, 64 filmes e ZERO pagamentos** em 14 dias, e **94 dessas 99
pousaram na home**, que é a página com **0 pagamentos** do período. Diretório
traz **volume**, não receita. Números canônicos conferidos contra `/api/facts`
estão em `docs/DIRETORIOS-SCRIPT-FUNDADOR-2026-09-06.md`.

⛔ **Product Hunt continua fora** — `producthunt.com/products/kineo` não é nosso.

---

## 5. ⚪ DIRETÓRIOS NOVOS — opcional, e por último

Texto pronto (tagline, descrição curta e longa, tags, screenshots) e os seis
destinos em `docs/DIRETORIOS-SCRIPT-FUNDADOR-2026-09-06.md`. **Não pague por
listagem destacada:** não existe um único pagamento vindo de diretório na
história do produto que justifique o gasto.

---

## O que **não** precisa da sua mão (já está no ar)

- **Atribuição de origem** — o evento de pouso passou a gravar a fonte que já
  tinha na mão. 82% das visitas eram "sem fonte" por **descarte**, não por falta
  de dado. Provado em produção: às 00:34 uma pessoa do ChatGPT pousou na
  `/ai-video-generator/kineo-1` e foi corretamente atribuída — antes seria
  "(sem fonte)".
- **Temporada nos fatos públicos** — `/llms.txt` e `/api/facts` agora contam que
  a Kineo escreve os 5 episódios seguintes. É aquisição por resposta, no canal
  que já traz 66% dos cadastros.
- **Consultas salvas** — `docs/queries/MAPA-DE-ENTRADA-2026-09-06.sql` e
  `docs/queries/DEGRAU-DO-CONVITE-2026-09-06.sql`, as duas verificadas rodando.
