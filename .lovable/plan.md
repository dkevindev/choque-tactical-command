## Problema

Em **Gestão e Logística > Policial**, as colunas **COLETE** e **ARMAMENTO** mostram `-` mesmo quando o policial possui materiais cautelados.

## Causa raiz

`src/components/PolicialTable.tsx` (linhas 76–93) deriva as colunas a partir de `materiais_belicos`, mas lê o campo errado:

```ts
const policialId = m.policialAssociadoId; // ❌ esse campo não existe no documento
```

No restante do sistema (`CadastroMateriais.tsx`, `BaixaMaterialCargaModal.tsx`, `AnaliseArmamentos.tsx`, `ArmamentosSection.tsx`) o vínculo material → policial é gravado no campo **`n`** (id do policial), com `cautelado: true` e `policialAssociadoNome`/`policialAssociadoMatricula` apenas para exibição. Como `m.policialAssociadoId` é sempre `undefined`, o loop faz `return` e nenhum material entra no `cautelasMap` → todas as linhas exibem `-`.

## Correção

Editar **apenas** `src/components/PolicialTable.tsx`, no bloco de carga (≈ linhas 76–93):

1. Trocar `const policialId = m.policialAssociadoId;` por:
   ```ts
   const policialId = m.n || m.policialAssociadoId;
   ```
   (mantém compatibilidade caso exista algum registro legado).

2. Considerar também o flag `m.cautelado` como gatilho válido — se `!policialId` mas `m.cautelado`, ignorar como hoje (sem id não dá pra mapear), porém **não** descartar materiais por `numeroSerie` vazio quando for `Colete Balístico` (alguns coletes antigos podem não ter série); nesse caso, exibir `S/N` em vez de bloquear a linha:
   ```ts
   const numeroSerie = m.numeroSerie || 'S/N';
   ```

3. Nenhuma outra mudança: a lógica de `baixado`/`transferido`, ordenação e filtros permanece igual; assim, baixas/transferências continuam removendo o item da coluna automaticamente, como já foi implementado na rodada anterior.

## Validação

- Abrir Gestão e Logística > Policial e verificar que o policial do exemplo (WEMERSON JARDEL) passa a exibir **PISTOLA .40 — 58H171292** em ARMAMENTO e **348570087** em COLETE.
- Confirmar que policiais sem cautela continuam com `-`.
- Confirmar que ao dar baixa/transferir o material, a coluna volta a `-` no próximo refresh (comportamento já existente).

## Arquivos

- `src/components/PolicialTable.tsx` (edição pontual, ~3 linhas).
