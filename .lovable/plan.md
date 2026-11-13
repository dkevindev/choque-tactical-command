# Baixar lista de coletes vencidos (PDF, Excel e Word)

## O que muda
Na janela **Coletes Balísticos Vencidos** dos alertas em Gestão e Logística, entram três botões no topo: **PDF**, **Excel** e **Word**.

Cada arquivo traz uma tabela com uma linha por colete vencido. As colunas são:
- **Nº**
- **QRA**: posto/graduação e nome de guerra
- **Nome do policial**: nome completo
- **CPF**
- **Colete**: número de série, fabricante/modelo, tamanho, masculino/feminino e data de vencimento
- **Tempo vencido**: por exemplo, "há 3 meses"

Coletes que não estão com ninguém aparecem com "SEM CAUTELA" no lugar do policial. A lista sai em ordem de vencimento, do mais antigo ao mais recente. O título leva a data de emissão no formato dd/MM/yy.

## Detalhes técnicos
- Novo arquivo `src/lib/exportColetesVencidos.ts` com `exportarPDF`, `exportarExcel` e `exportarWord`.
- Os dados do policial (nome, guerra, posto, CPF) vêm da coleção `policiais`, cruzando por `policialAssociadoId` ou pela matrícula, para ficarem sempre atualizados.
- PDF: jsPDF + autotable em paisagem (já instalados).
- Word: biblioteca `docx` (já instalada), tabela em paisagem.
- Excel: instalar `exceljs` para gerar `.xlsx` de verdade, com cabeçalho em negrito e colunas ajustadas.
- Botões adicionados ao modal de coletes vencidos em `AdminDashboard.tsx`.
