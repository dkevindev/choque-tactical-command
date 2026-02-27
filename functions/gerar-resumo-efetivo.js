const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Mapeamento de unidades Firebase -> Documento
const UNIDADE_MAP = {
    'SEDE': 'RPMONT - SEDE',
    '1º ESQD': '1o Esquadrão/RPMONT',
    '2º ESQD': '2o Esquadrão/RPMONT',
    '3º PEL': '3o Pelotão/2oESQD/RPMONT (Crato)',
    'BSP': 'BSP'
};

// Ordem das unidades no documento
const ORDEM_UNIDADES = ['SEDE', '1º ESQD', '2º ESQD', '3º PEL', 'BSP'];

// Situações operacionais (NÃO contam como indisponível)
const SITUACOES_OPERACIONAIS = [
    'MONTADO - POLICIAMENTO OSTENSIVO',
    'VIATURA'
];

const MESES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

app.post('/', async (req, res) => {
    let tempFilePath;
    try {
        const { mes, ano } = req.body;
        const mesAtual = mes !== undefined ? mes : new Date().getMonth();
        const anoAtual = ano || new Date().getFullYear();

        console.log(`Gerando Resumo de Efetivo para ${MESES[mesAtual]}/${anoAtual}`);

        // 1. Buscar todos os policiais
        const policiaisSnap = await admin.firestore().collection('policiais').get();
        const policiais = policiaisSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        console.log(`Total de policiais encontrados: ${policiais.length}`);

        // 2. Agrupar por unidade
        const porUnidade = {};
        ORDEM_UNIDADES.forEach(u => {
            porUnidade[u] = { todos: [], indisponiveis: [], operacionais: [] };
        });
        // Grupo para unidades não mapeadas
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

        // 3. Montar dados das unidades para a tabela
        let totalGeral = 0;
        let totalIndisponivel = 0;
        let totalOperacional = 0;

        const unidades = ORDEM_UNIDADES.map(key => {
            const g = porUnidade[key];
            const total = g.todos.length;
            const indisp = g.indisponiveis.length;
            const oper = g.operacionais.length;
            totalGeral += total;
            totalIndisponivel += indisp;
            totalOperacional += oper;
            return {
                nome: UNIDADE_MAP[key] || key,
                total: total,
                indisponivel: indisp,
                operacional: oper
            };
        });

        // 4. Montar descrição de indisponibilidades por unidade
        const indisponibilidades = [];
        ORDEM_UNIDADES.forEach(key => {
            const g = porUnidade[key];
            if (g.indisponiveis.length === 0) return;

            // Agrupar por tipo de situação
            const porSituacao = {};
            g.indisponiveis.forEach(p => {
                const sit = p['SITUAÇÃO'] || p.SITUAÇÃO || 'NÃO INFORMADO';
                if (!porSituacao[sit]) porSituacao[sit] = [];
                porSituacao[sit].push(p);
            });

            const situacoes = Object.entries(porSituacao).map(([situacao, pols]) => {
                const nomes = pols.map(p => {
                    const pg = p['Post/Grad'] || '';
                    const mat = p['Matrícula'] || p.Matricula || '';
                    const nome = p.NOME || p['NOME DE GUERRA'] || '';
                    return `${pg} Mat. ${mat} ${nome}`;
                }).join('; ');
                return {
                    situacao: situacao,
                    quantidade: pols.length,
                    nomes: nomes
                };
            });

            indisponibilidades.push({
                unidade: UNIDADE_MAP[key] || key,
                totalIndisponivel: g.indisponiveis.length,
                situacoes: situacoes
            });
        });

        // 5. Observação de férias por unidade
        const ferias = [];
        ORDEM_UNIDADES.forEach(key => {
            const g = porUnidade[key];
            const deFerias = g.indisponiveis.filter(p => {
                const sit = (p['SITUAÇÃO'] || p.SITUAÇÃO || '').toUpperCase();
                return sit.includes('FÉRIAS') || sit.includes('FERIAS');
            });
            if (deFerias.length > 0) {
                ferias.push({
                    unidade: UNIDADE_MAP[key] || key,
                    quantidade: deFerias.length
                });
            }
        });

        // 6. Baixar template e gerar DOCX
        const bucket = admin.storage().bucket();
        const templatePath = 'templates/template-resumo-efetivo.docx';
        tempFilePath = path.join('/tmp', `template-resumo-efetivo-${Date.now()}.docx`);
        await bucket.file(templatePath).download({ destination: tempFilePath });

        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const mesAno = `${MESES[mesAtual]} - ${anoAtual}`;
        const dataHoje = new Date();
        const dataDocumento = `${String(dataHoje.getDate()).padStart(2, '0')}/${String(dataHoje.getMonth() + 1).padStart(2, '0')}/${dataHoje.getFullYear()}`;

        const templateData = {
            mesAno,
            dataDocumento,
            unidades,
            totalGeral,
            totalIndisponivel,
            totalOperacional,
            indisponibilidades,
            ferias,
            temFerias: ferias.length > 0
        };

        console.log('Template data:', JSON.stringify(templateData, null, 2));

        doc.render(templateData);
        const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        const nomeArquivo = `RESUMO_DE_EFETIVO_${MESES[mesAtual]}_${anoAtual}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Erro ao gerar resumo de efetivo:', error);
        if (error.properties) {
            console.error('Erro Docxtemplater:', JSON.stringify({
                message: error.message,
                properties: error.properties
            }, null, 2));
            return res.status(500).send(`Erro ao preencher template: ${error.message}`);
        }
        res.status(500).send(`Erro interno: ${error.message}`);
    } finally {
        try { if (tempFilePath) fs.unlinkSync(tempFilePath); }
        catch (err) { console.warn('Erro ao excluir temp:', err); }
    }
});

exports.gerarResumoEfetivoDocx = functions.https.onRequest(app);
