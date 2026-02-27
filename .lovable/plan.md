

# Normalizar "LICENCA" vs "LICENÇA TRATAMENTO DE SAUDE"

## Problema
O sistema tem duas variantes da mesma situacao sendo tratadas como diferentes:
- `LICENÇA TRATAMENTO DE SAUDE` (com cedilha - vem da config_situacoes e do SituacaoTab)
- `LICENCA TRATAMENTO DE SAUDE` (sem cedilha - gravado pela automacao de LTS)

## Solucao

Padronizar para **uma unica forma**: `LICENÇA TRATAMENTO DE SAUDE` (com cedilha, que e o portugues correto). E criar uma funcao auxiliar de normalizacao para que comparacoes nunca falhem por causa de acentuacao.

### 1. Criar funcao utilitaria de normalizacao

Em `src/lib/policialUtils.ts`, adicionar:

```typescript
export const normalizarSituacao = (sit: string): string => {
  return sit.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
};

export const isLTS = (situacao: string | undefined): boolean => {
  if (!situacao) return false;
  const norm = normalizarSituacao(situacao);
  return (norm.includes('LICEN') && norm.includes('TRATAMENTO')) || norm === 'LTS';
};
```

### 2. Corrigir a gravacao para usar a forma com cedilha

Nos arquivos que gravam `SITUAÇÃO: 'LICENCA TRATAMENTO DE SAUDE'`, trocar para `'LICENÇA TRATAMENTO DE SAUDE'`:

- **`src/components/GestãoPessoas.tsx`** (linhas 180, 190) - automacao de entrada em LTS
- **`src/components/gestao-pessoas/AtestadosMedicosTab.tsx`** (linhas 254, 264) - ao cadastrar atestado > 3 dias

### 3. Usar `isLTS()` nas comparacoes

Substituir todas as verificacoes manuais com `includes('LICENÇA')` / `includes('LICENCA')` pela funcao `isLTS()`:

- **`src/components/GestãoPessoas.tsx`** (linhas 176, 204, 313-314)
- **`src/components/gestao-pessoas/EstatisticasTab.tsx`** (linhas 122-125, 130)

### 4. Migrar dados existentes (opcional mas recomendado)

Adicionar na funcao `verificarSituacoesLTS` uma correcao silenciosa: se um policial tem `LICENCA` (sem cedilha), atualizar para `LICENÇA` no Firebase automaticamente.

## Arquivos modificados
- `src/lib/policialUtils.ts` - adicionar `normalizarSituacao` e `isLTS`
- `src/components/GestãoPessoas.tsx` - usar `isLTS()` e gravar com cedilha
- `src/components/gestao-pessoas/AtestadosMedicosTab.tsx` - gravar com cedilha
- `src/components/gestao-pessoas/EstatisticasTab.tsx` - usar `isLTS()` nas filtragens

