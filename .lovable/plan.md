

# Corrigir Historico de Transferidos: Verificar materiaisDevolvidos

## Problema

O codigo atual so verifica `materiaisLevados` das transferencias. Porem, quando um policial e transferido e **devolve** materiais, esses itens ficam em `materiaisDevolvidos`. A arma nserie 58J051042 esta nessa lista, por isso o historico nao foi criado.

Dados reais do Firebase confirmam:
- `materiaisDevolvidos`: PISTOLA .40, nserie 58J051042 (materialId: ituHAW6jGpWHCEdzor1V)
- `materiaisLevados`: Colete Balistico (outro material)

## O que sera feito

Alterar a funcao `gerarHistoricoGlobal` para verificar **ambas** as listas: `materiaisLevados` e `materiaisDevolvidos`.

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

**Linhas 621-644** - Expandir o bloco de transferencias para iterar tambem sobre `materiaisDevolvidos`:

```typescript
// 3. Consultar transferências de policiais
const transferenciasSnap = await getDocs(collection(db, 'transferencias_policiais'));
for (const transDoc of transferenciasSnap.docs) {
  const transData = transDoc.data();
  
  // Verificar AMBAS as listas: levados E devolvidos
  const materiaisLevados = transData.materiaisLevados || [];
  const materiaisDevolvidos = transData.materiaisDevolvidos || [];
  const todosMateriaisTransferencia = [
    ...materiaisLevados.map((m: any) => ({ ...m, subTipo: 'levado' })),
    ...materiaisDevolvidos.map((m: any) => ({ ...m, subTipo: 'devolvido' }))
  ];

  for (const matTrans of todosMateriaisTransferencia) {
    const matId = matTrans.id || matTrans.materialId;
    if (!matId) continue;
    
    const chaveUnica = `${matId}_${transData.policialId || transData.policialNome}`;
    if (historicoTransferidos.has(chaveUnica)) continue;

    const obs = matTrans.subTipo === 'levado'
      ? `Levado para: ${transData.localDestino || 'Destino não informado'}`
      : `Devolvido pelo policial transferido para: ${transData.localDestino || 'Destino não informado'}`;

    await addDoc(collection(db, 'historico_material'), {
      materialId: matId,
      materialNome: matTrans.nome || matTrans.materialNome || 'Material',
      numeroSerie: matTrans.numeroSerie || '',
      policialNome: transData.policialNome || 'Desconhecido',
      policialId: transData.policialId || '',
      tipo: 'transferido',
      data: transData.dataTransferencia?.toDate?.() || transData.createdAt?.toDate?.() || new Date(),
      observacoes: obs
    });
    transferenciasEncontradas++;
    historicoTransferidos.add(chaveUnica);
  }
}
```

### Resumo

| O que muda | Detalhe |
|------------|---------|
| `materiaisDevolvidos` | Agora tambem e verificado, alem de `materiaisLevados` |
| Observacao no historico | Diferencia se o material foi "levado" ou "devolvido" pelo policial transferido |
| Resultado esperado | A PISTOLA .40 nserie 58J051042 aparecera no historico com o nome do policial transferido |

