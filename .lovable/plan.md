# Melhorar a reprodução de vídeos na galeria privada

O travamento acontece ao assistir no iPhone/Safari. Os vídeos são enviados no tamanho original (arquivos de iPhone podem ter centenas de MB, 4K/HEVC) e servidos direto do Firebase Storage, sem versão otimizada. Além disso, a tela da galeria monta um elemento `<video>` para cada item da grade, então vários vídeos começam a carregar ao mesmo tempo em segundo plano — isso compete com a banda do vídeo que você está assistindo e trava a reprodução.

## O que será feito

### 1. Parar o carregamento paralelo na grade
- Na grade de miniaturas, os vídeos deixam de carregar sozinhos: `preload="none"` e uso de uma imagem de capa (poster) em vez do arquivo completo.
- Gerar a capa uma única vez, no momento do envio (primeiro quadro do vídeo), e guardar junto com o registro. Assim a grade fica leve mesmo com muitos vídeos.

### 2. Reprodução mais estável no player
- No player em tela cheia, apenas o vídeo aberto é carregado; ao trocar de item o anterior é descarregado.
- Usar `preload="auto"` só no item atual, com `playsInline` e poster enquanto o buffer enche.

### 3. Compressão opcional no envio
- Adicionar uma opção "Otimizar vídeo para reprodução" ao enviar: reduz a resolução para 1080p e reencoda em H.264/MP4 no próprio navegador, mantendo o arquivo original também disponível para download.
- Reprodução usa a versão otimizada; o botão de baixar continua entregando o original.
- Se o navegador não suportar o reencode (Safari iOS tem limitação), o envio segue normal com o original e um aviso discreto.

### 4. Aviso de qualidade
- Dica na tela: vídeos 4K enviados direto do iPhone podem travar; o modo otimizado resolve na maioria dos casos.

## Detalhes técnicos

- `GaleriaUpload.tsx`: capturar o primeiro quadro via `<video>` + `canvas` → JPEG, subir como `galeria-privada/thumbs/...` e salvar `thumbUrl` no documento do Firestore. Compressão via `MediaRecorder` + `canvas.captureStream()` quando disponível, com fallback silencioso para o original; salvar `urlOtimizada`/`storagePathOtimizado` quando houver.
- `GaleriaPrivada.tsx`: grade usa `<img src={thumbUrl}>` para vídeos (fallback para `<video preload="none">` em itens antigos sem thumb).
- `GaleriaViewer.tsx`: renderizar só o item ativo, `key` por id, `poster={thumbUrl}`, `preload="auto"`, e priorizar `urlOtimizada` quando existir.
- Itens já enviados continuam funcionando; ganham a melhoria de `preload` e player, sem migração obrigatória.
