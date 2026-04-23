

# Correções no Painel de Notícias do Totem

## 1. Botão "Atualizar aniversariantes" (refresh manual)

**Arquivo**: `src/components/painel-noticias/GerenciarNoticiasTotem.tsx`

- Adicionar botão no cabeçalho do card: "Atualizar aniversariantes" com ícone `RefreshCw`
- Ao clicar, grava/atualiza um documento de controle em Firestore (`config_painel/aniversariantes` com campo `refreshAt: Timestamp.now()`)
- Toast confirmando: "Atualização solicitada — totens serão atualizados em segundos"

**Arquivo**: `src/components/reserva-armamento/PainelNoticias.tsx`

- Extrair a função `carregar()` dos aniversariantes para escopo do componente
- Adicionar `onSnapshot` em `config_painel/aniversariantes` — quando `refreshAt` mudar, executa `carregar()` imediatamente, antecipando o ciclo automático das 00h
- Mantém o reload diário automático já existente

## 2. Imagem não aparece no Totem após salvar

**Arquivo**: `src/components/reserva-armamento/PainelNoticias.tsx`

Causa: o layout `flex-row` do banner com imagem usa `flex-1` no bloco de texto sem `min-w-0`, e textos longos sem espaços (como `dsgd...\\\\`) empurram a imagem para fora da viewport, fazendo parecer que ela não foi enviada.

Correção:
- Adicionar `min-w-0` e `overflow-hidden` no container de texto
- Garantir que a imagem use `flex-shrink-0` com largura mínima fixa (ex.: `w-2/5`)
- Reduzir o `max-h` da imagem para `max-h-[60vh]` para não estourar verticalmente

## 3. Quebra automática de texto (sem ultrapassar a tela e sem cobrir a imagem)

**Arquivo**: `src/components/reserva-armamento/PainelNoticias.tsx`

No bloco do título e da mensagem (tanto layout sem imagem quanto com imagem):
- Adicionar classes Tailwind: `break-words` e `overflow-wrap-anywhere` (via `[overflow-wrap:anywhere]`)
- No título: `break-words [overflow-wrap:anywhere]`
- No parágrafo da mensagem: `whitespace-pre-wrap break-words [overflow-wrap:anywhere]`
- Adicionar `max-h-[70vh] overflow-hidden` no wrapper para evitar transbordo vertical

**Arquivo**: `src/components/painel-noticias/GerenciarNoticiasTotem.tsx`

- Aplicar as mesmas classes de quebra no preview do dialog para fidelidade visual

## Arquivos editados

- `src/components/painel-noticias/GerenciarNoticiasTotem.tsx` — botão de refresh + classes de quebra no preview
- `src/components/reserva-armamento/PainelNoticias.tsx` — listener de refresh, layout da imagem com `min-w-0`/`flex-shrink-0`, quebra de texto

