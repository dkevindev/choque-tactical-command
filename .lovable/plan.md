

# Atualizar Cautelas ao Editar Material

## Problema Encontrado

Ao editar um material e mudar o policial associado (ou remover o policial colocando como disponivel), o sistema **nao atualiza as cautelas permanentes**. A logica de cautela so executa para materiais novos (cadastro), nunca para edicao.

Cenarios que nao funcionam hoje:
1. **Trocar policial**: Material fica na cautela do antigo E nao entra na cautela do novo
2. **Remover policial** (deixar disponivel): Material continua na cautela do antigo

## O que sera feito

Adicionar logica no fluxo de edicao (`editingMaterial`) para:
- Detectar se o policial mudou
- Remover o material da cautela do policial anterior
- Adicionar na cautela do novo policial (ou criar cautela nova)
- Registrar no historico de material

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

Dentro do bloco `if (editingMaterial)` (apos a linha 339), adicionar logica para verificar mudanca de policial:

```
if (editingMaterial) {
  await updateDoc(doc(db, 'materiais_belicos', editingMaterial.id), materialData);
  materialId = editingMaterial.id;

  // NOVO: Verificar se policial mudou
  const policialAntigoId = editingMaterial.policialAssociadoId || '';
  const policialNovoId = formData.policialAssociadoId || '';

  if (policialAntigoId !== policialNovoId) {
    // 1. Remover da cautela do policial antigo (se existia)
    if (policialAntigoId) {
      // Buscar cautelas ativas do policial antigo
      // Filtrar o material da lista de materiais da cautela
      // Registrar no historico como "devolvido"
    }

    // 2. Adicionar na cautela do policial novo (se definido)
    if (policialNovoId) {
      // Buscar cautela ativa do novo policial
      // Se existe: adicionar material na lista
      // Se nao existe: criar nova cautela
      // Registrar no historico como "cautelado"
    }
  }

  toast.success('Material atualizado com sucesso');
}
```

### Resumo das acoes

| Cenario | O que acontece |
|---------|---------------|
| Trocar policial A por B | Remove da cautela de A, adiciona na cautela de B |
| Remover policial (disponivel) | Remove da cautela do policial anterior |
| Manter mesmo policial | Nenhuma alteracao nas cautelas |
| Associar policial onde nao tinha | Cria/atualiza cautela do novo policial |

A logica reutiliza o mesmo padrao ja existente no cadastro (linhas 362-471) para criar/atualizar cautelas, e o padrao do delete (linhas 522-548) para remover de cautelas.
