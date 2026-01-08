const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Usar o pacote cors com configuração permissiva
app.use(cors({ origin: true }));

// Também adicionar headers manualmente para garantir
app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Max-Age', '3600');
    
    // Responder imediatamente às requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    next();
});

app.use(express.json());

app.post('/', async (req, res) => {
    let tempFilePath;
    try {
        const data = req.body;
        console.log('Recebendo dados para gerar Livro da Reserva de Armamento:', JSON.stringify(data, null, 2));

        // Validação básica
        if (!data.armeiroNome || !data.dataAbertura) {
            return res.status(400).send('Dados incompletos: armeiroNome e dataAbertura são obrigatórios.');
        }

        // --- 1. Baixar o modelo DOCX do Firebase Storage ---
        const bucket = admin.storage().bucket();
        const templatePath = 'templates/template-livro-reserva-armamento.docx';
        tempFilePath = path.join('/tmp', `template-livro-reserva-${Date.now()}.docx`);
        
        await bucket.file(templatePath).download({ destination: tempFilePath });
        console.log('Template baixado para:', tempFilePath);

        // --- 2. Carregar o modelo e criar o Docxtemplater ---
        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { 
            paragraphLoop: true, 
            linebreaks: true 
        });

        // --- 3. Preparar dados para o template ---
        const dataAbertura = new Date(data.dataAbertura);
        const dataFechamento = data.dataFechamento ? new Date(data.dataFechamento) : null;
        
        const meses = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        const formatarDataHora = (date) => {
            if (!date) return '';
            const d = new Date(date);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const ano = d.getFullYear();
            const hora = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const seg = String(d.getSeconds()).padStart(2, '0');
            return `${dia}/${mes}/${ano} às ${hora}:${min}:${seg}`;
        };

        const formatarAssinatura = (data, hora) => {
            if (!data || !hora) return '';
            const d = new Date(data);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const ano = d.getFullYear();
            return `Assinado digitalmente com senha pessoal e intransferível às ${hora} do dia ${dia}/${mes}/${ano}`;
        };

        // Formatar movimentações
        const movimentacoes = (data.movimentacoes || []).map((mov, index) => {
            const materiaisTexto = (mov.materiais || []).map(mat => {
                let texto = `${mat.nome} (Qtd: ${mat.quantidade || 1})`;
                if (mat.numeroMatricula) texto += ` - Mat: ${mat.numeroMatricula}`;
                if (mat.numeroSerie) texto += ` Série: ${mat.numeroSerie}`;
                return texto;
            }).join('\n');

            const statusTexto = mov.status === 'entregue' ? 'ENTREGUE' : 'PENDENTE';
            
            return {
                sequencial: String(mov.sequencial || index + 1).padStart(3, '0'),
                policial: `${mov.postoGrad || ''} ${mov.policialNomeGuerra || mov.policialNome}`.trim(),
                materiaisTexto: materiaisTexto,
                status: statusTexto,
                assinaturaSaida: formatarAssinatura(mov.dataCautela, mov.horaCautela),
                assinaturaEntrada: mov.status === 'entregue' ? formatarAssinatura(mov.dataBaixa, mov.horaBaixa) : ''
            };
        });

        // Formatar alterações
        let alteracoesTexto = 'Sem alterações registradas.';
        if (data.alteracoes && data.alteracoes.length > 0) {
            alteracoesTexto = data.alteracoes.map(alt => {
                const dataAlt = new Date(alt.dataHora);
                const dia = String(dataAlt.getDate()).padStart(2, '0');
                const mes = String(dataAlt.getMonth() + 1).padStart(2, '0');
                const ano = dataAlt.getFullYear();
                const hora = String(dataAlt.getHours()).padStart(2, '0');
                const min = String(dataAlt.getMinutes()).padStart(2, '0');
                return `${alt.descricao} (${dia}/${mes}/${ano} às ${hora}:${min})`;
            }).join('\n');
        }

        const templateData = {
            dia: String(dataAbertura.getDate()).padStart(2, '0'),
            mes: meses[dataAbertura.getMonth()],
            ano: dataAbertura.getFullYear(),
            armeiro: data.armeiroNome || '',
            dataAberturaFormatada: formatarDataHora(dataAbertura),
            dataFechamentoFormatada: dataFechamento ? formatarDataHora(dataFechamento) : 'Livro ainda aberto',
            movimentacoes: movimentacoes,
            alteracoesTexto: alteracoesTexto,
            armeiroResponsavel: data.armeiroResponsavel || data.armeiroNome || ''
        };

        console.log('Dados para o template:', JSON.stringify(templateData, null, 2));

        // --- 4. Preencher o modelo com os dados ---
        doc.render(templateData);

        // --- 5. Gerar o DOCX preenchido ---
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // --- 6. Enviar o arquivo de volta para o cliente ---
        const dataArquivo = dataAbertura.toLocaleDateString('pt-BR').replace(/\//g, '-');
        const nomeArquivo = `Livro-Reserva-Armamento-${dataArquivo}.docx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);
        console.log('Documento gerado com sucesso:', nomeArquivo);

    } catch (error) {
        console.error('Erro ao gerar Livro da Reserva de Armamento:', error);
        if (error.properties) {
            const e = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                properties: error.properties,
            };
            console.error('Erro detalhado do Docxtemplater:', JSON.stringify(e, null, 2));
            return res.status(500).send(`Erro ao preencher o template: ${error.message}. Verifique os placeholders.`);
        }
        res.status(500).send(`Erro interno ao gerar o documento: ${error.message}`);
    } finally {
        try { 
            if (tempFilePath) fs.unlinkSync(tempFilePath); 
        } catch (err) { 
            console.warn('Não foi possível excluir o arquivo temporário:', err); 
        }
    }
});

const gerarLivroReservaArmamentoDocx = functions.https.onRequest(app);

module.exports = { gerarLivroReservaArmamentoDocx };
