
# Modal de Detalhes da Aula antes de Gerar Lista de Frequencia

## O que muda

Ao clicar em "Gerar Lista de Frequencia", em vez de chamar diretamente a cloud function, abre um **modal** exibindo:
- Nomes dos instrutores (Post/Grad + Nome de Guerra)
- Lista dos alunos presentes na aula
- Botao "Gerar Documento" dentro do modal para confirmar e executar a geracao

## Arquivo a modificar

**src/components/projetos-sociais/gestor/VisualizarAulasTab.tsx**

### Alteracoes:

1. Adicionar estado `aulaModal` para controlar qual aula esta com o modal aberto
2. Adicionar estado `dadosModal` para armazenar instrutores e alunos carregados
3. Adicionar estado `carregandoModal` para exibir loading enquanto busca os dados

4. Criar funcao `abrirModalFrequencia(aula)` que:
   - Seta `aulaModal = aula`
   - Busca instrutores detalhados (Post/Grad + Nome de Guerra) via `buscarPolicialPorId`
   - Busca alunos presentes via `getDoc` na colecao `projetos_alunos`
   - Armazena em `dadosModal`

5. Alterar o `onClick` do botao "Gerar Lista de Frequencia" para chamar `abrirModalFrequencia` em vez de `gerarListaFrequencia`

6. Adicionar componente `Dialog` (ja existe em `@/components/ui/dialog`) com:
   - Titulo: "Lista de Frequencia - {data da aula}"
   - Secao "Instrutores" com badges mostrando Post/Grad + Nome de Guerra
   - Secao "Alunos Presentes" com lista numerada dos nomes
   - Botao "Gerar Documento" no footer que chama `gerarListaFrequencia` com a aula do modal

7. Imports adicionais: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` de `@/components/ui/dialog`
