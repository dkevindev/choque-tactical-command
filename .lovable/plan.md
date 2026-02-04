
# Plano: Corrigir Erro de Transferência - Campos Undefined

## Diagnóstico

O erro `Function updateDoc() called with invalid data. Unsupported field value: undefined` está ocorrendo na função `handleIniciarTransferencia` (linhas 251-276) do `ModalTransferenciaMaterial.tsx`.

### Campos Problemáticos Identificados

Na linha 253-268, os seguintes campos podem ser `undefined`:

```typescript
transferenciaPara: {
  policialId: policialDestino.id,
  policialNome: policialDestino.NOME,
  policialNomeGuerra: nomeGuerraDestino,
  policialMatricula: String(policialDestino['Matrícula'] || ''),
  policialNumeral: policialDestino.NUMERAL,        // ← PODE SER undefined
  postoGrad: policialDestino['Post/Grad'],         // ← PODE SER undefined
  materiais: materiaisParaTransferir.map(...)
}
```

O Firebase não aceita campos com valor `undefined` explícito.

---

## Solução

Aplicar spread condicional para todos os campos opcionais, seguindo o padrão já usado para `categoria` e `numeroSerie`:

```typescript
transferenciaPara: {
  policialId: policialDestino.id,
  policialNome: policialDestino.NOME,
  policialNomeGuerra: nomeGuerraDestino,
  policialMatricula: String(policialDestino['Matrícula'] || ''),
  materiais: materiaisParaTransferir.map(...),
  // Campos opcionais com spread condicional
  ...(policialDestino.NUMERAL && { policialNumeral: policialDestino.NUMERAL }),
  ...(policialDestino['Post/Grad'] && { postoGrad: policialDestino['Post/Grad'] })
}
```

---

## Arquivo a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `ModalTransferenciaMaterial.tsx` | Aplicar spread condicional nas linhas 258-259 para `policialNumeral` e `postoGrad` |

---

## Código Específico da Correção

### Antes (linhas 251-268):
```typescript
await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
  statusTransferencia: 'aguardando_confirmacao',
  transferenciaPara: {
    policialId: policialDestino.id,
    policialNome: policialDestino.NOME,
    policialNomeGuerra: nomeGuerraDestino,
    policialMatricula: String(policialDestino['Matrícula'] || ''),
    policialNumeral: policialDestino.NUMERAL,
    postoGrad: policialDestino['Post/Grad'],
    materiais: materiaisParaTransferir.map(...)
  },
  ...
});
```

### Depois:
```typescript
await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
  statusTransferencia: 'aguardando_confirmacao',
  transferenciaPara: {
    policialId: policialDestino.id,
    policialNome: policialDestino.NOME,
    policialNomeGuerra: nomeGuerraDestino,
    policialMatricula: String(policialDestino['Matrícula'] || ''),
    materiais: materiaisParaTransferir.map(...),
    // Campos opcionais protegidos contra undefined
    ...(policialDestino.NUMERAL !== undefined && { policialNumeral: policialDestino.NUMERAL }),
    ...(policialDestino['Post/Grad'] && { postoGrad: policialDestino['Post/Grad'] })
  },
  ...
});
```

---

## Fluxo da Correção

```text
handleIniciarTransferencia()
         │
         ▼
    Construir objeto transferenciaPara
         │
         ├─ policialNumeral → spread condicional (só inclui se existir)
         │
         └─ postoGrad → spread condicional (só inclui se existir)
         │
         ▼
    updateDoc() → Firebase aceita sem erro
```
