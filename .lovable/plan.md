

# Registrar Cautela Atual no Historico

## O que sera feito

Ao clicar no botao de historico de um material, se ele estiver atualmente cautelado a um policial mas nao tiver nenhum registro na colecao `historico_material`, o sistema criara automaticamente um registro retroativo com os dados da associacao atual. Isso garante que pelo menos a cautela vigente fique registrada, alem de todas as futuras.

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

Alterar a funcao `loadHistorico` para:

1. Buscar os registros existentes em `historico_material`
2. Se nao houver nenhum registro E o material estiver cautelado (tiver `policialAssociadoNome` e `policialAssociadoId`), criar automaticamente um registro do tipo `cautelado` com os dados atuais
3. Recarregar a lista apos a insercao

Para isso, a funcao precisa receber tambem os dados do material (ou busca-lo da lista `materiais` em memoria). Como `materiais` ja esta no estado do componente, basta encontrar o material pelo ID.

```
Logica:
1. Buscar historico do Firebase
2. Se snapshot vazio E material.policialAssociadoId existir:
   - addDoc em historico_material com tipo 'cautelado' e observacao 'Registro retroativo - cautela vigente'
   - Recarregar snapshot
3. Exibir resultados
```

### Resumo

| Arquivo | Acao |
|---------|------|
| `CadastroMateriais.tsx` | Alterar funcao `loadHistorico` para registrar cautela atual se historico vazio |

