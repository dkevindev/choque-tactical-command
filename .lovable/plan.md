
# Plano: Correções na Reserva de Armamento

## Resumo dos Problemas

| Problema | Componente | Impacto |
|----------|------------|---------|
| Erro ao adicionar itens a cautela ja recebida | ModalComplementarCautela | Nao consegue complementar cautela |
| Pendencias anteriores ocupam muita tela | PendenciasAnterioresSection | Interface ruim |
| Adicionar item nao integra com Totem | ModalComplementarCautela | Policial nao consegue digitar senha no Totem |

---

## 1. Erro ao Adicionar Itens a Cautela Ja Recebida

### Diagnostico

O `ModalComplementarCautela` tem dois problemas potenciais:

1. **Busca de policial por ID**: A linha 158 faz `getDoc(doc(db, 'policiais', policialId))`, mas o `policialId` pode nao corresponder ao ID do documento no Firebase (pode ser busca por matricula ou outro campo)

2. **Validacao de senha**: A validacao de senha nao considera primeiro acesso

### Solucao

Modificar a funcao `handleConfirmarComSenha` para:
- Buscar policial por ID do documento ou por campo `id`/`usuarioId`
- Tratar primeiro acesso como o ModalAguardandoConfirmacao faz
- Adicionar logs para debug

```typescript
// Buscar policial - tentar por ID direto primeiro
let policialDoc = await getDoc(doc(db, 'policiais', policialId));

if (!policialDoc.exists()) {
  // Fallback: buscar por campo 'id'
  const queryByField = await getDocs(
    query(collection(db, 'policiais'), where('id', '==', policialId))
  );
  if (!queryByField.empty) {
    policialDoc = queryByField.docs[0];
  }
}
```

---

## 2. Opção de Minimizar Pendencias Anteriores

### Solucao

Adicionar `Collapsible` ao redor da tabela no `PendenciasAnterioresSection`:

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const [minimizado, setMinimizado] = useState(false);

// No JSX:
<Card className="border-yellow-500 bg-yellow-950/10">
  <Collapsible open={!minimizado} onOpenChange={(open) => setMinimizado(!open)}>
    <CardHeader className="pb-3">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer">
          <CardTitle className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
            Material Pendente de Devolução (Turno Anterior)
            <Badge variant="secondary">{pendencias.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm">
            {minimizado ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CollapsibleTrigger>
    </CardHeader>
    <CollapsibleContent>
      <CardContent>
        {/* Tabela existente */}
      </CardContent>
    </CollapsibleContent>
  </Collapsible>
</Card>
```

---

## 3. Integrar Confirmacao com Totem

### Problema Atual

O `ModalComplementarCautela` pede a senha localmente no computador do armeiro. Segundo o fluxo do sistema, o policial deveria digitar a senha no Totem.

### Solucao

Modificar o fluxo do `ModalComplementarCautela` para usar o mesmo padrao do `ModalAguardandoConfirmacao`:

1. **Etapa 'selecao'**: Armeiro seleciona materiais a adicionar (atual)
2. **Etapa 'aguardando'**: Criar cautela temporaria com status `aguardando_complemento` e aguardar confirmacao via Totem
3. **Etapa 'confirmado'**: Confirmacao recebida

### Modificacoes Necessarias

#### 3.1 ModalComplementarCautela.tsx

Adicionar nova etapa `'aguardando'` e integrar com Firebase para o Totem detectar:

```typescript
type Etapa = 'selecao' | 'aguardando' | 'confirmado';

// Ao clicar "Continuar" na selecao:
const handleIniciarConfirmacao = async () => {
  try {
    setLoading(true);
    
    // Criar documento temporario para o Totem detectar
    // Reutilizamos a cautela existente, atualizando seu status
    await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
      statusComplemento: 'aguardando_confirmacao',
      materiaisComplemento: materiaisAdicionados,
      sessaoDigitacao: {
        etapa: 'senha',
        senhaLength: 0,
        erro: null,
        timestamp: Date.now()
      }
    });
    
    setEtapa('aguardando');
  } finally {
    setLoading(false);
  }
};
```

#### 3.2 TotemPolicialInterface.tsx

Modificar para tambem detectar cautelas com `statusComplemento === 'aguardando_confirmacao'`:

```typescript
// Listener adicional ou modificar o existente
const unsubscribeComplemento = onSnapshot(
  query(
    collection(db, 'cautelas_provisorias'),
    where('statusComplemento', '==', 'aguardando_confirmacao')
  ),
  (snapshot) => {
    // Detectar e exibir materiais a adicionar
  }
);
```

#### 3.3 ModalAguardandoConfirmacao Pattern

Reutilizar o mesmo pattern de sincronizacao de `sessaoDigitacao`:
- Espelhar digitacao de senha no Totem
- Suportar primeiro acesso
- Suportar reset de senha
- Validar senha e confirmar

### Fluxo Visual

```text
ARMEIRO                                    TOTEM
   |                                          |
   | 1. Clica "Complementar"                  |
   |                                          |
   | 2. Seleciona materiais                   |
   |                                          |
   | 3. Clica "Continuar"                     |
   | ------------------>                      |
   |                    Firebase: statusComplemento = 'aguardando'
   |                                          |
   |                           <--------------| 4. Totem detecta
   |                                          |
   |   5. Aguarda senha                       | 5. Exibe materiais
   |      (campo de input)                    |    (policial confirma)
   |                                          |
   | 6. Digita senha do policial              | 6. Espelha asteriscos
   | ------------------>                      |
   |                    Firebase: sessaoDigitacao.senhaLength
   |                                          |
   | 7. Valida senha                          |
   | ------------------>                      |
   |                    Firebase: statusComplemento = null (confirmado)
   |                                          | 7. Exibe "CONFIRMADO!"
   |                                          |
```

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `ModalComplementarCautela.tsx` | Integrar com Totem, corrigir busca de policial |
| `PendenciasAnterioresSection.tsx` | Adicionar Collapsible para minimizar |
| `TotemPolicialInterface.tsx` | Detectar cautelas com statusComplemento |

---

## Implementacao Detalhada

### PendenciasAnterioresSection.tsx - Collapsible

```typescript
// Adicionar imports
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

// Adicionar estado
const [minimizado, setMinimizado] = useState(false);

// Modificar JSX para envolver em Collapsible
```

### ModalComplementarCautela.tsx - Integracao Totem

1. Mudar etapas para incluir `'aguardando'`
2. Na etapa `'aguardando'`:
   - Sincronizar `sessaoDigitacao` com Firebase
   - Mostrar campo de senha que espelha no Totem
   - Validar senha igual ao ModalAguardandoConfirmacao
   - Suportar primeiro acesso e reset de senha
3. Corrigir busca de policial com fallback

### TotemPolicialInterface.tsx - Detectar Complemento

Modificar o listener para tambem verificar campo `statusComplemento`:

```typescript
// No listener existente, verificar:
if (data.statusComplemento === 'aguardando_confirmacao') {
  // Exibir materiais do complemento em vez dos materiais originais
  const materiaisExibir = data.materiaisComplemento || [];
  // ... resto da logica
}
```

---

## Resumo

| Tarefa | Complexidade | Prioridade |
|--------|--------------|------------|
| Corrigir busca de policial no ModalComplementar | Baixa | Alta |
| Adicionar Collapsible em Pendencias | Baixa | Media |
| Integrar ModalComplementar com Totem | Media | Alta |
