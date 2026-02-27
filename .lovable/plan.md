
# Corrigir Select de Nova Situacao e Adicionar Retirada em Lote

## Alteracoes no arquivo `src/components/gestao-pessoas/SituacaoTab.tsx`

### 1. Nova Situacao - Mostrar apenas situacoes cadastradas
No dialog "Retirar da Situacao", o select de "Nova Situacao" atualmente tem opcoes hardcoded ("MONTADO - POLICIAMENTO OSTENSIVO", "VIATURA") alem das cadastradas. Sera alterado para mostrar **somente** as situacoes vindas do Firestore (`config_situacoes`), mais a opcao fixa "MONTADO - POLICIAMENTO OSTENSIVO" (que e o estado padrao/disponivel, nao uma situacao especial).

### 2. Retirada em Lote
Adicionar checkboxes na lista de "Policiais em Situacao" para selecionar multiplos policiais e um botao "Retirar Selecionados" que abre o mesmo dialog de retirada, aplicando nova situacao, nova funcao e publicacao para todos os selecionados de uma vez. Cada policial tera seu assentamento registrado individualmente.

### Detalhes tecnicos

- Novo estado `selectedRetirada: string[]` para controlar policiais selecionados para retirada em lote
- Checkbox em cada linha da lista "Policiais em Situacao"
- Botao "Selecionar Todos" / "Retirar Selecionados (N)" no header do card
- Ao clicar "Retirar Selecionados", abrir o dialog de retirada (sem nome do policial especifico, mostrando "N policiais selecionados")
- `handleConfirmarRetirada` sera adaptado para funcionar tanto para 1 policial quanto para lote, usando `writeBatch` para performance
- O select de "Nova Situacao" no dialog sera: "MONTADO - POLICIAMENTO OSTENSIVO" (fixo) + todas as situacoes de `situacoesNomes`
