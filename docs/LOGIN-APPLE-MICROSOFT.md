# Ligar o login com Apple e Microsoft

O código está pronto e os botões ficam escondidos até cada provedor estar ativo (`lib/authProviders.ts`). Em 04/11/2026 o Supabase respondeu "provider is not enabled" para os dois.

Endereço de retorno usado nos dois: `https://cqqukkvjjrguayiyjvhh.supabase.co/auth/v1/callback`

## Microsoft (grátis)
1. No [portal do Azure](https://portal.azure.com), abra **App registrations** e clique em **New registration**.
2. Nome: `Kineo`. Tipos de conta: **Accounts in any organizational directory and personal Microsoft accounts**.
3. Redirect URI: tipo **Web**, com o endereço de retorno acima. Registre.
4. Copie o **Application (client) ID**.
5. Em **Certificates & secrets**, crie um **New client secret** e copie o **Value** na hora.
6. No Supabase, em **Authentication > Sign In / Providers > Azure**: ative, cole o Client ID e o Secret. Em **Azure Tenant URL**, use `https://login.microsoftonline.com/common`. Salve.

## Apple (US$ 99 por ano)
1. Assine o [Apple Developer Program](https://developer.apple.com/programs/).
2. Em **Identifiers**, crie um **App ID** com **Sign in with Apple** ligado.
3. Crie um **Services ID**, ligue **Sign in with Apple**, informe o domínio `cqqukkvjjrguayiyjvhh.supabase.co` e o endereço de retorno acima.
4. Em **Keys**, crie uma chave com **Sign in with Apple** e baixe o arquivo `.p8` (só baixa uma vez).
5. No Supabase, em **Authentication > Sign In / Providers > Apple**, siga as instruções da tela com o Services ID, o Team ID, o Key ID e o `.p8`. A chave gerada vence em 6 meses e precisa ser renovada.
6. Para os nossos e-mails chegarem a quem esconde o e-mail da Apple, registre os domínios de envio em **Sign in with Apple for Email Communication**.

## Depois de ativar
Avise o Claude: ele troca o valor para `true` em `lib/authProviders.ts`, publica e testa o caminho até a tela do provedor.
