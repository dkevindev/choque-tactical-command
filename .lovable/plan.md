

## Plano de Correção: Alterações no Livro de Reserva de Armamento

### Problemas Identificados

Ao analisar o código, identifiquei os seguintes problemas:

| # | Problema | Descrição |
|---|----------|-----------|
| 1 | Modal não mostra alterações automáticas | O `ModalFechamentoLivro` só mostra alterações adicionadas manualmente, não exibe as automáticas (falta de munição) |
| 2 | Alterações automáticas não carregadas ao abrir modal | Quando o modal abre, não busca as `alteracoesAutomaticas` do Firebase para exibir |
| 3 | Usuário não sabe o que será salvo | Não há preview das alterações automáticas antes de confirmar o fechamento |

### Fluxo Atual (com Problemas)

```
Dar Baixa Parcial de Munição
         │
         ▼
┌─────────────────────────────────────┐
│ Salva em alteracoesAutomaticas ✓   │
│ (BaixaMaterialSection)             │
└─────────────────────────────────────┘
         │
         ▼
Clicar "Fechar Livro"
         │
         ▼
┌─────────────────────────────────────┐
│ Abre ModalFechamentoLivro          │
│ Mostra apenas alterações manuais   │  ← BUG: não mostra automáticas
│ (não carrega alteracoesAutomaticas)│
└─────────────────────────────────────┘
         │
         ▼
Confirmar Fechamento
         │
         ▼
┌─────────────────────────────────────┐
│ handleFecharLivro busca automáticas│
│ Combina e salva corretamente ✓     │
└─────────────────────────────────────┘
```

---

### Solução

Modificar o `ModalFechamentoLivro` para receber e exibir as alterações automáticas, e modificar o `ArmeiroInterface` para carregar e passar essas alterações quando o modal for aberto.

#### 1. ArmeiroInterface.tsx

**Adicionar estado para alterações automáticas:**
```typescript
const [alteracoesAutomaticas, setAlteracoesAutomaticas] = useState<Alteracao[]>([]);
```

**Criar função para carregar alterações automáticas antes de abrir o modal:**
```typescript
const abrirModalFechamento = async () => {
  if (!livroAtivo) return;
  
  try {
    const livroDoc = await getDoc(doc(db, 'livros_reserva_armamento', livroAtivo.id));
    const livroData = livroDoc.data();
    const autoAlteracoes = (livroData?.alteracoesAutomaticas || []).map((a: any) => ({
      id: a.id,
      descricao: a.descricao,
      dataHora: typeof a.dataHora === 'string' ? new Date(a.dataHora) : (a.dataHora?.toDate?.() || new Date()),
      tipo: a.tipo
    }));
    
    setAlteracoesAutomaticas(autoAlteracoes);
    setModalFechamento(true);
  } catch (error) {
    console.error('Erro ao carregar alterações:', error);
    setModalFechamento(true);
  }
};
```

**Modificar botão de fechar livro:**
```typescript
<Button 
  onClick={abrirModalFechamento}  // ← Chamar nova função
  disabled={loading}
  variant="destructive"
>
```

**Passar alterações automáticas para o modal:**
```typescript
<ModalFechamentoLivro
  open={modalFechamento}
  onClose={() => setModalFechamento(false)}
  armeiroNome={livroAtivo.armeiroNome}
  onFechar={handleFecharLivro}
  alteracoesAutomaticas={alteracoesAutomaticas}  // ← Nova prop
/>
```

#### 2. ModalFechamentoLivro.tsx

**Adicionar prop para alterações automáticas:**
```typescript
interface ModalFechamentoLivroProps {
  open: boolean;
  onClose: () => void;
  armeiroNome: string;
  onFechar: (senha: string, alteracoes: Alteracao[]) => Promise<boolean>;
  alteracoesAutomaticas?: Alteracao[];  // ← Nova prop
}
```

**Exibir alterações automáticas no modal:**
```typescript
{/* Alterações Automáticas (falta de munição, etc) */}
{alteracoesAutomaticas && alteracoesAutomaticas.length > 0 && (
  <div className="space-y-2">
    <Label className="text-amber-600">Alterações automáticas ({alteracoesAutomaticas.length})</Label>
    <div className="max-h-40 overflow-y-auto space-y-2">
      {alteracoesAutomaticas.map((alteracao) => (
        <div 
          key={alteracao.id}
          className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded"
        >
          <p className="text-sm text-amber-800 dark:text-amber-200">{alteracao.descricao}</p>
          <p className="text-xs text-amber-600">
            {alteracao.dataHora.toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ArmeiroInterface.tsx` | Adicionar estado `alteracoesAutomaticas` e função `abrirModalFechamento` |
| `ArmeiroInterface.tsx` | Modificar botão "Fechar Livro" para usar nova função |
| `ArmeiroInterface.tsx` | Passar `alteracoesAutomaticas` como prop para o modal |
| `ModalFechamentoLivro.tsx` | Adicionar prop `alteracoesAutomaticas` na interface |
| `ModalFechamentoLivro.tsx` | Exibir seção de alterações automáticas com estilo diferenciado |

---

### Fluxo Corrigido

```
Dar Baixa Parcial de Munição
         │
         ▼
┌─────────────────────────────────────┐
│ Salva em alteracoesAutomaticas ✓   │
└─────────────────────────────────────┘
         │
         ▼
Clicar "Fechar Livro"
         │
         ▼
┌─────────────────────────────────────┐
│ abrirModalFechamento() carrega     │
│ alteracoesAutomaticas do Firebase  │
│ Passa para o modal via prop        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ ModalFechamentoLivro exibe:        │
│ - Alterações automáticas (amarelo) │
│ - Alterações manuais (azul)        │
│ Armeiro pode adicionar mais        │
└─────────────────────────────────────┘
         │
         ▼
Confirmar Fechamento
         │
         ▼
┌─────────────────────────────────────┐
│ handleFecharLivro combina todas    │
│ Salva em campo `alteracoes`        │
│ Documento Word inclui todas ✓      │
└─────────────────────────────────────┘
```

---

### Resultado Esperado

Após as correções:

1. **Ao clicar "Fechar Livro":** Sistema carrega alterações automáticas do Firebase
2. **Modal mostra preview:** Armeiro vê alterações automáticas (falta de munição) + pode adicionar manuais
3. **Ao confirmar:** Todas as alterações são combinadas e salvas
4. **Documento Word:** Inclui todas as alterações (automáticas + manuais)

**Exemplo visual no modal:**

| Tipo | Aparência | Conteúdo |
|------|-----------|----------|
| Automática | Fundo amarelo | "FALTA DE MUNIÇÃO: SD KEVIN não devolveu 5x Munição .40. Motivo: Disparo em ocorrência" |
| Manual | Fundo azul | "Substituição de colete danificado" |

