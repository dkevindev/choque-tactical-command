

# Remover Alertas de Material Pendente

## O que sera feito

Remover todos os alertas do tipo `material_pendente` da exibicao no painel de Gestao, filtrando-os na query ou no processamento dos dados.

## Detalhes Tecnicos

### Arquivo: `src/components/gestao/AlertasGestaoSection.tsx`

Adicionar um filtro apos receber os dados do snapshot para excluir alertas do tipo `material_pendente`:

```typescript
// Apos mapear os docs, filtrar:
const alertasData = snapshot.docs
  .map(doc => ({ ... }))
  .filter(alerta => alerta.tipo !== 'material_pendente');
```

Isso mantera os alertas de `falta_municao` e `observacao_livro` funcionando normalmente, removendo apenas os de material pendente da visualizacao.

| Arquivo | Acao |
|---------|------|
| `AlertasGestaoSection.tsx` | Filtrar alertas do tipo `material_pendente` |

