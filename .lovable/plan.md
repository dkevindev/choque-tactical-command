
# Plano de Melhorias: Reserva de Armamento e Projetos Sociais

## Resumo Executivo

Este plano abrange 6 melhorias solicitadas em dois sistemas:

| Sistema | Melhoria | Complexidade |
|---------|----------|--------------|
| Reserva de Armamento | Adicionar itens enquanto aguarda senha | Média |
| Reserva de Armamento | Adicionar itens a cautela já confirmada (antes da baixa) | Média |
| Reserva de Armamento | Corrigir erro "usuário não logado" na baixa de pendentes anteriores | Baixa |
| Projetos Sociais | Alunos em múltiplas turmas (horário especial) | Alta |
| Projetos Sociais | Definir feriados/dias sem aula | Média |
| Projetos Sociais | Seletor de mês + botão copiar no relatório de horas por instrutor | Baixa |

---

## 1. RESERVA DE ARMAMENTO

### 1.1 Adicionar Itens Enquanto Aguarda Senha

**Problema:** Quando o armeiro envia a cautela para confirmação e percebe que esqueceu algum material, precisa cancelar tudo e começar do zero.

**Solução:** Adicionar botão "Adicionar Material" no `ModalAguardandoConfirmacao` que:
1. Abre um mini-seletor de materiais
2. Atualiza o documento do Firebase adicionando os novos materiais
3. Atualiza a lista exibida no modal e no totem

**Arquivos a modificar:**
- `src/components/reserva-armamento/ModalAguardandoConfirmacao.tsx`
- `src/components/reserva-armamento/ArmeiroInterface.tsx` (passar materiais disponíveis como prop)

**Implementação:**

```
ModalAguardandoConfirmacao.tsx:
┌────────────────────────────────────────┐
│ AGUARDANDO CONFIRMAÇÃO                 │
│                                        │
│ Policial: SD Kevin                     │
│                                        │
│ MATERIAIS (3):                         │
│ • Pistola Glock 19                     │
│ • Munição .40 (30 un)                  │
│ • Colete Balístico                     │
│                                        │
│ 🔐 SENHA DO POLICIAL: [________]       │
│                                        │
│ [+ Adicionar Material]  ← NOVO BOTÃO   │
│                                        │
│ [Resetar Senha] [❌ CANCELAR]          │
└────────────────────────────────────────┘
```

**Nova prop no modal:**
```typescript
interface ModalAguardandoConfirmacaoProps {
  // ... props existentes
  onAdicionarMaterial: (material: MaterialSelecionado) => Promise<void>;
  materiaisDisponiveis: Material[];
}
```

**Lógica do botão:**
1. Abre um Dialog com lista de materiais disponíveis
2. Ao selecionar, chama `updateDoc` no Firebase para adicionar ao array de materiais
3. Atualiza o estado local `materiais`
4. O totem recebe via `onSnapshot` automaticamente

---

### 1.2 Adicionar Itens a Cautela Já Confirmada (Antes da Baixa)

**Problema:** Após o policial confirmar com senha, se lembrar que esqueceu algo, precisa criar nova cautela.

**Solução:** Adicionar botão "Complementar Cautela" na tabela do Livro do Dia para cautelas com status `pendente`.

**Arquivos a modificar:**
- `src/components/reserva-armamento/LivroCautelaDia.tsx`
- `src/components/reserva-armamento/ArmeiroInterface.tsx` (criar modal e lógica)

**Implementação:**

```
LivroCautelaDia.tsx - Nova coluna de ações:
┌────┬──────────┬─────────────┬─────────┬───────────┬───────────┬──────────┐
│ Nº │ Policial │ Materiais   │ Status  │ Assinat.  │ Devolução │ Ações    │
├────┼──────────┼─────────────┼─────────┼───────────┼───────────┼──────────┤
│001 │ SD Kevin │ Pistola     │PENDENTE │ Assinado  │ -         │[+ Compl.]│  ← NOVO
│002 │ CB Silva │ Pistola     │ENTREGUE │ Assinado  │ Devolvido │    -     │  ← Sem botão após baixa
└────┴──────────┴─────────────┴─────────┴───────────┴───────────┴──────────┘
```

