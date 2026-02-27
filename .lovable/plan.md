
# Corrigir Assentamentos e Reformular Estatisticas

## 1. Corrigir registro de assentamentos ao mudar situacao

O codigo atual em `SituacaoTab.tsx` ja cria assentamentos ao colocar e retirar policiais de situacao. Vou investigar se ha algum problema no `policialId` que impede a consulta posterior, e garantir que a descricao inclua claramente a situacao anterior e a nova situacao.

**Ajuste**: Na funcao `handleColocarSituacao`, melhorar a descricao para incluir explicitamente: `Situacao anterior: X. Nova situacao: Y. Publicacao: Z`.

---

## 2. Reformular completamente a aba Estatisticas

### Remover
- Todos os graficos (PieChart, BarChart, LineChart)
- Imports do recharts
- Sub-abas antigas (graficos, situacao, funcao, postgrad, afastados)

### Novas abas por unidade
Substituir por 4 abas:
- **Regimento** (primeira, padrao) - engloba TODOS os policiais de todas as unidades
- **1 Esqd** - filtra por UNIDADE contendo "1" + "ESQD"
- **2 Esqd** - filtra por UNIDADE contendo "2" + "ESQD"
- **3 Pel/2 Esqd** - filtra por UNIDADE contendo "3" + "PEL"

### Conteudo de cada aba

**Cards de resumo (6 cards)**:
- Total Efetivo
- Total Efetivo Disponivel
- Total Efetivo Indisponivel
- Total de Ferias
- Total em LTS
- Total Outros Afastamentos

**Tabela de Indisponibilidades**: Mostra todos os policiais indisponiveis da unidade com colunas:
- NOME DE GUERRA1
- Numeral
- Matricula
- Situacao
- Data Inicio
- Data Final

**Botoes "Mostrar" ao lado de Ferias, LTS e Outros Afastamentos**: Cada botao expande/recolhe uma lista dos policiais nessa categoria, mostrando:
- NOME DE GUERRA1
- Numeral
- Matricula
- Data Inicio
- Data Final

**Estatisticas adicionais (sem graficos)**:
- Resumo por Posto/Graduacao (tabela simples com quantidade por posto)
- Percentual de disponibilidade da unidade

---

## Detalhes Tecnicos

### Arquivo: `src/components/gestao-pessoas/EstatisticasTab.tsx`
- Reescrever completamente o componente
- Remover imports do recharts
- Carregar `config_situacoes` do Firebase para determinar quais situacoes sao "indisponivel"
- Filtrar policiais por campo `UNIDADE` (usando `policial.UNIDADE || policial.Unidade`)
- Para cada aba, computar os 6 totais filtrando por situacao (FERIAS, LTS, outros)
- Usar estado `showFerias`, `showLTS`, `showOutros` para controlar visibilidade das listas expandidas
- Manter os botoes de exportacao CSV existentes

### Arquivo: `src/components/gestao-pessoas/SituacaoTab.tsx`
- Verificar e garantir que `handleColocarSituacao` registra corretamente a nova situacao nos assentamentos com descricao clara incluindo situacao anterior e nova
