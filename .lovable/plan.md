## Submenu "Pneus" em Frota

Nova aba em **Gestão e Logística → Frota** chamada **"Pneus"**, exibindo uma tabela consolidada com a última troca de pneus registrada de cada viatura, com base nos processos finalizados em `frota/{viaturaId}/processos_pneus`.

### Localização
- Arquivo novo: `src/components/frota/PneusPage.tsx`
- Editar: `src/components/frota/FrotaPage.tsx` — adicionar `TabsTrigger` "Pneus" (ícone `Disc` do lucide), alterar grid para `grid-cols-7`.

### Ordenação das linhas
1. **VTRs Operacionais** primeiro, depois **ADMs**
   - Operacional = `operacional === true` (ou `UTILIZACAO` indicando uso operacional, conforme já usado em outras telas — confirmar pelo campo `operacional`)
2. Dentro de cada grupo, ordenar por **PREFIXO** (numeral) **crescente** (menor → maior)
3. Linhas separadoras visuais entre os dois grupos

### Colunas da tabela
| Coluna | Origem |
|---|---|
| Prefixo | `viatura.PREFIXO` |
| Placa | `viatura.PLACA` |
| Modelo | `viatura.MODELO` |
| Tipo | Operacional / ADM (badge) |
| Última troca | `dataConclusao` do último processo finalizado (`dd/MM/yy`) |
| KM na troca | `kmAtual` do mesmo processo |
| Referência | `referenciaPneus` |
| Origem | OS nº `numeroOS` (se OFICINA, com link para `anexoOS_url` se houver) ou "COLOG" (se origem COLOG) |
| Qtd pneus | `quantidadePneus` |

Viaturas sem nenhum processo finalizado aparecem com "—" nos campos de troca (para visibilidade do que falta registrar).

### Lógica de carregamento
1. Buscar todas as viaturas via `buscarTodasViaturas()` (cache existente em `viaturaUtils.ts`).
2. Para cada viatura, buscar `collection(db, 'frota', viaturaId, 'processos_pneus')` filtrando `status === 'finalizado'`, ordenar por `dataConclusao desc`, pegar o primeiro.
   - Executar em paralelo com `Promise.all`.
3. Montar linhas, separar em operacionais/adms, sortear por `PREFIXO` numérico.

### Filtros / extras (leves, não alteram o escopo)
- Busca por prefixo/placa/modelo (input).
- Contador no topo: total de VTRs, com troca registrada, sem registro.
- Botão **"Ver processo"** abre dialog com detalhes do último processo (reaproveita visual do `ProcessosPneusSection`).

### Fora de escopo
- Não altera o fluxo de cadastro/aprovação de processos.
- Não exporta PDF/CSV nesta entrega (pode ser adicionado depois se pedido).
- Sem alterações em Firestore/schema.
