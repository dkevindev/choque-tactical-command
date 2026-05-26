
## Objetivo

Substituir o atual CAVBot (chat) por um portal mobile-first chamado **Sistema dos Usuários**, com menu de cards, fluxos passo-a-passo e visual próprio (mais vivo, fora do dark tactical padrão). Remover funcionalidades pouco usadas e criar um novo controle de oficina mais completo na seção Gestão e Logística.

---

## 1. Remoções no /cavbot atual

Remover do fluxo / menu do CAVBot:
- "Status oficina" (intent `listar_oficina`)
- "Buscar serviços" (intent `buscar_servico`)
- "Consultar OS" (intent `consultar_os`)

Remover também os botões rápidos correspondentes na UI e quaisquer atalhos.

---

## 2. Nova Home: "Sistema dos Usuários"

Reescrever `src/pages/...` (rota mantida `/cavbot` para não quebrar links — mas a UI/título passa a ser **Sistema dos Usuários**). Componente novo `src/components/sistema-usuario/SistemaUsuarioHome.tsx`.

- Layout 100% mobile-first (testado em 360–414px) com cards grandes.
- Visual diferenciado do resto do app: paleta mais viva (gradientes azul→ciano e laranja→âmbar para destaque), tipografia maior, sombras suaves, cantos 2xl. Permanece usando tokens do design system, mas com tema próprio escopado via classes (sem mexer no `index.css` global a ponto de afetar outras telas).
- Cabeçalho com saudação + brand "DKCODE / RPMONT".
- Menu de cards (cada card abre uma rota dedicada, fora do modelo de chat):
  1. **Iniciar Serviço** (avarias + checklist)
  2. **Entrada em Oficina**
  3. **Saída de Oficina**
  4. **Encerrar Serviço** (mantém o atual encerramento)
  5. **Patrimônio (CAVBot)** — atalho para o cadastro/scanner existente
- Cada card que exige autenticação leva primeiro a uma tela de **Login do Usuário** (matrícula + senha), reaproveitando `verificarPolicial` já existente. Depois redireciona para o fluxo correspondente.

Rotas novas em `App.tsx` (todas mobile-first):
- `/sistema` (home) — também acessível por `/cavbot` (alias)
- `/sistema/iniciar-servico`
- `/sistema/entrada-oficina`
- `/sistema/saida-oficina`
- `/sistema/encerrar-servico`

Componente compartilhado: `LoginUsuarioStep.tsx` (matrícula + senha + troca de senha no primeiro acesso, reutilizando lógica do CAVBot atual).

---

## 3. Iniciar Serviço (step-by-step, sem chat)

Novo componente `IniciarServicoWizard.tsx` com passos numerados (progress bar no topo):

1. **Login** (matrícula + senha)
2. **Tipo de frota** — Leve ou Pesada (botões grandes)
3. **Categoria** (se Leve) — Operacional ou Administrativa
4. **Selecionar VTR** — lista filtrada conforme passos anteriores
5. **Avarias por ângulo** — frontal / traseira / esquerdo / direito / mecânico / interno
   - Mantém integralmente o funcionamento atual de marcação por clique em imagem, salvamento na coleção `frota` em `avarias[]` (não alterar regras).
6. **Dados do serviço** — KM inicial + área de atuação
7. **Checklist da viatura** — mesmas 9 etapas atuais (óleo, água, step, macaco, chave roda, triângulo, smartphone, rádio fixo, cartão abastecimento)
8. **Confirmação** — resumo + salvar em `servicosDiarios` (mesmo schema atual)

Botões "Voltar" / "Próximo" em cada step. Nada de balões de chat.

---

## 4. Entrada em Oficina (novo fluxo step-by-step)

Novo componente `EntradaOficinaWizard.tsx`. Substitui o `FormEntradaOficina` antigo no contexto do novo portal (o componente antigo pode ser mantido só para retrocompatibilidade interna, mas não exposto). Passos:

1. **Login** do policial que está deixando a viatura (matrícula + senha)
2. **Tipo de frota** — Leve ou Pesada
3. **Selecionar viatura** — lista filtrada. Opção "Viatura não cadastrada" → input de texto livre (cadastro/identificação).
4. **Data de entrada** — preenchida automaticamente com `new Date()` (não pergunta ao usuário)
5. **Defeito relatado** — Textarea
6. **Oficina de destino** — Select com `oficinas` cadastradas + opção "Outra" (input livre)
7. **Confirmação** — resumo + salvar

### Nova coleção Firestore: `oficina_controle`

