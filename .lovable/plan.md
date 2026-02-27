
# Melhorar Ordenacao por Hierarquia e Corrigir Data de Ultima Promocao

## Resumo
Tres ajustes principais:
1. Melhorar a funcao `sortByHierarquia` para desempatar por data da ultima promocao e numeral
2. Adicionar `SUBTEN` (e variacao `TENCEL`) na tabela de hierarquia
3. Criar funcao para retroativamente atualizar a `dataUltimaPromocao` dos policiais ja promovidos, consultando o `historico_promocoes`

---

## 1. Atualizar `sortByHierarquia` em `policialUtils.ts`

**Problema atual:** A funcao so ordena por posto/graduacao. Falta `SUBTEN` na lista. Nao desempata por data de promocao nem numeral.

**Solucao:**
- Adicionar `SUBTEN` (posicao 6) e `TENCEL` como alias de `TEN CEL` na tabela de ordem
- Ajustar posicoes: `1o SGT` passa a 7, `2o SGT` a 8, `3o SGT` a 9, `CB` a 10, `SD` a 11
- Quando mesma graduacao: ordenar pela `dataUltimaPromocao` (quem foi promovido primeiro eh mais antigo, vem antes)
- Quando mesma graduacao e mesma data: ordenar pelo `NUMERAL` (menor numeral primeiro)

```text
Ordem de desempate:
1. Posto/Graduacao (TEN CEL > MAJ > CAP > ... > SD)
2. Data ultima promocao (mais antigo primeiro)
3. Numeral (menor primeiro)
```

## 2. Corrigir dados retroativos de promocoes ja feitas

**Problema:** Promocoes anteriores podem nao ter gravado `dataUltimaPromocao` no documento do policial.

**Solucao:** Adicionar um botao na tela de Gestao de Pessoas (ou executar automaticamente) que:
- Consulta todos os registros em `historico_promocoes`
- Agrupa por `policialId` e pega a data mais recente
- Atualiza o campo `dataUltimaPromocao` no documento do policial correspondente

Isso sera um botao "Sincronizar Datas de Promocao" na aba de Efetivo ou dentro do dialog de Promocao, visivel apenas para correcao.

## 3. Garantir que futuras promocoes continuem atualizando

**Status:** Ja funciona - o `PromocaoDialog` (linha 231) ja grava `dataUltimaPromocao`. Nenhuma alteracao necessaria aqui.

---

## Detalhes Tecnicos

### Arquivo: `src/lib/policialUtils.ts`

Atualizar `getPostGradOrder` para incluir SUBTEN e TENCEL:
```typescript
const ordem = {
  'TEN CEL': 1, 'TENCEL': 1, 'MAJ': 2, 'CAP': 3,
  '1o TEN': 4, '2o TEN': 5, 'SUBTEN': 6,
  '1o SGT': 7, '2o SGT': 8, '3o SGT': 9, 'CB': 10, 'SD': 11
};
```

Atualizar `sortByHierarquia` para desempatar:
```typescript
export const sortByHierarquia = (a: any, b: any): number => {
  const aIsCmt = a['FUNCAO']?.includes('CMT RPMONT');
  const bIsCmt = b['FUNCAO']?.includes('CMT RPMONT');
  if (aIsCmt && !bIsCmt) return -1;
  if (!aIsCmt && bIsCmt) return 1;

  const orderDiff = getPostGradOrder(a['Post/Grad'] || '') - getPostGradOrder(b['Post/Grad'] || '');
  if (orderDiff !== 0) return orderDiff;

  // Mesma graduacao: quem foi promovido primeiro eh mais antigo
  const dateA = a.dataUltimaPromocao ? new Date(a.dataUltimaPromocao).getTime() : Infinity;
  const dateB = b.dataUltimaPromocao ? new Date(b.dataUltimaPromocao).getTime() : Infinity;
  if (dateA !== dateB) return dateA - dateB;

  // Mesmo posto e data: ordenar por numeral
  const numA = Number(a.NUMERAL || a.numeral || 9999);
  const numB = Number(b.NUMERAL || b.numeral || 9999);
  return numA - numB;
};
```

### Arquivo: `src/components/gestao-pessoas/PromocaoDialog.tsx`

Adicionar funcao `handleSincronizarDatasPromocao` que:
1. Busca todos os docs de `historico_promocoes`
2. Agrupa por `policialId`, pegando a data mais recente
3. Para cada policial, atualiza `dataUltimaPromocao` no Firestore
4. Exibe toast com quantidade atualizada

Adicionar botao "Sincronizar Datas de Promocao" na etapa de selecao do dialog, com confirmacao.
