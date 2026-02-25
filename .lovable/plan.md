
# Plano: Ordenacao, Boletim Interno e BCG de Homologacao

## 1. Ordenar tabela por data do atestado (mais novos primeiro)

**Arquivo:** `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`

- No `filteredAtestados`, adicionar `.sort()` por `dataInicio` decrescente apos o filtro
- Isso garante que os atestados mais recentes aparecem no topo da tabela

---

## 2. Coluna "Boletim Interno" na tabela de atestados + acao para registrar

**Arquivo:** `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`

- Adicionar campo `boletimInterno` na interface `Atestado`
- Adicionar coluna "BI" na tabela de atestados (entre Status Pericia e Acoes)
- Na coluna Acoes, adicionar botao (icone de documento) para registrar o numero do Boletim Interno
- Ao clicar, abre um Dialog simples pedindo o numero do BI
- Ao confirmar, salva no Firestore via `updateDoc` o campo `boletimInterno`
- Exibir o BI na coluna quando preenchido
- Incluir coluna "Boletim Interno" tambem no export CSV

---

## 3. Coluna "Publicacao BCG" na tabela de Pendentes de Pericia + acao para registrar

**Arquivo:** `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`

- Adicionar campo `bcgHomologacao` na interface `Atestado`
- Na tabela de Pendentes, adicionar coluna "BCG" (entre Pericia e Acoes)
- Nos atestados com status HOMOLOGADO ou AGENDADO, adicionar botao na coluna Acoes para registrar o BCG da homologacao
- Ao clicar, abre Dialog pedindo o numero do BCG
- Ao confirmar, salva via `updateDoc` o campo `bcgHomologacao`
- Exibir o BCG na coluna quando preenchido

---

## 4. Novos estados de dialog

- Novo state `showBIDialog` + `biAtestado` + `boletimInternoInput` para o dialog de BI
- Novo state `showBCGDialog` + `bcgAtestado` + `bcgInput` para o dialog de BCG
- Duas funcoes: `handleSalvarBI` e `handleSalvarBCG` que fazem `updateDoc` no Firestore

---

## Resumo

| Alteracao | Descricao |
|-----------|-----------|
| Ordenacao | `filteredAtestados` ordenado por `dataInicio` desc |
| Coluna BI | Nova coluna + botao + dialog na tabela principal |
| Coluna BCG | Nova coluna + botao + dialog na tabela de pendentes |
| CSV | Incluir BI na exportacao |
