

# Criar Menu "Saiu da Carga" e Corrigir Problemas de Materiais

## Contexto

Atualmente, ao transferir policiais ou dar baixa em coletes vencidos, os materiais nao sao corretamente removidos da carga e continuam aparecendo nas listagens (Coletes, Reserva de Armamento). Alem disso, ao excluir um material no Cadastro, o sistema nao verifica se ele esta cautelado a algum policial.

## O que sera feito

### 1. Nova aba "Saiu da Carga" no menu Belico

A grade de 6 abas passara para 7, adicionando "Saiu da Carga" entre "Transferencias" e "Materiais". Esta aba tera duas sub-abas internas:

**Sub-aba "Transferidos"**
- Reaproveitamento do componente `MateriaisTransferidos` ja existente, que mostra policiais transferidos e seus materiais levados/devolvidos
- Ja contem todas as informacoes: policial, destino, materiais, documentos

**Sub-aba "Baixa de Materiais"**
- Tabela com historico de materiais que receberam baixa (coletes vencidos, materiais inservíveis, etc.)
- Informacoes: nome do material, numero de serie, categoria, motivo da baixa, destino, policial cautelado antes, data da baixa
- Botao "Dar Baixa em Materiais" que abre modal para:
  - Selecionar materiais (com busca e filtros por categoria)
  - Selecao em lote (checkboxes)
  - Informar motivo da baixa (Vencimento, Inservível, Avaria, Extravio, Outro)
  - Informar destino (ex: "Enviado para destruicao", "Devolvido ao almoxarifado")
  - Ao confirmar: salvar registro na colecao `baixas_materiais` no Firebase, atualizar o material como `baixado: true` e `disponivel: false`, e remover da cautela permanente do policial se estiver cautelado

### 2. Filtrar materiais transferidos/baixados nas listagens

**ColetesTab.tsx**: Adicionar filtro na query para excluir coletes com `transferido: true` ou `baixado: true`

**Reserva de Armamento**: Materiais devolvidos por policiais transferidos devem ter o campo `policialAssociadoNome` limpo quando marcados como `disponivel: true` (correcao no `TransferenciaPolicialModal.tsx`)

### 3. Excluir material verifica cautela permanente

**CadastroMateriais.tsx**: Antes de deletar, consultar `cautelas_permanentes` para verificar se o material consta em alguma cautela ativa. Se sim, remover o material do array `materiais` da cautela antes de excluir.

---

## Detalhes Tecnicos

### Novo arquivo: `src/components/admin-belico/SaiuDaCarga.tsx`

Componente principal com Tabs internas:
- Tab "Transferidos": renderiza `<MateriaisTransferidos />`
- Tab "Baixa de Materiais": renderiza a listagem de materiais baixados + botao de acao

### Novo arquivo: `src/components/admin-belico/BaixaMaterialCargaModal.tsx`

Modal para dar baixa em lote:
- Carrega materiais de `materiais_belicos` (filtrando opcionalente por categoria, ex: "Colete Balistico")
- Busca por nome ou numero de serie
- Checkboxes para selecao em lote
- Campos: motivo da baixa (Select), destino (Input), observacoes (Textarea)
- Ao confirmar, para cada material selecionado:
  1. Criar doc em `baixas_materiais` com: materialId, nome, numeroSerie, categoria, fabricante, modelo, vencimento, motivoBaixa, destino, policialCauteladoNome, policialCauteladoMatricula, dataBaixa, observacoes
  2. Atualizar `materiais_belicos/{id}` com `baixado: true, disponivel: false, cautelado: false, dataBaixa: Timestamp.now(), motivoBaixa`
  3. Se material estava cautelado: buscar cautela em `cautelas_permanentes` onde `materiais` contem o materialId, remover do array `materiais` via `updateDoc`

### Alteracao: `src/components/AdminDashboard.tsx`

- Import `SaiuDaCarga`
- Alterar grid de 6 para 7 colunas nas tabs do Belico
- Adicionar `<TabsTrigger value="saiu-carga">Saiu da Carga</TabsTrigger>`
- Adicionar `<TabsContent value="saiu-carga"><SaiuDaCarga /></TabsContent>`

### Alteracao: `src/components/admin-belico/ColetesTab.tsx`

Na funcao `buscarColetes`, filtrar resultados que tenham `transferido: true` ou `baixado: true`:

```typescript
const dados = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter((d: any) => !d.transferido && !d.baixado) as Colete[];
```

### Alteracao: `src/components/admin-belico/TransferenciaPolicialModal.tsx`

Ao marcar material como devolvido, limpar o campo `policialAssociadoNome`:

```typescript
await updateDoc(doc(db, 'materiais_belicos', material.materialId), {
  disponivel: true,
  cautelado: false,
  policialAssociadoNome: '',
  policialAssociadoId: '',
  // ...resto dos campos
});
```

### Alteracao: `src/components/admin-belico/CadastroMateriais.tsx`

Na funcao `handleDelete`, antes de deletar, verificar cautelas:

```typescript
const handleDelete = async (id: string) => {
  if (!confirm('Tem certeza que deseja excluir este material?')) return;
  try {
    // Verificar se esta em alguma cautela ativa
    const cautelasSnapshot = await getDocs(
      query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))
    );
    for (const cautelaDoc of cautelasSnapshot.docs) {
      const cautela = cautelaDoc.data();
      const materiaisAtualizados = cautela.materiais?.filter(
        (m: any) => m.materialId !== id
      );
      if (materiaisAtualizados?.length !== cautela.materiais?.length) {
        await updateDoc(doc(db, 'cautelas_permanentes', cautelaDoc.id), {
          materiais: materiaisAtualizados
        });
      }
    }
    await deleteDoc(doc(db, 'materiais_belicos', id));
    toast.success('Material excluído com sucesso');
    loadMateriais();
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    toast.error('Erro ao excluir material');
  }
};
```

### Colecao Firebase: `baixas_materiais`

Estrutura de cada documento:

```text
{
  materialId: string
  nome: string
  numeroSerie: string
  categoria: string
  fabricante: string
  modelo: string
  vencimento: string
  sexo: string (para coletes)
  tamanhoColete: string (para coletes)
  motivoBaixa: string (Vencimento | Inservível | Avaria | Extravio | Outro)
  destino: string
  observacoes: string
  policialCauteladoNome: string
  policialCauteladoMatricula: string
  policialCauteladoId: string
  dataBaixa: Timestamp
  criadoPor: string
}
```

## Resumo dos arquivos

| Arquivo | Acao |
|---------|------|
| `SaiuDaCarga.tsx` | Novo - componente principal da aba |
| `BaixaMaterialCargaModal.tsx` | Novo - modal de baixa em lote |
| `AdminDashboard.tsx` | Alterar - adicionar 7a aba no Belico |
| `ColetesTab.tsx` | Alterar - filtrar transferidos/baixados |
| `TransferenciaPolicialModal.tsx` | Alterar - limpar nome policial ao devolver |
| `CadastroMateriais.tsx` | Alterar - verificar cautela antes de excluir |

