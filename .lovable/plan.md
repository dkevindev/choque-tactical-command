

# Corrigir Limpeza do Nome do Policial ao Editar Material

## Problema

Ao editar um material e remover o policial (deixando disponivel na reserva), os campos `policialAssociadoId` e `policialAssociadoNome` nao sao incluidos no objeto de atualizacao porque o codigo so adiciona campos "se tiverem valor" (linhas 353-354). Como o Firestore so atualiza os campos enviados, os valores antigos permanecem no documento.

## Solucao

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

**1. Sempre incluir os campos de policial no objeto de atualizacao**, mesmo quando vazios. Trocar a logica condicional (linhas 353-354) para sempre incluir esses campos:

```
// DE:
if (formData.policialAssociadoId) materialDataBase.policialAssociadoId = formData.policialAssociadoId;
if (formData.policialAssociadoNome) materialDataBase.policialAssociadoNome = formData.policialAssociadoNome;

// PARA:
materialDataBase.policialAssociadoId = formData.policialAssociadoId || '';
materialDataBase.policialAssociadoNome = formData.policialAssociadoNome || '';
```

Isso garante que ao remover o policial, o Firestore recebe strings vazias e limpa os campos corretamente.

**2. Corrigir o botao "Gerar Historico"** - o mesmo problema ocorre na funcao `gerarHistoricoGlobal`: ela limpa os campos no Firestore corretamente (ja usa strings vazias), mas o material nao e recarregado na tela. A funcao ja chama `loadMateriais()` ao final, entao esse ponto esta ok. O problema do botao "nao limpar" provavelmente e porque o material ja tinha sido editado sem limpar os campos (problema 1 acima).

