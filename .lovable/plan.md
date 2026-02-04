# Plano: Sistema de Gestão Tactical Command

## Status: ✅ IMPLEMENTADO

---

## ✅ Frequência de Alunos com Horário Especial

### Problema Resolvido
Alunos com "Horário Especial" (que frequentam dias específicos de turmas diferentes) agora aparecem corretamente nas listas de frequência das turmas que participam.

### Solução Implementada

1. **FrequenciaMensalTab.tsx**:
   - Alunos normais da turma são listados (excluindo os que têm `horarioEspecial: true`)
   - Alunos com horário especial que têm `diasEspeciais` configurados para a turma são incluídos
   - Nos dias que o aluno NÃO frequenta aquela turma, aparece "-" (não pode assinar)
   - Nos dias que o aluno frequenta, fica disponível para assinar se esteve presente

2. **Lógica de Presença**:
   ```
   Para aluno Maria com diasEspeciais:
     - segunda/Turma1
     - terca/Turma3
   
   Lista Turma 1 (Segunda e Quarta):
     - Segunda: verifica presença (pode assinar)
     - Quarta: marca "-" (não é dia dela)
   
   Lista Turma 3 (Terça e Quinta):
     - Terça: verifica presença (pode assinar)  
     - Quinta: marca "-" (não é dia dela)
   ```

---

## ✅ UI de Materiais nos Modais de Armamento

### Problema Resolvido
A seleção de materiais nos modais estava usando um Select simples com todos os materiais em lista única.

### Solução Implementada

1. **Novo componente `SeletorMateriaisModal.tsx`**:
   - Abas: Nº Série | Munição | EPI | Acessórios
   - Campo de busca por nome ou número de série
   - Lista organizada por categoria
   - Auto-foco no campo de busca
   - Limpa busca ao trocar de aba

2. **Arquivos atualizados**:
   - `ModalAguardandoConfirmacao.tsx` - usa novo seletor
   - `ModalComplementarCautela.tsx` - usa novo seletor

3. **Correção do botão de ações no LivroCautelaDia**:
   - `ArmeiroInterface.tsx` - agora inclui `policialId` ao criar grupo de movimentações
   - Interface `MovimentacaoDia` atualizada com campo `policialId`

---

## Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| `FrequenciaMensalTab.tsx` | Incluir alunos especiais nas listas das turmas |
| `SeletorMateriaisModal.tsx` | **NOVO** - Componente com abas |
| `ModalAguardandoConfirmacao.tsx` | Usar novo seletor |
| `ModalComplementarCautela.tsx` | Usar novo seletor |
| `ArmeiroInterface.tsx` | Corrigir inclusão de policialId |
