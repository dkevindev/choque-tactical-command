
# Plano: Corrigir Erro de Recebimento de Material Pendente

## Problema Identificado

O erro `TypeError: Cannot read properties of undefined (reading 'indexOf')` ocorre no Firebase quando um caminho de documento recebe `undefined` como argumento. 

No arquivo `ModalRecebimentoPendente.tsx`, a funcao `confirmarRecebimento` faz varias chamadas `doc(db, 'colecao', id)` onde o `id` pode ser `undefined`:

1. **`mat.materialId`** (linha 170) - Cautelas antigas podem nao ter esse campo salvo
2. **`cautela.livroId`** (linha 233) - Pode ser undefined se a cautela foi criada sem livro ativo
3. **`userData.id`** (linha 161) - Se o localStorage nao tiver o id do armeiro

O erro mais provavel e o `materialId` ausente em cautelas mais antigas, ou o `livroId` ausente.

## Correcoes

### 1. ModalRecebimentoPendente.tsx - Proteger contra valores undefined

| Local | Correcao |
|-------|---------|
| Linha 155-166 | Usar `armeiroLogadoId` como fallback para buscar armeiro |
| Linha 170 | Verificar se `mat.materialId` existe antes de chamar `doc()` |
| Linha 217 | Verificar se `cautela.id` existe |
| Linha 233 | Verificar se `cautela.livroId` existe antes de atualizar livro original |
| Linha 318 | Adicionar `DialogDescription` para resolver warning de acessibilidade |

Mudancas especificas:

```typescript
// Linha 170 - Proteger materialId
if (mat.materialId) {
  const materialRef = doc(db, 'materiais_belicos', mat.materialId);
  // ... logica existente
}

// Linha 233 - Proteger livroId  
if (cautela.livroId) {
  const livroOriginalRef = doc(db, 'livros_reserva_armamento', cautela.livroId);
  // ... logica existente
}

// Linha 155-166 - Proteger armeiroId
let armeiroId = armeiroLogadoId || '';
if (!armeiroId) {
  const userStorage = localStorage.getItem('user');
  if (userStorage) {
    const userData = JSON.parse(userStorage);
    armeiroId = userData.id || '';
  }
}
if (armeiroId) {
  const armeiroDoc = await getDoc(doc(db, 'policiais', armeiroId));
  // ...
}
```

### 2. DialogContent - Corrigir warning de acessibilidade

Adicionar `DialogDescription` ao modal para resolver o warning `Missing Description or aria-describedby`.

```typescript
import { DialogDescription } from "@/components/ui/dialog";

// Dentro do DialogHeader:
<DialogDescription className="sr-only">
  Modal de recebimento de material pendente
</DialogDescription>
```

## Arquivo a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/reserva-armamento/ModalRecebimentoPendente.tsx` | Adicionar verificacoes de undefined em todos os acessos a documentos Firebase e adicionar DialogDescription |

## Resumo

Todas as chamadas `doc(db, 'colecao', id)` serao protegidas com verificacao previa do `id`, evitando o `TypeError`. O warning de acessibilidade sera corrigido com a adicao de `DialogDescription`.
