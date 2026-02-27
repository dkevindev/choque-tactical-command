
# Filtrar Lista de Policiais em Situacao por Indisponibilidade

## Resumo
Na lista "Policiais em Situacao", mostrar apenas policiais cuja situacao esteja marcada como `indisponivel: true` na colecao `config_situacoes`. Situacoes que nao geram indisponibilidade serao excluidas da lista.

## Detalhes Tecnicos

### Arquivo: `src/components/gestao-pessoas/SituacaoTab.tsx`

Alterar o `useMemo` de `policiaisEmSituacao` (linha ~135) para cruzar com a lista de situacoes cadastradas e filtrar apenas aquelas com `indisponivel === true`:

**De:**
```typescript
const policiaisEmSituacao = useMemo(() => {
  return policiais
    .filter(p => p.SITUAÇÃO !== 'MONTADO - POLICIAMENTO OSTENSIVO' && p.SITUAÇÃO !== 'VIATURA' && p.SITUAÇÃO)
    .sort(sortByHierarquia);
}, [policiais]);
```

**Para:**
```typescript
const policiaisEmSituacao = useMemo(() => {
  const situacoesIndisponiveis = situacoes
    .filter(s => s.indisponivel)
    .map(s => s.nome);
  return policiais
    .filter(p => p.SITUAÇÃO && situacoesIndisponiveis.includes(p.SITUAÇÃO))
    .sort(sortByHierarquia);
}, [policiais, situacoes]);
```

Isso garante que apenas situacoes marcadas como indisponibilidade aparecam na lista "Policiais em Situacao".
