

# Plano de Melhoria Completa: Sistema de Gestao de Pessoas

## Visao Geral

O plano aborda 3 grandes frentes: (1) Substituir o drag-and-drop de funcoes por uma abordagem mais pratica, (2) Criar uma aba completa de Estatisticas com graficos e exportacao, e (3) Corrigir problemas e melhorias gerais.

---

## 1. Reformular a Aba "Funcao" (substituir drag-and-drop)

**Problema:** O sistema atual de arrastar e soltar e dificil de usar com um efetivo grande. Cada funcao ocupa muito espaco na tela e e lento para reorganizar.

**Solucao:** Substituir por uma **tabela editavel com filtros e acao em lote**:

**Arquivo:** `src/components/gestao-pessoas/FuncaoTab.tsx` (reescrever)

- Tabela com colunas: Post/Grad, Nome, Funcao Atual, Acao
- Na coluna "Acao", um `Select` inline para trocar a funcao do policial diretamente na linha
- Filtro por funcao atual (Select) + busca por nome
- Botao "Alterar em lote": selecionar varios policiais via checkbox e definir uma nova funcao para todos de uma vez
- Resumo visual: cards compactos mostrando quantidade por funcao (ja existe, manter)
- Remover totalmente a dependencia do `@hello-pangea/dnd` neste componente

---

## 2. Nova Aba "Estatisticas" (a maior entrega)

**Arquivo novo:** `src/components/gestao-pessoas/EstatisticasTab.tsx`

**Arquivo modificado:** `src/components/GestãoPessoas.tsx` (adicionar a 9a aba)

### 2.1 Cards de Resumo (topo)
- Efetivo Total
- Aptos para servico (Montado + Viatura)
- De Ferias (contagem)
- Em Licenca Tratamento Saude
- Em outras situacoes especiais (Luto, Nupcias, Cursando, etc.)
- Transferidos (total historico)
- Atestados no mes atual (quantidade)
- Dias de licenca no mes (somatorio)

### 2.2 Graficos (recharts - ja instalado)
- **Pizza**: Distribuicao por Situacao (todos os status)
- **Pizza**: Distribuicao por Funcao
- **Barras**: Efetivo por Posto/Graduacao
- **Barras**: Atestados por mes (ultimos 12 meses) - quantidade e dias
- **Barras**: Policiais por Unidade/Esquadrao
- **Barras Horizontais**: Top 10 funcoes com mais policiais
- **Linha**: Evolucao mensal de afastamentos (ferias + licencas + atestados)

### 2.3 Tabelas Detalhadas (sub-abas dentro de Estatisticas)
- **Resumo por Situacao**: tabela com cada situacao, quantidade de policiais, percentual
- **Resumo por Funcao**: tabela com cada funcao, quantidade
- **Resumo por Posto/Grad**: tabela com cada graduacao, quantidade
- **Policiais Afastados Hoje**: lista de quem esta de ferias, licenca, atestado vigente

### 2.4 Exportacao
- Botao "Exportar Relatorio Completo" que gera CSV com:
  - Resumo geral (totais)
  - Lista de policiais por situacao
  - Lista de policiais de ferias com datas
  - Lista de policiais em licenca
  - Quantidade por funcao
  - Quantidade por posto/graduacao
- Botao "Exportar Efetivo Completo" (todos os policiais com todos os campos)

### 2.5 Dados necessarios
- Colecao `policiais` (ja carregada no componente pai)
- Colecao `atestados_medicos` (buscar via getDocs)
- Colecao `policiais_transferidos` (buscar via getDocs)

---

## 3. Melhorias e Correcoes Identificadas

### 3.1 Dashboard atual (GestãoPessoas.tsx)
- O dashboard atual tem graficos basicos que serao **movidos/expandidos** na nova aba Estatisticas
- O dashboard ficara como uma visao resumida com os cards + alertas, sem duplicar graficos

### 3.2 TabsList com 9 abas
- Atualmente `grid-cols-8`, sera alterado para `grid-cols-9` para incluir "Estatisticas"
- Em telas menores, usar `flex flex-wrap` em vez de grid fixo para evitar abas cortadas

### 3.3 Aba Situacao - Bug potencial
- Ao retirar policial da situacao, a funcao default volta para 'VIATURA', mas nem todos eram de viatura. O campo `funcaoOrigem` resolve isso, porem se nao existir, o fallback deveria ser 'MONTADO - POLICIAMENTO OSTENSIVO' em vez de 'VIATURA'

### 3.4 Aba Ferias - Mesmo bug
- `handleRetirarFerias` usa `policial.funcaoOrigem || 'VIATURA'` - mesmo problema do fallback

### 3.5 Aba Movimentacoes - Campo nome ao cadastrar chegada
- Os campos salvos usam nomes diferentes do padrao da colecao (`Nome de Guerra` vs `NOME DE GUERRA`). Isso pode causar inconsistencia ao exibir dados

### 3.6 Previsao Ferias hardcoded "2024"
- O campo `PREVISAO FERIAS - AQUISITIVO 2024` esta hardcoded. Deveria ser atualizado para o ano vigente ou ser dinamico

---

## 4. Ajuste na Navegacao das Abas

**Arquivo:** `src/components/GestãoPessoas.tsx`

```text
Abas atuais (8):
Dashboard | Ferias | Efetivo | Movimentacoes | Situacao | Funcao | Transferidos | Atestados

Abas novas (9):
Dashboard | Ferias | Efetivo | Movimentacoes | Situacao | Funcao | Transferidos | Atestados | Estatisticas
```

- TabsList com `flex flex-wrap gap-1` para responsividade
- Aba Estatisticas com icone `BarChart3`

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `GestãoPessoas.tsx` | Adicionar aba Estatisticas, ajustar TabsList responsivo |
| `FuncaoTab.tsx` | Reescrever: remover drag-drop, usar tabela com Select inline e acao em lote |
| `EstatisticasTab.tsx` (NOVO) | Aba completa com cards, graficos, tabelas e exportacao |
| `SituacaoTab.tsx` | Fix fallback funcaoOrigem |
| `GestaoFeriasTab.tsx` | Fix fallback funcaoOrigem |

