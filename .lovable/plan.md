

# Filtrar Top Assiduidade: remover quem teve indisponibilidade nos ultimos 12 meses

## Contexto

O ranking "Top Assiduidade" conta atestados medicos nos ultimos 12 meses. Porem, policiais que ficaram afastados por qualquer situacao de indisponibilidade (licenca maternidade, LTS, etc.) nao devem aparecer no ranking, pois a ausencia deles nao e comparavel.

As mudancas de situacao ja sao salvas na colecao `assentamentos` com tipo `'Mudanca de Situacao'` ou `'mudanca_situacao'`, contendo os campos `novaSituacao` ou `situacaoNova`. A colecao `config_situacoes` indica quais situacoes geram indisponibilidade (flag `indisponivel`).

## Solucao

Carregar os assentamentos de mudanca de situacao dos ultimos 12 meses, cruzar com `config_situacoes` para identificar quais policiais entraram em alguma situacao indisponivel, e remove-los do ranking.

## Arquivo a modificar

**src/components/gestao-pessoas/EstatisticasTab.tsx**

### Alteracoes:

1. No `useEffect` de carregamento (linha 88-123), adicionar fetch da colecao `assentamentos` em paralelo com as demais
2. Armazenar os assentamentos em novo estado `allAssentamentos`
3. No `useMemo` do `rankingAssiduidade` (linhas 133-152):
   - Identificar nomes de situacoes indisponiveis (ja existe em `situacoesIndisponiveis`)
   - Varrer assentamentos dos ultimos 12 meses com tipo de mudanca de situacao
   - Coletar IDs de policiais cuja `novaSituacao` ou `situacaoNova` esteja na lista de situacoes indisponiveis
   - Filtrar esses policiais fora do ranking
   - Manter a contagem de atestados (quantidade, independente de dias) para os restantes

### Logica principal:

```text
// Dentro do rankingAssiduidade useMemo:
const idsComIndisponibilidade = new Set();
allAssentamentos.forEach(a => {
  if (a.data < limite) return;
  const tipo = (a.tipo || '').toLowerCase();
  if (!tipo.includes('mudanca') && !tipo.includes('mudança')) return;
  const sitNova = a.novaSituacao || a.situacaoNova || '';
  if (situacoesIndisponiveis.includes(sitNova)) {
    idsComIndisponibilidade.add(a.policialId);
  }
});

return policiaisFiltrados
  .filter(p => !idsComIndisponibilidade.has(p.id))
  .map(...)
  .sort(...);
```

Nenhuma alteracao estrutural necessaria -- os dados ja existem no Firebase, apenas precisam ser carregados e cruzados.
