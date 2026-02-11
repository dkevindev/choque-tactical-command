

# Recolocar Botao "Gerar Historico"

## O que sera feito

Recolocar o botao "Gerar Historico" no header da pagina de materiais belicos, junto com a funcao `gerarHistoricoGlobal` que foi removida anteriormente.

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

**1. Adicionar estado `gerandoHistorico`** na area de estados (apos os estados existentes)

**2. Recriar a funcao `gerarHistoricoGlobal`** que:
- Busca todos os documentos da colecao `materiais_transferidos`
- Para cada transferencia, itera seus materiais
- Se o material tem `subTipo === 'devolvido'`, limpa os campos `policialAssociadoNome`, `policialAssociadoId`, `cautelado`, `disponivel` no documento do material
- Cria registro no `historico_material` (evitando duplicatas com um Set de chaves unicas)
- Exibe toast com resultado ao final

**3. Adicionar o botao no header** (entre "Gerenciar Categorias" e "Novo Material"):

```text
[History] Gerar Historico   [Target] Gerenciar Categorias   [+] Novo Material
```

O botao tera estado de loading com spinner enquanto processa.

