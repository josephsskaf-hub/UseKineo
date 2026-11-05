# Teste "filme grátis a pedido": o desenho mudou em 04/11/2026

**Decisão do fundador, 04/11/2026 por volta de 22h BRT ("recomendações").** Marca no código: KINEO-FLUXO2-G-0411.

## O que mudou

Em `/studio/previa`, para a conta do lado "a pedido" (`trial_status = on_request`, sem pagamento, plano grátis):

- O botão principal da prévia **pede o filme grátis**, pela mesma rota da faixa (`POST /api/trial/claim`), e volta ao Studio com o roteiro da prévia, Seedance 1.5, 15 s.
- Os planos continuam disponíveis, agora como link embaixo do botão.
- A faixa do topo, ao pedir o filme, leva junto a ideia que está na tela.

Antes, o botão principal da prévia sempre ia para `/pricing`, e a faixa voltava ao `/studio` sem a ideia. Das 3 primeiras pessoas do lado "a pedido", 2 saíram da prévia para os planos sem nunca pedir o filme.

## O que não mudou

Quem entra no teste, o sorteio de 50/50 (`ladoDoTeste`), a janela de 30 dias, a quantidade de crédito, o motor do filme grátis e as outras contas. A concessão continua sendo `claimOnRequestTrial`.

## Como ler os resultados

**Não misturar o antes e o depois.** O teste abriu em 04/11/2026 às 17:00 UTC. O corte é o instante em que este commit entrou em produção: anote aqui ao publicar.

- Corte (deploy em produção): _preencher ao publicar_
- Antes do corte: desenho "a prévia leva aos planos".
- Depois do corte: desenho "a prévia pede o filme".
- A comparação com o lado controle deve usar só as contas criadas depois do corte. As contas criadas antes ainda veem o desenho novo ao voltar, então também ficam de fora da conta do "depois".

## Medição

- `trial_on_request_preview_clicked` (novo): clique no botão principal da prévia, com `test`, `language` e `scenes`.
- `trial_on_request_clicked`: clique na faixa, como antes.
- `trial_on_request_claimed`: o servidor liberou, venha de onde vier.
- `scene_preview_cta_clicked`: ida aos planos a partir da prévia. No lado "a pedido", agora com `placement = preview_plans`.
