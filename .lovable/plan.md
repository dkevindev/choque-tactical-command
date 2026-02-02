

## Plano de Correção: Salvamento de Alterações no Livro de Reserva

### Problemas Identificados

Analisando o código, encontrei **3 problemas específicos** que estão causando as alterações não serem salvas/exibidas:

| # | Problema | Arquivo | Linha | Descrição |
|---|----------|---------|-------|-----------|
| 1 | Alterações manuais não sendo salvas | `ArmeiroInterface.tsx` | 593 | O código salva apenas `alteracoes` (array vazio do modal) ao invés de `todasAlteracoes` |
| 2 | Histórico não carrega alterações automáticas | `HistoricoLivrosSection.tsx` | 52-56 | Só busca campo `alteracoes`, ignora `alteracoesAutomaticas` |
| 3 | Exportação Word ignora automáticas | `HistoricoLivrosSection.tsx` | 122-125 | Só envia `livro.alteracoes`, não busca `alteracoesAutomaticas` do Firebase |

### Detalhes Técnicos

**Problema 1 - ArmeiroInterface.tsx linha 593:**

O código corretamente combina as alterações na linha 574:
```typescript
const todasAlteracoes = [...alteracoesAutomaticas, ...alteracoes];
```

Porém ao salvar no Firebase (linha 593), usa apenas `alteracoes`:
```typescript
await updateDoc(doc(db, 'livros_reserva_armamento', livroAtivo!.id), {
  status: 'fechado',
  dataFechamento: new Date(),
  alteracoes,  // ← BUG: deveria ser todasAlteracoes
  ...
});
```

**Problema 2 - HistoricoLivrosSection.tsx linhas 52-56:**

Ao carregar histórico, só busca o campo `alteracoes`:
```typescript
alteracoes: (data.alteracoes || []).map((a: any) => ({
  ...a,
  dataHora: a.dataHora?.toDate?.() || new Date()
}))
```

Deveria combinar `alteracoes` + `alteracoesAutomaticas`.

**Problema 3 - HistoricoLivrosSection.tsx linhas 122-125:**

Ao exportar para Word, envia apenas:
```typescript
alteracoes: livro.alteracoes.map(a => ({
  descricao: a.descricao,
  dataHora: a.dataHora.toISOString()
}))
```

Precisa buscar `alteracoesAutomaticas` do Firebase e combinar.

---

### Alterações Necessárias

#### 1. ArmeiroInterface.tsx - Linha 593

Trocar `alteracoes` por `todasAlteracoes`:

```typescript
await updateDoc(doc(db, 'livros_reserva_armamento', livroAtivo!.id), {
  status: 'fechado',
  dataFechamento: new Date(),
  alteracoes: todasAlteracoes,  // ← Corrigido
  totalCautelas: totalCautelasHoje,
  totalBaixas: totalBaixasHoje,
  materiaisPendentes: cautelasPendentesSnapshot.size
});
```

#### 2. HistoricoLivrosSection.tsx - Linhas 45-56

Combinar alterações manuais + automáticas ao carregar:

```typescript
const livrosData = querySnapshot.docs.map(doc => {
  const data = doc.data();
  
  // Processar alterações normais
  const alteracoesNormais = (data.alteracoes || []).map((a: any) => ({
    ...a,
    dataHora: typeof a.dataHora === 'string' 
      ? new Date(a.dataHora) 
      : (a.dataHora?.toDate?.() || new Date())
  }));
  
  // Processar alterações automáticas
  const alteracoesAuto = (data.alteracoesAutomaticas || []).map((a: any) => ({
    ...a,
    dataHora: typeof a.dataHora === 'string' 
      ? new Date(a.dataHora) 
      : (a.dataHora?.toDate?.() || new Date())
  }));
  
  return {
    id: doc.id,
    ...data,
    dataAbertura: data.dataAbertura?.toDate?.() || new Date(),
    dataFechamento: data.dataFechamento?.toDate?.() || null,
    alteracoes: [...alteracoesNormais, ...alteracoesAuto]  // Combina todas
  } as LivroDiario;
});
```

#### 3. HistoricoLivrosSection.tsx - Função exportarLivro (linhas 78-127)

Buscar `alteracoesAutomaticas` diretamente do Firebase antes de exportar:

```typescript
const exportarLivro = async (livro: LivroDiario, e: React.MouseEvent) => {
  e.stopPropagation();
  setExportando(livro.id);
  
  try {
    // Buscar dados completos do livro incluindo alteracoesAutomaticas
    const livroDoc = await getDoc(doc(db, 'livros_reserva_armamento', livro.id));
    const livroData = livroDoc.data();
    
    // Processar alterações automáticas do Firebase
    const alteracoesAutomaticas = (livroData?.alteracoesAutomaticas || []).map((a: any) => ({
      descricao: a.descricao,
      dataHora: typeof a.dataHora === 'string' ? a.dataHora : new Date().toISOString()
    }));
    
    // Combinar com alterações manuais do livro carregado
    const todasAlteracoes = [
      ...livro.alteracoes.map(a => ({
        descricao: a.descricao,
        dataHora: a.dataHora.toISOString()
      })),
      ...alteracoesAutomaticas
    ];
    
    // ... resto do código ...
    
    const dados = {
      armeiroNome: livro.armeiroNome,
      dataAbertura: livro.dataAbertura.toISOString(),
      dataFechamento: livro.dataFechamento?.toISOString() || null,
      movimentacoes,
      alteracoes: todasAlteracoes,  // ← Envia todas combinadas
      armeiroResponsavel: livro.armeiroNome
    };
```

---

### Resumo das Alterações

| Arquivo | Linha(s) | Alteração |
|---------|----------|-----------|
| `ArmeiroInterface.tsx` | 593 | Trocar `alteracoes` por `todasAlteracoes` no updateDoc |
| `HistoricoLivrosSection.tsx` | 6 | Adicionar import `getDoc, doc` |
| `HistoricoLivrosSection.tsx` | 45-56 | Combinar `alteracoes` + `alteracoesAutomaticas` ao carregar |
| `HistoricoLivrosSection.tsx` | 78-127 | Buscar `alteracoesAutomaticas` do Firebase e combinar antes de exportar |

---

### Fluxo Corrigido

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Durante o Turno                                              │
├─────────────────────────────────────────────────────────────────┤
│ Dar baixa com falta de munição → Salva em alteracoesAutomaticas │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Ao Fechar Livro (ArmeiroInterface)                           │
├─────────────────────────────────────────────────────────────────┤
│ Modal exibe alterações manuais adicionadas                      │
│ + alterações automáticas (falta munição)                        │
│ → Salva TODAS em campo `alteracoes`                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Visualizar Histórico (HistoricoLivrosSection)                │
├─────────────────────────────────────────────────────────────────┤
│ Carrega `alteracoes` + `alteracoesAutomaticas`                  │
│ Exibe todas combinadas na interface                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Exportar Word                                                │
├─────────────────────────────────────────────────────────────────┤
│ Busca do Firebase: alteracoes + alteracoesAutomaticas           │
│ Combina e envia para Cloud Function                             │
│ Documento Word inclui TODAS as alterações                       │
└─────────────────────────────────────────────────────────────────┘
```

