const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const appListaFrequencia = express();
appListaFrequencia.use(cors({ origin: true }));
appListaFrequencia.use(express.json());

appListaFrequencia.post('/', async (req, res) => {
    let tempFilePath;

    try {
        const data = req.body;

        // Validação
        if (!data.instrutores || !Array.isArray(data.instrutores) || data.instrutores.length === 0) {
            return res.status(400).send('Instrutores não informados.');
        }

        if (!data.dataAula || !data.turno) {
            return res.status(400).send('Data e turno são obrigatórios.');
        }

        // Baixar template
        const bucket = admin.storage().bucket();
        const filePath = 'templates/template-lista-frequencia.docx';
        tempFilePath = path.join('/tmp', `lista-freq-${Date.now()}.docx`);
        
        await bucket.file(filePath).download({ destination: tempFilePath });
        console.log('Template baixado para:', tempFilePath);

        // Carregar template
        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Preparar dados dos instrutores
        const instrutor1 = data.instrutores[0] || {};
        const instrutor2 = data.instrutores[1] || {};

        // Preparar lista de alunos
        const alunos = (data.alunos || []).map((aluno, index) => ({
            numero: index + 1,
            nome: aluno.nomeCompleto || aluno.nome || '',
            assinatura: ''
        }));

        const templateData = {
            instrutor1_posto: instrutor1.postGrad || instrutor1['Post/Grad'] || '',
            instrutor1_nome: instrutor1.nomeGuerra || instrutor1['NOME DE GUERRA'] || '',
            instrutor2_posto: instrutor2.postGrad || instrutor2['Post/Grad'] || '',
            instrutor2_nome: instrutor2.nomeGuerra || instrutor2['NOME DE GUERRA'] || '',
            data: data.dataAula,
            horario: data.turno,
            total_aulas: '3',
            conteudo: data.conteudo || '',
            alunos: alunos
        };

        console.log('Dados para o template:', JSON.stringify(templateData, null, 2));

        // Renderizar
        doc.render(templateData);

        // Gerar buffer
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // Enviar
        const nomeArquivo = `Lista_Frequencia_${data.dataAula.replace(/\//g, '-')}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Erro ao gerar lista de frequência:', error);
        if (error.properties) {
            console.error('Erro detalhado:', JSON.stringify(error.properties, null, 2));
            return res.status(500).send(`Erro ao preencher template: ${error.message}`);
        }
        res.status(500).send('Erro ao gerar documento.');
    } finally {
        try {
            if (tempFilePath) fs.unlinkSync(tempFilePath);
        } catch (e) {
            console.warn('Não foi possível excluir arquivo temporário:', e);
        }
    }
});

module.exports = { gerarListaFrequenciaDocx: functions.https.onRequest(appListaFrequencia) };