

# Corrigir Limpeza de Material Devolvido

## Problema

A limpeza dos campos `policialAssociadoNome` e `policialAssociadoId` esta dentro do bloco que so executa quando o historico ainda nao existe. Como o historico ja foi criado na primeira vez que o botao foi clicado, na segunda vez o `continue` na linha 637 pula todo o bloco, incluindo o `updateDoc`.

## Solucao

Mover a logica de limpeza para **fora** da verificacao de historico duplicado. A limpeza deve acontecer **sempre** que encontrar um material devolvido, independente de ja ter historico criado ou nao.

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

**Reestruturar o loop de transferencias (linhas 632-669)**:

```typescript
for (const matTrans of todosMateriaisTransferencia) {
  const matId = matTrans.id || matTrans.materialId;
  if (!matId) continue;

  // SEMPRE limpar campos se o material foi devolvido
  if (matTrans.subTipo === 'devolvido') {
    try {
      await updateDoc(doc(db, 'materiais_belicos', matId), {
        policialAssociadoNome: '',
        policialAssociadoId: '',
        cautelado: false,
        disponivel: true
      });
    } catch (e) {
      console.error('Erro ao limpar associação:', matId, e);
    }
  }

  // Criar historico apenas se ainda nao existe
  const chaveUnica = `${matId}_${transData.policialId || transData.policialNome}`;
  if (historicoTransferidos.has(chaveUnica)) continue;

  // ... resto do codigo de criacao de historico ...
}
```

A mudanca e simples: o bloco de limpeza (`updateDoc`) vem **antes** do `continue`, garantindo que sempre execute para materiais devolvidos.

| O que muda | Detalhe |
|------------|---------|
| Ordem de execucao | Limpeza executa ANTES da verificacao de duplicidade de historico |
| Resultado | Ao clicar "Gerar Historico", a pistola 58H245020 tera os campos limpos mesmo que o historico ja tenha sido criado |

