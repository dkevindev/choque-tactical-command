
# Gerenciar Funcoes, Situacoes e Melhorar Retirada de Situacao

## Resumo

Tres grandes melhorias no modulo de Gestao de Pessoas:

1. **Aba Funcao**: adicionar secao para gerenciar o cadastro de funcoes (adicionar, editar, excluir) -- salvas no Firestore na colecao `config_funcoes`
2. **Aba Situacao**: adicionar secao para gerenciar o cadastro de situacoes (adicionar, editar, excluir) com campo "indisponibilidade" (sim/nao) por situacao -- salvas na colecao `config_situacoes`
3. **Retirar Situacao**: ao clicar "Retirar da Situacao", abrir dialog pedindo nova situacao, nova funcao e publicacao (opcional). Registrar tudo nos assentamentos do policial
4. **Ordenacao por hierarquia**: nas listas de policiais tanto na aba Funcao quanto na aba Situacao, ordenar pela hierarquia militar (mesma logica do EfetivoTab)

---

## Detalhes Tecnicos

### 1. Colecoes Firebase novas

**`config_funcoes`** -- cada documento:
```
{ nome: "ARMEIRO", criadoEm: "..." }
```

**`config_situacoes`** -- cada documento:
```
{ nome: "FERIAS", indisponivel: true, criadoEm: "..." }
```

Na primeira carga, se as colecoes estiverem vazias, popular com os valores hardcoded atuais (FUNCOES_DISPONIVEIS e SITUACOES_DISPONIVEIS).

### 2. Arquivo: `src/components/gestao-pessoas/FuncaoTab.tsx`

- Remover array hardcoded `FUNCOES_DISPONIVEIS`
- Buscar funcoes de `config_funcoes` no Firestore (useEffect)
- Adicionar Card "Gerenciar Funcoes" no topo com:
  - Tabela listando funcoes com botoes Editar e Excluir
  - Botao "Adicionar Funcao" que abre dialog com input de nome
  - Editar: dialog com input preenchido
  - Excluir: confirmacao antes de deletar
- Aplicar ordenacao por hierarquia (`getPostGradOrder`) na lista de policiais da tabela

### 3. Arquivo: `src/components/gestao-pessoas/SituacaoTab.tsx`

- Remover array hardcoded `SITUACOES_DISPONIVEIS`
- Buscar situacoes de `config_situacoes` no Firestore (useEffect)
- Adicionar Card "Gerenciar Situacoes" com:
  - Tabela listando situacoes com coluna "Indisponibilidade" (Switch sim/nao), botoes Editar e Excluir
  - Botao "Adicionar Situacao" com dialog (nome + checkbox indisponibilidade)
- Alterar `handleRetirarSituacao`:
  - Em vez de executar direto, abrir dialog pedindo:
    - Nova situacao (select das situacoes cadastradas, default "MONTADO - POLICIAMENTO OSTENSIVO")
    - Nova funcao (select das funcoes cadastradas, default funcaoOrigem do policial)
    - Publicacao (input texto, opcional)
  - Ao confirmar: atualizar policial no Firestore e gravar assentamento na colecao `assentamentos` com dados completos (situacao anterior, nova situacao, nova funcao, publicacao, data)
- Aplicar ordenacao por hierarquia nas listas de policiais

### 4. Colecao `assentamentos` no Firestore

Cada registro ao retirar situacao:
```
{
  policialId: "...",
  tipo: "Mudanca de Situacao",
  data: "2026-02-27",
  descricao: "Retirado de FERIAS. Nova situacao: MONTADO - POLICIAMENTO OSTENSIVO. Nova funcao: ARMEIRO",
  situacaoAnterior: "FERIAS",
  novaSituacao: "MONTADO - POLICIAMENTO OSTENSIVO",
  novaFuncao: "ARMEIRO",
  publicacao: "Portaria 123/2024",
  criadoEm: "..."
}
```

### 5. Arquivo: `src/components/gestao-pessoas/EfetivoTab.tsx`

- Atualizar `AssentamentosSection` para tambem buscar da colecao `assentamentos` (alem de `atestados_medicos`) e incluir na timeline com cor propria e exibicao da publicacao quando houver

### 6. Funcao de ordenacao compartilhada

Extrair `getPostGradOrder` para `src/lib/policialUtils.ts` (ou reutilizar se ja existir) para usar em FuncaoTab e SituacaoTab.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/gestao-pessoas/FuncaoTab.tsx` | Gerenciamento dinamico de funcoes + ordenacao hierarquica |
| `src/components/gestao-pessoas/SituacaoTab.tsx` | Gerenciamento dinamico de situacoes com flag indisponibilidade + dialog de retirada com assentamento + ordenacao |
| `src/components/gestao-pessoas/EfetivoTab.tsx` | Buscar assentamentos na timeline |
| `src/lib/policialUtils.ts` | Adicionar/exportar getPostGradOrder (se nao existir) |
