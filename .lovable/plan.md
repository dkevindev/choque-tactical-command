

# Bug: Aluna de Horário Especial não aparece na lista da Turma 3 (terça-feira)

## Causa raiz

No arquivo `IniciarAulaWizard.tsx`, há uma contradição na lógica de filtragem:

1. **Linha 187-188**: Alunos com `horarioEspecial: true` são **removidos** da lista normal da turma
2. **Linha 218**: Alunos especiais que já estão no array `alunos` da turma são **removidos** da lista de especiais

Se a aluna está cadastrada como membro da Turma 3 (seu ID está no array `alunos` da turma) E tem `horarioEspecial: true`, ela é excluída dos dois lados:
- Excluída da lista normal (porque tem horário especial)
- Excluída da lista especial (porque seu ID já está no array `alunosIds` da turma)

Resultado: a aluna desaparece completamente.

## Correção

**Arquivo**: `src/components/projetos-sociais/instrutor/IniciarAulaWizard.tsx`

Remover o filtro da linha 218 que exclui alunos especiais que já estão na lista da turma. A exclusão da lista normal (linha 187-188) já garante que não haverá duplicatas, pois alunos com `horarioEspecial` nunca entram em `alunosTurma`.

```text
Antes (linha 217-218):
  // Excluir se já está na lista da turma
  .filter((aluno: any) => !alunosIds.includes(aluno.id));

Depois:
  // Removido filtro que excluía alunos especiais já cadastrados na turma
  // pois eles já foram excluídos da lista normal (linha 187-188)
```

Isso é uma correção de uma única linha — remover o `.filter` da linha 218.

