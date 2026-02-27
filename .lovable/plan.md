

# Corrigir Campo UNIDADE e Fazer Deploy

## Problema Principal
O campo no Firestore e `UNIDADE` (tudo maiusculo), mas o codigo usa `p.Unidade` (camelCase). Isso faz com que nenhum policial seja classificado corretamente nas unidades, resultando em tudo zero.

Evidencia do Firestore (dados reais capturados):
```text
"UNIDADE": { "stringValue": "2o ESQD" }
```

Codigo atual (errado):
```text
const unidade = p.Unidade || 'OUTROS';   // linha 587
```

## Alteracao

### Arquivo: `functions/index.js`

Corrigir TODAS as referencias de `p.Unidade` para `p.UNIDADE || p.Unidade`:

- **Linha 578**: Debug log - trocar `p.Unidade` por `p.UNIDADE || p.Unidade`
- **Linha 587**: Agrupamento principal - trocar `p.Unidade` por `p.UNIDADE || p.Unidade`

Sao apenas 2 linhas a alterar.

## Apos a Alteracao

Voce precisa fazer o deploy das functions para que a alteracao tenha efeito no endpoint:

```
cd functions
firebase deploy --only functions:gerarResumoEfetivoDocx
```

Tambem certifique-se de que o template `template-resumo-efetivo.docx` ja foi enviado para o Firebase Storage na pasta `templates/`.

## Resumo

| Arquivo | Acao |
|---------|------|
| `functions/index.js` | Corrigir `p.Unidade` para `p.UNIDADE` em 2 linhas |

