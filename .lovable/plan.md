

# Adicionar QOPM/QOAPM e prioridade SUBCMT RPMONT na ordenacao

## Contexto
Oficiais podem ser de dois quadros: **QOPM** (mais antigo) ou **QOAPM** (menos antigo). Alem disso, quem exerce a funcao de **SUBCMT DO RPMONT** deve aparecer antes dos oficiais de mesmo posto. Atualmente o sistema nao diferencia esses quadros nem prioriza o SUBCMT.

## Alteracoes

### 1. Formulario de edicao - checkboxes QOPM/QOAPM (EfetivoTab.tsx)

No `EditPolicialForm`, na secao "Dados Profissionais", adicionar um campo **"Quadro"** que aparece apenas para oficiais (TEN CEL, MAJ, CAP, 1 TEN, 2 TEN). O campo sera um Select com opcoes: "Nenhum", "QOPM", "QOAPM". O valor sera salvo no Firebase no campo `quadro`.

Tambem adicionar o campo `quadro` ao estado inicial do formulario, lendo de `policial.quadro`.

### 2. Logica de ordenacao (policialUtils.ts)

Atualizar `sortByHierarquia` para incluir duas novas regras apos o CMT RPMONT:

```text
Ordem de prioridade:
1. CMT RPMONT sempre primeiro (ja existe)
2. SUBCMT DO RPMONT antes dos demais de mesmo posto
3. Mesmo posto: QOPM antes de QOAPM
4. Mesmo quadro: data de promocao mais antiga primeiro
5. Mesmo tudo: numeral menor primeiro
```

A logica especifica:
- Apos verificar CMT RPMONT, verificar se a funcao inclui "SUBCMT" (para SUBCMT DO RPMONT)
- Apos verificar posto/graduacao, se o posto for de oficial e ambos tiverem o mesmo posto, comparar quadro: QOPM (valor 1) antes de QOAPM (valor 2), sem quadro definido fica no meio

### 3. Exibir quadro na tabela (EfetivoTab.tsx)

Na coluna Post/Grad da tabela, se o policial tiver `quadro` definido, exibir um badge pequeno ao lado: "QOPM" (verde) ou "QOAPM" (amarelo).

## Arquivos modificados

1. **src/lib/policialUtils.ts** -- atualizar `sortByHierarquia` com regras de SUBCMT e QOPM/QOAPM
2. **src/components/gestao-pessoas/EfetivoTab.tsx** -- adicionar campo `quadro` no formulario de edicao + badge na tabela

## Detalhes tecnicos

### sortByHierarquia atualizado
```text
1. CMT RPMONT primeiro
2. SUBCMT RPMONT segundo (novo)
3. Comparar posto/graduacao
4. Se mesmo posto E for oficial: QOPM < QOAPM (novo)
5. Data ultima promocao
6. Numeral
```

### Campo Firebase
- Nome: `quadro`
- Valores: `'QOPM'` | `'QOAPM'` | `undefined`
- Apenas relevante para oficiais (TEN CEL ate 2 TEN)
