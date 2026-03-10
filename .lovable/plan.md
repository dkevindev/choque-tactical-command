

# Ajustes ao Plano: Acervo de Modelos para Materiais Bélicos

## Alterações solicitadas

### 1. Sem cadastro manual para Armamento
Quando a categoria for "Armamento", o único caminho será selecionar um modelo do acervo. Se o modelo não existir, o usuário primeiro cadastra no acervo e depois volta ao cadastro do material. Isso garante 100% de padronização.

### 2. Edição de material em Modal
Hoje o formulário de edição abre inline no topo da página (Card na linha 1200). Ao clicar "Editar" num material lá embaixo, o usuário precisa rolar toda a tela. A correção é: ao editar, abrir o formulário dentro de um `Dialog` (modal) ao invés de inline.

## Plano técnico completo

### A. Coleção Firestore `modelos_armamento`
```text
{
  nome: "Pistola P320",
  fabricante: "SIG SAUER",
  modelo: "P320",
  calibre: ".40",
  tipoArma: "Arma Curta",
  categoria: "Armamento",
  createdAt: Date
}
```

### B. Novo componente `src/components/admin-belico/AcervoModelos.tsx`
- CRUD completo de modelos (Dialog para criar/editar)
- Tabela com nome, fabricante, modelo, calibre, tipo de arma
- Botões editar/excluir
- Acessível via botão "Acervo de Modelos" no header de CadastroMateriais

### C. Alterar `src/components/admin-belico/CadastroMateriais.tsx`

**Formulário em Modal para edição:**
- Substituir o Card inline (linha 1200) por um `Dialog` que abre tanto para novo material quanto para edição
- Isso resolve o problema de scroll ao editar materiais do final da lista

**Seleção de modelo obrigatória para Armamento:**
- Carregar modelos de `modelos_armamento` no useEffect
- Quando `categoria === 'Armamento'`: mostrar Select "Selecionar Modelo" com os modelos cadastrados
- Ao selecionar modelo: preencher automaticamente nome, fabricante, modelo, calibre, tipoArma
- Esses campos ficam desabilitados (readonly) -- sem opção de digitação manual
- Se não há modelos cadastrados, exibir mensagem orientando a cadastrar primeiro no Acervo
- Campos restantes (nº série, nº SIARM, carregadores, munições) continuam editáveis
- Cadastro em lote funciona igual: seleciona modelo + cola séries

**Botão no header:**
- Adicionar botão "Acervo de Modelos" ao lado de "Novo Material"

