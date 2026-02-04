
# Plano de Implementacao: Frequencia de Alunos Especiais + UI de Materiais nos Modais

## Resumo

Este plano abrange duas melhorias solicitadas:

| Sistema | Melhoria | Complexidade |
|---------|----------|--------------|
| Projetos Sociais | Alunos com horario especial aparecem nas listas das turmas (com `-` nos dias que nao frequentam) | Media |
| Reserva de Armamento | Melhorar UI de adicionar materiais nos modais (com abas como no ArmeiroInterface) | Media |

---

## 1. PROJETOS SOCIAIS - Frequencia de Alunos com Horario Especial

### Problema Atual
- Alunos com horario especial geram um documento separado individual
- O usuario precisa que esses alunos aparecam nas listas das duas turmas (ex: Turma 1 e Turma 3)
- Nos dias que o aluno NAO frequenta aquela turma, aparece `-` (para nao assinar)
- Nos dias que o aluno frequenta, fica disponivel para assinar

### Solucao

**Modificar a logica de `gerarFrequenciaMensal` em `FrequenciaMensalTab.tsx`:**

1. **Buscar alunos com horario especial que participam DESTA turma:**
   - Alem dos alunos normais da turma, buscar alunos com `horarioEspecial=true` que tenham `diasEspeciais` incluindo esta turma

2. **Ao gerar presenca para cada aluno:**
   - Para alunos normais: manter logica atual
   - Para alunos com horario especial: verificar se o dia da semana esta configurado em `diasEspeciais` para esta turma
     - Se SIM: verificar presenca normal
     - Se NAO: marcar com `-` (nao pode assinar)

**Logica detalhada:**

```text
Para aluno Maria com diasEspeciais:
  - segunda/Turma1
  - terca/Turma3

Ao gerar lista da Turma 1 (dias: Segunda e Quarta):
  - Segunda: verifica presenca normal (pode assinar)
  - Quarta: marca com "-" (nao e dia dela nesta turma)

Ao gerar lista da Turma 3 (dias: Terca e Quinta):
  - Terca: verifica presenca normal (pode assinar)
  - Quinta: marca com "-" (nao e dia dela nesta turma)
```

### Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `FrequenciaMensalTab.tsx` | Incluir alunos especiais na lista de turmas + logica de presenca por dia |

### Implementacao Detalhada

```typescript
// Dentro de gerarFrequenciaMensal:

// 1. Buscar alunos normais da turma (atual)
const alunosNormais = await buscarAlunosTurma(turma.alunos || []);

// 2. Buscar alunos com horario especial que frequentam ESTA turma
const qEspeciais = query(
  collection(db, 'projetos_alunos'),
  where('projetoId', '==', projeto.id),
  where('ativo', '==', true),
  where('horarioEspecial', '==', true)
);
const snapEspeciais = await getDocs(qEspeciais);
const alunosEspeciaisDaTurma = snapEspeciais.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(aluno => {
    // Aluno tem algum dia configurado para ESTA turma
    return aluno.diasEspeciais?.some((d: any) => d.turmaId === turma.id);
  })
  // Excluir se ja esta na lista normal da turma
  .filter(aluno => !(turma.alunos || []).includes(aluno.id));

// 3. Combinar listas
const todosAlunos = [...alunosNormais, ...alunosEspeciaisDaTurma];

// 4. Ao montar presenca, verificar horario especial por dia
const alunosComPresenca = todosAlunos.map(aluno => {
  const presencas: Record<string, string> = {};
  
  diasAula.slice(0, 10).forEach((dia, idx) => {
    const diaSemana = getDiaSemana(dia); // "segunda", "terca"...
    const dataStr = format(dia, 'dd/MM');
    
    // Verificar se aluno deveria estar neste dia
    let deveEstarNoDia = true;
    if (aluno.horarioEspecial && aluno.diasEspeciais?.length > 0) {
      // Verificar se tem config para este dia E esta turma
      const diaConfig = aluno.diasEspeciais.find((d: any) => 
        d.diaSemana === diaSemana && d.turmaId === turma.id
      );
      deveEstarNoDia = !!diaConfig;
    }
    
    if (!deveEstarNoDia) {
      // Nao e dia deste aluno nesta turma - marca com "-" (nao conta falta)
      presencas[`p${idx + 1}`] = '-';
    } else {
      // Logica normal de presenca
      const aulaData = aulas.find(a => format(a.data, 'dd/MM') === dataStr);
      if (aulaData && aulaData.alunosPresentes.includes(aluno.id)) {
        presencas[`p${idx + 1}`] = ''; // Presente - disponivel para assinar
      } else {
        presencas[`p${idx + 1}`] = '-'; // Faltou ou nao teve aula
      }
    }
  });
  
  return { nome: aluno.nomeGuerra || aluno.nomeCompleto, ...presencas };
});
```

