

# Correção do Modal + Sistema de Problemas de Material

## 1. Corrigir Modal de edição/novo material em CadastroMateriais

O `DialogContent` na linha 1692 usa `max-h-[90vh] flex flex-col` e o `ScrollArea` usa `flex-1 min-h-0`, mas o ScrollArea precisa de uma altura explícita para funcionar. A correção é adicionar `overflow-y-auto` diretamente no container interno ou garantir que o ScrollArea tenha altura definida.

**Arquivo**: `src/components/admin-belico/CadastroMateriais.tsx` (linha 1692)
- Mudar `DialogContent` para `max-w-3xl max-h-[90vh] overflow-hidden flex flex-col`
- Mudar o `ScrollArea` para ter `className="flex-1 min-h-0 max-h-[calc(90vh-80px)]"` ou trocar por um `div` com `overflow-y-auto` e `max-h-[calc(90vh-80px)]`

## 2. Sistema de Relato de Problemas de Material

### Firestore
Nova coleção: `problemas_material`
```text
{
  materialId: string,
  materialNome: string,
  materialNumeroSerie: string,
  problema: string,
  relatadoPor: string (nome armeiro),
  dataRelato: Date,
  status: "aguardando" | "resolvido",
  dataResolucao?: Date,
  resolvidoPor?: string
}
```

### Interface do Armeiro (`ArmeiroInterface.tsx`)
- Adicionar botão "Relatar Problema" nas ações do material (no livro do dia ou na seleção de materiais)
- Abre um Dialog simples: seleciona o material, descreve o problema, salva em `problemas_material`

### Nova aba em Gestão > Reserva (`ReservaAdminPage.tsx`)
- Adicionar terceira aba "Problemas" ao lado de "Material na Rua" e "Histórico de Livros"
- Novo componente `src/components/reserva-armamento/ProblemasMaterialSection.tsx`:
  - Tabela com colunas: Material, Nº Série, Problema, Relatado por, Data, Status
  - Badge "Aguardando" (amarelo) ou "Resolvido" (verde)
  - Botão "Resolver" que marca como resolvido com data e nome
  - Filtro por status (todos / aguardando / resolvido)

