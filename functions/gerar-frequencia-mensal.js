const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const appFrequenciaMensal = express();
appFrequenciaMensal.use(cors({ origin: true }));
appFrequenciaMensal.use(express.json());

appFrequenciaMensal.post('/', async (req, res) => {
    let tempFilePath;

    try {
        const data = req.body;

        // Validação
        if (!data.turma || !data.turno || !data.mes) {
            return res.status(400).send('Turma, turno e mês são obrigatórios.');
        }

        // Escolher template baseado em usaFrequencia
        const bucket = admin.storage().bucket();
        const usaFrequencia = data.usaFrequencia !== false;
        const filePath = usaFrequencia 
            ? 'templates/template-frequencia-mensal.docx'
            : 'templates/template-frequencia-mensal-sem-alunos.docx';
        tempFilePath = path.join('/tmp', `freq-mensal-${Date.now()}.docx`);
        
        console.log('Usando template:', filePath, '| usaFrequencia:', usaFrequencia);
        
        await bucket.file(filePath).download({ destination: tempFilePath });
        console.log('Template baixado para:', tempFilePath);

        // Carregar template
        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Preparar dados dos instrutores (garantir que todos tenham p1-p10)
        const instrutores = (data.instrutores || []).map(inst => ({
            nome: inst.nome || '',
            p1: inst.p1 || '',
            p2: inst.p2 || '',
            p3: inst.p3 || '',
            p4: inst.p4 || '',
            p5: inst.p5 || '',
            p6: inst.p6 || '',
            p7: inst.p7 || '',
            p8: inst.p8 || '',
            p9: inst.p9 || '',
            p10: inst.p10 || ''
        }));

        // Preparar dados dos alunos (garantir que todos tenham p1-p10)
        const alunos = (data.alunos || []).map(aluno => ({
            nome: aluno.nome || '',
            p1: aluno.p1 || '',
            p2: aluno.p2 || '',
            p3: aluno.p3 || '',
            p4: aluno.p4 || '',
            p5: aluno.p5 || '',
            p6: aluno.p6 || '',
            p7: aluno.p7 || '',
            p8: aluno.p8 || '',
            p9: aluno.p9 || '',
            p10: aluno.p10 || ''
        }));

        const templateData = {
            mes: data.mes || '',
            turma: data.turma || '',
            turno: data.turno || '',
            conteudo: data.conteudo || '',
            projeto: data.projeto || 'PROJETO CÉLERIS',
            // Datas das colunas (até 10)
            data1: data.data1 || '',
            data2: data.data2 || '',
            data3: data.data3 || '',
            data4: data.data4 || '',
            data5: data.data5 || '',
            data6: data.data6 || '',
            data7: data.data7 || '',
            data8: data.data8 || '',
            data9: data.data9 || '',
            data10: data.data10 || '',
            // Arrays
            instrutores: instrutores,
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
        const nomeArquivo = `Frequencia_${data.turma}_${data.turno}_${data.mes}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Erro ao gerar frequência mensal:', error);
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

module.exports = { gerarFrequenciaMensalDocx: functions.https.onRequest(appFrequenciaMensal) };
