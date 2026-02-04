
# Plano: Correção Completa de Alunos com Horário Especial

## ✅ IMPLEMENTADO

## Resumo do Problema (Resolvido)

| Problema | Local | Impacto |
|----------|-------|---------|
| Aluno aparece apenas na turma principal | IniciarAulaWizard | Instrutor nao consegue marcar presença do aluno nas outras turmas |
| Frequencia calcula faltas incorretas | RelatoriosGestorTab | Aluno leva falta em dias que nao deveria comparecer |
| Lista de frequencia mensal inclui em uma unica turma | FrequenciaMensalTab | Documento para assinatura nao reflete realidade |
| Sem visao consolidada | Nenhum | Gestor nao consegue ver frequencia real desses alunos |

## Fluxo Atual (Problematico)

```text
Aluno Maria configurada com Horario Especial:
  - Segunda: Turma 1 (Manha)
  - Terca: Turma 3 (Manha)

Problemas:
1. No IniciarAulaWizard da Turma 3, Maria NAO aparece na lista
2. Na frequencia mensal da Turma 1, Maria aparece em TODOS os dias (leva falta na Quarta)
3. Nao ha quadro especifico para gerar documento de Maria
```

## Solucao Proposta

### 1. IniciarAulaWizard - Incluir Alunos com Horario Especial na Chamada

**Modificacao:** Ao carregar alunos para uma turma, buscar tambem alunos com `horarioEspecial=true` que tenham esta turma configurada em `diasEspeciais` para o dia atual.

**Logica:**
```text
carregarAlunos():
  1. Buscar alunos da turma (atual)
  2. Buscar TODOS alunos com horarioEspecial=true do projeto
  3. Filtrar: aluno.diasEspeciais tem config para:
     - turmaId = turma selecionada
     - diaSemana = dia atual (segunda, terca, etc)
  4. Combinar listas (sem duplicar)
  5. Marcar alunos especiais com badge indicativo
```

**Resultado:** Maria aparece na Turma 3 apenas na terca-feira.

---

### 2. FrequenciaMensalTab - Excluir Alunos Especiais da Turma Principal

**Modificacao:** Alunos com `horarioEspecial=true` NAO devem aparecer na lista de frequencia da turma principal - apenas no quadro de Horario Especial.

**Ajuste na funcao `gerarFrequenciaMensal`:**
```text
// Filtrar alunos: excluir os que tem horario especial
const alunosTurma = alunos.filter(a => !a.horarioEspecial);
```

---

### 3. FrequenciaMensalTab - Novo Quadro "Alunos com Horario Especial"

**Adicionar secao separada** com cards para cada aluno com horario especial, mostrando:
- Nome do aluno
- Dias configurados (ex: "Segunda/Turma 1, Terca/Turma 3")
- Botao "Gerar Lista de Frequencia"

**Logica de geracao:**
```text
Para aluno Maria (Segunda/Turma1, Terca/Turma3):
  1. Calcular dias do mes que sao Segunda + dias que sao Terca
  2. Filtrar dias sem aula (feriados)
  3. Buscar aulas:
     - Da Turma 1 nos dias Segunda
     - Da Turma 3 nos dias Terca
  4. Verificar presenca de Maria em cada aula
  5. Gerar documento com TODOS os dias ordenados
```

**Documento gerado:**
```text
| Data    | Dia     | Turma   | Presenca |
|---------|---------|---------|----------|
| 03/02   | Segunda | Turma 1 | [assina] |
| 04/02   | Terca   | Turma 3 | [assina] |
| 10/02   | Segunda | Turma 1 | [assina] |
| 11/02   | Terca   | Turma 3 | [assina] |
| ...     | ...     | ...     | ...      |
```

---

### 4. RelatoriosGestorTab - Novo Quadro "Frequencia Alunos com Horario Especial"

**Adicionar Collapsible** na aba "Frequencia Alunos" para alunos com horario especial:

```text
Frequencia dos Alunos por Turma
├── Turma 1 (15 alunos) - Media: 85.2%
├── Turma 2 (12 alunos) - Media: 78.4%
├── Turma 3 (18 alunos) - Media: 82.1%
└── Horario Especial (3 alunos) - Media: 90.5%  ← NOVO
    ├── Maria da Silva - 95% (19 de 20 aulas)
    ├── João Santos - 85% (17 de 20 aulas)
    └── Ana Costa - 91.6% (22 de 24 aulas)
```

**Calculo de frequencia correto:**
```text
Para Maria (Segunda/Turma1, Terca/Turma3):
  totalAulas = aulas Turma1 em Segundas + aulas Turma3 em Tercas
  presencas = aulas onde Maria.id in alunosPresentes
  percentual = (presencas / totalAulas) * 100
```

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `IniciarAulaWizard.tsx` | Incluir alunos com horario especial na chamada |
| `FrequenciaMensalTab.tsx` | Excluir alunos especiais da turma, adicionar quadro especial |
| `RelatoriosGestorTab.tsx` | Adicionar secao de frequencia para alunos especiais |
| `gerar-frequencia-mensal.js` | Suportar geracao para aluno individual com multiplas turmas |

---

## Detalhamento Tecnico

### 4.1 IniciarAulaWizard.tsx - Carregar Alunos com Horario Especial

