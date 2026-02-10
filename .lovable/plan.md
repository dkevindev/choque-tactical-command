

# Corrigir Delay no Carregamento da Aba "Baixa"

## Problema

Quando o usuario clica na aba "Baixa", a mensagem "Nenhum policial com material cautelado" aparece imediatamente e so depois os policiais carregam. Isso acontece por dois motivos:

1. **Sem indicador de carregamento**: O estado `policiaisComCautela` comeca como array vazio e nao existe um estado `loading` para o carregamento inicial, entao a mensagem "Nenhum policial" aparece enquanto os dados ainda estao sendo buscados.

2. **Consultas sequenciais lentas**: A funcao `recarregarPoliciaisComCautela` busca os dados de cada policial um por um em um loop `for`, fazendo 16+ chamadas sequenciais ao Firebase. Cada chamada espera a anterior terminar.

## Solucao

### 1. Adicionar estado de carregamento inicial

Criar um estado `loadingInicial` que mostra um skeleton/spinner enquanto os dados carregam, em vez da mensagem enganosa "Nenhum policial".

### 2. Paralelizar consultas Firebase

Substituir o loop `for` sequencial por `Promise.all` para buscar todos os policiais simultaneamente, reduzindo o tempo de ~1.5s para ~0.2s.

## Detalhes Tecnicos

### Arquivo: `src/components/reserva-armamento/BaixaMaterialSection.tsx`

**Adicionar estado de loading inicial (linha 59):**
```typescript
const [loadingInicial, setLoadingInicial] = useState(true);
```

**Paralelizar consultas na funcao `recarregarPoliciaisComCautela` (linhas 114-123):**

Antes (sequencial):
```typescript
for (const policialId of policialIds) {
  const policialDoc = await getDoc(doc(db, 'policiais', policialId));
  if (policialDoc.exists()) {
    policiaisData.push({ id: policialDoc.id, ...policialDoc.data() });
  }
}
```

Depois (paralelo):
```typescript
const policiaisData = (await Promise.all(
  policialIds.map(async (policialId) => {
    const policialDoc = await getDoc(doc(db, 'policiais', policialId));
    return policialDoc.exists()
      ? { id: policialDoc.id, ...policialDoc.data() } as Policial
      : null;
  })
)).filter((p): p is Policial => p !== null);
```

**Atualizar `setLoadingInicial(false)` no finally da funcao.**

**Mostrar skeleton durante carregamento (linha 683):**

Substituir a verificacao `policiaisComCautela.length === 0` por uma que considera o loading:

```typescript
{loadingInicial ? (
  <div className="space-y-2">
    {[1, 2, 3].map(i => (
      <div key={i} className="p-3 border rounded-lg">
        <Skeleton className="h-5 w-48 mb-1" />
        <Skeleton className="h-4 w-32" />
      </div>
    ))}
  </div>
) : policiaisComCautela.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground">
    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
    <p>Nenhum policial com material cautelado</p>
  </div>
) : (
  // lista existente...
)}
```

### Resumo das mudancas

| Mudanca | Efeito |
|---------|--------|
| Estado `loadingInicial` | Mostra skeleton em vez de "Nenhum policial" durante carregamento |
| `Promise.all` nas consultas | Reduz tempo de carregamento de ~1.5s para ~0.2s |
| Import `Skeleton` | Componente visual durante loading |

