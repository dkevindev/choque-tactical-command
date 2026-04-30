# Viaturas operacionais dinâmicas no CAVBot

## Problema identificado

No `CAVBot` (tela "Iniciar serviço"), a separação entre viaturas Operacionais e Administrativas usa uma lista fixa no código:

```ts
// src/components/CAVBot.tsx (linha 134)
const allowedOperacionais = ['05', '06', '08', '11', '12', '13'];
```

Por isso a **CAV15** (e qualquer viatura nova que não contenha esses dígitos no cadastro) nunca aparece na lista "Operacional". A solução é migrar essa marcação para um campo no próprio cadastro da viatura (coleção `frota`), que pode ser alterado livremente.

## Mudanças

### 1. Novo campo `operacional` (boolean) na coleção `frota`

- Tipo: `boolean` — `true` = Operacional, `false`/ausente = Administrativa.
- Não trava nada: pode ser alternado a qualquer momento na edição da viatura.
- Aplica-se apenas à Frota Leve (pesadas continuam como hoje, sem essa distinção).

### 2. Cadastro de viatura — `src/components/frota/ModalCadastroViatura.tsx`

- Adicionar no `formData` o campo `operacional: false`.
- Adicionar um **Switch** "Viatura operacional" na seção de tipo, visível quando `tipo === 'leve'`.
- Enviar `operacional` no `addDoc` para `frota`.
- Pré-preenchimento inteligente (sugestão automática, sem travar): ao digitar o CADASTRO, se os dígitos contiverem `05/06/08/11/12/13`, o switch liga automaticamente — mas o usuário pode desligar/ligar livremente.

### 3. Edição de viatura — `src/components/ModalDetalhesViatura.tsx`

- Incluir `operacional` em `dadosEdicao` (carregar o valor atual da viatura).
- Adicionar o mesmo **Switch** "Viatura operacional" ao lado do select de tipo (linha ~759), visível quando `tipo === 'leve'`.
- Salvar `operacional` no `updateDoc` (linhas ~347 e ~365).
- Exibir badge "Operacional" / "Administrativa" na visualização (perto de "Frota Leve/Pesada", linha ~856).

### 4. CAVBot — `src/components/CAVBot.tsx`

- Remover `allowedOperacionais` e `isOperacionalCadastro` (linhas 134-139).
- Novo helper:

```ts
const isOperacional = (v: ViaturaBasica): boolean => v.operacional === true;
```

- Atualizar os filtros:
  - `loadLevesOperacional` (linha ~387): `leves.filter(isOperacional)`.
  - `loadLevesAdministrativa` (linha ~399): `leves.filter(v => !isOperacional(v))`.

### 5. Tipagem — `src/lib/viaturaUtils.ts` e `src/bot/types.ts`

- Adicionar `operacional?: boolean` em `ViaturaBasica` e em `Viatura`.

## Migração de dados existentes (opcional, sem impacto)

Nenhuma migração é obrigatória: as viaturas legadas com cadastro `05/06/08/11/12/13` podem ser marcadas manualmente como operacionais na tela de edição. Se o usuário preferir um utilitário em lote, é possível adicionar depois um botão "Marcar como operacional" na lista de viaturas, mas não está incluído agora para evitar repetir o problema anterior (atualizações em massa que bagunçam dados).

## Arquivos editados

- `src/components/CAVBot.tsx` — usar `operacional` do banco em vez da lista fixa
- `src/components/frota/ModalCadastroViatura.tsx` — Switch "Operacional" + sugestão automática
- `src/components/ModalDetalhesViatura.tsx` — Switch "Operacional" na edição + badge na visualização
- `src/lib/viaturaUtils.ts` — adicionar `operacional?: boolean` em `ViaturaBasica`
- `src/bot/types.ts` — adicionar `operacional?: boolean` em `Viatura`

## Resultado esperado

- CAV15 (e qualquer nova viatura) aparecerá em **Operacional** assim que for marcada no cadastro/edição.
- A marcação é livre: nenhum automatismo trava a escolha do usuário — o switch pode ser alternado a qualquer momento.