**Nova interface:**
```typescript
interface LivroCautelaDiaProps {
  movimentacoes: MovimentacaoDia[];
  dataAbertura: Date;
  armeiroNome: string;
  onComplementarCautela?: (cautelaId: string, policialId: string) => void;  // NOVO
}
```

**Regra:** Botão só aparece quando `status === 'pendente'` (antes da baixa).

**Modal de Complemento:**
```
ModalComplementarCautela.tsx (NOVO):
┌────────────────────────────────────────┐
│ COMPLEMENTAR CAUTELA                   │
│                                        │
│ Policial: SD Kevin                     │
│ Materiais atuais: 2                    │
│                                        │
│ [Selecionar materiais adicionais...]   │
│                                        │
│ Materiais selecionados:                │
│ • Munição .40 (30 un)                  │
│                                        │
│ 🔐 SENHA DO POLICIAL: [________]       │
│ (Confirmar adição com senha)           │
│                                        │
│ [Cancelar] [Confirmar Adição]          │
└────────────────────────────────────────┘
```

**Fluxo:**
1. Armeiro clica em "Complementar"
2. Seleciona novos materiais
3. Policial confirma com sua senha
4. Sistema adiciona materiais na cautela existente via `updateDoc`
5. Atualiza disponibilidade dos materiais

---

### 1.3 Corrigir Erro "Usuário Não Logado" na Baixa de Pendentes

**Problema:** Ao clicar em "Receber" no alerta de pendências anteriores, dá erro de "usuário não logado".

**Causa identificada:** O `PendenciasAnterioresSection` passa a cautela para `ModalRecebimentoPendente`, mas o componente não recebe o ID do armeiro logado diretamente - busca do localStorage que pode estar inconsistente.

**Arquivo:** `src/components/reserva-armamento/PendenciasAnterioresSection.tsx`

**Solução:** Passar o ID do armeiro logado como prop do componente pai (`ArmeiroInterface`), garantindo que está sempre disponível.

**Implementação:**
```typescript
// PendenciasAnterioresSection.tsx
interface PendenciasAnterioresSectionProps {
  livroAtualId: string;
  onRecebimentoRealizado: () => void;
  armeiroLogadoId: string;  // NOVO
}

// Passar para ModalRecebimentoPendente
<ModalRecebimentoPendente
  ...
  armeiroLogadoId={armeiroLogadoId}  // NOVO
/>
```

```typescript
// ModalRecebimentoPendente.tsx
interface ModalRecebimentoPendenteProps {
  ...
  armeiroLogadoId?: string;  // NOVO
}

// Na função validarSenha, usar armeiroLogadoId ao invés de buscar do localStorage
const validarSenha = async () => {
  const armeiroId = armeiroLogadoId || JSON.parse(localStorage.getItem('user') || '{}').id;
  if (!armeiroId) {
    setSenhaErro('Usuário não logado.');
    return;
  }
  // ... resto da lógica
};
```

---

## 2. PROJETOS SOCIAIS

### 2.1 Alunos em Múltiplas Turmas (Horário Especial)

**Problema:** Alguns alunos têm conflito de horário com a escola e precisam frequentar dias de turmas diferentes. Exemplo:
- Turma 1: Segunda e Quarta
- Turma 3: Segunda e Terça
- Aluna Maria: só pode Segunda e Terça → frequenta Segunda da Turma 1 + Terça da Turma 3

**Solução proposta:** Criar conceito de "Horário Especial" para alunos:

1. **Campo no aluno:** `horarioEspecial: boolean` e `diasEspeciais: { diaSemana: string, turmaId: string, turno: string }[]`
2. **UI no cadastro de alunos:** Opção de marcar "Horário Especial" com seletor de dias/turmas
3. **Frequência:** Ao gerar lista, verificar se aluno tem horário especial e incluir apenas nos dias configurados

