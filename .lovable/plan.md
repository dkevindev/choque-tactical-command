

# Plano: CID Completo, Campos Opcionais, Filtros e Exportacao Excel

---

## 1. Tornar campos nao obrigatorios

**Arquivo:** `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`

- Remover a validacao de `selectedCid` no `handleSalvar` (linha 162)
- Apenas `selectedPolicial`, `dataInicio` e `dias` serao obrigatorios
- Quando nao houver CID selecionado, salvar `cid: ''` e `cidDescricao: ''`
- Permitir tambem digitacao livre no campo CID (caso o usuario digite um codigo que nao esta no autocomplete, salvar o texto digitado)
- Remover os asteriscos (*) dos labels de CID, Medico, CRM e Hospital no formulario

---

## 2. Substituir cidData.ts com a tabela completa de CIDs

**Arquivo:** `src/lib/cidData.ts`

- Substituir os ~160 codigos atuais pela tabela completa do Excel enviado (~14.400 codigos CID-10)
- Manter o mesmo formato `{ codigo: string, descricao: string }`
- Inclui todos os codigos como S462, M501, A059 que nao estavam sendo encontrados
- A funcao `buscarCid` continuara funcionando igual, retornando no maximo 15 resultados por busca

---

## 3. Adicionar filtros na lista de atestados

**Arquivo:** `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`

Novos filtros acima da tabela de atestados:
- **Filtro por policial**: Select/combobox para filtrar por nome do policial
- **Filtro por mes**: Select com meses (Janeiro a Dezembro)
- **Filtro por ano**: Select com anos disponiveis
- **Filtro por periodo**: Campos "Data De" e "Data Ate" para filtrar por intervalo

Todos os filtros serao combinados (AND) e aplicados sobre a lista de atestados.

---

## 4. Exportar tabela em Excel

**Arquivo:** `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`

- Adicionar botao "Exportar Excel" ao lado dos filtros
- Gerar arquivo .xlsx ou .csv com os atestados filtrados
- Colunas: Policial, Post/Grad, Matricula, Data Inicio, Dias, Data Fim, CID, Descricao CID, Medico, CRM, Hospital, Status Pericia
- Usar geracao de CSV nativo (sem dependencia extra) com download automatico

---

## Resumo dos arquivos

| Arquivo | Acao |
|---------|------|
| `src/lib/cidData.ts` | Reescrever com tabela completa (~14.400 CIDs) |
| `src/components/gestao-pessoas/AtestadosMedicosTab.tsx` | Campos opcionais + filtros + exportacao Excel |

