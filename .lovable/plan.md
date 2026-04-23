
# Aniversariantes (NASCIMENTO Excel serial) + Modelo editável + Autor manual

## 1. Detecção correta da data de nascimento

**Arquivo**: `src/components/reserva-armamento/PainelNoticias.tsx`

Confirmado: o campo é `NASCIMENTO` (int64, serial Excel — ex.: `34493` → 08/06/1994). A função `parseNascimento` atual já converte serial Excel via `(raw - 25569) * 86400 * 1000`, mas a leitura prioriza outros campos. Ajustes:

- Ler **`p.NASCIMENTO`** como campo principal (depois fallback para `Data de Nascimento`, `dataNascimento`, `data_nascimento`)
- Scan case-insensitive das chaves do doc (qualquer chave que contenha "nascimento")
- Log no console: `[Aniversariantes] Encontrados: N | Hoje: dd/mm` listando matrícula + nome detectados, para diagnóstico
- Calcular **idade** a partir do ano da data convertida

## 2. Slide individual por aniversariante

Hoje todos vão em UM slide. Alterar para gerar **um slide por policial**, cada um com seu próprio banner festivo (gradiente dourado/rosa, animação, ícone 🎂). Isso garante que o nome do policial específico apareça em destaque na rotação do carrossel.

## 3. Modelo de mensagem editável (com variáveis)

Novo documento Firestore: `config_painel/template_aniversario`
```
titulo: string    (default: "🎉 PARABÉNS {POSTO} {NOME DE GUERRA1} 🎉")
mensagem: string  (default: "O RPMONT deseja muitas felicidades — que Deus abençoe sua jornada!")
```

Variáveis substituídas por slide:
- `{NOME DE GUERRA1}` → nome de guerra
- `{NOME}` → nome completo
- `{POSTO}` ou `{POST/GRAD}` → posto/graduação
- `{MATRICULA}` → matrícula
- `{IDADE}` → idade calculada

`PainelNoticias.tsx` adiciona `onSnapshot` no template para atualização em tempo real.

## 4. Editor do modelo no Gerenciar

**Arquivo**: `src/components/painel-noticias/GerenciarNoticiasTotem.tsx`

Junto ao botão "Atualizar aniversariantes", novo botão **"Editar modelo de parabéns"** abre Dialog com:
- Input do Título + Textarea da Mensagem
- Chips clicáveis das variáveis (insere no cursor)
- Lista de variáveis com explicação
- Pré-visualização ao vivo usando dados fictícios (`SD KEVIN`, matrícula 123456, idade 30)
- Salvar → grava em `config_painel/template_aniversario` + atualiza `refreshAt` para forçar refresh imediato dos totens

## 5. Autor manual ao criar notícia/determinação

**Arquivo**: `src/components/painel-noticias/GerenciarNoticiasTotem.tsx`

- Remover leitura automática do `localStorage`
- Adicionar campo **"Autor / Responsável"** (Input obrigatório) no formulário
- Placeholder sugerindo formato (`Ex.: CAP FULANO`), mas vazio por padrão
- Validação no `handleSave`: se vazio, toast "Informe o autor" e bloqueia
- Ao editar notícia existente, carregar o `autor` salvo no campo

## Arquivos editados

- `src/components/reserva-armamento/PainelNoticias.tsx` — leitura priorizada de `NASCIMENTO`, slides individuais, listener do template, substituição de variáveis, log de diagnóstico
- `src/components/painel-noticias/GerenciarNoticiasTotem.tsx` — campo autor manual obrigatório, Dialog "Editar modelo de parabéns" com chips de variáveis e preview
