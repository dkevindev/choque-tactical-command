# Editar e apagar aulas lançadas (Gestor de Projetos Sociais)

Hoje o gestor só consegue visualizar as aulas (aba "Aulas") e lançar aulas retroativas (aba "Lançar Aula Retroativa", que já cobre os dias esquecidos). Falta poder corrigir e apagar aulas lançadas erradas.

## O que será feito

### 1. Editar aula já lançada
Novo botão "Editar" em cada card de aula na aba Aulas, abrindo um diálogo onde o gestor pode alterar:
- Data da aula (calendário)
- Turno/horário (conforme nomenclatura configurada no projeto)
- Turma (quando o projeto usa turmas)
- Instrutores (marcar/desmarcar entre os instrutores do projeto, mínimo 1)

Ao salvar, a aula é atualizada e um registro é adicionado ao histórico da aula (o que mudou, quem alterou e quando), seguindo o padrão de histórico já usado nas aulas.

### 2. Apagar aula lançada errada
Botão "Apagar" no card da aula, com diálogo de confirmação mostrando data, turno e número de presentes, exigindo confirmação explícita. A aula é removida da coleção de aulas e as horas dos instrutores deixam de contar automaticamente (as horas são derivadas das aulas, não armazenadas).

### 3. Lançar aula em dia esquecido
Já existe na aba "Lançar Aula Retroativa" — será apenas destacada com um atalho ("Lançar aula em dia esquecido") no topo da aba Aulas, para o gestor encontrar a função com facilidade.

## Detalhes técnicos

- `src/components/projetos-sociais/gestor/VisualizarAulasTab.tsx`: adiciona botões Editar/Apagar por card, estados de diálogo, `deleteDoc` em `projetos_aulas` e recarga da lista após alteração; aceita callback opcional para navegar até a aba de lançamento retroativo.
- Novo `src/components/projetos-sociais/gestor/EditarAulaGestorDialog.tsx`: carrega instrutores de `projetos_instrutores` e turmas de `projetos_turmas` do projeto, monta o formulário (data, turno, turma, instrutores) e faz `updateDoc` com `data` como `Timestamp`, `turno`, `turnoNome`, `turmaId`/`turmaNome`, `instrutores`, `instrutoresCompleto` e `arrayUnion` no `historico`.
- `src/components/projetos-sociais/gestor/GestorDashboard.tsx`: passa o controle de aba ativa para permitir o atalho e o refresh das estatísticas após editar/apagar.
- Nenhuma alteração nos fluxos do instrutor nem nos relatórios/frequência mensal, que continuam derivando os dados das aulas.
