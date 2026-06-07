## Problema

Na página **Fichas de Serviço** a coluna "Avaria" mostra sempre `-` para fichas ainda abertas e não há como ver os detalhes de cada serviço. Hoje o checklist e as avarias da viatura são gravados apenas no documento da `frota/{viaturaId}` (campos `ultimoChecklist` e `avarias[]`), e não dentro do `servicosDiarios`. Por isso a ficha não consegue mostrar:
- as avarias que o motorista marcou ao iniciar o serviço,
- como o motorista preencheu o checklist da viatura,
- a descrição da avaria do encerramento (se houver),
- demais dados da ficha em formato legível.

## Objetivo

1. Gravar um **snapshot por ficha** dos dados marcados pelo motorista, para que cada ficha tenha histórico próprio (não depender do "último checklist" da viatura, que muda a cada serviço).
2. Tornar cada linha da tabela **clicável**, abrindo um **modal de detalhes** com todas as informações do serviço.
3. Mostrar corretamente a coluna **Avaria** também em serviços abertos (quantas avarias o motorista registrou na entrada).

## Mudanças

### 1. `IniciarServicoWizard.tsx` — salvar snapshot na ficha
Ao criar o documento em `servicosDiarios` (função `iniciarServicoSalvar`), incluir o id do serviço para uso posterior. Em `salvarChecklistFinal`, além de atualizar `frota/{id}`, atualizar **também** o documento de `servicosDiarios` recém-criado adicionando:
- `checklistInicial`: o objeto `completo` (mesmo conteúdo gravado em `ultimoChecklist`).
- `avariasIniciais`: snapshot das avarias da viatura no momento do início (cópia de `avariasLista`, já filtrado/clonado).
- `problemasChecklist`: array `problemas` resumido (para badge rápido).

### 2. `EncerrarServicoWizard.tsx` — já grava `constatouAvaria` e `descricaoAvariaFim`
Sem mudança lógica; garantir apenas que `encerradoPorId` e `encerradoPorNome` continuem sendo gravados (já estão).

### 3. `FichasServicoPage.tsx` — modal de detalhes + coluna Avaria melhorada

- Adicionar estado `fichaSelecionada` e abrir `<Dialog>` ao clicar na linha.
- Linha com `cursor-pointer hover:bg-muted/50`.
- Coluna "Avaria":
  - Se ficha tem `avariasIniciais.length > 0` ou `constatouAvaria === true`, exibir badge vermelho com contagem (entrada) e ícone de alerta para encerramento.
  - Se ficha aberta sem avarias iniciais → "—".
  - Se encerrada sem avaria → "Não".
- Para fichas antigas (sem `checklistInicial` salvo), o modal busca `frota/{viaturaId}.ultimoChecklist` como fallback.

### 4. Modal `DetalheFichaModal` (novo, dentro do mesmo arquivo ou em `frota/DetalheFichaModal.tsx`)

Layout em seções:

```
[Cabeçalho]
VTR <CADASTRO> • <PLACA>          [Badge status]
Motorista: <nomeGuerra1>           Área: <area>
Início: dd/MM/yy HH:mm             Fim:   dd/MM/yy HH:mm
KM inicial / final / rodada
Encerrada por: <nomeGuerra1>

[Avarias registradas na entrada]
- ângulo, descrição, foto (se houver) — lista vinda de avariasIniciais
- se vazio: "Nenhuma avaria registrada na entrada."

[Checklist da viatura]
Tabela de chave → valor (Óleo motor, Água radiador, Step, Macaco, Chave de roda,
Triângulo, Smartphone estado/conexão, Rádio fixo, Cartão abastecimento).
Itens com problema marcados em vermelho.

[Avaria no encerramento]
"Constatou avaria: Sim/Não"
Descrição (se houver).
```

Estilo: usar `Dialog` do shadcn com classes light já padronizadas (`bg-white text-slate-900`) para manter consistência com o portal mobile, mas como esta tela é desktop (Gestão e Logística), seguir o tema escuro do app (`bg-card text-foreground`).

## Detalhes técnicos

- Tipo `FichaServico` ganha `checklistInicial?`, `avariasIniciais?: any[]`, `problemasChecklist?: string[]`.
- Função utilitária `labelChecklist(key, value)` para mostrar nomes amigáveis.
- Fallback de busca em `frota/{viaturaId}` apenas se o snapshot não estiver na ficha (compatibilidade com fichas antigas).
- Nenhuma alteração no schema/Firestore além dos novos campos opcionais — sem migrations.

## Arquivos

- `src/components/sistema-usuario/IniciarServicoWizard.tsx` — gravar snapshot no `servicosDiarios`.
- `src/components/frota/FichasServicoPage.tsx` — linha clicável, coluna Avaria com contagem da entrada, integração com modal.
- `src/components/frota/DetalheFichaModal.tsx` (novo) — modal de detalhes.
