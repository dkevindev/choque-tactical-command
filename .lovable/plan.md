
# Corrigir Nome nos Documentos e Ordenacao do SUBCMT

## Duas correcoes necessarias

### 1. Documentos DOCX: usar `Post/Grad` + `NOME` (nome completo)

Atualmente os 4 arquivos de geracao de documentos usam `dadosAtuais?.nomeGuerra` que retorna o nome de guerra (ex: "K RIBEIRO"). O correto para documentos oficiais e usar `dadosAtuais?.nome` que corresponde ao campo `NOME` do Firebase (ex: "KEVIN RIBEIRO DOS SANTOS").

O campo `postGrad` ja corresponde a `Post/Grad` do Firebase, entao esta correto.

**Arquivos afetados** (trocar `nomeGuerra` por `nome` apenas no payload do documento):

- `src/components/admin-belico/GerenciarCautelas.tsx` (linha 155): `dadosAtuais?.nomeGuerra` -> `dadosAtuais?.nome`
- `src/components/admin-belico/documentos/GerarNadaConstaForm.tsx` (linha 73): idem
- `src/components/admin-belico/documentos/GerarTermoEntregaForm.tsx` (linha 236): idem
- `src/components/admin-belico/documentos/GerarTransferenciaCautelaForm.tsx` (linha 88): idem

Nas telas/UI continua usando `nomeGuerra` normalmente.

### 2. Ordenacao: SUBCMT e desempate de mesmo posto, nao sobrepoe graduacao

No `src/lib/policialUtils.ts`, a verificacao do SUBCMT (etapa 2, linhas 65-68) esta ANTES da comparacao de posto (etapa 3, linhas 71-72). Isso faz um MAJ SUBCMT aparecer antes de um TEN CEL, o que esta errado.

**Correcao**: mover a verificacao do SUBCMT para DEPOIS da comparacao de posto, tornando-a o primeiro criterio de desempate quando os postos sao iguais.

Nova ordem:
1. CMT RPMONT sempre primeiro
2. Comparar posto/graduacao
3. Mesmo posto: SUBCMT primeiro (desempate)
4. Mesmo posto e oficial: QOPM antes de QOAPM
5. Data ultima promocao
6. Numeral

**Arquivo**: `src/lib/policialUtils.ts` -- reordenar blocos dentro de `sortByHierarquia`
