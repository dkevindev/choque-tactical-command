

# Formatar datas de yyyy-MM-dd para dd/MM/yy

## Problema
Em varias tabelas do sistema, datas armazenadas no formato `2026-02-19` estao sendo exibidas sem formatacao. O usuario quer que todas aparecam como `19/02/26`.

## Locais a corrigir

### 1. `src/components/gestao-pessoas/EstatisticasTab.tsx`
- **Linha 200**: `p.inicioSituacao || '-'` (lista expandida de policiais)
- **Linha 201**: `p.fimSituacao || '-'` (lista expandida de policiais)
- **Linha 349**: `p.inicioSituacao || '-'` (tabela de indisponibilidades)
- **Linha 350**: `p.fimSituacao || '-'` (tabela de indisponibilidades)
- Criar funcao auxiliar `formatDateBR` que converte `yyyy-MM-dd` para `dd/MM/yy` usando `format(parseISO(d), 'dd/MM/yy')`

### 2. `src/components/gestao-pessoas/GestaoFeriasTab.tsx`
- **Linha 348**: `new Date(policial.inicioFerias).toLocaleDateString()` -- trocar para formato `dd/MM/yy`

### 3. `src/components/gestao-pessoas/SituacaoTab.tsx`
- Verificar se exibe `inicioSituacao`/`fimSituacao` em alguma tabela sem formatacao

## Implementacao

Adicionar uma funcao utilitaria simples em cada arquivo (ou reutilizar existente):

```typescript
const formatDateBR = (d: string | undefined) => {
  if (!d) return '-';
  try { return format(parseISO(d), 'dd/MM/yy'); } catch { return d; }
};
```

Substituir todas as exibicoes diretas de datas `inicioSituacao`, `fimSituacao`, `inicioFerias`, `fimFerias` por chamadas a `formatDateBR()`.

## Arquivos modificados
- `src/components/gestao-pessoas/EstatisticasTab.tsx` (4 pontos)
- `src/components/gestao-pessoas/GestaoFeriasTab.tsx` (1 ponto)
- `src/components/gestao-pessoas/SituacaoTab.tsx` (verificar e corrigir se necessario)
