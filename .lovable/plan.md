
# Lista de Aniversariantes + Reformatador de Datas + Edição manual

## 1. Aba "Aniversariantes" no `GerenciarNoticiasTotem.tsx`

Adicionar um Dialog acionado por botão **"Aniversariantes do dia"** (ícone `Cake`) no cabeçalho, que mostra:

### Tabela com TODOS os policiais aniversariantes de hoje
- Colunas: Posto/Grad · Nome de Guerra · Nome Completo · Matrícula · Idade · Data (formatada `dd/MM/yyyy`) · Valor bruto do campo `NASCIMENTO` (para diagnóstico) · Ações
- Reutiliza a função `parseNascimento` (extraída para arquivo compartilhado ou duplicada localmente) que aceita: int64 Excel serial (`34493` → 08/06/1994), strings ISO, strings numéricas, Timestamps Firestore
- Botão **"Atualizar"** no topo do dialog → re-executa a varredura e atualiza `config_painel/aniversariantes.refreshAt` (sincroniza todos os totens em tempo real)

### Ação por linha: "Corrigir data de nascimento"
- Abre sub-dialog com Input tipo `date` (formato pt-BR)
- Ao salvar: grava no documento do policial em `policiais/{id}` o campo `NASCIMENTO` como **Excel serial int** (mantém compatibilidade com o formato existente — fórmula inversa: `Math.floor(date.getTime() / 86400000) + 25569`)
- Após salvar: atualiza `refreshAt` para refletir nos totens em segundos

## 2. Botão "Reformatar todas as datas de nascimento"

Botão de ação em massa **"Padronizar formato NASCIMENTO"** dentro do dialog de aniversariantes (com confirmação dupla). Para cada policial:

- Lê todos os possíveis campos de nascimento (`NASCIMENTO`, `Data de Nascimento`, `dataNascimento`, `data_nascimento`, scan case-insensitive de qualquer chave que contenha "nascimento")
- Detecta o formato (Excel serial / string ISO / string `dd/MM/yyyy` / Timestamp / Date)
- Converte tudo para **Excel serial int64** e grava em `NASCIMENTO`
- Pula registros sem data ou com data inválida (loga no console com matrícula)
- Mostra toast com totais: `Convertidos: X | Já no formato: Y | Sem data: Z | Inválidos: W`
- Ao final, atualiza `refreshAt` para forçar refresh nos totens

### Aba complementar: "Listar todos os policiais (busca)"
Dentro do mesmo dialog, segunda aba **"Buscar policial"** com Input de busca (por nome, nome de guerra ou matrícula) listando os policiais encontrados com:
- Data de nascimento atual formatada
- Botão "Editar data" (mesmo sub-dialog do item 1)

Isso permite corrigir manualmente a data de qualquer policial — não apenas dos aniversariantes do dia.

## 3. Visual e UX

- Usar `Tabs` (Radix) no Dialog: aba 1 = "Aniversariantes hoje" · aba 2 = "Buscar policial"
- Linhas de aniversariantes destacadas com fundo `bg-pink-50`
- Tabela com `ScrollArea` (max altura para caber em telas menores)
- Datas exibidas em `dd/MM/yyyy` (padrão sistema)

## Arquivos editados

- `src/components/painel-noticias/GerenciarNoticiasTotem.tsx` — novo Dialog "Aniversariantes" com tabela, botão de reformatação em massa, aba de busca, e sub-dialog de edição de data

Nenhum outro arquivo precisa ser tocado — `PainelNoticias.tsx` já reage automaticamente via `onSnapshot` em `config_painel/aniversariantes` quando `refreshAt` muda.