### Remocao do Quadro Separado

O quadro "Alunos com Horario Especial" sera mantido apenas para visualizacao/consulta rapida, mas a geracao de documento individual sera removida. O aluno passara a aparecer nas listas das turmas configuradas.

---

## 2. RESERVA DE ARMAMENTO - UI de Adicionar Materiais nos Modais

### Problema Atual
- No `ModalAguardandoConfirmacao`, ao clicar em "Adicionar Material", aparece um `Select` simples com TODOS os materiais em uma lista unica - muito dificil de navegar
- No `ModalComplementarCautela`, mesma situacao - lista simples sem organizacao
- O usuario quer a mesma interface do "Materiais Disponiveis" do ArmeiroInterface:
  - Abas: Nº Serie | Municao | EPI | Acessorios
  - Campo de busca
  - Lista organizada por categoria

### Solucao

**Criar um componente reutilizavel de selecao de materiais com abas:**

1. Criar `SeletorMateriaisModal.tsx` - componente com:
   - Tabs: serie, municao, epi, acessorio
   - Input de busca
   - Lista de materiais filtrados
   - Callback ao selecionar material

2. Usar este componente em:
   - `ModalAguardandoConfirmacao.tsx` (etapa 'adicionar_material')
   - `ModalComplementarCautela.tsx` (etapa 'selecao')

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `SeletorMateriaisModal.tsx` | **NOVO** - Componente reutilizavel |
| `ModalAguardandoConfirmacao.tsx` | Usar novo componente na etapa adicionar_material |
| `ModalComplementarCautela.tsx` | Usar novo componente na etapa selecao |
| `LivroCautelaDia.tsx` | Corrigir botao de acoes mostrando `-` (verificar props) |

### Novo Componente: SeletorMateriaisModal

```typescript
interface SeletorMateriaisModalProps {
  materiaisDisponiveis: Material[];
  materiaisExcluidos?: string[]; // IDs de materiais ja na cautela
  onSelecionarMaterial: (material: Material) => void;
  loading?: boolean;
}

const CATEGORIAS = [
  { id: 'serie', label: 'Nº Série', icon: Search },
  { id: 'municao', label: 'Munição', icon: Package },
  { id: 'epi', label: 'EPI', icon: Shield },
  { id: 'acessorio', label: 'Acessórios', icon: Plus }
];

const SeletorMateriaisModal: React.FC<SeletorMateriaisModalProps> = ({
  materiaisDisponiveis,
  materiaisExcluidos = [],
  onSelecionarMaterial,
  loading
}) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState('serie');
  const [searchMaterial, setSearchMaterial] = useState('');
  
  // Mesma logica de mapearCategoria do ArmeiroInterface
  const mapearCategoria = (material: Material) => {
    const categoria = (material.categoria || '').toLowerCase();
    if (categoria.includes('munição') || categoria.includes('municao')) return 'municao';
    if (categoria.includes('colete')) return 'serie';
    if (categoria.includes('epi')) return 'epi';
    if (categoria.includes('acessório') || categoria.includes('acessorio')) return 'acessorio';
    if (material.numeroSerie) return 'serie';
    return 'acessorio';
  };
  
  // Filtrar materiais
  const materiaisFiltrados = materiaisDisponiveis
    .filter(m => !materiaisExcluidos.includes(m.id))
    .filter(m => {
      const categoriaDoMaterial = mapearCategoria(m);
      // ... mesma logica de filtragem do ArmeiroInterface
    });
  
  return (
    <div className="space-y-3">
      {/* Tabs de Categoria */}
      <Tabs value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
        <TabsList className="grid grid-cols-4 h-auto">
          {CATEGORIAS.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs px-2 py-1.5">
              <cat.icon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou nº série..."
          value={searchMaterial}
          onChange={(e) => setSearchMaterial(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Lista de Materiais */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : materiaisFiltrados.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum material disponível
          </div>
        ) : (
          materiaisFiltrados.map((material) => (
            <div
              key={material.id}
              className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              onClick={() => onSelecionarMaterial(material)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-sm">{material.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {material.numeroSerie && `Série: ${material.numeroSerie}`}
                    {material.calibre && ` - ${material.calibre}`}
                    {material.quantidade && ` - Est: ${material.quantidade}`}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-primary" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

### Correcao do Botao de Acoes no LivroCautelaDia

O botao de acoes esta mostrando apenas `-` porque a condicao `mov.cautelaId && mov.policialId` esta falhando.

Verificar se os dados de movimentacao estao incluindo `policialId` ao carregar do Firebase em `ArmeiroInterface.tsx`.

**Localizacao do problema:**
```typescript
// LivroCautelaDia.tsx linha 190-206
{mov.status === 'pendente' && mov.cautelaId && mov.policialId ? (
  <Button ...>Compl.</Button>
) : (
  <span>-</span>
)}
```

**Solucao:**
Garantir que ao carregar cautelas em `carregarMovimentacoesDoDia`, o `policialId` seja incluido na movimentacao:

```typescript
// Em ArmeiroInterface.tsx, dentro de carregarMovimentacoesDoDia:
gruposMap.set(groupKey, {
  // ... outros campos
  policialId: data.policialId,  // GARANTIR QUE ESTA INCLUIDO
  // ...
});
```

---

## Fluxo Visual Esperado

### Projetos Sociais - Lista de Frequencia

```text
Lista de Frequencia - Turma 1 (Segunda e Quarta)

