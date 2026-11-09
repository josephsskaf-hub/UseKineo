# Moldura futura — proposta, não implementação

**SUGESTÃO — 09/11/2026:** após o Recreate e o botão de série, adotar uma moldura compartilhada com abas Film · Cartoon · Recreate, painel à esquerda e biblioteca/entregas à direita. Cada produto mantém seu adaptador de entrada, schema, validação de direitos, preço e despacho no servidor. A moldura só compõe a apresentação; não cria um “Generate” genérico que misture cobranças ou dispare geração ao navegar.

**FATO CONFIRMADO:** o Studio atual monta `StudioClient` em `app/(dashboard)/studio/page.tsx:80`; a casa de máquinas é `GenerateClient`, montada por `app/(dashboard)/studio/create/page.tsx:315`. O Recreate agora tem catálogo e componentes próprios. **SUGESTÃO:** começar extraindo somente os espaços visuais e controles comuns; manter essas rotas como destinos compatíveis até haver testes de retomada, idioma, referências, débito e estorno dos três produtos. Preservar o que cada produto já entrega, sem anunciar Model antes da confirmação do fundador.

**FATO CONFIRMADO:** `app/api/enhance/route.ts:1` já implementa Enhance/Topaz para vídeos próprios, com cobrança/estorno próprios. **SUGESTÃO:** é o candidato existente para um futuro Upscale em Edit Video. Extend, Reframe e Remove Background permanecem fora do escopo; seus motores, custos e validação são desconhecidos nesta obra.

**QUESTÃO PENDENTE:** autorização do fundador para construir essa unificação. Nada desta proposta foi ligado ou anunciado na interface.
