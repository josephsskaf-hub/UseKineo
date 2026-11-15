# Missão do GPT · Criar sem parede, como o Higgsfield · 15/11/2026

Pedido do dono, 15/11 ~04:40: "quero o fluxo novo para as páginas de criação, para as pessoas conseguirem criar com mais leveza (usa como referência o site da Higgsfield)". Antes disso: "testa pra ver se um usuário sem login até onde ele consegue ir".

Dono da área: GPT (telas, home, fluxos). O Claude testou, mediu e escreveu. Nada aqui foi mexido no código.
Imagens: `docs/fluxo-criacao-higgsfield-1511/` (1 a 3 = Higgsfield, 4 e 5 = Kineo hoje).

## 1. O que o visitante sem login vive hoje (teste de 15/11, 04:30-04:40, sem conta)

| Onde ele clica | O que acontece |
|---|---|
| Os 4 cartões do topo da home (Film, Product ads, UGC ads, Cartoon) | Vai DIRETO para "Create your account", antes de ver a tela de criar (foto 4) |
| Cartões da vitrine "Make a film / Make your ad" | Idem: cadastro antes de tudo |
| Total na home | **55 links levam a /signup ou /login** antes de a pessoa escrever qualquer coisa |
| /create/film, /create/cartoon, /create/ads | Redirecionam para /signup |
| /kids-cartoon | Redireciona para /login |
| /studio, /clips, /recreate, /ads, /images | Abrem para visitante ("Guest User") |
| Escrever ideia no /studio e apertar Generate | Vai para **"Welcome back · Sign in"** (tela de QUEM JÁ TEM CONTA), não para criar conta. A ideia é guardada no redirect (foto 5) |

Defeitos que isso causa:
- A decisão de 04/11 ("escrever antes do login: o cartão da home abre a tela e a conta vem no Generate") **não vale mais nos cartões da home**: eles voltaram a ir ao cadastro primeiro.
- Quem é novo e aperta Generate vê "Welcome back". Se digitar e-mail e senha ali, o "Sign In" falha (a conta não existe). O link "Sign up" é pequeno, no rodapé.
- Duas portas diferentes (login e cadastro) para a mesma pessoa.

## 2. O que o Higgsfield faz (visto em 15/11, sem conta)

1. **Uma barra só** no topo de cada página de produto: "+" para anexar imagem, a caixa de texto, chips pequenos (modelo · duração · formato · som) e um GENERATE grande (foto 1).
2. O visitante digita e aperta GENERATE: **não pede conta**. Abre a tela de criação com o **texto já preenchido** (foto 2).
3. Tela de criação: painel à esquerda com cartão do preset ("GENERAL · Change"), "Upload media", o texto, modelo, duração, formato e o botão Generate **com o custo em créditos** no próprio botão. À direita, enquanto não há vídeo, "MAKE VIDEOS IN ONE CLICK" em 3 passos (adicionar imagem, escolher preset, gerar).
4. A conta só aparece no **último** Generate, numa **janela por cima da tela** (o texto continua visível atrás): "Get started with Higgsfield" — Google primeiro, Apple, Microsoft, SSO, e e-mail **sem senha**. Uma porta só para quem é novo e quem já tem conta (foto 3).

## 3. O que pedir (ordem de valor)

**A. Urgente (pequeno, vira cadastro hoje):**
1. Todo Generate de visitante abre a janela de conta **por cima da tela**, com o título "Get started" (não "Welcome back") e a ideia preservada. Nunca troca de página.
2. Os 55 links da home que vão a /signup passam a abrir a tela de criação (/create/film, /create/ads?entry=…, /create/cartoon, /recreate/…) **sem conta**; /create/* e /kids-cartoon abrem para visitante. A conta vem só no Generate (decisão de 04/11).
3. E-mail na janela: um campo só; o sistema decide se é login ou cadastro (Supabase signInWithOtp / código), sem a pessoa escolher entre "Sign in" e "Sign up".

**B. Fluxo novo das páginas de criação (o "mais leve"):**
4. Uma barra igual nas páginas de produto e na home (texto + "+" para foto + chips + Generate), que leva a ideia para a tela de criação já preenchida.
5. Tela de criação no molde do Higgsfield: painel único à esquerda (preset/exemplo escolhido em cima com "Change", mídia, texto, 2-3 ajustes em chips, Generate com o custo no botão); à direita o exemplo tocando ou "3 passos" quando vazio.
6. Ajustes escondidos atrás de chips (motor, duração, voz). Padrão pronto: a pessoa só escreve e aperta (memória "Gerar sem escolher motor 04/11").

## 4. Regras que continuam valendo
- Site FICA o de hoje; o GPT melhora os fluxos (dono 14/11). Nada de home nova.
- Pares: login com signup (AuthReel); Sidebar com MobileNav.
- Botão de compra nunca se esconde antes do 1º filme em país rico.
- "Pronto" = tipos limpos, `scripts/ci/novos-vermelhos.sh` sem vermelho novo, foto em 1920 e 390 px, tela logada conferida logada, conferido no ar.
- Medir: `studio_create_auth_door_v1`, `auth_modal_opened`, `auth_callback_completed`, cadastros por dia (linha de base: 20 contas novas em 30 h até 15/11 04:32 BRT).

## 5. Login: o que o teste achou (para não confundir com a missão)
- Google funciona: nas últimas 24 h, 21 de 23 cliques voltaram logados (2 abandonos no Google, BD e RU).
- **Microsoft no celular: 2 de 2 tentativas reais (EUA, 15/11 02:56 BRT) não voltaram.** A página da Microsoft abre normal; o passo depois da senha não foi testado (exige conta Microsoft real). Hipótese, não provada: o app da Microsoft no Azure aceita só contas de empresa, e conta pessoal (@outlook/@hotmail) é recusada. Teste do dono: "Continue with Microsoft" no celular com a conta pessoal dele.
- Navegador de dentro do Instagram/TikTok: o site detecta (app/(auth)/signup isEmbeddedBrowser) mas ainda mostra o botão Google, que o Google recusa ali (disallowed_useragent). Pedido: nesse navegador, trocar o botão por "Abra no navegador para entrar com Google" + e-mail.
