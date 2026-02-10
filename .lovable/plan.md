

# Corrigir Material Devolvido que Ainda Mostra Policial Transferido

## Problema

A PISTOLA serie 58H245020 esta com status "Reserva" (corretamente `cautelado: false`) mas ainda exibe o nome do policial transferido (SD FAGNER) na coluna "Cautelado Para". Isso acontece porque o campo `policialAssociadoNome` nao foi limpo quando o policial foi transferido e devolveu o material.

O `TransferenciaPolicialModal` deveria limpar esse campo (linhas 128-132), mas provavelmente essa transferencia foi feita antes dessa logica existir, ou houve falha silenciosa.

## O que sera feito

Adicionar uma etapa de limpeza no `gerarHistoricoGlobal` que, ao encontrar materiais devolvidos por policiais transferidos, tambem limpa os campos `policialAssociadoNome` e `policialAssociadoId` no Firebase se o material nao esta mais cautelado.

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

**Dentro do loop de `todosMateriaisTransferencia`** (apos criar o registro de historico), adicionar logica para materiais devolvidos:

```typescript
// Se o material foi devolvido, garantir que os campos de associacao estejam limpos
if (matTrans.subTipo === 'devolvido') {
  try {
    await updateDoc(doc(db, 'materiais_belicos', matId), {
      policialAssociadoNome: '',
      policialAssociadoId: '',
      cautelado: false,
      disponivel: true
    });
  } catch (e) {
    console.error('Erro ao limpar associacao do material devolvido:', matId, e);
  }
}
```

Isso resolve tanto o caso atual (pistola 58H245020) quanto qualquer outro material que tenha ficado com dados inconsistentes apos transferencia.

| O que muda | Detalhe |
|------------|---------|
| Limpeza de campos | `policialAssociadoNome` e `policialAssociadoId` sao zerados para materiais devolvidos |
| Quando executa | Durante o "Gerar Historico", junto com a criacao do registro de transferencia |
| Resultado | A pistola 58H245020 deixara de mostrar o nome do policial na coluna "Cautelado Para" |

