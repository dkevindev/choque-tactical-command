# Corrigir envio de vídeos HEVC pelo iPhone na Galeria

## Diagnóstico

O código atual só reage ao evento `change` de um único `<input>` escondido com `accept="image/*,video/*,.mov,.mp4,..."` e `multiple`. Quando o iPhone (Safari iOS) seleciona vídeos HEVC da galeria de Fotos, ele precisa **exportar/transcodificar** o vídeo antes de entregar ao site. Nesse cenário é comum que:

- o evento `change` não dispare ou chegue com lista vazia (o código atual apenas faz `return` em silêncio — por isso "não acontece nada", sem nenhuma mensagem);
- o arquivo chegue com `size = 0` ou `type = ""` quando a exportação falha;
- a combinação `image/*,video/*` + lista de extensões + `multiple` faça o iOS abrir o seletor em modo que não entrega vídeos corretamente.

A verificação exata no aparelho não é possível daqui, então o plano remove todas essas causas conhecidas de uma vez e adiciona feedback visível para qualquer caso que sobrar.

## O que será feito

1. **Dois botões separados**: "Enviar fotos" (`accept="image/*"`) e "Enviar vídeos" (`accept="video/*"`, sem lista de extensões). Seletores puros são os que o iOS trata de forma mais confiável para vídeo.
2. **Input real em vez de `display:none`**: o input fica sobreposto ao botão com opacidade zero (dentro de um `<label>`), evitando o clique programático em elemento oculto, que o Safari iOS às vezes ignora para vídeos.
3. **Feedback em todo caminho**:
   - evento `change` com 0 arquivos -> aviso "O iPhone não entregou o arquivo. Tente enviar um vídeo por vez ou pelo app Arquivos".
   - arquivo com `size = 0` -> aviso "Vídeo veio vazio (falha na exportação do iPhone)".
   - indicador "Aguardando o iPhone preparar o vídeo..." exibido ao clicar no botão de vídeo até o `change` chegar (ou desaparecer após alguns segundos), para o usuário saber que o aparelho está processando.
4. **Escutar também o evento `input`** além de `change` (alguns builds do iOS disparam só um deles), com proteção contra processar o mesmo lote duas vezes.
5. **Tipo de conteúdo**: para HEVC sem `type`, gravar `video/quicktime` (`.mov`) ou `video/mp4`, garantindo que o player do visualizador consiga reproduzir.
6. **Dica na tela** (texto pequeno abaixo dos botões): no iPhone, em Ajustes > Fotos > "Transferir para Mac ou PC" escolher **Manter Originais** evita a transcodificação que trava o envio de HEVC; e vídeos longos funcionam melhor um por vez.

## Detalhes técnicos

- Arquivo alterado: `src/components/galeria/GaleriaUpload.tsx` (apenas este).
- Estrutura: componente interno `BotaoSelecao({ accept, label, icone, onFiles })` renderizando `<label>` com `<input type="file" multiple accept={accept} className="absolute inset-0 opacity-0 cursor-pointer" />`.
- `onFiles` centraliza validação (`detectarTipo`, `size === 0`, limite 2 GB) e chama o `enviarArquivo` já existente (upload resumable para `galeria-privada/` + doc em `galeria_privada`) sem mudanças na lógica de envio.
- Guard de duplicidade: ref com assinatura `nome+tamanho+lastModified` do último lote processado nos últimos 2 s.
- Estado `aguardandoPicker` ligado no `onClick` do label de vídeo e desligado no `change`/`input` ou por timeout de 15 s.
- Nenhuma mudança em regras do Firebase, banco ou visualizador.
