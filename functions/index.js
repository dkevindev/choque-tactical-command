const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

admin.initializeApp();

// ----------------- FUNÇÃO ORDEM DE SERVIÇO -----------------
const appOS = express();
appOS.use(cors({ origin: true }));
appOS.use(express.json());

appOS.post('/', async (req, res) => {
    let tempFilePath; // Declarado com 'let' fora do try

    try {
        const osData = req.body; // Os dados da Ordem de Serviço enviados do frontend

        // Validação básica dos dados recebidos
        if (!osData || !osData.cadastroViatura || !osData.numeroOS || !osData.dataOS) {
            console.error('Dados da OS incompletos:', osData);
            return res.status(400).send('Dados da Ordem de Serviço incompletos.');
        }

        // --- 1. Baixar o modelo DOCX do Firebase Storage ---
        const bucket = admin.storage().bucket();
        const filePath = 'templates/template-os.docx'; // Caminho exato no seu Storage

        tempFilePath = path.join('/tmp', `modelo-${osData.numeroOS || 'temp'}.docx`);

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
        const dataOS = new Date(osData.dataOS + 'T00:00:00');
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        const dataFormatada = dataOS.toLocaleDateString('pt-BR', options);

        const templateData = {
            numeroOficina: osData.numeroOficina || '',
            data: dataFormatada,
            numeroOS: osData.numeroOS || '',
            cadastro: osData.cadastroViatura || '',
            modelo: osData.modeloViatura || '',
            placa: osData.placaViatura || 'N/D',
            oficina: osData.oficinaResponsavel || '',
            observacao: osData.defeitoRelatado || osData.observacao || '',
            valorOS: osData.valorOS || 'R$ 0,00',
            tipo: osData.tipoFrota || 'FROTA PESADA',
            cota: osData.tipoFrota === 'leve' ? osData.cotaMensal || '' : 'FROTA PESADA',
            saldo: osData.tipoFrota === 'leve' ? osData.saldoDisponivel || '' : 'FROTA PESADA',
            policial: osData.assinatura?.policial?.NOME || '',
            'NOME DE GUERRA1': osData.assinatura?.policial?.['Post/Grad'] || '',
            funcao: osData.assinatura?.funcao || '',
            Matrícula: osData.assinatura?.policial?.Matrícula || '',
        };

        console.log('Dados para o template:', templateData);

        // --- 4. Preencher o modelo com os dados ---
        doc.render(templateData);

        // --- 5. Gerar o DOCX preenchido ---
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // --- 6. Enviar o arquivo de volta para o cliente ---
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        const nomeArquivo = `${osData.numeroOficina || '000'} - COLOG - ${osData.placaViatura || 'SEM-PLACA'} - OS ${osData.numeroOS || 'sem-numero'}`.replace(/[^\w\s\-]/gi, '');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.docx"`);
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

exports.gerarOrdemServicoDocx = functions.https.onRequest(appOS);

// ----------------- FUNÇÃO CAUTELA -----------------
const appCautela = express();
appCautela.use(cors({ origin: true }));
appCautela.use(express.json());

appCautela.post('/', async (req, res) => {
    console.log('Endpoint / gerando cautela acessado!');
    console.log('Corpo recebido:', JSON.stringify(req.body, null, 2));
    console.log('Número da cautela recebido:', req.body.numeroCautela);
    let tempFilePath;
    try {
        const data = req.body;

        // Validação da estrutura de dados recebida
        if (!data.policial || !data.policial.nome || !data.policial.matricula) {
            return res.status(400).send('Dados do policial incompletos.');
        }

        if (!data.materiais || !Array.isArray(data.materiais) || data.materiais.length === 0) {
            return res.status(400).send('Nenhum material informado para a cautela.');
        }

        const bucket = admin.storage().bucket();
        const templatePath = 'templates/template-cautela.docx';
        tempFilePath = path.join('/tmp', `template-cautela-${Date.now()}.docx`);
        await bucket.file(templatePath).download({ destination: tempFilePath });
        console.log('Template baixado para:', tempFilePath);

        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Primeiro, identificar o calibre da arma principal
        let calibreArma = '';
        const armaPrincipal = data.materiais.find(m => m.categoria === 'Armamento');
        if (armaPrincipal && armaPrincipal.calibre) {
            calibreArma = armaPrincipal.calibre;
        }

        // Separar materiais em dois arrays: Armamento e Coletes
        const materiaisArmamento = data.materiais
            .filter(m => 
                m.categoria === 'Armamento' || 
                m.subcategoria === 'Munição' || 
                m.subcategoria === 'Carregador' ||
                m.nome?.includes('Munição') ||
                m.nome?.includes('Munições') ||
                m.nome?.includes('Carregador')
            )
            .map(material => {
                let descricao = '';
                let calibre = material.calibre || material.calibreMunicao || '';
                let modelo = material.modelo || '';
                let marca = material.fabricante || '';
                let numeroSerie = material.numeroSerie || '';
                let quantidade = material.quantidade || 1;
                
                // Para Armamento - apenas o tipo (Pistola, Fuzil, etc)
                if (material.categoria === 'Armamento') {
                    descricao = material.nome || 'Pistola';
                    // Remove qualquer texto após " - " para pegar só o tipo
                    if (descricao.includes(' - ')) {
                        descricao = descricao.split(' - ')[0];
                    }
                }
                // Para Munições - apenas "Munição"
                else if (material.subcategoria === 'Munição' || material.nome?.includes('Munição') || material.nome?.includes('Munições')) {
                    descricao = 'Munição';
                    quantidade = material.quantidadeMunicoes || material.quantidade || 1;
                    // Herdar calibre da arma se não tiver calibre próprio
                    if (!calibre && calibreArma) {
                        calibre = calibreArma;
                    }
                }
                // Para Carregadores - apenas "Carregador"
                else if (material.subcategoria === 'Carregador' || material.nome?.includes('Carregador')) {
                    descricao = 'Carregador';
                    quantidade = material.quantidadeCarregadores || material.quantidade || 1;
                    // Herdar calibre da arma se não tiver calibre próprio
                    if (!calibre && calibreArma) {
                        calibre = calibreArma;
                    }
                    // Limpar modelo se for igual ao da arma (evitar redundância)
                    if (armaPrincipal && modelo === armaPrincipal.modelo) {
                        modelo = '';
                    }
                }
                
                return {
                    descricao: descricao,
                    marca: marca,
                    modelo: modelo,
                    calibre: calibre,
                    numeroSerie: numeroSerie,
                    quantidade: quantidade
                };
            });

        // Array separado para Coletes e EPI
        const materiaisColetes = data.materiais
            .filter(m => 
                m.categoria === 'Colete Balístico' || 
                m.categoria === 'Equipamento de Proteção Individual' ||
                m.nome?.includes('Colete')
            )
            .map(material => {
                return {
                    descricao: material.nome || 'Colete Balístico',
                    marca: material.fabricante || '',
                    numeroSerie: material.numeroSerie || '',
                    tamanho: material.tamanhoColete || '',
                    genero: material.sexo || '',
                    quantidade: material.quantidade || 1
                };
            });
        
        const templateData = {
            ncautela: data.numeroCautela || '',
            grad: data.policial.grad || '',
            numeral: data.policial.numeral || '',
            nome: data.policial.nome || '',
            policial: data.policial.nome || '',
            matricula: data.policial.matricula || '',
            dataAtual: new Date().toLocaleDateString('pt-BR'),
            materiaisArmamento: materiaisArmamento,
            materiaisColetes: materiaisColetes
        };

        console.log('Dados para o template:', JSON.stringify(templateData, null, 2));
        console.log('ncautela final:', templateData.ncautela);

        doc.render(templateData);
        const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        const nomeArquivo = `Cautela-${data.policial.nome.replace(/\s+/g, '_')}-${Date.now()}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Erro ao gerar o documento de cautela:', error);
        if (error.properties) {
            const e = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                properties: error.properties,
            };
            console.error('Erro detalhado do Docxtemplater:', JSON.stringify(e, null, 2));
            return res.status(500).send(`Erro ao preencher o template: ${error.message}. Verifique os placeholders no template.`);
        }
        res.status(500).send(`Erro interno ao gerar o documento de cautela: ${error.message}`);
    } finally {
        try { if (tempFilePath) fs.unlinkSync(tempFilePath); } 
        catch (err) { console.warn('Não foi possível excluir o arquivo temporário:', err); }
    }
});

exports.gerarCautelaDocx = functions.https.onRequest(appCautela);

// ----------------- FUNÇÃO BAIXA DE CAUTELA -----------------
const appBaixaCautela = express();
appBaixaCautela.use(cors({ origin: true }));
appBaixaCautela.use(express.json());

appBaixaCautela.post('/', async (req, res) => {
    let tempFilePath;
    try {
        const data = req.body;

        if (!data.policial || !data.numeroOficio || !data.transferidoPara || !data.publicacao) {
            return res.status(400).send('Dados incompletos para baixa de cautela.');
        }

        const bucket = admin.storage().bucket();
        const templatePath = 'templates/template-baixa-cautela.docx';
        tempFilePath = path.join('/tmp', `template-baixa-cautela-${Date.now()}.docx`);
        await bucket.file(templatePath).download({ destination: tempFilePath });

        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const pistola = `${data.pistola.fabricante} ${data.pistola.modelo} ${data.pistola.calibre}`.trim();

        const templateData = {
            grad: data.policial.grad || '',
            nomedopolicial: data.policial.nome || '',
            matricula: data.policial.matricula || '',
            dataatual: data.dataAtual || new Date().toLocaleDateString('pt-BR'),
            numerooficio: data.numeroOficio || '',
            transferidopara: data.transferidoPara || '',
            publicacao: data.publicacao || '',
            pistola: pistola,
            nserie: data.numeroSerie || '',
            ncautela: data.numeroCautela || ''
        };

        doc.render(templateData);
        const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        const nomeArquivo = `Baixa-Cautela-${data.policial.nome.replace(/\s+/g, '_')}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Erro ao gerar baixa de cautela:', error);
        res.status(500).send('Erro ao gerar documento de baixa de cautela.');
    } finally {
        try { if (tempFilePath) fs.unlinkSync(tempFilePath); } 
        catch (err) { console.warn('Não foi possível excluir o arquivo temporário:', err); }
    }
});

exports.gerarBaixaCautelaDocx = functions.https.onRequest(appBaixaCautela);

// ----------------- FUNÇÃO TRANSFERÊNCIA DE CAUTELA -----------------
const appTransferenciaCautela = express();
appTransferenciaCautela.use(cors({ origin: true }));
appTransferenciaCautela.use(express.json());

appTransferenciaCautela.post('/', async (req, res) => {
    let tempFilePath;
    try {
        const data = req.body;

        if (!data.policial || !data.numeroOficio || !data.transferidoPara || !data.publicacao) {
            return res.status(400).send('Dados incompletos para transferência de cautela.');
        }

        const bucket = admin.storage().bucket();
        const templatePath = 'templates/template-transferencia-cautela.docx';
        tempFilePath = path.join('/tmp', `template-transferencia-cautela-${Date.now()}.docx`);
        await bucket.file(templatePath).download({ destination: tempFilePath });

        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const pistola = `${data.pistola.fabricante} ${data.pistola.modelo} ${data.pistola.calibre}`.trim();

        const templateData = {
            grad: data.policial.grad || '',
            nomedopolicial: data.policial.nome || '',
            matricula: data.policial.matricula || '',
            dataatual: data.dataAtual || new Date().toLocaleDateString('pt-BR'),
            numerooficio: data.numeroOficio || '',
            transferidopara: data.transferidoPara || '',
            publicacao: data.publicacao || '',
            pistola: pistola,
            nserie: data.numeroSerie || '',
            ncautela: data.numeroCautela || ''
        };

        doc.render(templateData);
        const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        const nomeArquivo = `Transferencia-Cautela-${data.policial.nome.replace(/\s+/g, '_')}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Erro ao gerar transferência de cautela:', error);
        res.status(500).send('Erro ao gerar documento de transferência de cautela.');
    } finally {
        try { if (tempFilePath) fs.unlinkSync(tempFilePath); } 
        catch (err) { console.warn('Não foi possível excluir o arquivo temporário:', err); }
    }
});

exports.gerarTransferenciaCautelaDocx = functions.https.onRequest(appTransferenciaCautela);

// ----------------- FUNÇÃO TERMO DE ENTREGA -----------------
const appTermoEntrega = express();
appTermoEntrega.use(cors({ origin: true }));
appTermoEntrega.use(express.json());

appTermoEntrega.post('/', async (req, res) => {
    let tempFilePath;
    try {
        const data = req.body;

        if (!data.policial || !data.numeroTermo || !data.transferidoPara || !data.publicacao) {
            return res.status(400).send('Dados incompletos para termo de entrega.');
        }

        const bucket = admin.storage().bucket();
        const templatePath = 'templates/template-termo-entrega.docx';
        tempFilePath = path.join('/tmp', `template-termo-entrega-${Date.now()}.docx`);
        await bucket.file(templatePath).download({ destination: tempFilePath });

        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const templateData = {
            grad: data.policial.grad || '',
            nomedopolicial: data.policial.nome || '',
            matricula: data.policial.matricula || '',
            dataatual: data.dataAtual || new Date().toLocaleDateString('pt-BR'),
            numerotermo: data.numeroTermo || '',
            transferidopara: data.transferidoPara || '',
            publicacao: data.publicacao || '',
            materiais: data.materiais || [],
            itensadicionais: data.itensAdicionais || []
        };

        doc.render(templateData);
        const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        const nomeArquivo = `Termo-Entrega-${data.policial.nome.replace(/\s+/g, '_')}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Erro ao gerar termo de entrega:', error);
        res.status(500).send('Erro ao gerar termo de entrega.');
    } finally {
        try { if (tempFilePath) fs.unlinkSync(tempFilePath); } 
        catch (err) { console.warn('Não foi possível excluir o arquivo temporário:', err); }
    }
});

exports.gerarTermoEntregaDocx = functions.https.onRequest(appTermoEntrega);