**Arquivos a modificar:**
- `src/components/projetos-sociais/gestor/CadastroAlunosTab.tsx`
- `src/components/projetos-sociais/gestor/FrequenciaMensalTab.tsx`
- Cloud Function `gerar-frequencia-mensal.js`

**Nova estrutura do aluno:**
```typescript
interface Aluno {
  id: string;
  nomeCompleto: string;
  nomeGuerra: string;
  idade: number;
  // ... outros campos
  horarioEspecial?: boolean;
  diasEspeciais?: Array<{
    diaSemana: string;      // "segunda", "terca", etc
    turmaId: string;        // ID da turma que frequenta nesse dia
    turno: string;          // "manha", "tarde"
  }>;
}
```

**UI no cadastro:**
```
┌─────────────────────────────────────────────────────────────┐
│ Editar Aluno                                                │
│                                                             │
│ Nome Completo: Maria da Silva                               │
│ Nome de Guerra: Maria                                       │
│ Turma Principal: [Turma 1 ▼]                               │
│                                                             │
│ ☑ Horário Especial (frequenta dias de outras turmas)       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Configuração de Dias:                                   ││
│ │                                                         ││
│ │ Segunda-feira: [Turma 1 ▼] Turno: [Manhã ▼]            ││
│ │ Terça-feira:   [Turma 3 ▼] Turno: [Manhã ▼]            ││
│ │                                                         ││
│ │ [+ Adicionar Dia]                                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [Cancelar] [Salvar]                                         │
└─────────────────────────────────────────────────────────────┘
```

**Lógica na frequência:**
```typescript
// FrequenciaMensalTab.tsx - ao gerar frequência
const alunosComPresenca = alunos.map(aluno => {
  const presencas: Record<string, string> = {};
  
  diasAula.slice(0, 10).forEach((dia, idx) => {
    const diaSemana = getDayName(dia);  // "segunda", "terca", etc
    
    // Verificar se aluno deveria estar neste dia
    let deveEstarNoDia = true;
    if (aluno.horarioEspecial && aluno.diasEspeciais) {
      const diaConfig = aluno.diasEspeciais.find(d => d.diaSemana === diaSemana);
      // Só inclui se o dia especial pertence a esta turma
      deveEstarNoDia = diaConfig?.turmaId === turma.id;
    }
    
    if (!deveEstarNoDia) {
      presencas[`p${idx + 1}`] = '-';  // Não é dia deste aluno
    } else {
      // Lógica normal de presença
      const aulaData = aulas.find(a => format(a.data, 'dd/MM') === dataStr);
      if (aulaData && aulaData.alunosPresentes.includes(aluno.id)) {
        presencas[`p${idx + 1}`] = '';
      } else {
        presencas[`p${idx + 1}`] = '-';
      }
    }
  });
  
  return { nome: aluno.nomeGuerra, ...presencas };
});
```

---

### 2.2 Definir Feriados/Dias Sem Aula

**Problema:** Dias de feriado são contados como falta para os alunos na frequência.

**Solução:** Criar cadastro de "Dias Sem Aula" (feriados, recesso, etc.) por projeto.

**Arquivos a criar/modificar:**
- `src/components/projetos-sociais/gestor/ConfiguracaoProjetoTab.tsx` (adicionar seção)
- `src/components/projetos-sociais/gestor/FrequenciaMensalTab.tsx`
- Cloud Function `gerar-frequencia-mensal.js`

**Nova coleção Firebase:** `projetos_dias_sem_aula`
```typescript
interface DiaSemAula {
  id: string;
  projetoId: string;
  data: Date;
  motivo: string;  // "Feriado Nacional", "Recesso", "Reunião Pedagógica"
  criadoPor: string;
  criadoEm: Date;
}
```

