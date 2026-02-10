

# Corrigir Erro de Index no Historico de Material

## Problema

O Firebase Firestore exige um indice composto (composite index) para consultas que combinam `where` com `orderBy` em campos diferentes. A query atual usa `where('materialId', '==', id)` + `orderBy('data', 'desc')`, e esse indice nao existe no projeto.

A mensagem de erro no console confirma:
> "The query requires an index."

## Solucao

Remover o `orderBy('data', 'desc')` da query do Firestore e ordenar os resultados em memoria (no JavaScript) apos buscar os documentos. Isso elimina a necessidade de criar um indice composto no Firebase Console.

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

Na funcao `loadHistorico`, alterar a query de:

```typescript
const q = query(
  collection(db, 'historico_material'),
  where('materialId', '==', materialId),
  orderBy('data', 'desc')
);
```

Para:

```typescript
const q = query(
  collection(db, 'historico_material'),
  where('materialId', '==', materialId)
);
```

E apos mapear os documentos, ordenar em memoria:

```typescript
const data = snapshot.docs.map(d => ({
  id: d.id,
  ...d.data(),
  data: d.data().data?.toDate?.() || new Date()
}));
data.sort((a, b) => b.data.getTime() - a.data.getTime());
setHistoricoMaterial(data);
```

### Resumo

| Arquivo | Acao |
|---------|------|
| `CadastroMateriais.tsx` | Remover `orderBy` da query e ordenar em memoria |

