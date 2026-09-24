# Painel semanal de prompts — quais perguntas fazem o ChatGPT citar a Kineo, e em qual página (desde 23/09/2026)

Por quê: o ChatGPT é 6 dos 7 últimos pagantes e ~200 sessões/semana, paradas desde a semana de 31/08. Ninguém na casa mede QUAIS prompts citam a Kineo nem QUAL página ele cita. Sem isso, toda página nova é tiro no escuro (100 páginas /for: 0 sessões humanas em 6 dias). Desde 08/08 o ChatGPT consulta domínios com `site:` em 16,8% das buscas e cita listas/comparativos em 32,5% dos casos (caso Tally). A casa já fez duas baterias à mão (10 perguntas em 09/09: Kineo ausente em 9; 48 perguntas genéricas em 16 línguas em 21/09: 0 citações). Isto vira rotina, por página e por semana.

Dono: Cowork (rotina semanal, segunda-feira). Leitor: Claude Code (junta o CSV ao banco e decide qual página construir).

## Regras de medição

- Mesmo modo toda semana: ChatGPT web, conta logada do fundador, modelo padrão, **busca na web ligada**, nova conversa por prompt, sem memória personalizada (desligar "Reference chat history" nas configurações antes da bateria ou usar conversa temporária).
- 3 rodadas por prompt (a resposta varia). Uma citação conta quando a resposta menciona "Kineo" ou "usekineo.com" com link ou sem link.
- Registrar SEMPRE: data, língua, id do prompt, rodada, `kineo_citada` (sim/não), `pagina_citada` (URL exata ou vazio), `posicao` (1 = primeira ferramenta citada), `concorrentes` (até 5 nomes na ordem), `observacao` (uma linha: o que a resposta destacou).
- Bloqueio ou erro = "desconhecido", não "não citada".
- Salvar em `C:\kineo\docs\painel-prompts\AAAA-MM-DD.csv` (UTF-8, ponto e vírgula). O Claude Code recolhe e versiona.

## Os 30 prompts (em inglês; traduzir fielmente para ES, FR, DE, IT, NL, PT — as línguas dos pagantes)

Motor pago (é onde nasce o pagante):
1. best AI video generator that uses Seedance for YouTube Shorts
2. how to make a 60-second vertical video with Seedance 1.5 with voiceover and captions
3. Kling 3 vs Veo 3.1 for YouTube Shorts, which is better and cheaper
4. cheapest way to use Veo 3.1 for short vertical videos with narration
5. AI tool that turns a script into a finished vertical film with Kling or Seedance

Roteiro pronto (o gesto da coorte que paga 3x mais):
6. I wrote a 60-second script in ChatGPT, what tool turns it into a vertical video with AI voice
7. paste script and get a finished TikTok video with narration, captions and music
8. text to video shorts generator that keeps my script word for word
9. AI that makes a faceless documentary short from my text in 3 minutes
10. best tool to turn a ChatGPT story into a YouTube Short

Sora (a API fechou em 24/09/2026):
11. Sora shut down, what should I use to make AI videos now
12. best Sora alternative for vertical short films with narration
13. Sora API is ending, which AI video generator makes finished Shorts

Grátis e preço:
14. free AI shorts generator no watermark
15. AI video generator with a free trial and no credit card
16. cheapest AI video generator subscription under 10 dollars
17. how much does it cost to make one AI short with voiceover

Nicho (onde já há citação):
18. AI horror story video generator for TikTok
19. AI video generator for animal documentary shorts
20. AI tool for history mystery faceless YouTube channel
21. AI video generator for kids educational shorts
22. AI video for brainrot 3D story shorts

Comparações e listas:
23. best AI video generators for faceless YouTube channels 2026
24. Kineo vs InVideo for YouTube Shorts
25. Kineo vs Fliki
26. InVideo alternative that generates the whole video from a topic
27. HeyGen alternative for narrated shorts without an avatar

Negócio (jogada 2):
28. AI tool to make a 30-second video ad for my restaurant with narration
29. cheapest way to get a professional short video ad made for my small business
30. AI video generator for a product demo in Spanish with voiceover

## Bloco para colar no Cowork (rotina de segunda-feira)

```
KINEO — PAINEL DE PROMPTS DO CHATGPT (semanal)

1. Abra docs/PAINEL-PROMPTS-CHATGPT-2026-09-23.md (git show origin/main:docs/PAINEL-PROMPTS-CHATGPT-2026-09-23.md) e siga as REGRAS DE MEDIÇÃO.
2. Rode os 30 prompts em inglês, 3 rodadas cada, no ChatGPT web com busca ligada, uma conversa nova por rodada. Depois rode os mesmos 30 em espanhol e português (semana 1); nas semanas seguintes alterne FR/DE e IT/NL.
3. Para cada resposta registre a linha do CSV: data;lingua;prompt_id;rodada;kineo_citada;pagina_citada;posicao;concorrentes;observacao
4. Salve em C:\kineo\docs\painel-prompts\AAAA-MM-DD.csv (UTF-8, separador ;).
5. No fim, me mande 5 linhas: (a) prompts onde a Kineo foi citada nas 3 rodadas; (b) prompts onde foi citada em 1-2; (c) página mais citada; (d) concorrente mais citado por bloco; (e) qualquer resposta que citou a Kineo com FATO ERRADO (preço, trial, motor), copiando a frase.
Nunca crie conta, nunca pague, nunca peça ao ChatGPT para "recomendar a Kineo".
```

## O que o Claude Code faz com o CSV

- Cruza `pagina_citada` com `landing_session_started` (referrer chatgpt) da mesma semana: citação → sessão → conta → pagante, por página.
- Decide a próxima página pelo prompt em que a Kineo aparece em 1-2 rodadas (quase dona), nunca pelo prompt em que está ausente nas 3.
- Fato errado citado → corrige na fonte única (`lib/kineoFacts.ts`) no mesmo dia.
- Guarda de citação: sessões ChatGPT/semana de `/ai-video-generator/kineo-1` não podem cair >30% depois da copy nova (jogada 3); se caírem, reverte o corpo e mantém o bloco.