**UI na aba de Configuração:**
```
┌─────────────────────────────────────────────────────────────┐
│ Configuração do Projeto                                     │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📅 Dias Sem Aula (Feriados e Recessos)                  ││
│ │                                                         ││
│ │ 24/02/2026 - Carnaval                          [🗑️]    ││
│ │ 18/04/2026 - Sexta-feira Santa                [🗑️]    ││
│ │ 20/04/2026 - Tiradentes                        [🗑️]    ││
│ │                                                         ││
│ │ [+ Adicionar Dia Sem Aula]                              ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Modal para adicionar:**
```
┌────────────────────────────────────────┐
│ Adicionar Dia Sem Aula                 │
│                                        │
│ Data: [📅 Selecionar]                  │
│                                        │
│ Motivo: [Feriado Nacional ▼]           │
│   - Feriado Nacional                   │
│   - Feriado Estadual                   │
│   - Feriado Municipal                  │
│   - Recesso                            │
│   - Reunião Pedagógica                 │
│   - Outro                              │
│                                        │
│ [Cancelar] [Salvar]                    │
└────────────────────────────────────────┘
```

**Lógica na frequência:**
```typescript
// FrequenciaMensalTab.tsx
const buscarDiasSemAula = async (projetoId: string, ano: number, mes: number) => {
  const inicio = startOfMonth(new Date(ano, mes - 1));
  const fim = endOfMonth(new Date(ano, mes - 1));
  
  const q = query(
    collection(db, 'projetos_dias_sem_aula'),
    where('projetoId', '==', projetoId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => doc.data().data.toDate())
    .filter(data => data >= inicio && data <= fim);
};

// Ao gerar frequência, excluir dias sem aula
const diasSemAula = await buscarDiasSemAula(projeto.id, ano, mes);
const diasAulaFiltrados = diasAula.filter(dia => 
  !diasSemAula.some(dsa => isSameDay(dsa, dia))
);
```

---

### 2.3 Seletor de Mês + Botão Copiar no Relatório de Horas por Instrutor

**Problema:** O relatório de horas por instrutor sempre mostra o mês atual, sem opção de ver meses anteriores. Também falta botão de copiar para WhatsApp.

**Arquivo:** `src/components/projetos-sociais/gestor/RelatoriosGestorTab.tsx`

**Solução:**

1. **Adicionar seletor de mês:** Dropdown para escolher mês de referência
2. **Adicionar botão copiar:** Similar ao existente no relatório do instrutor

**Implementação:**

```typescript
// Novos estados
const [mesRelatorioInstrutores, setMesRelatorioInstrutores] = useState<Date>(new Date());

// Modificar cálculo de aulasMes
const aulasMesInstrutores = useMemo(() => {
  const primeiroDiaMes = new Date(mesRelatorioInstrutores.getFullYear(), mesRelatorioInstrutores.getMonth(), 1);
  const ultimoDiaMes = new Date(mesRelatorioInstrutores.getFullYear(), mesRelatorioInstrutores.getMonth() + 1, 0, 23, 59, 59);
  
  return todasAulas.filter(aula => {
    const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
    return dataAula >= primeiroDiaMes && dataAula <= ultimoDiaMes;
  });
}, [todasAulas, mesRelatorioInstrutores]);

// Recalcular instrutores com base no mês selecionado
const instrutoresRelatorioMes = useMemo(() => {
  return instrutoresRelatorio.map(instrutor => {
    const aulasInstrutorMes = aulasMesInstrutores.filter(a => 
      a.instrutores?.includes(instrutor.id)
    );
    return {
      ...instrutor,
      aulasMes: aulasInstrutorMes.length,
      horasMes: aulasInstrutorMes.length * 3
    };
  });
}, [instrutoresRelatorio, aulasMesInstrutores]);
```

**UI modificada:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Horas por Instrutor                                                     │
│                                                                         │
│ Mês de Referência: [Janeiro 2026 ▼]  [📋 Copiar Resumo]  ← NOVOS       │
│                                                                         │
│ ┌─────────────────┬────────────┬────────────┬───────────────┐          │
│ │ Instrutor       │ Aulas (Mês)│ Horas (Mês)│ Total Acumulado│          │
│ ├─────────────────┼────────────┼────────────┼───────────────┤          │
│ │ CB Santos  👁   │ 8          │ 24h        │ 96h           │          │
│ │ SD Lima    👁   │ 6          │ 18h        │ 72h           │          │
│ └─────────────────┴────────────┴────────────┴───────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Dialog de detalhes (também atualizado):**
```
┌────────────────────────────────────────────────────────────────┐
│ Aulas de CB Santos - Janeiro/2026                              │
│                                                                │
│ ┌──────────────┬──────────┐                                   │
│ │ Data         │ Turno    │                                   │
│ ├──────────────┼──────────┤                                   │
│ │ 06/01/2026   │ Manhã    │                                   │
│ │ 08/01/2026   │ Manhã    │                                   │
│ │ 13/01/2026   │ Manhã    │                                   │
│ │ ...          │ ...      │                                   │
│ └──────────────┴──────────┘                                   │
│                                                                │
│ Total: 8 aulas • 24h                                           │
│                                                                │
│ [📋 Copiar Detalhes]  ← NOVO BOTÃO                             │
└────────────────────────────────────────────────────────────────┘
```

**Função de copiar:**
```typescript
const copiarResumoInstrutores = () => {
  const mesNome = format(mesRelatorioInstrutores, 'MMMM/yyyy', { locale: ptBR });
  let texto = `📊 *RELATÓRIO DE HORAS - ${mesNome.toUpperCase()}*\n\n`;
  
  instrutoresRelatorioMes.forEach(inst => {
    texto += `👤 ${inst.nome}\n`;
    texto += `   📚 Aulas: ${inst.aulasMes}\n`;
    texto += `   ⏱️ Horas: ${inst.horasMes}h\n\n`;
  });
  
  const totalHoras = instrutoresRelatorioMes.reduce((sum, i) => sum + i.horasMes, 0);
  texto += `\n*TOTAL: ${totalHoras}h ministradas*`;
  
  navigator.clipboard.writeText(texto);
  toast.success('Resumo copiado para a área de transferência!');
};

const copiarDetalhesInstrutor = () => {
  const mesNome = format(mesRelatorioInstrutores, 'MMMM/yyyy', { locale: ptBR });
  let texto = `📊 *AULAS DE ${instrutorSelecionado.nome.toUpperCase()}*\n`;
  texto += `📅 Referência: ${mesNome}\n\n`;
  
  aulasInstrutor.forEach(aula => {
    const data = formatarDataAula(aula.data);
    texto += `• ${data} - ${aula.turnoNome || `Turno ${aula.turno}`}\n`;
  });
  
  texto += `\n*Total: ${aulasInstrutor.length} aulas • ${aulasInstrutor.length * 3}h*`;
  
  navigator.clipboard.writeText(texto);
  toast.success('Detalhes copiados!');
};
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `ModalAguardandoConfirmacao.tsx` | Adicionar botão e modal para adicionar materiais |
| `ArmeiroInterface.tsx` | Passar props extras, criar handler de complemento |
| `LivroCautelaDia.tsx` | Nova coluna de ações com botão "Complementar" |
| `ModalComplementarCautela.tsx` | **NOVO** - Modal para adicionar itens a cautela existente |
| `PendenciasAnterioresSection.tsx` | Receber `armeiroLogadoId` como prop |
| `ModalRecebimentoPendente.tsx` | Usar prop `armeiroLogadoId` |
| `CadastroAlunosTab.tsx` | Adicionar seção de horário especial |
| `ConfiguracaoProjetoTab.tsx` | Adicionar seção de dias sem aula |
| `FrequenciaMensalTab.tsx` | Considerar feriados e horários especiais |
| `RelatoriosGestorTab.tsx` | Seletor de mês + botões de copiar |

---

## Ordem de Implementação Sugerida

1. **Fase 1 - Correções Rápidas**
   - Corrigir erro "usuário não logado" (baixa complexidade)
   - Seletor de mês + copiar no relatório de instrutores (baixa complexidade)

2. **Fase 2 - Reserva de Armamento**
   - Adicionar materiais enquanto aguarda senha
   - Complementar cautela antes da baixa

3. **Fase 3 - Projetos Sociais**
   - Cadastro de feriados/dias sem aula
   - Horário especial para alunos (mais complexo)
