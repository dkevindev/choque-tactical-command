
# Sistema GESTÃO - COMANDANTES

## Resumo
Novo sistema na tela Home com login e controle de acesso (chave `gestaoComandantes`), apresentando um dashboard visual estilo Power BI (paleta diferente, mais cores e cards visuais) com dados somente-leitura do efetivo, armamentos e projetos sociais. Todas as seções exportam em PDF e Excel.

## Acesso

### Home (`src/pages/Home.tsx`)
- Adicionar novo card "GESTÃO - COMANDANTES" com ícone `Crown` e cor distinta (ex: `bg-indigo-600`)
- `acessoKey: 'gestaoComandantes'`

### Login (`src/components/LoginSistema.tsx`)
- Adicionar case `gestaoComandantes` no `verificarAcessoSistema`

### Gestão de Acessos (`src/components/GestaoAcesso.tsx`)
- Adicionar sistema `gestaoComandantes` na lista de sistemas com toggle

### Rota (`src/App.tsx`)
- Nova rota `/gestao-comandantes` → componente `ComandanteDashboard`

## Componente Principal

### `src/components/comandante/ComandanteDashboard.tsx`
Dashboard com sidebar/tabs para navegar entre seções. Paleta visual diferenciada: fundo escuro com cards coloridos, gradientes, badges grandes — estilo BI.

### Seções (cada uma como componente separado em `src/components/comandante/`):

#### 1. `EfetivoSection.tsx` — Efetivo
- Cards grandes: Total Regimento, 1º ESQD, 2º ESQD, 3º PEL
- Dados de `policiais` no Firestore
- Filtros por unidade, posto/graduação, situação
- Tabela consultável com busca
- Exportar PDF e Excel

#### 2. `FeriasSection.tsx` — Férias
- Cards: total em férias, por unidade
- Tabela de policiais em férias com datas início/fim
- Filtros por unidade
- Exportar PDF e Excel

#### 3. `TransferidosSection.tsx` — Transferidos
- Dados de `policiais_transferidos`
- Tabela com destino, data, publicação
- Exportar PDF e Excel

#### 4. `AtestadosSection.tsx` — Atestados
- Cards: total atestados ativos, ranking
- Filtros: dia, semana, mês, unidade
- Ranking de policiais por quantidade de atestados
- Tabela com CID, dias, datas
- Exportar PDF e Excel

#### 5. `EstatisticasSection.tsx` — Estatísticas Gerais
- Cards visuais: disponíveis, indisponíveis, por situação
- Resumo por posto/graduação (badges coloridos)
- Resumo por função
- Exportar PDF e Excel

#### 6. `ArmamentosSection.tsx` — Armamentos
- Dados de `materiais_belicos`
- Cards: total armas curtas, longas, coletes
- Divisão: na reserva vs cauteladas
- Por modelo (usando `modelos_armamento`)
- Exportar PDF e Excel

#### 7. `MaterialNaRuaSection.tsx` — Material na Rua
- Dados do livro de cautela ativo
- Tabela de materiais cautelados no momento
- Exportar PDF e Excel

#### 8. `ProjetosSociaisSection.tsx` — Projetos Sociais (condicional)
- Verifica se o policial logado é instrutor em algum projeto
- Se sim: mostra horas do mês atual, frequência de alunos, aulas do dia com turno e quantidade
- Dados de `aulas` e `projetos`
- Exportar PDF e Excel

## Exportação
- **Excel**: CSV com BOM UTF-8 separado por `;` (padrão do sistema)
- **PDF**: jsPDF + autoTable, paisagem, com cabeçalho "RPMONT - Relatório [Seção]"
- Cada seção terá botões "Exportar PDF" e "Exportar Excel" no header

## Estilo Visual
- Paleta: indigo, violet, slate, com gradientes nos cards
- Cards com números grandes e ícones
- Badges coloridos para status
- Layout responsivo com grid
- Diferente do padrão tático do resto do sistema — mais colorido e visual

## Arquivos a criar
- `src/components/comandante/ComandanteDashboard.tsx`
- `src/components/comandante/EfetivoSection.tsx`
- `src/components/comandante/FeriasSection.tsx`
- `src/components/comandante/TransferidosSection.tsx`
- `src/components/comandante/AtestadosSection.tsx`
- `src/components/comandante/EstatisticasSection.tsx`
- `src/components/comandante/ArmamentosSection.tsx`
- `src/components/comandante/MaterialNaRuaSection.tsx`
- `src/components/comandante/ProjetosSociaisSection.tsx`

## Arquivos a editar
- `src/pages/Home.tsx` — novo card
- `src/App.tsx` — nova rota
- `src/components/LoginSistema.tsx` — novo acessoKey
- `src/components/GestaoAcesso.tsx` — novo sistema no toggle
