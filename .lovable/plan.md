## Problema

Hoje a tabela de Policial (colunas COLETE/ARMAMENTO) e as cautelas permanentes guardam um **snapshot** do material (numeroSerie, nome, etc.). Quando o material é editado, apagado ou tem baixa, esses snapshots ficam desatualizados:

- `PolicialTable.tsx` lê `cautelas_permanentes.materiais[].numeroSerie` (snapshot antigo) em vez do material vivo.
- `CadastroMateriais.handleSubmit` (linha 416-417) só sincroniza o array `materiais` da cautela quando **muda o policial** — se você só corrigiu o número de série, a cautela continua com o número antigo.
- A baixa e a exclusão já removem o item da cautela, mas se algum registro antigo tiver ficado órfão (material `baixado/transferido` ainda referenciado), a coluna do policial continua mostrando.

## Solução

Tornar o documento em `materiais_belicos` a **única fonte de verdade**. A cautela passa a guardar apenas a referência (`materialId`) e — em tempo de leitura/edição — busca os dados atuais do material. Em paralelo, manter o snapshot da cautela "vivo" via sincronização automática a cada mudança no material.

### 1. `src/components/PolicialTable.tsx` — derivar COLETE/ARMAMENTO do material

Substituir a leitura de `cautelas_permanentes` pela leitura de `materiais_belicos`:

- Carregar `materiais_belicos` filtrando `!baixado && !transferido && policialAssociadoId`.
- Construir `Map<policialId, { armamento?, colete? }>` usando o `numeroSerie` **atual** do material.
- Critério de categoria: `categoria === 'Armamento'` → coluna ARMAMENTO; `categoria === 'Colete Balístico'` (e equivalentes já usados no projeto) → coluna COLETE.
- Manter busca por número de série usando os valores atuais.

Resultado: qualquer alteração no material reflete imediatamente; material baixado/transferido some da coluna.

### 2. `src/components/admin-belico/CadastroMateriais.tsx` — sincronizar cautela em toda edição

No bloco `if (editingMaterial)` (linha ~416), **antes** do `if (policialAntigoId !== policialNovoId)`, adicionar uma sincronização incondicional: para toda cautela ativa que contenha `materiais[].materialId === editingMaterial.id` (ou `${id}_carregadores` / `${id}_municoes`), atualizar in-place os campos do snapshot (`numeroSerie`, `nome`, `categoria`, `fabricante`, `modelo`, `calibre`, `tamanhoColete`, `sexo`, `numeroSIARM`, `quantidadeCarregadores`, `quantidadeMunicoes`) a partir dos novos `materialData`. Persistir com `updateDoc` apenas as cautelas que realmente mudaram.

Assim a cautela permanente reflete o material atualizado mesmo quando o policial não muda.

### 3. `handleDelete` (linha ~830) — já está correto

Continua removendo os itens cuja `materialId` casa com o id (e variantes `_carregadores`/`_municoes`). Apenas garantir que também trate as variantes (hoje filtra só `m.materialId !== id`). Adicionar o filtro das duas variantes para limpar acessórios/munições deixados para trás.

### 4. `BaixaMaterialCargaModal.tsx` — já está correto

Já marca `baixado=true`, `cautelado=false` e remove da cautela. Sem alteração além de incluir também a remoção das variantes `_carregadores`/`_municoes` (mesmo ajuste do item 3) para não deixar lixo.

### 5. Botão de reparo "Sincronizar cautelas com materiais"

Adicionar em `CadastroMateriais.tsx` (junto aos outros utilitários existentes) uma ação única que percorre `cautelas_permanentes` ativas e:

1. Atualiza cada item para refletir o estado atual do material (`numeroSerie`, etc.).
2. Remove itens cujo `materialId` não exista mais ou cujo material esteja `baixado/transferido`.
3. Reporta o total de cautelas corrigidas via toast.

Isso conserta os dados legados que já estão divergentes.

## Arquivos alterados

- `src/components/PolicialTable.tsx`
- `src/components/admin-belico/CadastroMateriais.tsx`
- `src/components/admin-belico/BaixaMaterialCargaModal.tsx` (ajuste mínimo)

## Fora do escopo

- Não mexer no fluxo de cautelas temporárias da Reserva de Armamento.
- Não criar triggers/regras no backend (projeto usa Firestore, não Postgres).
