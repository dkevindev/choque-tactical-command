# Galeria Privada (fotos e vídeos)

Sistema pessoal, separado do resto do sistema, em rota oculta, protegido por senha única, usando o Firebase Storage já conectado ao projeto.

## Como vai funcionar

1. Você acessa `/galeria` (nenhum link no menu — só quem sabe a URL chega lá).
2. A tela pede a senha. Senha correta libera o acesso e fica lembrada naquele dispositivo (até você sair pelo botão "Sair").
3. Dentro: galeria única em grade, ordenada do envio mais recente para o mais antigo, com miniaturas das fotos e capa/ícone dos vídeos.
4. Botão de envio permite selecionar **vários arquivos de uma vez** (fotos e vídeos), com barra de progresso por arquivo.
5. Clicar em um item abre o visualizador em tela cheia: foto ampliada ou player de vídeo com controles, navegação para o anterior/próximo.
6. Cada item pode ser apagado (remove do Storage e do índice) — com confirmação.

## Senha

- A senha fica guardada em Firestore como hash (não em texto puro, e não no código).
- No primeiro acesso, se ainda não existir senha cadastrada, a tela pede para você **definir a senha** ali mesmo.
- Há a opção "Alterar senha" dentro da galeria (pede a senha atual).

## Detalhes técnicos

- Rota nova em `src/App.tsx`: `/galeria` → `src/pages/GaleriaPrivada.tsx` (fora do `TacticalSidebar`, layout próprio, escuro e minimalista, independente do design do sistema).
- Storage: `firebase/storage` (`storage` já exportado em `src/firebase.ts`), arquivos em `galeria-privada/{timestamp}-{nome}`, upload com `uploadBytesResumable` para progresso.
- Firestore:
  - `galeria_privada` — um doc por arquivo: `{ nome, tipo: 'image'|'video', url, storagePath, tamanho, criadoEm }`, lido com `onSnapshot` para atualizar em tempo real.
  - `galeria_config/acesso` — `{ senhaHash }` (SHA-256 via `crypto.subtle`, com salt fixo do app).
- Sessão liberada guardada em `localStorage` (`galeria_privada_ok`), com botão de sair.
- Componentes novos: `GaleriaPrivada.tsx` (página + gate de senha), `GaleriaUpload.tsx` (envio múltiplo com progresso), `GaleriaViewer.tsx` (visualizador tela cheia com `<video controls>` e navegação por setas/swipe).
- Limites: aviso e bloqueio de arquivos acima de 200 MB por item, tipos aceitos `image/*` e `video/*`.

## Observação sobre segurança

A senha protege a interface. Como as regras do Firebase Storage/Firestore deste projeto são controladas fora daqui, quem tiver a URL direta de um arquivo pode abri-lo. Se quiser proteção real no nível do arquivo, o passo seguinte é ajustar as regras do Storage no console do Firebase — posso indicar as regras exatas depois de implementar.
