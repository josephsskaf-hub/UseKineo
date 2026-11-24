# Ajustes locais de Clips

**FATO CONFIRMADO · 23/11/2026.** `app/recreate/RecreateClient.tsx` aplica foco de capa aos quatro cartões no workspace de Clips. `components/create/clip-workspace.css` põe título e ação sobre uma superfície sólida no tema. Os quatro pôsteres e vídeos são os mesmos do catálogo.

**FATO CONFIRMADO.** `components/clips/SavedClipCard.tsx` usa o aspecto declarado até o player informar a dimensão real. My clips e History compartilham esse comportamento. O vídeo horizontal ocupa uma linha da grade, com a largura máxima protegida. Na prova de navegador, a amostra em History passou de 153 para 336 px no viewport de 390 px.

**TESTADO LOCALMENTE.** O clique em Play dentro de Clip effects and ideas manteve Templates ativo. O guardião monta os controles e simula a proteção das fotos já escolhidas. Ele derruba dez mutações que afetam as capas, o tamanho e os controles.

**SUGESTÃO.** Na revisão interna de produção, abrir as quatro capas com as contas apropriadas. Conferir os temas, dois vídeos horizontais em My clips e History, posição vertical, foco de teclado, Play com uma foto carregada e a confirmação no clique de mudança de efeito. Usar `C:/kineo/docs/decisoes-2311/AJUSTES-CLIPS-2311.html`.