| Aluno           | 03/02 | 05/02 | 10/02 | 12/02 |
|-----------------|-------|-------|-------|-------|
| Joao (normal)   | [ok]  | [ok]  | [ok]  | [-]   |
| Pedro (normal)  | [ok]  | [-]   | [ok]  | [ok]  |
| Maria (especial)| [ok]  | [-]   | [ok]  | [-]   |  <- Quarta = "-" (nao e dia dela)

Lista de Frequencia - Turma 3 (Terca e Quinta)

| Aluno           | 04/02 | 06/02 | 11/02 | 13/02 |
|-----------------|-------|-------|-------|-------|
| Ana (normal)    | [ok]  | [ok]  | [-]   | [ok]  |
| Maria (especial)| [ok]  | [-]   | [ok]  | [-]   |  <- Quinta = "-" (nao e dia dela)
```

### Reserva de Armamento - Modal de Adicionar Material

```text
┌─────────────────────────────────────────────────────┐
│ ADICIONAR MATERIAL                                  │
│                                                     │
│ Adicionar item à cautela de SD Kevin                │
│                                                     │
│ Materiais na cautela (2):                           │
│ • Pistola Glock .40                                 │
│ • Colete Balístico                                  │
│                                                     │
│ ┌─────────┬──────────┬─────┬────────────┐          │
│ │ Nº Série│ Munição  │ EPI │ Acessórios │  <- ABAS │
│ └─────────┴──────────┴─────┴────────────┘          │
│                                                     │
│ 🔍 [Buscar por nome ou nº série...]                │
│                                                     │
│ ┌─────────────────────────────────────────┐        │
│ │ Munição .40 CBC - Est: 1000         [+] │        │
│ │ Munição 5.56 - Est: 500             [+] │        │
│ │ Munição 9mm - Est: 2000             [+] │        │
│ └─────────────────────────────────────────┘        │
│                                                     │
│ Quantidade: [-] 30 [+]                              │
│                                                     │
│ [ADICIONAR]              [VOLTAR]                   │
└─────────────────────────────────────────────────────┘
```

---

## Resumo de Implementacao

| Etapa | Descricao | Arquivo |
|-------|-----------|---------|
| 1 | Modificar geracao de frequencia para incluir alunos especiais nas listas das turmas | FrequenciaMensalTab.tsx |
| 2 | Criar componente SeletorMateriaisModal com abas | SeletorMateriaisModal.tsx (NOVO) |
| 3 | Atualizar ModalAguardandoConfirmacao para usar novo seletor | ModalAguardandoConfirmacao.tsx |
| 4 | Atualizar ModalComplementarCautela para usar novo seletor | ModalComplementarCautela.tsx |
| 5 | Corrigir inclusao de policialId nas movimentacoes | ArmeiroInterface.tsx |
