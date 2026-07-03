## Objetivo
Na tabela de Gestão e Logística > Policial, exibir o Número da Cautela SIARM logo abaixo do número de série do armamento na coluna ARMAMENTO.

## Alteração
Arquivo único: `src/components/PolicialTable.tsx`

1. Estender a interface `CautelaData` para incluir `armamentoSIARM?: string`.
2. Ao montar `cautelasData` (nos dois blocos — vínculo direto por `policialAssociadoId` e via `cautelas_permanentes`), quando o material for `Armamento`, também guardar `mat.numeroSIARM` em `atual.armamentoSIARM`.
3. Na célula da coluna ARMAMENTO, abaixo do Badge com o nº de série, renderizar uma segunda linha pequena:
   - `SIARM: {armamentoSIARM}` em `text-xs text-muted-foreground` quando existir
   - `SIARM: —` quando estiver vazio (para facilitar identificar armas sem SIARM)
4. Incluir `armamentoSIARM` no filtro de busca, para permitir procurar por número SIARM.

Nenhuma outra tela ou lógica de backend é alterada — apenas apresentação na tabela de policiais.