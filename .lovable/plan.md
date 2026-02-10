

# Auditoria Completa: Sistema Gestao e Logistica

## Problemas Identificados

### 1. CRITICO - Consultas Firebase Duplicadas no Dashboard

O `DashboardOverview` carrega a colecao `frota` inteira uma vez. Depois, os componentes `AlertaOleoAtrasado` e `AlertaTrocaOleo` (renderizados dentro do mesmo dashboard) fazem **cada um** outra consulta completa a colecao `frota`. Sao **3 leituras completas da mesma colecao** ao abrir o dashboard.

**Correcao:** Passar os dados de viaturas ja carregados como props para `AlertaOleoAtrasado` e `AlertaTrocaOleo`, eliminando 2 consultas desnecessarias.

---

### 2. CRITICO - FrotaDashboard faz consultas redundantes e excessivas

- `fetchViaturas()` carrega toda a colecao `frota`
- `calcularMetricasDashboard()` chama `buscarViaturasLeves()` e `buscarViaturasPesadas()` que internamente chamam `buscarTodasViaturas()` novamente (mesmo com cache de 5 min, na primeira carga sao chamadas extras)
- `getStatusViatura()` e uma funcao **async** chamada para CADA viatura no render, e dentro dela faz `buscarViaturasLeves()` + `getDocs(saldosViaturas)` **para cada viatura individual** - potencialmente dezenas de queries Firebase por render
- `handleAtualizarSaldos()` faz outra leitura completa de `ordensDeServico` (ja carregada no estado)

**Correcao:** 
- Remover `getStatusViatura` como funcao async e calcular status de todas as viaturas de uma vez usando dados ja carregados
- Reutilizar `ordensServico` do estado em vez de buscar novamente
- Carregar `saldosViaturas` uma unica vez e reutilizar

---

### 3. CRITICO - CadastroMateriais carrega cautelas inteiras desnecessariamente

`loadMateriais()` carrega TODAS as `cautelas_permanentes` (sem filtro, com `orderBy`) para sincronizar status. Ao criar/editar material com policial, faz OUTRA query de todas as cautelas. Ao excluir, faz outra query filtrada.

**Correcao:** Carregar cautelas ativas uma unica vez e manter em estado. Usar cache local para operacoes subsequentes.

---

### 4. IMPORTANTE - Login sem autenticacao real

`LoginGestao` aceita qualquer matricula/senha. Se contem "admin" ou e "001", vai para admin. Caso contrario, vai para user. Nao ha verificacao de credenciais no Firebase Auth nem no Firestore.

**Correcao:** Implementar verificacao real contra a colecao `policiais` no Firebase, comparando matricula e senha (ou usar Firebase Auth).

---

### 5. IMPORTANTE - Logs de debug excessivos em producao

`FrotaDashboard` tem **mais de 20 console.log** detalhados que rodam em producao, impactando performance e expondo dados sensiveis no console do navegador.

**Correcao:** Remover ou envolver em condicional `if (import.meta.env.DEV)`.

---

### 6. MEDIO - AlertasGestaoSection usa query com orderBy que pode falhar

A query `where('lido', '==', false) + orderBy('dataHora', 'desc')` requer um indice composto no Firestore. Se o indice nao existir, a query falha silenciosamente (o `onSnapshot` captura o erro mas so loga no console).

**Correcao:** Adicionar tratamento de erro visivel ou ordenar em memoria (mesmo padrao aplicado ao historico).

---

### 7. MEDIO - Dados mock misturados com dados reais

`CadastroMateriais`, `GerenciarCautelas` e `ControleEstoque` tem blocos catch que inserem **dados mock** no estado quando o Firebase falha. Isso pode mascarar erros reais e confundir o usuario com dados falsos.

**Correcao:** Remover dados mock dos blocos catch. Exibir mensagem de erro clara em vez de dados ficticios.

---

### 8. MEDIO - DialogContent sem DialogDescription

Os console warnings mostram que varios modais usam `DialogContent` sem `DialogDescription`, gerando warnings de acessibilidade. Isso afeta todos os modais do sistema.

**Correcao:** Adicionar `DialogDescription` (pode ser visually-hidden) em todos os DialogContent que nao tem.

---

### 9. MENOR - GuardaQuartelContent usa window.location.href

```typescript
const navigate = (path: string) => {
  window.location.href = path;
};
```

Isso causa reload completo da pagina em vez de usar o React Router.

**Correcao:** Usar `useNavigate` do react-router-dom.

---

### 10. MENOR - BaixaMaterialCargaModal operacoes sequenciais lentas

O loop `for...of` faz operacoes Firebase sequenciais para cada material selecionado (historico + baixa + update + cautelas). Com 10 materiais, sao ~40 operacoes sequenciais.

**Correcao:** Usar `Promise.all` para paralelizar operacoes por material, ou usar `writeBatch` do Firestore para operacoes atomicas.

---

## Plano de Implementacao

### Fase 1 - Correcoes Criticas de Performance

**Arquivo: `src/components/AdminDashboard.tsx`**
- Modificar `DashboardOverview` para passar dados de viaturas como props para `AlertaOleoAtrasado` e `AlertaTrocaOleo`
- Alterar ambos componentes para receber `viaturas` via props em vez de fazer getDocs proprias

**Arquivo: `src/components/frota/FrotaDashboard.tsx`**
- Refatorar `getStatusViatura` para ser sincrona, pre-calculando status de todas as viaturas em batch
- Remover getDocs redundante em `handleAtualizarSaldos` (usar estado existente)
- Remover console.logs excessivos

**Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`**
- Carregar cautelas ativas uma vez e manter em ref/estado para reuso

### Fase 2 - Correcoes de Qualidade

**Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`**
- Remover dados mock do catch

**Arquivo: `src/components/admin-belico/GerenciarCautelas.tsx`**
- Remover dados mock do catch

**Arquivo: `src/components/admin-belico/ControleEstoque.tsx`**
- Remover dados mock do catch

**Arquivo: `src/components/AdminDashboard.tsx`**
- Corrigir `GuardaQuartelContent` para usar `useNavigate`

**Arquivo: `src/components/admin-belico/BaixaMaterialCargaModal.tsx`**
- Paralelizar operacoes Firebase com `Promise.all`

### Fase 3 - Acessibilidade e Warnings

**Multiplos arquivos de modais:**
- Adicionar `DialogDescription` com classe `sr-only` nos DialogContent que estao gerando warnings

---

## Resumo de Impacto

| Problema | Tipo | Impacto | Queries Economizadas |
|----------|------|---------|---------------------|
| Dashboard 3x frota | Performance | Alto | -2 queries/load |
| FrotaDashboard getStatusViatura | Performance | Critico | -N queries por viatura |
| CadastroMateriais cautelas redundantes | Performance | Alto | -2 queries/operacao |
| Console.logs em producao | Performance | Medio | N/A |
| Dados mock em catch | Qualidade | Medio | N/A |
| window.location.href | UX | Menor | N/A |
| BaixaMaterial sequencial | Performance | Medio | N/A |
| DialogDescription faltando | Acessibilidade | Menor | N/A |

