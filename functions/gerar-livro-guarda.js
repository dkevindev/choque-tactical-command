const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const appLivroGuarda = express();
appLivroGuarda.use(cors({ origin: true }));
appLivroGuarda.use(express.json());

appLivroGuarda.post('/', async (req, res) => {
    let tempFilePath;

    try {
        const data = req.body;

        // Validação básica dos dados recebidos
        if (!data || !data.data || !data.escalaServicoInterno) {
            console.error('Dados incompletos:', data);
            return res.status(400).send('Dados do Livro da Guarda incompletos.');
        }

        // --- 1. Baixar o modelo DOCX do Firebase Storage ---
        const bucket = admin.storage().bucket();
        const filePath = 'templates/template-livro-guarda.docx';

        tempFilePath = path.join('/tmp', `modelo-livro-guarda-${Date.now()}.docx`);

        await bucket.file(filePath).download({ destination: tempFilePath });
        console.log('Modelo DOCX baixado para:', tempFilePath);

        // --- 2. Carregar o modelo e criar o Docxtemplater ---
        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // --- 3. Preparar os dados para o Docxtemplater ---
        const templateData = prepararDadosParaTemplate(data);

        console.log('Dados para o template:', JSON.stringify(templateData, null, 2));

        // --- 4. Preencher o modelo com os dados ---
        doc.render(templateData);

        // --- 5. Gerar o DOCX preenchido ---
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // --- 6. Enviar o arquivo de volta para o cliente ---
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        const [ano, mes, dia] = data.data.split('-');
        const nomeArquivo = `Livro_Guarda_${dia}_${mes}_${ano}.docx`;
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Erro ao gerar o documento DOCX:', error);
        if (error.properties) {
            const e = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                properties: error.properties,
            };
            console.error(JSON.stringify({ error: e }));
            return res.status(500).send(`Erro ao preencher o template: ${error.message}. Verifique os placeholders.`);
        }
        return res.status(500).send('Erro interno do servidor ao gerar o documento.');
    } finally {
        try {
            if (tempFilePath) {
                fs.unlinkSync(tempFilePath);
                console.log('Arquivo temporário excluído:', tempFilePath);
            }
        } catch (e) {
            console.warn('Não foi possível excluir o arquivo temporário:', e);
        }
    }
});

function prepararDadosParaTemplate(data) {
    // Formatar datas
    const [ano, mes, dia] = data.data.split('-');
    const dataInicio = new Date(ano, mes - 1, dia);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 1);

    const mesesNome = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const getMesNome = (mes) => mesesNome[parseInt(mes) - 1];

    // Formatar escala de serviço interno
    const escalaServicoInterno = data.escalaServicoInterno
        .filter(funcao => funcao.policiais && funcao.policiais.length > 0)
        .map(funcao => {
            const policiais = funcao.policiais.map(p => {
                let linha = `${p.posto}`;
                
                // Adicionar matrícula se existir
                if (p.matricula) {
                    linha += ` ${p.matricula}`;
                }
                
                // Adicionar nome de guerra
                linha += ` ${p.nomeGuerra}`;
                
                // Adicionar horário se existir
                if (p.horario && p.horario.trim()) {
                    linha += `. (${p.horario})`;
                } else {
                    linha += '.';
                }
                
                // Adicionar observação se existir
                if (p.observacao && p.observacao.trim()) {
                    linha += ` ${p.observacao}`;
                }

                return {
                    linha: linha,
                    temHorario: !!(p.horario && p.horario.trim())
                };
            });

            return {
                nome: funcao.nome,
                policiais: policiais
            };
        });

    return {
        dataInicio: `${dia} DE ${getMesNome(mes)} DE ${ano}`,
        dataFim: `${String(dataFim.getDate()).padStart(2, '0')} DE ${getMesNome(String(dataFim.getMonth() + 1))} DE ${dataFim.getFullYear()}`,
        ano: ano,
        mes: getMesNome(mes),
        dia: dia,
        escalaServicoInterno: escalaServicoInterno,
        // TODO: Adicionar demais seções quando forem implementadas
        escalaServicoExterno: data.escalaServicoExterno || 'Conforme escala anexa.',
        // ... outras seções ...
    };
}

module.exports = { gerarLivroGuardaDocx: functions.https.onRequest(appLivroGuarda) };
