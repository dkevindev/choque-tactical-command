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
    const escalaServicoInterno = (data.escalaServicoInterno || [])
        .filter(funcao => funcao.policiais && funcao.policiais.length > 0)
        .map(funcao => {
            const policiais = funcao.policiais.map(p => {
                let linha = `${p.posto}`;
                
                if (p.matricula) {
                    linha += ` ${p.matricula}`;
                }
                
                linha += ` ${p.nomeGuerra}`;
                
                if (p.horario && p.horario.trim()) {
                    linha += `. (${p.horario})`;
                } else {
                    linha += '.';
                }
                
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
        
        // Seção 01
        escalaServicoInterno: escalaServicoInterno,
        
        // Seção 02
        escalaServicoExterno: data.escalaServicoExterno || 'Conforme escala anexa.',
        
        // Seção 03
        escalaPermanencia: (data.escalaPermanencia || []).map(p => ({
            posto: p.posto,
            numeral: p.numeral,
            nomeGuerra: p.nomeGuerra,
            funcao: p.funcao,
            horario: p.horario || '',
            observacao: p.observacao || ''
        })),
        
        // Seção 04
        escalaRonda: (data.escalaRonda || []).map(p => ({
            posto: p.posto,
            numeral: p.numeral,
            nomeGuerra: p.nomeGuerra,
            funcao: p.funcao,
            horario: p.horario || '',
            observacao: p.observacao || ''
        })),
        
        // Seção 05
        controleKm: (data.controleKm || []).map(v => ({
            placa: v.placa,
            kmAtual: v.kmAtual || '-',
            kmAnterior: v.kmAnterior || '-',
            kmRodada: v.kmRodada !== null && v.kmRodada !== undefined ? v.kmRodada : '-',
            valorAbastecimento: v.valorAbastecimento || '',
            litros: v.litros || '',
            motoristaNome: v.motorista ? `${v.motorista.posto} ${v.motorista.numeral} ${v.motorista.nomeGuerra}` : ''
        })),
        
        // Seção 06
        viaturasForaEscala: (data.viaturasForaEscala || []).map(v => ({
            viatura: v.viatura,
            motorista: v.motorista ? {
                posto: v.motorista.posto,
                numeral: v.motorista.numeral,
                nomeGuerra: v.motorista.nomeGuerra
            } : {},
            horarioSaida: v.horarioSaida || '',
            horarioChegada: v.horarioChegada || '',
            destino: v.destino || ''
        })),
        
        // Seção 07
        consumoServicos: (data.consumoServicos || []).map(c => ({
            nomeServico: c.nomeServico,
            leituraFinal: c.leituraFinal,
            leituraInicial: c.leituraInicial,
            consumo: c.consumo
        })),
        
        // Seção 08
        alimentacaoSolipedes: (data.alimentacaoSolipedes || []).map(a => ({
            tipoAlimentacao: a.tipoAlimentacao,
            entrada: a.entrada || '-',
            saida: a.saida || '-',
            saldoAnterior: a.saldoAnterior || 0,
            consumo: a.consumo || 0,
            saldoAtual: a.saldoAtual || 0
        })),
        
        // Seção 09
        documentosAnexo: data.documentosAnexo || '',
        
        // Seção 10
        cavalhada: data.cavalhada || '',
        
        // Seção 11
        substituicoesSolipede: (data.substituicoesSolipede || []).map(s => ({
            horario: s.horario,
            local: s.local,
            solipedeSubstituido: s.solipedeSubstituido,
            solipedeSubstituto: s.solipedeSubstituto
        })),
        
        // Seção 12
        permutasServico: (data.permutasServico || []).map(p => ({
            horario: p.horario,
            local: p.local,
            pmSubstituido: p.pmSubstituido ? {
                posto: p.pmSubstituido.posto,
                numeral: p.pmSubstituido.numeral,
                nomeGuerra: p.pmSubstituido.nomeGuerra
            } : {},
            pmSubstituto: p.pmSubstituto ? {
                posto: p.pmSubstituto.posto,
                numeral: p.pmSubstituto.numeral,
                nomeGuerra: p.pmSubstituto.nomeGuerra
            } : {},
            autorizadoPor: p.autorizadoPor ? {
                posto: p.autorizadoPor.posto,
                numeral: p.autorizadoPor.numeral,
                nomeGuerra: p.autorizadoPor.nomeGuerra
            } : {}
        })),
        
        // Seção 13
        remanejamentosServico: (data.remanejamentosServico || []).map(r => ({
            policial: r.policial ? {
                posto: r.policial.posto,
                numeral: r.policial.numeral,
                nomeGuerra: r.policial.nomeGuerra
            } : {},
            horarioAnterior: r.horarioAnterior,
            servicoAnterior: r.servicoAnterior,
            horarioAtual: r.horarioAtual,
            servicoAtual: r.servicoAtual
        })),
        
        // Seção 14
        atividadesOperacionais: (data.atividadesOperacionais || []).map(a => ({
            ordem: a.ordem,
            localHorario: a.localHorario,
            tipoOcorrencia: a.tipoOcorrencia,
            quantidade: a.quantidade
        })),
        
        // Seção 15
        ocorrencias: (data.ocorrencias || []).map(o => ({
            numero: o.numero,
            descricao: o.descricao
        })),
        
        // Seção 16
        passagemServico: data.passagemServico && data.passagemServico.oficialSubstituto ? {
            texto: data.passagemServico.texto,
            dataPassagem: data.passagemServico.dataPassagem,
            oficialSubstituto: {
                posto: data.passagemServico.oficialSubstituto.posto,
                nome: data.passagemServico.oficialSubstituto.nome || data.passagemServico.oficialSubstituto.nomeGuerra
            }
        } : {},
        
        // Assinatura
        assinatura: data.assinatura && data.assinatura.policial ? {
            nome: data.assinatura.policial.NOME || data.assinatura.policial['NOME DE GUERRA1'],
            posto: data.assinatura.policial['Post/Grad'],
            matricula: data.assinatura.policial.Matrícula || data.assinatura.policial.matricula,
            funcao: data.assinatura.funcao
        } : {}
    };
}

module.exports = { gerarLivroGuardaDocx: functions.https.onRequest(appLivroGuarda) };
