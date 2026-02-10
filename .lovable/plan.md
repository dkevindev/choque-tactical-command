

# Separar Componentes: Transferências vs Saiu da Carga

## Problema

O componente `MateriaisTransferidos.tsx` e usado em dois locais:
1. **Belico > Transferencias** (aba principal) - deveria manter o formato original focado no policial
2. **Belico > Saiu da Carga > Transferidos** - deveria ter o novo formato focado no material

Ao reescrever o componente, ambos os locais foram alterados. Precisamos restaurar o original e criar um componente separado para "Saiu da Carga".

## Solucao

1. **Restaurar `MateriaisTransferidos.tsx`** ao formato original (focado no policial, com publicacao, destino, etc.)
2. **Criar novo componente `MateriaisTransferidosCarga.tsx`** com o formato focado no material (tabela material-centrica com modal de detalhes do policial)
3. **Atualizar `SaiuDaCarga.tsx`** para importar o novo `MateriaisTransferidosCarga` em vez de `MateriaisTransferidos`

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/MateriaisTransferidos.tsx`
- Restaurar ao conteudo original que ja foi fornecido no contexto do projeto (tabela centrada no policial, com colunas de publicacao, destino, status, modal com dados completos)

### Novo arquivo: `src/components/admin-belico/MateriaisTransferidosCarga.tsx`
- Contera o codigo atual de `MateriaisTransferidos.tsx` (versao material-centrica)
- Tabela com colunas: Material, N/S, Categoria, Fabricante/Modelo, Cautelado a, Data, Acoes
- Modal com detalhes do policial, destino, publicacao, materiais levados e devolvidos

### Arquivo: `src/components/admin-belico/SaiuDaCarga.tsx`
- Trocar o import de `MateriaisTransferidos` para `MateriaisTransferidosCarga`

### Resumo

| Arquivo | Acao |
|---------|------|
| `MateriaisTransferidos.tsx` | Restaurar ao formato original (foco no policial) |
| `MateriaisTransferidosCarga.tsx` | Novo - formato material-centrico (codigo atual do MateriaisTransferidos) |
| `SaiuDaCarga.tsx` | Alterar import para usar MateriaisTransferidosCarga |

