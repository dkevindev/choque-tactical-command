

# Melhorias em Estatisticas, Funcao e Performance

## 1. Top Policiais Assiduidade (EstatisticasTab.tsx)

No grid onde aparece o card "Disponibilidade" e "Resumo por Posto/Graduacao", transformar em grid de 3 colunas e adicionar um terceiro card **"Top Assiduidade"** que:
- Busca atestados dos ultimos 12 meses da colecao `atestados_medicos`
- Conta quantos atestados cada policial teve
- Lista TODOS os policiais em ordem crescente (quem tem MENOS atestados primeiro)
- Formato de cada item: posicao + NOME DE GUERRA1 (maiusculo, campo do Firebase)
- Policiais com 0 atestados aparecem primeiro (mais assíduos)
- Card com scroll interno (max-height) para nao estourar o layout
- Usa os dados de `atestados_medicos` ja carregados no useEffect existente, apenas expandindo o calculo

## 2. Resumo por Funcao mais bonito (EstatisticasTab.tsx)

Substituir a tabela simples de "Resumo por Posto/Graduacao" no grid inferior por um layout visual melhor:
- Usar cards pequenos ou badges coloridos em grid ao inves de tabela crua
- Adicionar tambem um resumo por funcao (agrupando policiais por FUNCAO)
- Cada item com icone, nome da funcao e quantidade em destaque
- Layout em grid responsivo (3-4 colunas)

## 3. Correcoes de Performance no modulo Gestao de Pessoas

### 3.1 Remover carregamento duplicado de policiais (GestãoPessoas.tsx)
- Linha 120: `if (retornos.length > 0 || true)` -- o `|| true` forca SEMPRE um segundo `getDocs` desnecessario. Remover o `|| true` para so recarregar quando houve mudancas reais

### 3.2 Evitar re-fetch de atestados no EstatisticasTab
- O componente pai (`GestãoPessoas`) ja carrega atestados no `iniciarSistema`. Passar esses dados via props para `EstatisticasTab` ao inves de fazer outra query ao Firebase
- Isso elimina uma chamada duplicada ao Firestore

### 3.3 Otimizar FuncaoTab
- A tab de Funcao faz seed de `config_funcoes` toda vez que a lista esta vazia -- isso e correto mas o `useEffect` nao tem dependencias que mudem, entao roda so 1x. OK.

## Arquivos a modificar

1. **src/components/gestao-pessoas/EstatisticasTab.tsx** -- adicionar card Top Assiduidade no grid, melhorar visual do resumo por funcao, receber atestados via props
2. **src/components/GestãoPessoas.tsx** -- remover `|| true` no carregamento duplicado, passar atestados como prop para EstatisticasTab

## Detalhes tecnicos

### Top Assiduidade (calculo)
```text
1. Filtrar atestados com dataInicio nos ultimos 12 meses
2. Agrupar por policialId -> contar quantidade
3. Para cada policial do efetivo filtrado, buscar contagem (0 se nao tem)
4. Ordenar crescente (menos atestados = mais assiduo)
5. Exibir: #1 - NOME DE GUERRA1
```

### Grid Estatisticas (layout)
```text
Antes:  grid 1x2 -> [Disponibilidade] [Posto/Grad]
Depois: grid 1x3 -> [Disponibilidade] [Top Assiduidade] [Resumo Funcao]
```

O resumo por Posto/Graduacao sera mantido mas com visual de badges/chips ao inves de tabela.
