

# Corrigir cedilha e cadastrar policiais BSP (cedidos)

## Parte 1: Botao para corrigir cedilha nos dados existentes

Na aba **Efetivo** (EfetivoTab.tsx), adicionar um botao "Corrigir Acentuacao" que:
- Busca todos os policiais no Firebase cuja SITUACAO contenha "LICENCA" (sem cedilha)
- Atualiza automaticamente para "LICENÇA TRATAMENTO DE SAUDE" (com cedilha)
- Exibe um toast informando quantos registros foram corrigidos (ou "Nenhum registro para corrigir")

O botao ficara ao lado do botao "Gerenciar Promocoes" no header do card de Efetivo.

## Parte 2: Cadastro de policiais BSP (cedidos)

### Conceito
Policiais cedidos de outras unidades (ex: BSP) serao armazenados na mesma colecao `policiais` no Firebase, porem com um campo `origemExterna: 'BSP'` (ou outra unidade) e `UNIDADE: 'BSP'`. Isso permite que:
- Aparecam na tabela de efetivo, diferenciados visualmente
- Sejam contados nas estatisticas
- Aparecam no documento de Resumo de Efetivo (a cloud function ja trata BSP como unidade)

### Implementacao

**EfetivoTab.tsx:**
- Adicionar botao "Cadastrar Policial Cedido (BSP)" no header
- Abrir um Dialog com formulario simplificado: Nome, Nome de Guerra, Post/Grad, Matricula, Funcao, Situacao (padrao "EM ATIVIDADE"), Telefone
- Ao salvar, gravar no Firebase com `origemExterna: 'BSP'`, `UNIDADE: 'BSP'`
- Na tabela de efetivo, policiais com `origemExterna` terao um Badge "BSP" ou "CEDIDO" ao lado do nome, com cor diferenciada (ex: azul)
- Filtro de situacao continuara funcionando normalmente

**EstatisticasTab.tsx:**
- Os policiais BSP ja serao incluidos nos dados pois vem da mesma colecao `policiais`
- O agrupamento por unidade ja funciona (a cloud function ja mapeia BSP)

### Diferenciacao visual na tabela
Na linha da tabela, se o policial tiver `origemExterna`, exibir:
- Badge azul "BSP" na coluna Unidade
- Linha com fundo levemente diferente (bg-blue-50)

## Arquivos modificados
- `src/components/gestao-pessoas/EfetivoTab.tsx` -- botao corrigir cedilha + cadastro BSP + visual diferenciado na tabela

