

# Registrar Promocoes nos Assentamentos do Policial

## Resumo
Adicionar registro automatico na colecao `assentamentos` do Firebase sempre que uma promocao for realizada (novas promocoes) e tambem retroativamente ao sincronizar datas de promocoes ja feitas.

---

## Detalhes Tecnicos

### Arquivo: `src/components/gestao-pessoas/PromocaoDialog.tsx`

#### 1. Novas promocoes (funcao `handleConfirmar`, apos linha 273)
Apos criar o registro em `historico_promocoes`, adicionar um `addDoc` na colecao `assentamentos` com:
- `policialId`: novo ID do policial
- `tipo`: "Promocao"
- `data`: data da promocao (formato YYYY-MM-DD)
- `descricao`: ex. "Promovido de SD para CB. Publicacao: Portaria no 123/2024"
- `graduacaoAnterior`: posto antigo
- `graduacaoNova`: posto novo
- `publicacao`: numero da publicacao/portaria
- `criadoEm`: timestamp atual

#### 2. Sincronizacao retroativa (funcao `handleSincronizarDatasPromocao`, apos linha 164)
Ao atualizar cada policial, tambem criar um assentamento retroativo para cada promocao encontrada no historico:
- Consultar todos os registros de `historico_promocoes` para cada policial
- Para cada registro, verificar se ja existe assentamento de promocao correspondente (evitar duplicatas)
- Se nao existir, criar assentamento com os dados da promocao historica (data, graduacao anterior, nova, publicacao)

### Estrutura do assentamento de promocao
```text
{
  policialId: "CB_KEVIN_123",
  tipo: "Promocao",
  data: "2024-06-15",
  descricao: "Promovido de SD para CB. Publicacao: Portaria no 123/2024",
  graduacaoAnterior: "SD",
  graduacaoNova: "CB",
  publicacao: "Portaria no 123/2024",
  criadoEm: "2024-06-15T10:00:00.000Z"
}
```

### Exibicao nos assentamentos
O componente `AssentamentosSection` em `EfetivoTab.tsx` ja exibe assentamentos genericamente (linha 441-448), entao os novos registros de promocao aparecerrao automaticamente na timeline. Nenhuma alteracao necessaria na exibicao.

