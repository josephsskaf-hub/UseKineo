# Capas editoriais de Trending — 25/10/2026

**IMPLEMENTADO / FATO CONFIRMADO:** 14 ilustrações vetoriais próprias em `public/trending/topics/`, criadas para substituir cartões temáticos sem imagem, incluindo uma capa genérica para categorias desconhecidas. Base de trabalho: `7ab62db2b10bea45b0c550879c7353f03caf3a6a`.

**FATO CONFIRMADO:** os SVGs são código vetorial autoral desta entrega, sem fotografia, raster, logotipo, imagem de terceiro, fonte externa, texto visível, script ou pedido de rede. Títulos e descrições são metadados acessíveis, sem renderização de texto. As cenas são referências editoriais de categoria, sem representar pessoas, acontecimentos ou lugares específicos.

| Arquivo | Referência ilustrada |
|---|---|
| `billionaire.svg` | Relógio dourado e arquitetura noturna |
| `money.svg` | Moedas e crescimento abstrato |
| `ai.svg` | Cérebro digital e conexões |
| `psychology.svg` | Perfil abstrato e labirinto da mente |
| `mystery.svg` | Montanhas, lua e neblina |
| `history.svg` | Colunas antigas e ampulheta |
| `science.svg` | Átomo e frasco de laboratório |
| `country.svg` | Globo simbólico e cidade genérica |
| `health.svg` | Coração estilizado e pulso decorativo |
| `space.svg` | Planeta vermelho e veículo explorador |
| `nature.svg` | Árvore e floresta em camadas |
| `technology.svg` | Dispositivo móvel e circuitos |
| `crime.svg` | Impressão digital e lupa |
| `default.svg` | Composição genérica de quadros e luz |

**FATO CONFIRMADO:** cada arquivo declara `width="360"`, `height="640"` e `viewBox="0 0 360 640"`, na proporção 9:16. O assunto principal ocupa o centro superior; a parte inferior recebe sombra para permitir texto do cartão pelo componente da aplicação.

**TESTADO LOCALMENTE — 25/10/2026:** os 14 SVGs passaram no parser XML, na verificação de inventário exato, dimensões 360 × 640, referências internas de gradientes/clipping/metadados e IDs únicos por arquivo. Nenhum contém `script`, `image`, `foreignObject`, `text` ou referência de rede. Tamanho total: 36.571 bytes; maior arquivo: `space.svg`, 3.075 bytes; máximo de 36 linhas por arquivo. Fonte: leitura direta dos 14 arquivos por validação PowerShell/.NET XML desta sessão, sem render ou serviço externo.

**QUESTÃO PENDENTE / DESCONHECIDO:** estes arquivos por si só não comprovam que as telas os usam, nem publicação ou validação em produção. A integração e a comparação visual antes/depois pertencem à entrega que os incorpora.