Documento gravado:
```
{
  viaturaId: string | null,           // null se não cadastrada
  cadastro: string,
  placa: string | null,
  modelo: string | null,
  viaturaNaoCadastrada: boolean,
  tipoFrota: 'leve' | 'pesada',
  oficina: string,
  defeitoRelatado: string,
  dataEntrada: ISO,                   // automática
  deixadoPorId: string,
  deixadoPorMatricula: string,
  deixadoPorNome: string,
  deixadoPorNomeGuerra1: string,
  status: 'na-oficina',
  retiradoPorId?: string,
  retiradoPorMatricula?: string,
  retiradoPorNome?: string,
  retiradoPorNomeGuerra1?: string,
  dataSaida?: ISO,
  observacaoServico?: string,
  diasNaOficina?: number,             // calculado ao sair
  createdAt: ISO
}
```

Manter a coleção antiga `oficina` intocada (apenas para histórico legado já existente — o novo fluxo escreve só na `oficina_controle`).

---

## 5. Saída de Oficina (novo fluxo step-by-step)

Novo componente `SaidaOficinaWizard.tsx`. Passos:

1. **Login** do policial que está retirando (matrícula + senha)
2. **Selecionar viatura na oficina** — lista filtrada por `status === 'na-oficina'` em `oficina_controle`. Mostra cadastro/placa, oficina, dias parada.
3. **Observação do serviço realizado**
4. **Confirmação** — salva no documento: `status='saiu'`, `dataSaida=now()`, `diasNaOficina`, dados do retirante.

---

## 6. Novo controle em Gestão e Logística → Frota

Novo componente `src/components/frota/ControleOficinaPage.tsx` + nova aba "Controle Oficina" em `FrotaPage.tsx` (vira `grid-cols-8`, ícone `Wrench`).

Layout em duas seções:

**A. Viaturas atualmente na oficina** (cards/tabela)
Colunas: VTR (cadastro/placa) • Tipo frota • Deixada por (nome guerra + matrícula) • Data entrada (dd/MM/yy) • **Dias parada** (badge colorido: verde ≤3, âmbar 4–7, vermelho >7) • Oficina • Defeito relatado.

**B. Histórico de retiradas** (tabela)
Colunas: VTR • Deixada por • Data entrada • Retirada por • Data saída • **Dias total** • Oficina • Defeito • Serviço realizado.

- Busca por cadastro/placa/oficina/policial.
- Filtro por status (Na oficina / Histórico / Tudo).
- Contadores no topo (Na oficina / Saídas no mês / Tempo médio).
- Sem mexer na velha página `OficinaPage.tsx` (continua acessível para o histórico legado se necessário, mas a nova aba vira a principal).

---

## 7. Detalhes técnicos

- Reaproveitar `verificarPolicial`, `buscarViaturasLeves`, `buscarViaturasPesadas`, `isOperacional` movendo para `src/lib/policialAuth.ts` e mantendo no `viaturaUtils`.
- Wizard genérico: criar `src/components/sistema-usuario/StepWizard.tsx` (header com progress, body, footer com Voltar/Próximo).
- Estilo "vivo": gradiente `from-sky-500 to-cyan-400`, cards `bg-white/95` em fundo gradiente, ícones grandes (lucide). Aplicado apenas dentro de `/sistema/*`.
- Lógica de avarias e checklist é **reusada sem alteração** — extrair as funções `salvarAvaria`, `iniciarServico`, `salvarChecklist` do `CAVBot.tsx` para `src/lib/servicoDiario.ts` para serem chamadas pelo wizard.
- Nada de migrations: apenas nova coleção Firestore (`oficina_controle`) criada on-the-fly via `addDoc`.
- Manter `/cavbot` redirecionando para o novo `/sistema` (ou renderizando-o), para não quebrar atalhos existentes.

---

## 8. Fora de escopo

- Não alterar regras de negócio de avarias, checklist e `servicosDiarios`.
- Não migrar dados da coleção antiga `oficina` para `oficina_controle`.
- Não mexer em outras seções do app (Reserva, Projetos Sociais, Gestão Pessoas, etc.).
- Sem PDF/export nesta etapa.

---

## Arquivos a criar
- `src/components/sistema-usuario/SistemaUsuarioHome.tsx`
- `src/components/sistema-usuario/StepWizard.tsx`
- `src/components/sistema-usuario/LoginUsuarioStep.tsx`
- `src/components/sistema-usuario/IniciarServicoWizard.tsx`
- `src/components/sistema-usuario/EntradaOficinaWizard.tsx`
- `src/components/sistema-usuario/SaidaOficinaWizard.tsx`
- `src/components/sistema-usuario/EncerrarServicoWizard.tsx`
- `src/components/frota/ControleOficinaPage.tsx`
- `src/lib/policialAuth.ts`
- `src/lib/servicoDiario.ts`

## Arquivos a editar
- `src/App.tsx` (novas rotas `/sistema/*`, alias de `/cavbot`)
- `src/components/FrotaPage.tsx` (nova aba "Controle Oficina")
- `src/bot/intents.ts` (remover `listar_oficina`, `buscar_servico`, `consultar_os`)
