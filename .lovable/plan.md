

# Plano de Implementacao: Correcoes e Novas Funcionalidades

## Resumo das Solicitacoes

| Sistema | Funcionalidade | Tipo | Prioridade |
|---------|----------------|------|------------|
| Reserva de Armamento | Corrigir erro "undefined" ao complementar cautela | Correcao | Alta |
| Reserva de Armamento | Opcao de Transferir Material entre policiais | Nova Feature | Alta |
| Projetos Sociais | Gestor lancar aula retroativa | Nova Feature | Media |
| Ordem de Servico | Editar data da OS para cota correta | Nova Feature | Media |

---

## 1. CORRECAO: Erro ao Complementar Cautela

### Diagnostico

O erro `"Function updateDoc() called with invalid data. Unsupported field value: undefined"` ocorre na linha 284 do `ModalComplementarCautela.tsx`:

```typescript
materiaisComplemento: materiaisAdicionados.map(m => ({
  materialId: m.materialId,
  nome: m.nome,
  quantidade: m.quantidade,
  categoria: m.categoria,  // <-- PODE SER UNDEFINED
  ...(m.numeroSerie && { numeroSerie: m.numeroSerie })
})),
```

### Solucao

Aplicar o mesmo padrao de protecao contra `undefined` usado no `ModalAguardandoConfirmacao.tsx`:

```typescript
materiaisComplemento: materiaisAdicionados.map(m => ({
  materialId: m.materialId,
  nome: m.nome,
  quantidade: m.quantidade,
  ...(m.categoria && { categoria: m.categoria }),
  ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
  ...(m.carregadores !== undefined && { carregadores: m.carregadores })
})),
```

### Arquivos a Modificar

| Arquivo | Linhas | Modificacao |
|---------|--------|-------------|
| `ModalComplementarCautela.tsx` | 280-286 | Proteger campos opcionais contra undefined |
| `ModalComplementarCautela.tsx` | 371-378 | Mesmo padrao ao salvar materiais finais |

---

## 2. NOVA FEATURE: Transferir Material entre Policiais

### Fluxo Proposto

```text
ARMEIRO                                           TOTEM
   |                                                  |
   | 1. Seleciona policial de ORIGEM (com material)   |
   |                                                  |
   | 2. Clica em "Transferir Material"                |
   |                                                  |
   | 3. Seleciona policial de DESTINO                 |
   |                                                  |
   | 4. Seleciona materiais a transferir              |
   |                                                  |
   | 5. Clica "Confirmar Transferencia"               |
   |    ──────────────────────────────────────────►   |
   |                                                  |
   |        Firebase: statusTransferencia =           |
   |              'aguardando_confirmacao'            |
   |                                                  |
   |                           ◄───────────────────── | 6. Totem detecta
   |                                                  |
   |   7. Policial DESTINO ve materiais               | 7. Exibe materiais
   |      e digita senha no terminal armeiro          |    a receber
   |      ──────────────────────────────────────────► |
   |                                                  |
   |   8. Sistema:                                    | 8. "TRANSFERENCIA
   |      - Marca devolvido para policial ORIGEM      |     CONFIRMADA!"
   |      - Cria nova cautela para policial DESTINO   |
   |                                                  |
```

### Componentes Necessarios

| Componente | Tipo | Descricao |
|------------|------|-----------|
| `ModalTransferenciaMaterial.tsx` | NOVO | Modal para selecionar destino e materiais |
| `BaixaMaterialSection.tsx` | MODIFICAR | Adicionar botao "Transferir" |
| `TotemPolicialInterface.tsx` | MODIFICAR | Detectar `statusTransferencia` |
| `ArmeiroInterface.tsx` | MODIFICAR | Importar e gerenciar modal |

### Estrutura do Modal de Transferencia

