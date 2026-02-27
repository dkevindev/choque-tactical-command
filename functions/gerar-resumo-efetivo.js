const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel, PageOrientation } = require('docx');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Mapeamento de unidades Firebase -> Documento
const UNIDADE_MAP = {
    'SEDE': 'RPMONT – SEDE',
    '1º ESQD': '1º Esquadrão/RPMONT',
    '2º ESQD': '2º Esquadrão/RPMONT',
    '3º PEL': '3º Pel./2º ESQD/RPMONT (Crato)',
    'BSP': 'BSP'
};

const ORDEM_UNIDADES = ['SEDE', '1º ESQD', '2º ESQD', '3º PEL', 'BSP'];

const SITUACOES_OPERACIONAIS = [
    'MONTADO - POLICIAMENTO OSTENSIVO',
    'VIATURA'
];

const MESES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

// Helper: criar célula de tabela
function criarCelula(texto, opts = {}) {
    const { bold = false, size = 20, alignment = AlignmentType.CENTER, width, shading, colSpan } = opts;
    const cellOpts = {
        children: [
            new Paragraph({
                alignment,
                children: [new TextRun({ text: texto, bold, size, font: 'Arial' })]
            })
        ],
        verticalAlign: 'center',
    };
    if (width) cellOpts.width = width;
    if (shading) cellOpts.shading = shading;
    if (colSpan) cellOpts.columnSpan = colSpan;
    return new TableCell(cellOpts);
}

// Helper: criar linha de cabeçalho da tabela de efetivo
function criarCabecalhoTabela() {
    const headerShading = { fill: 'D9E2F3', type: 'clear' };
    return new TableRow({
        children: [
            criarCelula('UNIDADE', { bold: true, shading: headerShading, width: { size: 5000, type: WidthType.DXA } }),
            criarCelula('TOTAL', { bold: true, shading: headerShading, width: { size: 1500, type: WidthType.DXA } }),
            criarCelula('INDISPONÍVEL', { bold: true, shading: headerShading, width: { size: 2000, type: WidthType.DXA } }),
            criarCelula('OPERACIONAL', { bold: true, shading: headerShading, width: { size: 2000, type: WidthType.DXA } }),
        ]
    });
}

// Helper: criar linha de dados
function criarLinhaUnidade(nome, total, indisponivel, operacional, bold = false) {
    return new TableRow({
        children: [
            criarCelula(nome, { bold, alignment: AlignmentType.LEFT, width: { size: 5000, type: WidthType.DXA } }),
            criarCelula(String(total), { bold, width: { size: 1500, type: WidthType.DXA } }),
            criarCelula(String(indisponivel), { bold, width: { size: 2000, type: WidthType.DXA } }),
            criarCelula(String(operacional), { bold, width: { size: 2000, type: WidthType.DXA } }),
        ]
    });
}

