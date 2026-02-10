

# Remover Status de Transferencias e Adicionar Historico de Material

## O que sera feito

### 1. Remover coluna "Status" da aba Transferencias

Em `MateriaisTransferidos.tsx`, remover:
- O filtro de Status (Select)
- A coluna "Status" da tabela (TableHead + TableCell)
- A funcao `getStatusBadge`
- O filtro `filtroStatus` do estado e da logica de filtragem
- A secao de status no modal de detalhes

### 2. Adicionar botao de Historico na aba Materiais

Em `CadastroMateriais.tsx`, adicionar na coluna "Acoes" um botao com icone de historico (History) que ao clicar abre um modal mostrando todo o historico de cautelas daquele material -- por quais policiais ele passou, datas de entrada e saida.

### 3. Registrar historico de cautelas do material

Criar uma nova colecao Firebase `historico_material` que sera alimentada sempre que:
- Um material for cautelado a um policial (entrada)
- Um material for devolvido/removido de uma cautela (saida)
- Um material for transferido com um policial

Cada registro tera: materialId, materialNome, policialNome, policialMatricula, policialId, tipo (cautelado/devolvido/transferido), data, observacoes.

Para materiais ja existentes, o historico sera construido a partir das cautelas ativas atuais (registro retroativo ao abrir o historico pela primeira vez nao sera feito -- apenas a partir de agora).

---

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/MateriaisTransferidos.tsx`

Remover:
- Estado `filtroStatus` e `setFiltroStatus`
- O Select de filtro de status no grid de filtros (alterar grid de 4 para 3 colunas)
- A coluna `<TableHead>Status</TableHead>` e `<TableCell>{getStatusBadge(t.status)}</TableCell>`
- A funcao `getStatusBadge`
- `matchStatus` da logica de filtragem
- Secao de status no modal de detalhes
- Ajustar colSpan de 8 para 7

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

Alteracoes:
1. Importar `History` do lucide-react
2. Adicionar estados: `historicoMaterial` (array), `showHistorico` (boolean), `historicoLoading` (boolean)
3. Criar funcao `loadHistorico(materialId)` que busca docs em `historico_material` onde `materialId == id`, ordenados por data desc
4. Na coluna Acoes, adicionar botao com icone History entre Edit e Trash
5. Adicionar modal/Dialog de historico com timeline mostrando cada evento

### Novo registro de historico

Nos pontos do codigo que ja existem onde um material e cautelado ou devolvido, adicionar chamada para salvar em `historico_material`:

**Em `CadastroMateriais.tsx` (ao cadastrar material com policial associado):**
```typescript
await addDoc(collection(db, 'historico_material'), {
  materialId: materialId,
  materialNome: materialData.nome,
  numeroSerie: materialData.numeroSerie || '',
  policialNome: formData.policialAssociadoNome,
  policialId: formData.policialAssociadoId,
  tipo: 'cautelado',
  data: new Date(),
  observacoes: 'Cautela inicial no cadastro'
});
```

**Em `CadastroMateriais.tsx` (ao excluir material que esta cautelado):**
```typescript
await addDoc(collection(db, 'historico_material'), {
  materialId: id,
  materialNome: material.nome,
  numeroSerie: material.numeroSerie || '',
  policialNome: cautelaInfo.policialNome,
  policialId: cautelaInfo.policialId,
  tipo: 'removido',
  data: new Date(),
  observacoes: 'Material excluido do sistema'
});
```

**Em `BaixaMaterialCargaModal.tsx` (ao dar baixa):**
```typescript
await addDoc(collection(db, 'historico_material'), {
  materialId: mat.id,
  materialNome: mat.nome,
  numeroSerie: mat.numeroSerie || '',
  policialNome: mat.policialAssociadoNome || '',
  policialId: mat.policialAssociadoId || '',
  tipo: 'baixa',
  data: new Date(),
  observacoes: `Baixa: ${motivoBaixa} - Destino: ${destino}`
});
```

### Modal de Historico (dentro de CadastroMateriais.tsx)

O modal mostrara uma timeline vertical com cada evento:
- Icone colorido por tipo (verde = cautelado, vermelho = devolvido, azul = transferido, cinza = baixa)
- Nome do policial
- Data formatada
- Tipo do evento
- Observacoes

### Colecao Firebase: `historico_material`

```text
{
  materialId: string
  materialNome: string
  numeroSerie: string
  policialNome: string
  policialId: string
  tipo: string (cautelado | devolvido | transferido | baixa | removido)
  data: Timestamp
  observacoes: string
}
```

### Resumo dos arquivos

| Arquivo | Acao |
|---------|------|
| `MateriaisTransferidos.tsx` | Alterar - remover coluna e filtro de Status |
| `CadastroMateriais.tsx` | Alterar - adicionar botao Historico + modal + registro de historico |
| `BaixaMaterialCargaModal.tsx` | Alterar - registrar historico ao dar baixa |
