

# Plano: Melhorias na Gestao de Frota

## Resumo das Alteracoes

| Alteracao | Descricao |
|-----------|-----------|
| 1. Botao Cadastrar Viatura | Adicionar botao no header do Dashboard para cadastrar novas viaturas |
| 2. Remover Botoes de Saldos | Remover os botoes "Atualizar Saldos" e "Configurar Saldos" do header |
| 3. Atualizar KM no Modal Detalhes | Adicionar botao no modal de detalhes para atualizar KM e KM da proxima troca de oleo |

---

## 1. Novo Modal de Cadastro de Viatura

Criar um componente `ModalCadastroViatura.tsx` com os seguintes campos baseados no tipo `Viatura`:

| Campo | Tipo | Obrigatorio |
|-------|------|-------------|
| CADASTRO | texto | Sim |
| PLACA | texto | Sim |
| MODELO | texto | Sim |
| CHASSI | texto | Nao |
| RENAVAM | numero | Nao |
| PREFIXO | numero | Nao |
| KM | numero | Sim |
| KMOLEO | numero | Sim |
| SITUACAO | select (OPERANTE/INOPERANTE) | Sim |
| UTILIZACAO | texto | Nao |
| tipo | select (leve/pesada) | Nao |
| GOODCARD | texto | Nao |
| RADIO | numero | Nao |
| ORD | numero | Nao |
| OBS | textarea | Nao |

**Acao**: Ao salvar, usa `addDoc` para adicionar na colecao `frota` do Firebase.

---

## 2. Remocao de Botoes no Header do Dashboard

**Arquivo**: `src/components/frota/FrotaDashboard.tsx`

Remover as linhas 645-661:
- Botao "Atualizar Saldos" (linhas 645-653)
- Botao "Configurar Saldos" (linhas 654-661)

Manter apenas o botao "Atualizar KM e Oleo" existente e adicionar o novo botao "Cadastrar Viatura".

**Novo layout do header**:
- Titulo e subtitulo (esquerda)
- Botao "Cadastrar Viatura" + Botao "Atualizar KM e Oleo" (direita)

---

## 3. Atualizar KM no Modal de Detalhes

**Arquivo**: `src/components/ModalDetalhesViatura.tsx`

Adicionar na secao de "Dados Completos da Viatura" um novo botao "Atualizar KM" que abre um pequeno formulario inline ou dialog para:

1. Atualizar KM atual
2. Atualizar KM da proxima troca de oleo

Campos editaveis:
- Input para novo KM
- Input para nova KM proxima troca de oleo
- Botao Salvar que atualiza o documento no Firebase

---

## Detalhes Tecnicos

### Novo Arquivo: `src/components/frota/ModalCadastroViatura.tsx`

```typescript
// Estrutura do componente
interface ModalCadastroViaturaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // callback para recarregar lista
}

// Campos do formulario
const [formData, setFormData] = useState({
  CADASTRO: '',
  PLACA: '',
  MODELO: '',
  CHASSI: '',
  RENAVAM: 0,
  PREFIXO: 0,
  KM: 0,
  KMOLEO: 0,
  SITUACAO: 'OPERANTE',
  UTILIZACAO: '',
  tipo: '' as 'leve' | 'pesada' | '',
  GOODCARD: '',
  RADIO: 0,
  ORD: 0,
  OBS: '',
  SALDO: 0,
  avarias: []
});

// Ao salvar:
await addDoc(collection(db, 'frota'), formData);
```

### Alteracoes em `FrotaDashboard.tsx`

Linhas 628-663 (header):
- REMOVER: Botao "Atualizar Saldos" 
- REMOVER: Botao "Configurar Saldos"
- ADICIONAR: Botao "Cadastrar Viatura" com icone Plus
- MANTER: Botao "Atualizar KM e Oleo"

### Alteracoes em `ModalDetalhesViatura.tsx`

Apos o card de "Dados Completos da Viatura" (linha 630), adicionar novo card ou secao para atualizar KM:

```typescript
// Novos estados
const [novoKm, setNovoKm] = useState('');
const [novoKmOleo, setNovoKmOleo] = useState('');
const [editandoKm, setEditandoKm] = useState(false);

// Funcao para atualizar
const handleAtualizarKm = async () => {
  const viaturaRef = doc(db, 'frota', viatura.id);
  await updateDoc(viaturaRef, {
    KM: parseInt(novoKm),
    KMOLEO: parseInt(novoKmOleo)
  });
  toast({ title: "KM atualizado com sucesso" });
  setEditandoKm(false);
};
```

UI: Botao ao lado dos campos KM Atual e KM Proximo Oleo para habilitar edicao inline.

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/frota/ModalCadastroViatura.tsx` | CRIAR - Modal de cadastro de nova viatura |
| `src/components/frota/FrotaDashboard.tsx` | MODIFICAR - Remover botoes de saldo, adicionar botao cadastrar |
| `src/components/ModalDetalhesViatura.tsx` | MODIFICAR - Adicionar funcionalidade de atualizar KM inline |

---

## Fluxo de Usuario

```text
Dashboard de Frota
      │
      ├─ Clica em "Cadastrar Viatura"
      │         │
      │         └─ Abre ModalCadastroViatura
      │                    │
      │                    └─ Preenche dados → Salva → Recarrega lista
      │
      └─ Clica em "Ver Detalhes" em qualquer viatura
                │
                └─ Abre ModalDetalhesViatura
                           │
                           └─ Na secao de dados, clica em "Atualizar KM"
                                      │
                                      └─ Edita KM e KM Oleo → Salva
```

---

## Ordem de Implementacao

| Etapa | Tarefa | Complexidade |
|-------|--------|--------------|
| 1 | Criar `ModalCadastroViatura.tsx` | Media |
| 2 | Modificar `FrotaDashboard.tsx` - remover botoes e adicionar cadastrar | Baixa |
| 3 | Modificar `ModalDetalhesViatura.tsx` - adicionar edicao de KM | Media |