app.post('/', async (req, res) => {
    try {
        const { mes, ano } = req.body;
        const mesAtual = mes !== undefined ? mes : new Date().getMonth();
        const anoAtual = ano || new Date().getFullYear();

        console.log(`Gerando Resumo de Efetivo para ${MESES[mesAtual]}/${anoAtual}`);

        // 1. Buscar todos os policiais
        const policiaisSnap = await admin.firestore().collection('policiais').get();
        const policiais = policiaisSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Agrupar por unidade
        const porUnidade = {};
        ORDEM_UNIDADES.forEach(u => {
            porUnidade[u] = { todos: [], indisponiveis: [], operacionais: [] };
        });
        porUnidade['OUTROS'] = { todos: [], indisponiveis: [], operacionais: [] };

        policiais.forEach(p => {
            const unidade = p.Unidade || 'OUTROS';
            const grupo = porUnidade[unidade] || porUnidade['OUTROS'];
            grupo.todos.push(p);

            const situacao = p['SITUAÇÃO'] || p.SITUAÇÃO || '';
            if (!situacao || SITUACOES_OPERACIONAIS.includes(situacao)) {
                grupo.operacionais.push(p);
            } else {
                grupo.indisponiveis.push(p);
            }
        });

        // 3. Calcular totais
        let totalGeral = 0, totalIndisponivel = 0, totalOperacional = 0;
        const dadosUnidades = ORDEM_UNIDADES.map(key => {
            const g = porUnidade[key];
            totalGeral += g.todos.length;
            totalIndisponivel += g.indisponiveis.length;
            totalOperacional += g.operacionais.length;
            return { key, nome: UNIDADE_MAP[key], total: g.todos.length, indisp: g.indisponiveis.length, oper: g.operacionais.length };
        });

        // 4. Construir seções do documento
        const sections = [];

        // --- TÍTULO ---
        sections.push(
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
                new TextRun({ text: 'COMANDO DE POLICIAMENTO DE CHOQUE', bold: true, size: 22, font: 'Arial' })
            ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
                new TextRun({ text: 'REGIMENTO DE POLÍCIA MONTADA DO CEARÁ', bold: true, size: 22, font: 'Arial' })
            ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
                new TextRun({ text: 'CEL MOURA BRASIL', bold: true, size: 20, font: 'Arial' })
            ]}),
            new Paragraph({ spacing: { after: 200 }, children: [] }),
        );

        // --- TABELA PRINCIPAL: RESUMO DE EFETIVO ---
        sections.push(
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 }, children: [
                new TextRun({ text: 'RESUMO DE EFETIVO POR UNIDADE', bold: true, size: 24, font: 'Arial', underline: {} })
            ]})
        );

        // Tabela principal com todas as unidades
        const tabelaPrincipalRows = [criarCabecalhoTabela()];
        dadosUnidades.forEach(u => {
            tabelaPrincipalRows.push(criarLinhaUnidade(u.nome, u.total, u.indisp, u.oper));
        });
        // Linha de total
        tabelaPrincipalRows.push(criarLinhaUnidade('EFETIVO TOTAL RPMONT', totalGeral, totalIndisponivel, totalOperacional, true));

        sections.push(new Table({
            rows: tabelaPrincipalRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
        }));

        sections.push(new Paragraph({ spacing: { after: 300 }, children: [] }));

        // --- DESCRIÇÃO INDISPONIBILIDADE ---
        sections.push(
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 200 }, children: [
                new TextRun({ text: 'DESCRIÇÃO INDISPONIBILIDADE POR UNIDADE', bold: true, size: 24, font: 'Arial', underline: {} })
            ]})
        );

        // Tabela de indisponibilidades
        const indispRows = [];
        const indispHeaderShading = { fill: 'D9E2F3', type: 'clear' };
        indispRows.push(new TableRow({
            children: [
                criarCelula('SITUAÇÃO', { bold: true, shading: indispHeaderShading, width: { size: 3500, type: WidthType.DXA } }),
                criarCelula('QTD', { bold: true, shading: indispHeaderShading, width: { size: 1000, type: WidthType.DXA } }),
                criarCelula('POLICIAIS', { bold: true, shading: indispHeaderShading, width: { size: 6000, type: WidthType.DXA } }),
            ]
        }));

        ORDEM_UNIDADES.forEach(key => {
            const g = porUnidade[key];
            if (g.indisponiveis.length === 0) return;

            // Linha de cabeçalho da unidade
            const unidadeShading = { fill: 'E2EFDA', type: 'clear' };
            const totalIndisp = g.indisponiveis.filter(p => {
                const sit = (p['SITUAÇÃO'] || p.SITUAÇÃO || '').toUpperCase();
                return !sit.includes('FÉRIAS') && !sit.includes('FERIAS');
            }).length;

            indispRows.push(new TableRow({
                children: [
                    criarCelula(`${UNIDADE_MAP[key]} - TOTAL: ${g.indisponiveis.length}`, { bold: true, shading: unidadeShading, colSpan: 3, alignment: AlignmentType.LEFT }),
                ]
            }));

            // Agrupar por situação
            const porSituacao = {};
            g.indisponiveis.forEach(p => {
                const sit = p['SITUAÇÃO'] || p.SITUAÇÃO || 'NÃO INFORMADO';
                if (!porSituacao[sit]) porSituacao[sit] = [];
                porSituacao[sit].push(p);
            });

            Object.entries(porSituacao).forEach(([situacao, pols]) => {
                // Filtrar férias (vão para observação)
                const sitUpper = situacao.toUpperCase();
                if (sitUpper.includes('FÉRIAS') || sitUpper.includes('FERIAS')) return;

                const nomes = pols.map(p => {
                    const pg = p['Post/Grad'] || '';
                    const mat = p['Matrícula'] || p.Matricula || '';
                    const nome = p.NOME || p['NOME DE GUERRA'] || '';
                    return `${pg} ${mat} ${nome}`.trim();
                }).join(', ');

                indispRows.push(new TableRow({
                    children: [
                        criarCelula(situacao, { alignment: AlignmentType.LEFT, width: { size: 3500, type: WidthType.DXA } }),
                        criarCelula(String(pols.length), { width: { size: 1000, type: WidthType.DXA } }),
                        criarCelula(nomes, { alignment: AlignmentType.LEFT, size: 18, width: { size: 6000, type: WidthType.DXA } }),
                    ]
                }));
            });
        });

        if (indispRows.length > 1) {
            sections.push(new Table({
                rows: indispRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
            }));
        }

        // --- OBSERVAÇÃO DE FÉRIAS ---
        sections.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

        const feriasPorUnidade = [];
        ORDEM_UNIDADES.forEach(key => {
            const g = porUnidade[key];
            const deFerias = g.indisponiveis.filter(p => {
                const sit = (p['SITUAÇÃO'] || p.SITUAÇÃO || '').toUpperCase();
                return sit.includes('FÉRIAS') || sit.includes('FERIAS');
            });
            if (deFerias.length > 0) {
                feriasPorUnidade.push({ unidade: UNIDADE_MAP[key], quantidade: deFerias.length });
            }
        });

        if (feriasPorUnidade.length > 0) {
            sections.push(
                new Paragraph({ spacing: { before: 200, after: 100 }, children: [
                    new TextRun({ text: 'Obs. ', bold: true, size: 20, font: 'Arial' }),
                    new TextRun({ text: 'Encontram-se em gozo de férias:', size: 20, font: 'Arial' })
                ]})
            );

            feriasPorUnidade.forEach(f => {
                sections.push(new Paragraph({ spacing: { after: 50 }, children: [
                    new TextRun({ text: `${String(f.quantidade).padStart(2, '0')} PPMM do ${f.unidade}`, size: 20, font: 'Arial' })
                ]}));
            });
        }

        // --- RODAPÉ ---
        const dataHoje = new Date();
        const dia = String(dataHoje.getDate()).padStart(2, '0');
        const mesNome = MESES[mesAtual].charAt(0) + MESES[mesAtual].slice(1).toLowerCase();
        const anoDoc = anoAtual;

        sections.push(
            new Paragraph({ spacing: { before: 400 }, children: [] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 200 }, children: [
                new TextRun({ text: `Quartel do RPMONT, ${dia} de ${mesNome} de ${anoDoc}.`, size: 20, font: 'Arial' })
            ]}),
        );

        // 5. Gerar documento
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
                    }
                },
                children: sections
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        const nomeArquivo = `RESUMO_DE_EFETIVO_${MESES[mesAtual]}_${anoAtual}_${dia}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${anoAtual}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);

        console.log('Resumo de efetivo gerado com sucesso:', nomeArquivo);

    } catch (error) {
        console.error('Erro ao gerar resumo de efetivo:', error);
        res.status(500).send(`Erro interno: ${error.message}`);
    }
});

exports.gerarResumoEfetivoDocx = functions.https.onRequest(app);
