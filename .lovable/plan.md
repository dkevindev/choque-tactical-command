
# Botao para Migrar Policiais de "MONTADO - POLICIAMENTO OSTENSIVO" / "VIATURA" para "EM ATIVIDADE"

## Resumo
Adicionar um botao no topo da secao "Policiais Disponíveis" (ou na lista principal) que permita alterar em massa a situacao de todos os policiais que estao com `SITUAÇÃO` igual a "MONTADO - POLICIAMENTO OSTENSIVO" ou "VIATURA" para "EM ATIVIDADE".

## Detalhes Tecnicos

### Arquivo: `src/components/gestao-pessoas/SituacaoTab.tsx`

1. **Adicionar botao** na area dos policiais disponiveis (proximo a linha 131 onde eles sao filtrados) com texto como "Migrar todos para EM ATIVIDADE"
2. **Nova funcao `handleMigrarParaEmAtividade`**:
   - Filtra policiais com `SITUAÇÃO` igual a "MONTADO - POLICIAMENTO OSTENSIVO" ou "VIATURA" (ou sem situacao)
   - Usa `writeBatch` do Firestore para atualizar todos de uma vez, setando `SITUAÇÃO: "EM ATIVIDADE"`
   - Exibe toast de sucesso com quantidade migrada
   - Recarrega a lista de policiais
3. **Confirmacao via AlertDialog** antes de executar, mostrando quantos policiais serao afetados
4. O botao ficara no `CardHeader` da secao de policiais disponiveis, ao lado do titulo