```typescript
const carregarAlunos = async () => {
  try {
    let alunosData: any[] = [];
    
    if (usaTurmas && turmaSelecionada) {
      // 1. Buscar alunos da turma
      const turmaDoc = await getDocs(...);
      const turmaData = turmaDoc.docs[0].data();
      const alunosIds = turmaData.alunos || [];
      
      // Buscar detalhes dos alunos da turma
      const alunosTurma = await Promise.all(...);
      
      // 2. Buscar alunos com horario especial
      const qEspeciais = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true),
        where('horarioEspecial', '==', true)
      );
      const snapEspeciais = await getDocs(qEspeciais);
      
      // 3. Filtrar: devem ter esta turma configurada para o dia atual
      const diaAtual = diasSemana[hoje.getDay()]; // "segunda", "terca"...
      
      const alunosEspeciaisFiltrados = snapEspeciais.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(aluno => {
          // Verificar se tem config para esta turma e este dia
          return aluno.diasEspeciais?.some(
            (d: any) => d.turmaId === turmaSelecionada && d.diaSemana === diaAtual
          );
        })
        // Excluir se ja esta na lista da turma
        .filter(aluno => !alunosIds.includes(aluno.id));
      
      // 4. Combinar e marcar
      alunosData = [
        ...alunosTurma.filter(a => a !== null),
        ...alunosEspeciaisFiltrados.map(a => ({
          ...a,
          isHorarioEspecial: true  // Flag para UI
        }))
      ];
    }
    
    setAlunos(alunosData);
  } catch (error) {
    console.error('Erro ao carregar alunos:', error);
  }
};
```

### 4.2 FrequenciaMensalTab.tsx - Quadro de Horario Especial

```typescript
// Estado para alunos especiais
const [alunosHorarioEspecial, setAlunosHorarioEspecial] = useState<any[]>([]);
const [gerandoEspecial, setGerandoEspecial] = useState<string | null>(null);

// Carregar ao montar
const carregarAlunosEspeciais = async () => {
  const q = query(
    collection(db, 'projetos_alunos'),
    where('projetoId', '==', projeto.id),
    where('ativo', '==', true),
    where('horarioEspecial', '==', true)
  );
  const snapshot = await getDocs(q);
  const alunos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setAlunosHorarioEspecial(alunos);
};

// Funcao para gerar frequencia de aluno especial
const gerarFrequenciaAlunoEspecial = async (aluno: any) => {
  // Logica detalhada para combinar dias de multiplas turmas
  // e gerar documento personalizado
};
```

### 4.3 RelatoriosGestorTab.tsx - Calculo Correto de Frequencia

```typescript
// Calcular frequencia de alunos com horario especial
const calcularFrequenciaAlunoEspecial = (aluno: any) => {
  const diasEspeciais = aluno.diasEspeciais || [];
  let totalAulasPossiveis = 0;
  let totalPresencas = 0;
  
  diasEspeciais.forEach(diaConfig => {
    // Pegar aulas desta turma neste dia da semana
    const aulasDesteDia = todasAulas.filter(aula => {
      const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
      const diaSemanaAula = getDiaSemana(dataAula);
      return aula.turmaId === diaConfig.turmaId && 
             diaSemanaAula === diaConfig.diaSemana;
    });
    
    totalAulasPossiveis += aulasDesteDia.length;
    totalPresencas += aulasDesteDia.filter(a => 
      a.alunosPresentes?.includes(aluno.id)
    ).length;
  });
  
  return {
    ...aluno,
    aulasParticipadas: totalPresencas,
    faltas: totalAulasPossiveis - totalPresencas,
    percentualPresenca: totalAulasPossiveis > 0 
      ? (totalPresencas / totalAulasPossiveis) * 100 
      : 0
  };
};
```

---

## Fluxo Corrigido

```text
Aluno Maria configurada com Horario Especial:
  - Segunda: Turma 1 (Manha)
  - Terca: Turma 3 (Manha)

Agora:
1. IniciarAulaWizard Turma 1 (Segunda): Maria APARECE
2. IniciarAulaWizard Turma 3 (Terca): Maria APARECE
3. IniciarAulaWizard Turma 1 (Quarta): Maria NAO aparece
4. IniciarAulaWizard Turma 3 (Quinta): Maria NAO aparece
5. Lista Frequencia Turma 1: Maria NAO esta (excluida)
6. Lista Frequencia Turma 3: Maria NAO esta (excluida)
7. Lista Frequencia Horario Especial: Maria tem documento proprio
8. Relatorio Frequencia: Maria aparece no quadro "Horario Especial" com percentual correto
```

---

## Resumo de Implementacao

| Etapa | Descricao | Complexidade |
|-------|-----------|--------------|
| 1 | Modificar carregarAlunos no IniciarAulaWizard | Media |
| 2 | Adicionar badge visual para alunos especiais | Baixa |
| 3 | Excluir alunos especiais da geracao de turma | Baixa |
| 4 | Criar secao "Horario Especial" no FrequenciaMensalTab | Media |
| 5 | Implementar geracao de documento personalizado | Alta |
| 6 | Adicionar collapsible no RelatoriosGestorTab | Media |
| 7 | Implementar calculo de frequencia correto | Media |
