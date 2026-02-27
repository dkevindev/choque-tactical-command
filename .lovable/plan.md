

# Corrigir Mapeamento da Unidade RPMONT para SEDE

## Problema
No Firestore, a coluna UNIDADE tem o valor `"RPMONT"`, mas a funcao `normalizarUnidade` so reconhece como SEDE se o texto contiver a palavra "SEDE". Como "RPMONT" nao contem "SEDE", esses policiais caem em "OUTROS" e aparecem com 0/0/0.

## Alteracao

### Arquivo: `functions/index.js`
Adicionar uma linha na funcao `normalizarUnidade` para mapear `"RPMONT"` para `"SEDE"`:

```
if (u === 'SEDE' || u.includes('SEDE') || u === 'RPMONT' || u.includes('RPMONT')) return 'SEDE';
```

Isso garante que qualquer valor contendo "RPMONT" (como "RPMONT", "RPMONT - SEDE", etc.) seja corretamente agrupado como SEDE.

## Apos a alteracao
Fazer deploy: `firebase deploy --only functions:gerarResumoEfetivoDocx`