```typescript
interface ModalTransferenciaMaterialProps {
  open: boolean;
  onClose: () => void;
  cautelaOrigem: CautelaProvisoria;
  policialOrigem: Policial;
  livroId: string;
  onTransferido: () => void;
}

// Estados do modal:
type EtapaTransferencia = 
  | 'selecao_destino'      // Buscar e selecionar policial destino
  | 'selecao_materiais'    // Marcar materiais a transferir
  | 'aguardando'           // Aguardando confirmacao no Totem
  | 'confirmado';          // Transferencia concluida
```

### Dados no Firebase (durante transferencia)

```typescript
// Atualizar cautela_provisoria do policial ORIGEM:
{
  statusTransferencia: 'aguardando_confirmacao',
  transferenciaPara: {
    policialId: 'ID_DESTINO',
    policialNome: 'Nome do Destino',
    policialNomeGuerra: 'Nome de Guerra',
    materiais: [/* materiais selecionados */]
  },
  sessaoDigitacao: {
    etapa: 'senha',
    senhaLength: 0,
    erro: null,
    timestamp: Date.now()
  }
}
```

### Logica de Confirmacao

1. Policial DESTINO confirma com senha
2. Sistema busca materiais da transferencia
3. Para cada material transferido:
   - Remove da cautela ORIGEM
   - Se cautela ORIGEM ficar vazia, marca como 'entregue'
4. Cria nova cautela para policial DESTINO com os materiais
5. Remove campos de transferencia da cautela origem
6. Registra movimentacao de transferencia no historico

### Modificacao no Totem

```typescript
// Adicionar ao listener do Totem:
if (data.statusTransferencia === 'aguardando_confirmacao') {
  // Exibir materiais sendo transferidos
  const transferencia = data.transferenciaPara;
  // Mostrar: "Recebendo materiais de [ORIGEM]"
  // Listar materiais
  // Campo de senha para DESTINO confirmar
}
```

---

## 3. NOVA FEATURE: Gestor Lancar Aula Retroativa

### Problema

Quando instrutor esquece de lancar aula, se lancar depois o sistema registra com data errada (data atual em vez da data real).

### Solucao

Criar aba/botao no GestorDashboard para "Lancar Aula" com selecao de data retroativa.

### Componente Necessario

| Componente | Tipo | Descricao |
|------------|------|-----------|
| `LancarAulaRetroativaTab.tsx` | NOVO | Wizard para gestor lancar aula de dia passado |
| `GestorDashboard.tsx` | MODIFICAR | Adicionar nova aba/botao |

### Fluxo do Wizard

```text
┌──────────────────────────────────────────────────────────────────┐
│ LANCAR AULA RETROATIVA                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Etapa 1: SELECIONAR DATA                                        │
│  ┌────────────────────────────────────┐                          │
│  │  Calendario (somente dias passados)│                          │
│  │  [Calendario com datas anteriores] │                          │
│  └────────────────────────────────────┘                          │
│                                                                  │
│  Etapa 2: SELECIONAR TURNO                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                             │
│  │ Manha   │ │ Tarde   │ │ Noite   │                             │
│  └─────────┘ └─────────┘ └─────────┘                             │
│                                                                  │
│  Etapa 3: SELECIONAR TURMA (se projeto usar turmas)              │
│  ┌─────────────────────────────────────┐                         │
│  │ [Lista de turmas disponiveis]       │                         │
│  └─────────────────────────────────────┘                         │
│                                                                  │
│  Etapa 4: SELECIONAR INSTRUTORES                                 │
│  (Gestor NAO entra como instrutor)                               │
│  ┌─────────────────────────────────────┐                         │
│  │ [ ] CB Fulano                       │                         │
│  │ [ ] SD Ciclano                      │                         │
│  │ [ ] SD Beltrano                     │                         │
│  └─────────────────────────────────────┘                         │
│                                                                  │
│  Etapa 5: MARCAR ALUNOS PRESENTES                                │
│  ┌─────────────────────────────────────┐                         │
│  │ [ ] Joao da Silva                   │                         │
│  │ [ ] Maria Santos                    │                         │
│  │ [ ] Pedro Oliveira                  │                         │
│  └─────────────────────────────────────┘                         │
│                                                                  │
│  [CANCELAR]                     [LANCAR AULA]                    │
└──────────────────────────────────────────────────────────────────┘
```

