

# Plano: Corrigir Erro "undefined" e Recuperacao Automatica de Operacoes Pendentes

## Problema 1: Erro ao Complementar Cautela

### Diagnostico Detalhado

O erro `"Function updateDoc() called with invalid data. Unsupported field value: undefined"` persiste porque:

1. **Fonte do problema**: Na linha 1441-1451 do `ArmeiroInterface.tsx`, os `materiaisAtuais` sao mapeados diretamente sem proteger campos opcionais:

```typescript
setComplementarMateriais(materiais.map(m => ({
  materialId: m.materialId || m.id,
  nome: m.nome,
  quantidade: m.quantidade,
  categoria: m.categoria,         // ← PODE SER undefined
  numeroSerie: m.numeroSerie      // ← PODE SER undefined
})));
```

2. Mesmo que o `ModalComplementarCautela` use spread condicional (`...(m.categoria && { categoria: m.categoria })`), o problema é que `materiaisAtuais` JA CHEGA com campos `undefined` explicitamente definidos (ex: `{ categoria: undefined }`).

3. O spread condicional `...(m.categoria && { categoria: m.categoria })` nao resolve quando o valor é **explicitamente** `undefined` - ele so protege quando o campo nao existe.

### Solucao

Filtrar campos undefined antes de salvar em TODAS as chamadas de `updateDoc`:

```typescript
// Funcao helper para limpar undefined
const limparUndefined = (obj: any) => {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

// Uso:
materiaisComplemento: materiaisAdicionados.map(m => limparUndefined({
  materialId: m.materialId,
  nome: m.nome,
  quantidade: m.quantidade,
  categoria: m.categoria,
  numeroSerie: m.numeroSerie,
  carregadores: m.carregadores
}))
```

### Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `ModalComplementarCautela.tsx` | Adicionar funcao helper e aplicar em todas as chamadas updateDoc (linhas 280-297 e 371-386) |
| `ArmeiroInterface.tsx` | Limpar undefined ao mapear materiais antes de passar para o modal (linhas 1445-1451) |

---

## Problema 2: Totem Travado apos Fechar Tela

### Diagnostico

Quando o armeiro fecha a tela (modal ou navegador) durante uma operacao de complemento ou transferencia:

1. A operacao permanece com status `aguardando_confirmacao` no Firebase
2. O Totem fica esperando confirmacao por senha
3. Ao reabrir, o armeiro nao ve nenhum modal - nao ha como cancelar ou continuar

### Causa Raiz

O `ArmeiroInterface.tsx` so verifica cautelas novas pendentes:

```typescript
// Linha 379 - So verifica status principal
where('status', '==', 'aguardando_confirmacao')
```

Nao verifica:
- `statusComplemento === 'aguardando_confirmacao'`
- `statusTransferencia === 'aguardando_confirmacao'`

### Solucao

Expandir a funcao `verificarCautelasAguardando` para verificar TODOS os tipos de operacoes pendentes:

```typescript
const verificarCautelasAguardando = async () => {
  try {
    // 1. Verificar cautelas novas aguardando
    const cautelasNovasSnapshot = await getDocs(
      query(collection(db, 'cautelas_provisorias'), where('status', '==', 'aguardando_confirmacao'))
    );
    
    if (!cautelasNovasSnapshot.empty) {
      // ... logica existente para reabrir ModalAguardandoConfirmacao
      return;
    }
    
    // 2. Verificar complementos pendentes
    const complementosSnapshot = await getDocs(
      query(collection(db, 'cautelas_provisorias'), where('statusComplemento', '==', 'aguardando_confirmacao'))
    );
    
    if (!complementosSnapshot.empty) {
      const cautelaDoc = complementosSnapshot.docs[0];
      const cautelaData = cautelaDoc.data();
      
      // Reabrir modal de complementar com dados recuperados
      setComplementarCautelaId(cautelaDoc.id);
      setComplementarPolicialId(cautelaData.policialId);
      setComplementarPolicialNome(cautelaData.policialNomeGuerra || cautelaData.policialNome);
      setComplementarMateriais(cautelaData.materiais || []);
      setComplementarMateriaisNovos(cautelaData.materiaisComplemento || []);
      setModalComplementar(true);
      return;
    }
    
    // 3. Verificar transferencias pendentes
    const transferenciasSnapshot = await getDocs(
      query(collection(db, 'cautelas_provisorias'), where('statusTransferencia', '==', 'aguardando_confirmacao'))
    );
    
    if (!transferenciasSnapshot.empty) {
      // Reabrir modal de transferencia com dados recuperados
      // ...
    }
  } catch (error) {
    console.error('Erro ao verificar operacoes pendentes:', error);
  }
};
```

### Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `ArmeiroInterface.tsx` | Expandir verificarCautelasAguardando para verificar complementos e transferencias (linhas 374-404) |
| `ModalComplementarCautela.tsx` | Adicionar suporte para abrir ja na etapa 'aguardando' quando recuperado |
| `ModalTransferenciaMaterial.tsx` | Adicionar suporte para recuperacao de transferencias pendentes |

---

## Resumo de Implementacao

### Prioridade 1: Corrigir erro undefined

1. Criar funcao helper `limparUndefined()` em ambos os arquivos
2. Aplicar em todas as chamadas `updateDoc` que envolvem arrays de materiais
3. Aplicar ao mapear materiais no ArmeiroInterface antes de passar props

### Prioridade 2: Recuperacao automatica

1. Expandir `verificarCautelasAguardando` para verificar todos os status
2. Adicionar estados para rastrear se modal foi aberto via recuperacao
3. Ajustar modais para suportar abertura ja na etapa 'aguardando'

