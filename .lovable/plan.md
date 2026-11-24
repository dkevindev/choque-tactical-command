# Q5 por unidade + Unidade selecionável no cadastro

## O que muda para você
1. **Cadastro do policial (Efetivo):** o campo "Unidade (RPMONT)" deixa de ser digitável e vira uma lista com: **RPMONT, 1ESQ, 2ESQ, 3PEL/2ESQ**.
2. **Aba Q5 com abas de unidade:** no topo, abas **Q5 TOTAL | RPMONT | 1ESQ | 2ESQ | 3PEL/2ESQ | 2ESQ + 3PEL**.
   - TOTAL: todos os policiais, de qualquer unidade (como hoje).
   - Cada unidade: só os policiais daquela unidade.
   - 2ESQ + 3PEL: soma de 2ESQ e 3PEL/2ESQ.
   - Grade, painel de detalhes e exportação Excel/PDF seguem a aba escolhida (título do arquivo com o nome da unidade).
3. **Inconsistências:**
   - Policiais EM ATIVIDADE deixam de aparecer como inconsistência (não compõem categoria e isso é normal).
   - Policial com unidade vazia ou diferente das 4 opções aparece como inconsistência "Unidade não reconhecida", com uma lista ali mesmo para escolher a unidade certa e botão **Corrigir** que grava no cadastro na hora.

## Detalhes técnicos
- Constante `UNIDADES = ['RPMONT','1ESQ','2ESQ','3PEL/2ESQ']` e `normalizarUnidade()` em `src/lib/q5.ts` (aceita variações como "1º ESQ", "3 PEL", "3PEL 2ESQ").
- Leitura da unidade com os mesmos fallbacks de hoje (`UNIDADE"RPMONT"`, `UNIDADE`, `Unidade`, `unidade`); gravação em `UNIDADE"RPMONT"` com `setDoc merge`.
- `EfetivoTab.tsx`: Input → Select; valor antigo fora da lista aparece vazio até escolher.
- `calcularQ5`: excluir EM ATIVIDADE (e MONTADO legado) da regra "situação não ligada"; nova inconsistência de unidade; filtro por unidade aplicado antes do cálculo em `Q5Tab.tsx`. A inconsistência de unidade aparece em todas as abas.