### Diferencas do IniciarAulaWizard

| Aspecto | IniciarAulaWizard (Instrutor) | LancarAulaRetroativa (Gestor) |
|---------|-------------------------------|-------------------------------|
| Data | Sempre HOJE | Selecao de data PASSADA |
| Status | 'em_andamento' | 'encerrada' (ja finalizada) |
| Gestor como Instrutor | Sim (se for instrutor) | NAO (apenas registra) |
| horaInicio/horaFim | Registra em tempo real | Valores estimados ou vazios |

### Dados a Salvar

```typescript
const aulaData = {
  projetoId: projeto.id,
  data: dataSelecionada,  // Data retroativa selecionada
  turno: turnoSelecionado,
  turnoNome: turnosNomeclatura[turnoSelecionado - 1],
  instrutores: instrutoresSelecionados,
  instrutoresCompleto: instrutoresSelecionados.length === config.maxInstrutoresPorTurno,
  maxInstrutores: config.maxInstrutoresPorTurno,
  status: 'encerrada',  // Ja encerrada
  horaInicio: dataSelecionada,  // Estimativa
  horaFim: dataSelecionada,
  alunosPresentes: alunosPresentes,
  lancadoRetroativamente: true,  // Flag para identificar
  lancadoPor: gestorId,
  dataLancamento: new Date()
};
```

---

## 4. NOVA FEATURE: Editar Data da Ordem de Servico

### Problema

OS lancada retroativamente entra na cota do mes atual em vez do mes correto.

### Solucao

Adicionar botao de edicao nas OS existentes para alterar a data e recalcular a cota.

### Implementacao

Modificar a tela de listagem de OS ou criar modal de edicao:

```typescript
// Modal de Edicao de OS
interface ModalEditarOSProps {
  os: OrdemServico;
  onSalvar: () => void;
  onClose: () => void;
}

// Campos editaveis:
// - dataOS (com recalculo automatico de cota/saldo)
```

### Logica de Recalculo

1. Ao alterar a data da OS:
   - Verificar novo mes de referencia
   - Buscar saldo/cota do novo mes
   - Atualizar registro na colecao `saldoOficina`
   - Atualizar campo `dataOS` no documento

### Componentes a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `NovaOSForm.tsx` ou novo componente | Adicionar modal/funcao de edicao de data |
| `OrdensServicoPage.tsx` | Adicionar botao "Editar" na listagem |

---

## Resumo de Arquivos

### Novos Arquivos a Criar

| Arquivo | Sistema |
|---------|---------|
| `ModalTransferenciaMaterial.tsx` | Reserva de Armamento |
| `LancarAulaRetroativaTab.tsx` | Projetos Sociais |
| `ModalEditarOS.tsx` | Ordem de Servico |

### Arquivos a Modificar

| Arquivo | Modificacoes |
|---------|--------------|
| `ModalComplementarCautela.tsx` | Corrigir campos undefined |
| `BaixaMaterialSection.tsx` | Adicionar botao Transferir |
| `TotemPolicialInterface.tsx` | Detectar statusTransferencia |
| `ArmeiroInterface.tsx` | Gerenciar modal transferencia |
| `GestorDashboard.tsx` | Adicionar tab/botao Lancar Aula |
| `OrdensServicoPage.tsx` | Adicionar botao Editar OS |

---

## Ordem de Implementacao Sugerida

| Prioridade | Tarefa | Complexidade |
|------------|--------|--------------|
| 1 | Corrigir erro undefined no ModalComplementarCautela | Baixa |
| 2 | Transferir Material entre policiais | Alta |
| 3 | Gestor lancar aula retroativa | Media |
| 4 | Editar data da OS | Media |

