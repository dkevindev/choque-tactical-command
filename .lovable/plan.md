## Nova aba "Análise" em Controle Bélico

Adicionar uma aba **Análise** dentro do Controle Bélico (Gestão e Logística → Bélico), focada em armamentos, com agrupamentos, totais por unidade (Sede/Crato), por modelo, por calibre e exportação rápida em PDF.

### Onde aparece
- `AdminDashboard.tsx` → `BelicoContent` → adiciona `TabsTrigger "analise"` (8 colunas) + `TabsContent` que renderiza o novo componente `AnaliseArmamentos`.
- Novo arquivo: `src/components/admin-belico/AnaliseArmamentos.tsx`.

### Fonte de dados
- Coleção `materiais` do Firestore (mesma que `CadastroMateriais` usa).
- Filtra `categoria === 'Armamento'` e ignora `baixado` ou `transferido` (regra Core já adotada no projeto).
- Campos usados: `nome`, `modelo`, `calibre`, `tipoArma` (Curta/Longa), `fabricante`, `numeroSerie`, `local` (Fortaleza/Crato), `policialAssociadoId`.

### Layout da aba

1. **Filtros no topo**
   - Tipo: Todos / Curtas / Longas (default Longas, já que é o caso de uso principal).
   - Unidade: Todas / Fortaleza (Sede) / Crato.
   - Busca por modelo / nº série.
   - Botão **Exportar PDF** (jsPDF + autotable, padrão do projeto) e **Exportar CSV** (UTF-8 BOM).

2. **Cards de totais** (grid responsivo)
   - Total geral (com filtro aplicado).
   - Total Sede (Fortaleza).
   - Total Crato.
   - Cauteladas vs Na Reserva.

3. **Agrupamento por Modelo** (principal)
   - Tabela: Modelo | Calibre | Fabricante | Tipo | Sede | Crato | Total | Cauteladas | Reserva.
   - Cada linha expansível mostrando os números de série pertencentes àquele modelo, separados por unidade.
   - Ex.: ARAD aparece como uma linha com totais; expandindo, lista os nº de série em Sede e em Crato.

4. **Agrupamento por Calibre**
   - Tabela compacta: Calibre | Sede | Crato | Total.

5. **Agrupamento por Tipo** (Curta x Longa) por unidade
   - Mini tabela: Tipo | Sede | Crato | Total.

### Exportação PDF
- Usa `jspdf` + `jspdf-autotable` (já presentes no projeto).
- Conteúdo do PDF respeita o filtro ativo:
  - Cabeçalho "RPMONT - Análise de Armamentos" + filtros aplicados + data.
  - Tabela 1: Resumo por Modelo (com Sede/Crato/Total/Cauteladas/Reserva).
  - Tabela 2: Resumo por Calibre.
  - Tabela 3: Resumo por Tipo.
  - Tabela 4 (opcional, ligada por checkbox "Incluir nº de série"): listagem detalhada agrupada por modelo e unidade.
- Orientação Landscape, nome `analise_armamentos_AAAA-MM-DD.pdf`.

### Detalhes técnicos
- Componente client-side puro, faz `getDocs(collection(db,'materiais'))` em `useEffect`.
- Cálculos memorizados (`useMemo`) por filtro.
- Cautelados: usa `policialAssociadoId` truthy (cautelas permanentes). Provisórias podem ser ignoradas neste recorte (foco é "carga" da unidade), mantendo a regra usada em `ArmamentosSection.tsx` apenas para cautelas permanentes — confirmar se quer incluir provisórias depois.
- Componentes shadcn já existentes: `Card`, `Tabs` interna não necessária, `Table`, `Badge`, `Select`, `Input`, `Button`, `Collapsible` para expandir nº de série.

### Arquivos alterados/criados
- **Criar** `src/components/admin-belico/AnaliseArmamentos.tsx`.
- **Editar** `src/components/AdminDashboard.tsx` (importar e adicionar aba "Análise" no `BelicoContent`, mudar grid para `grid-cols-8`).

### Fora de escopo
- Não altera schema de materiais.
- Não toca em coletes/munição (só armamento), conforme pedido.