---

## Codigo Especifico das Correcoes

### 1. Funcao Helper (ModalComplementarCautela.tsx)

```typescript
// Adicionar no inicio do componente
const limparUndefined = (obj: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};
```

### 2. Aplicar nas chamadas updateDoc (ModalComplementarCautela.tsx)

Linha 282-289:
```typescript
materiaisComplemento: materiaisAdicionados.map(m => limparUndefined({
  materialId: m.materialId,
  nome: m.nome,
  quantidade: m.quantidade,
  categoria: m.categoria,
  numeroSerie: m.numeroSerie,
  carregadores: m.carregadores
})),
```

Linha 375-382:
```typescript
materiais: novosMateriais.map(m => limparUndefined({
  materialId: m.materialId,
  nome: m.nome,
  quantidade: m.quantidade,
  categoria: m.categoria,
  numeroSerie: m.numeroSerie,
  carregadores: m.carregadores
})),
```

### 3. Limpar no ArmeiroInterface (linha 1445-1451)

```typescript
setComplementarMateriais(materiais.map(m => {
  const material: any = {
    materialId: m.materialId || m.id,
    nome: m.nome,
    quantidade: m.quantidade
  };
  if (m.categoria) material.categoria = m.categoria;
  if (m.numeroSerie) material.numeroSerie = m.numeroSerie;
  if (m.carregadores !== undefined) material.carregadores = m.carregadores;
  return material;
}));
```

### 4. Expandir verificarCautelasAguardando (ArmeiroInterface.tsx)

```typescript
const verificarCautelasAguardando = async () => {
  try {
    // 1. Cautelas novas
    const cautelasNovasSnapshot = await getDocs(
      query(collection(db, 'cautelas_provisorias'), where('status', '==', 'aguardando_confirmacao'))
    );
    
    if (!cautelasNovasSnapshot.empty) {
      const cautelaDoc = cautelasNovasSnapshot.docs[0];
      const cautelaData = cautelaDoc.data();
      const nomePolicial = `${cautelaData.postoGrad || ''} ${cautelaData.policialNomeGuerra || cautelaData.policialNome}`.trim();
      
      setCautelaAguardandoId(cautelaDoc.id);
      setPolicialAguardandoId(cautelaData.policialId);
      setPolicialAguardandoNome(nomePolicial);
      setMateriaisAguardando(cautelaData.materiais || []);
      setModalAguardando(true);
      return;
    }
    
    // 2. Complementos pendentes
    const complementosSnapshot = await getDocs(
      query(collection(db, 'cautelas_provisorias'), where('statusComplemento', '==', 'aguardando_confirmacao'))
    );
    
    if (!complementosSnapshot.empty) {
      const cautelaDoc = complementosSnapshot.docs[0];
      const data = cautelaDoc.data();
      const nomePolicial = `${data.postoGrad || ''} ${data.policialNomeGuerra || data.policialNome}`.trim();
      
      // Mapear materiais existentes
      const materiaisExistentes = (data.materiais || []).map((m: any) => {
        const mat: any = { materialId: m.materialId, nome: m.nome, quantidade: m.quantidade };
        if (m.categoria) mat.categoria = m.categoria;
        if (m.numeroSerie) mat.numeroSerie = m.numeroSerie;
        return mat;
      });
      
      setComplementarCautelaId(cautelaDoc.id);
      setComplementarPolicialId(data.policialId);
      setComplementarPolicialNome(nomePolicial);
      setComplementarMateriais(materiaisExistentes);
      setRecuperandoComplemento(true); // Novo estado para indicar recuperacao
      setModalComplementar(true);
      return;
    }
    
    // 3. Transferencias pendentes
    const transferenciasSnapshot = await getDocs(
      query(collection(db, 'cautelas_provisorias'), where('statusTransferencia', '==', 'aguardando_confirmacao'))
    );
    
    if (!transferenciasSnapshot.empty) {
      const cautelaDoc = transferenciasSnapshot.docs[0];
      const data = cautelaDoc.data();
      
      // Configurar estados para reabrir modal de transferencia
      setTransferenciaCautelaId(cautelaDoc.id);
      setRecuperandoTransferencia(true);
      setModalTransferencia(true);
      return;
    }
  } catch (error) {
    console.error('Erro ao verificar operacoes pendentes:', error);
  }
};
```

---

## Fluxo de Recuperacao

```text
Armeiro abre a tela
        │
        ▼
verificarCautelasAguardando()
        │
        ├─ Encontrou status='aguardando_confirmacao'?
        │         │
        │         ▼ SIM
        │    Reabrir ModalAguardandoConfirmacao
        │
        ├─ Encontrou statusComplemento='aguardando_confirmacao'?
        │         │
        │         ▼ SIM
        │    Reabrir ModalComplementarCautela na etapa 'aguardando'
        │
        └─ Encontrou statusTransferencia='aguardando_confirmacao'?
                  │
                  ▼ SIM
             Reabrir ModalTransferenciaMaterial na etapa 'aguardando'
```

---

## Ordem de Implementacao

| Etapa | Tarefa | Complexidade |
|-------|--------|--------------|
| 1 | Adicionar funcao `limparUndefined` e aplicar nas chamadas updateDoc | Baixa |
| 2 | Limpar materiais no ArmeiroInterface antes de passar props | Baixa |
| 3 | Expandir verificarCautelasAguardando para todos os status | Media |
| 4 | Ajustar modais para suportar abertura em estado recuperado | Media |

