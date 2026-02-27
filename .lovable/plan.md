
# Padronizar Ordenacao e Resolver Dados Estaticos de Policiais

## Problema 1: Ordenacao inconsistente
Varios locais do sistema listam policiais mas usam logica de ordenacao diferente ou nenhuma. O `sortByHierarquia` de `policialUtils.ts` e a versao canonica, mas nao e usado em todos os lugares.

### Locais que precisam adotar `sortByHierarquia`:

1. **PolicialTable.tsx** (linhas 115-192) - Tem sua propria logica de ordenacao com `getPostGradOrder` local, `hasCmtRpmont`, `shouldCapComeFirst`. Substituir por `sortByHierarquia` importado de `policialUtils.ts`.

2. **PolicialSearchCombobox.tsx** (linha 88-98) - Lista filtrada sem nenhuma ordenacao hierarquica. Adicionar `.sort(sortByHierarquia)` apos o filtro, mapeando os campos (`posto` -> `Post/Grad`, etc.) ou adaptando antes de ordenar.

3. **ArmeiroInterface.tsx** (linhas 1069-1076) - `policiaisFiltrados` sem ordenacao. Adicionar `.sort(sortByHierarquia)`.

4. **NovaCautelaForm.tsx** - Lista de policiais para selecao de cautela. Verificar e adicionar ordenacao.

5. **EfetivoTab.tsx** (linhas 102-108) - Tem `getPostGradOrder` local duplicado. Remover e usar apenas o `sortByHierarquia` importado (que ja e usado na linha 133).

---

## Problema 2: Dados estaticos de graduacao nas cautelas permanentes

Quando uma cautela e criada, os campos `policialNome`, `policialPatente` e `policialAssociadoNome` sao gravados como texto fixo. Se o policial e promovido, os dados ficam desatualizados.

### Solucao: Resolucao dinamica na hora de EXIBIR

Nao alterar como os dados sao gravados (manter `policialId` como referencia principal). Criar uma funcao utilitaria que, dado um `policialId`, busca os dados atuais do policial na colecao `policiais` e retorna posto/graduacao e nome atualizados.

### Arquivos afetados para exibicao dinamica:

1. **CadastroMateriais.tsx** (linha 174) - Onde monta `policialAssociadoNome` a partir da cautela: em vez de usar `cautela.policialPatente + cautela.policialNome`, buscar dados atuais pelo `policialId`.

2. **GerenciarCautelas.tsx** (linha 327) - Exibe `cautela.policialNome` estatico na tabela. Resolver dinamicamente usando `policialId`.

3. **BaixaMaterialCargaModal.tsx** (linha 82) - Monta nome a partir de `policialPatente + policialNome` da cautela. Resolver pelo ID.

4. **MateriaisTransferidos.tsx** (linha 163) - Exibe `policialPatente + policialNome`. Resolver pelo ID.

5. **MateriaisTransferidosCarga.tsx** (linhas 149, 179) - Mesmo padrao.

6. **TransferenciaPolicialModal.tsx** (linha 196) - Exibe dados estaticos.

7. **ConsultaMaterialPolicial.tsx** - Exibe dados de cautelas com nomes estaticos.

### Implementacao tecnica:

Criar um hook `usePolicialResolver` ou uma funcao de cache que:
- Recebe uma lista de `policialId`s
- Faz uma unica query ao Firebase para buscar todos os policiais
- Retorna um Map de `policialId -> { nome, postGrad, nomeGuerra, matricula }`
- Usado nos componentes de listagem para exibir dados atualizados

```text
// Novo hook: src/hooks/usePolicialResolver.ts
// Input: policialIds: string[]
// Output: Map<string, { nome, postGrad, nomeGuerra, matricula }>
// Faz getDocs(collection('policiais')) uma vez e cacheia
```

Nos componentes de listagem, em vez de exibir `cautela.policialPatente + cautela.policialNome`, exibir:
```text
const dadosAtuais = policiaisMap.get(cautela.policialId);
const nomeExibicao = dadosAtuais 
  ? `${dadosAtuais.postGrad} ${dadosAtuais.nomeGuerra}`
  : `${cautela.policialPatente} ${cautela.policialNome}`; // fallback
```

---

## Arquivos a modificar

1. **src/hooks/usePolicialResolver.ts** (NOVO) - Hook para resolver dados atuais de policiais por ID
2. **src/components/PolicialTable.tsx** - Remover logica de ordenacao local, usar `sortByHierarquia`
3. **src/components/guarda-quartel/PolicialSearchCombobox.tsx** - Adicionar ordenacao hierarquica na lista
4. **src/components/reserva-armamento/ArmeiroInterface.tsx** - Adicionar `.sort(sortByHierarquia)` nos policiais filtrados
5. **src/components/gestao-pessoas/EfetivoTab.tsx** - Remover `getPostGradOrder` duplicado
6. **src/components/admin-belico/CadastroMateriais.tsx** - Usar resolver para exibir dados atuais do policial cautelado
7. **src/components/admin-belico/GerenciarCautelas.tsx** - Usar resolver para exibir dados atuais
8. **src/components/admin-belico/BaixaMaterialCargaModal.tsx** - Usar resolver para exibir dados atuais
9. **src/components/admin-belico/MateriaisTransferidos.tsx** - Usar resolver para exibir dados atuais
10. **src/components/admin-belico/MateriaisTransferidosCarga.tsx** - Usar resolver para exibir dados atuais
11. **src/components/admin-belico/TransferenciaPolicialModal.tsx** - Usar resolver para exibir dados atuais
12. **src/components/admin-belico/NovaCautelaForm.tsx** - Adicionar ordenacao na lista de policiais
