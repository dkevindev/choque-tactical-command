

# Cadastro em Lote de Materiais

## O que sera feito

Adicionar um toggle "Cadastro em Lote" no formulario de novo material. Quando ativado, o campo "Numero de Serie" sera substituido por uma area onde voce pode adicionar multiplos numeros de serie (um por item). Ao salvar, o sistema cria um registro separado para cada numero de serie, todos com as mesmas informacoes preenchidas no formulario.

## Como vai funcionar

1. Ao clicar em "Novo Material", aparece o formulario normal com um switch "Cadastro em Lote" no topo
2. Ao ativar o lote, o campo "Numero de Serie" vira uma lista onde voce digita um numero e clica em "Adicionar"
3. Os numeros adicionados aparecem como badges que podem ser removidos individualmente
4. Ao clicar "Cadastrar", o sistema cria N materiais identicos, cada um com seu numero de serie
5. Uma barra de progresso mostra o andamento do cadastro

## Exemplo visual

```text
+------------------------------------------+
|  [x] Cadastro em Lote                    |
+------------------------------------------+
|  Nome: Colete Balistico Nivel IIIA       |
|  Categoria: Colete Balistico             |
|  Fabricante: Armour                      |
|  ...demais campos iguais...              |
|                                          |
|  Numeros de Serie do Lote:               |
|  [_______________] [+ Adicionar]         |
|                                          |
|  [CB-001 x] [CB-002 x] [CB-003 x]       |
|  [CB-004 x] ... (40 itens)              |
|                                          |
|  Total: 40 materiais serao cadastrados   |
|                                          |
|  [Cadastrar Lote]  [Cancelar]            |
+------------------------------------------+
```

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

**1. Novos estados:**
- `modoLote: boolean` - controla se o modo lote esta ativo
- `seriesLote: string[]` - lista de numeros de serie adicionados
- `serieAtual: string` - campo de input para digitar o proximo numero
- `cadastrandoLote: boolean` - indica que o cadastro em lote esta em andamento
- `progressoLote: number` - progresso do cadastro (0 a N)

**2. No formulario (JSX):**
- Adicionar switch "Cadastro em Lote" logo apos o titulo do card (aparece apenas quando NAO esta editando)
- Quando `modoLote` esta ativo: substituir o campo "Numero de Serie" por um campo de input + botao "Adicionar" + lista de badges com os numeros adicionados
- Mostrar contador "Total: X materiais serao cadastrados"
- Botao muda de "Cadastrar" para "Cadastrar Lote (X itens)"

**3. Na logica de submit (`handleSubmit`):**
- Se `modoLote` esta ativo e `seriesLote.length > 0`:
  - Loop por cada numero de serie
  - Criar material identico para cada um (mesmo `materialDataBase` mas com `numeroSerie` diferente)
  - Atualizar progresso a cada item
  - Ao final, exibir toast de sucesso com quantidade cadastrada
  - Se houver policial associado, a cautela tambem e criada para cada material

**4. Funcoes auxiliares:**
- `adicionarSerie()` - adiciona o numero digitado na lista (impede duplicatas)
- `removerSerie(index)` - remove um numero da lista
- Suporte a colar lista separada por virgula, ponto-e-virgula ou quebra de linha (para agilizar entrada de muitos numeros)

### O que NAO muda
- Todo o formulario de campos (nome, categoria, fabricante, etc.) permanece identico
- A logica de edicao nao e afetada (lote so aparece no cadastro novo)
- A logica de cautela existente e reutilizada para cada item do lote
