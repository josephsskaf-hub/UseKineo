# Como o Claude passa a dar push sozinho — sem bat, sem computer use, sem você online

**Pedido do fundador (31/08):** *"você não consegue fazer nenhum tipo de push ou bat sem usar o computer use? Dessa forma eu sempre vou precisar estar online pra subir os push, e não era isso que eu queria."*

## Por que hoje eu não consigo

Duas paredes, as duas de permissão — nenhuma é falta de capacidade:

1. **Computer use** (controlar a tela dele para clicar no bat) é bloqueado pelo classificador de segurança nas sessões automáticas/agendadas. E é o que faz a tela piscar, porque tira screenshot a cada passo.
2. **O git do sandbox Linux não tem credencial do GitHub.** `git ls-remote` funciona (o repo é público), mas `git push` responde `could not read Username for 'https://github.com'`. As credenciais existem só no Windows do fundador — que é exatamente por que o `!RODAR-AGORA.bat` foi inventado.

## OPÇÃO A — recomendada: um arquivo de credencial dentro da pasta Usekineo

**Funciona mesmo com o computador dele desligado**, porque quem empurra é o sandbox, não a máquina dele. Setup de uma vez, para sempre.

### O que o fundador faz (uma vez)

1. Abrir <https://github.com/settings/personal-access-tokens/new> (token **fine-grained**).
2. Preencher:
   - **Repository access:** *Only select repositories* → `josephsskaf-hub/UseKineo`
   - **Permissions → Repository permissions → Contents:** `Read and write`
     (só isso — nada de Actions, Secrets, Administration, Workflows)
   - **Expiration:** 90 dias (renovar depois; token eterno é risco desnecessário)
3. Copiar o token gerado.
4. Criar, **na raiz da pasta** `C:\Users\josep\OneDrive\Área de Trabalho\Usekineo`, um arquivo chamado exatamente:

   ```
   .kineo-push-credentials
   ```

   com **uma única linha**, sem espaços, trocando `SEU_TOKEN` pelo token copiado:

   ```
   https://josephsskaf-hub:SEU_TOKEN@github.com
   ```

5. Salvar e me avisar: **"credencial pronta"**.

A partir daí eu configuro `credential.helper=store --file=<esse arquivo>` e dou `git push origin entrega-atual:main` direto do sandbox, ao fim de cada rodada, sozinho.

### Segurança — o que eu garanto e o que ele precisa saber

- **Eu nunca abro, leio, imprimo nem copio esse arquivo.** Só passo o *caminho* dele para o git; o token nunca aparece no chat nem em log.
- `.kineo-push-credentials` já está no `.gitignore` (commit desta rodada) — não pode subir para o repo por acidente.
- **Aviso honesto:** a pasta é sincronizada pelo OneDrive, então o arquivo vai para a nuvem da Microsoft junto com o resto. Por isso o token é *fine-grained*, limitado a **um repositório**, com **uma permissão** e **prazo de validade**. No pior caso alguém consegue commitar nesse repo — não há dinheiro, cliente nem dado pessoal atrás dele.
- Para revogar a qualquer momento: <https://github.com/settings/personal-access-tokens> → Revoke. E apagar o arquivo.

## OPÇÃO B — sem token: o PC dele roda o bat sozinho

`scripts\INSTALAR-PUSH-AUTOMATICO.bat` (criado nesta rodada) registra uma tarefa do Windows que executa
`scripts\!SUBIR-SOZINHO.bat` **a cada 20 minutos, em silêncio** (sem janela, sem `pause`, com log em
`scripts\push_auto.log`).

- **Um duplo-clique de instalação, e nunca mais.**
- **Limitação real:** só roda com o computador dele ligado. Se o PC estiver desligado, a entrega espera.
- Não precisa de token nenhum: usa a credencial que o git dele já tem.
- Para desinstalar: `scripts\DESINSTALAR-PUSH-AUTOMATICO.bat`.

## Recomendação — DECIDIDA: opção B

O fundador respondeu (31/08): **"o pc vai ficar ligado"**. Isso derruba a única vantagem real da opção A.

**Fica a B.** O raciocínio:

- A **única** coisa que a A fazia melhor era entregar com a máquina dele desligada. Com o PC ligado, empatam.
- A A **adiciona** um segredo de longo prazo dentro de uma pasta que sincroniza com a nuvem, mais uma
  renovação a cada 90 dias e uma revogação para lembrar. Isso é dívida operacional permanente para comprar
  uma vantagem que ele acabou de dispensar.
- A B **não adiciona superfície nenhuma**: usa a credencial que o git do Windows já tem, o mesmo comando que
  ele já roda hoje à mão, só que disparado por relógio em vez de por dedo.

Regra geral que fica registrada: **quando duas soluções entregam o mesmo resultado, ganha a que não cria
segredo novo.** A A continua documentada aqui e pode ser ligada em minutos se um dia ele quiser entrega com o
computador desligado — nada do que está escrito acima se perde.

### O que a B NÃO resolve (dito na frente)

- Se o computador dormir, hibernar ou o usuário deslogar, a tarefa não dispara — ela roda com a sessão dele
  aberta. Ao voltar, a próxima janela de 20 min pega o atraso.
- **Não há revisão humana antes do push.** Mas o portão não mudou: `entrega-atual` só se move quando eu movo,
  depois de `tsc` limpo e dos testes da rodada. A B tira o clique, não a verificação.
- Se o Codex empurrar por cima, o push falha e fica registrado em `scripts/push_auto.log` como `RESULTADO:
  FALHOU`. Eu rebaso na rodada seguinte e a tarefa sobe sozinha depois.
