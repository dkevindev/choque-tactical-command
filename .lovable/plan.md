

# Sistema GESTÃO - COMANDANTES

## Resumo
Novo sistema na tela Home com login e controle de acesso (chave `gestaoComandantes`), apresentando um dashboard visual estilo Power BI (paleta diferente, cores vibrantes, cards grandes) com dados somente-leitura do efetivo, armamentos e projetos sociais. Todas as seções exportam em PDF e Excel.

## Acesso e Autenticação

- Novo card na Home: "GESTÃO - COMANDANTES" com ícone `Crown`, cor `bg-indigo-600`
- `acessoKey: 'gestaoComandantes'` — mesmo padrão de login/acesso dos demais sistemas
- Toggle de liberação na tela de Gestão de Acessos (dentro de Gestão e Logística)
- Nova rota `/gestao-comandantes`

## Dashboard Principal

Componente `ComandanteDashboard.tsx` com navegação lateral/tabs entre 8 seções. Estilo visual diferenciado — paleta indigo/violet/slate com gradientes, cards com números grandes e ícones, badges coloridos. Visual parecido com Power BI, não com o padrão tático.

## Seções

### 1. Efetivo
- Cards grandes: Total Regimento, 1º ESQD, 2º ESQD, 3º PEL
- Filtros por unidade, posto/graduação, situação
- Tabela consultável com busca

### 2. Férias
- Cards: total em férias, por unidade
- Tabela com datas início/fim

### 3. Transferidos
- Dados de `policiais_transferidos`
- Tabela com destino, data, publicação

### 4. Atestados
- Cards: total ativos, ranking
- Filtros: dia, semana, mês, unidade
- Ranking por quantidade de atestados
- Tabela com CID, dias, datas

### 5. Estatísticas Gerais
- Disponíveis vs indisponíveis
- Resumo por posto/graduação e função (badges coloridos)

### 6. Armamentos
- Cards: armas curtas, longas, coletes
- Divisão: na reserva vs cauteladas
- Agrupado por modelo

### 7. Material na Rua
- Materiais cautelados no momento (livro ativo)

### 8. Projetos Sociais (condicional)
- Se for instrutor: horas no mês, frequência de alunos, aulas do dia/turno/quantidade

## Exportação em todas as seções
- **Excel**: CSV com BOM UTF-8 separado por `;`
- **PDF**: jsPDF + autoTable, paisagem, cabeçalho "RPMONT"
- Botões "Exportar PDF" e "Exportar Excel" em cada seção

## Arquivos

**Criar (9 componentes):**
- `src/components/comandante/ComandanteDashboard.tsx`
- `src/components/comandante/EfetivoSection.tsx`
- `src/components/comandante/FeriasSection.tsx`
- `src/components/comandante/TransferidosSection.tsx`
- `src/components/comandante/AtestadosSection.tsx`
- `src/components/comandante/EstatisticasSection.tsx`
- `src/components/comandante/ArmamentosSection.tsx`
- `src/components/comandante/MaterialNaRuaSection.tsx`
- `src/components/comandante/ProjetosSociaisSection.tsx`

**Editar (4 arquivos):**
- `src/pages/Home.tsx` — novo card
- `src/App.tsx` — nova rota
- `src/components/LoginSistema.tsx` — novo acessoKey
- `src/components/GestaoAcesso.tsx` — novo sistema no toggle

