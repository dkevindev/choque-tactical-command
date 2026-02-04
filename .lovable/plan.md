
# Plano de Correção: 3 Problemas Identificados

## Resumo dos Problemas

| # | Problema | Localização | Solução |
|---|----------|-------------|---------|
| 1 | "Material Pendente de Devolução (Turno Anterior)" abre expandido | `PendenciasAnterioresSection.tsx` | Alterar estado inicial `minimizado` para `true` |
| 2 | Erro ao transferir material pelo menu "Livro do Dia" | `ModalTransferenciaMaterial.tsx` e `ArmeiroInterface.tsx` | Limpar valores `undefined` antes de salvar no Firebase |
| 3 | Cota do Mês não aparece em Gestão e Logística > OS | `AdminDashboard.tsx` | Trocar import para o componente correto com a UI de cota |

---

## 1. Material Pendente de Devolução - Iniciar Oculto

### Diagnóstico
No arquivo `PendenciasAnterioresSection.tsx` (linha 51), o estado `minimizado` é inicializado como `false`, fazendo com que o card abra expandido por padrão.

### Correção
```typescript
// Linha 51 - ANTES
const [minimizado, setMinimizado] = useState(false);

// DEPOIS
const [minimizado, setMinimizado] = useState(true);
```

---

## 2. Erro na Transferência via Menu "Livro do Dia"

### Diagnóstico
Ao comparar as duas implementações de transferência:

**BaixaMaterialSection (funciona):**
- Usa `policialSelecionado` que é carregado diretamente do Firebase com todos os campos
- O objeto Policial está completo

**ArmeiroInterface → LivroCautelaDia (dá erro):**
- O `policialOrigem` é construído manualmente nas linhas 1549-1557
- Os campos `NOME DE GUERRA` e `NOME DE GUERRA1` podem ser `undefined`
- Na linha 375 do `ModalTransferenciaMaterial.tsx`:
```typescript
policialNomeGuerra: policialOrigem['NOME DE GUERRA1'] || policialOrigem['NOME DE GUERRA'],
// Se ambos forem undefined, salva undefined no Firebase → ERRO!
```

### Correção em 2 lugares:

**ArmeiroInterface.tsx (linha 1549-1557):**
- Adicionar campos `senha` e `SITUAÇÃO` que podem estar faltando
- Garantir que campos undefined não sejam passados

**ModalTransferenciaMaterial.tsx (linha 372-377):**
- Proteger o campo `policialNomeGuerra` contra undefined usando spread condicional

```typescript
// ANTES
transferidoDe: {
  policialId: policialOrigem.id,
  policialNome: policialOrigem.NOME,
  policialNomeGuerra: policialOrigem['NOME DE GUERRA1'] || policialOrigem['NOME DE GUERRA'],
  cautelaId: cautela.id
}

// DEPOIS
transferidoDe: {
  policialId: policialOrigem.id,
  policialNome: policialOrigem.NOME,
  cautelaId: cautela.id,
  ...((policialOrigem['NOME DE GUERRA1'] || policialOrigem['NOME DE GUERRA']) && {
    policialNomeGuerra: policialOrigem['NOME DE GUERRA1'] || policialOrigem['NOME DE GUERRA']
  })
}
```

---

## 3. Cota do Mês Não Aparece na Tela de OS

### Diagnóstico
O `AdminDashboard.tsx` está importando o componente **errado**:

```typescript
// Linha 25 - IMPORT ATUAL (ERRADO)
import OrdemServicoPage from '@/components/OrdemServicoPage';

// Este é o componente ANTIGO que NÃO tem a UI de Cota do Mês
```

O componente **correto** com a UI de "Cota do Mês" está em:
```
src/components/frota/OrdensServicoPage.tsx
```

### Correção
```typescript
// ANTES (linha 25)
import OrdemServicoPage from '@/components/OrdemServicoPage';

// DEPOIS
import OrdensServicoPage from '@/components/frota/OrdensServicoPage';

// E atualizar o uso (linha 73)
// ANTES
case 'ordens-servico':
  return <OrdemServicoPage />;

// DEPOIS
case 'ordens-servico':
  return <OrdensServicoPage />;
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `PendenciasAnterioresSection.tsx` | Alterar `useState(false)` para `useState(true)` na linha 51 |
| `ModalTransferenciaMaterial.tsx` | Proteger campo `policialNomeGuerra` contra undefined nas linhas 372-377 |
| `ArmeiroInterface.tsx` | Garantir campos completos ao construir `policialOrigem` (linhas 1549-1557) |
| `AdminDashboard.tsx` | Trocar import de `OrdemServicoPage` para `OrdensServicoPage` do diretório `frota` |

---

## Fluxo da Correção

```text
PendenciasAnterioresSection.tsx
           │
           └─ minimizado = true (iniciar oculto)

ModalTransferenciaMaterial.tsx
           │
           └─ transferidoDe.policialNomeGuerra com spread condicional

ArmeiroInterface.tsx
           │
           └─ Construir policialOrigem com campos protegidos

AdminDashboard.tsx
           │
           ├─ import OrdensServicoPage from '@/components/frota/OrdensServicoPage'
           │
           └─ case 'ordens-servico': return <OrdensServicoPage />
```
