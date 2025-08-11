import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import type { BotResponse, Viatura, ViaturaNaOficina, Oficina } from './types';

// Padrões para entrada na oficina
const entradaPatterns = [
  'registrar entrada', 'entrada oficina', 'levar oficina', 'deixar oficina',
  'entrada na oficina', 'colocar oficina', 'mandar oficina'
];

// Padrões para saída da oficina  
const saidaPatterns = [
  'registrar saída', 'saída oficina', 'retirar oficina', 'buscar oficina',
  'saída da oficina', 'pegar oficina', 'finalizar serviço'
];

export async function handleEntradaOficina(input: string): Promise<BotResponse> {
  const inputLower = input.toLowerCase();
  
  // Verifica se é solicitação de entrada
  const isEntrada = entradaPatterns.some(pattern => inputLower.includes(pattern));
  
  if (isEntrada) {
    return {
      type: 'form_entrada_oficina'
    };
  }
  
  return {
    type: 'text',
    text: 'Para registrar entrada na oficina, diga "registrar entrada" ou "levar para oficina".'
  };
}

export async function handleSaidaOficina(input: string): Promise<BotResponse> {
  const inputLower = input.toLowerCase();
  
  // Verifica se é solicitação de saída
  const isSaida = saidaPatterns.some(pattern => inputLower.includes(pattern));
  
  if (isSaida) {
    return {
      type: 'form_saida_oficina'
    };
  }
  
  return {
    type: 'text',
    text: 'Para registrar saída da oficina, diga "registrar saída" ou "retirar da oficina".'
  };
}

export async function processarEntradaOficina(
  cadastro: string,
  dataEntrada: string,
  servicoRealizar: string,
  oficina: string
): Promise<string> {
  try {
    console.log('Processando entrada para cadastro:', cadastro);
    
    // Buscar dados da viatura
    const viaturasSnapshot = await getDocs(collection(db, 'frota'));
    const viatura = viaturasSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Viatura))
      .find(v => {
        // Garantir que CADASTRO é string antes de usar toLowerCase
        const viaturaCadastro = String(v.CADASTRO || '').trim();
        const searchCadastro = String(cadastro || '').trim();
        
        console.log('Comparando:', viaturaCadastro, 'com', searchCadastro);
        
        return viaturaCadastro.toLowerCase() === searchCadastro.toLowerCase();
      });
    
    if (!viatura) {
      console.log('Viatura não encontrada:', cadastro);
      return `Viatura ${cadastro} não encontrada na frota.`;
    }

    console.log('Viatura encontrada:', viatura);

    // Verificar se a viatura já está na oficina
    const oficinaQuery = query(
      collection(db, 'oficina'),
      where('cadastro', '==', String(viatura.CADASTRO)),
      where('status', '==', 'na-oficina')
    );
    const oficinaSnapshot = await getDocs(oficinaQuery);
    
    if (!oficinaSnapshot.empty) {
      return `A viatura ${cadastro} já está registrada na oficina.`;
    }

    // Registrar entrada na oficina
    await addDoc(collection(db, 'oficina'), {
      cadastro: String(viatura.CADASTRO),
      placa: String(viatura.PLACA || ''),
      modelo: String(viatura.MODELO || ''),
      dataEntrada,
      servicoRealizar,
      oficina,
      status: 'na-oficina',
      createdAt: new Date().toISOString()
    });

    return `✅ Entrada registrada com sucesso!\n\nViatura: ${viatura.CADASTRO}\nPlaca: ${viatura.PLACA}\nOficina: ${oficina}\nServiço: ${servicoRealizar}`;
  } catch (error) {
    console.error('Erro ao registrar entrada na oficina:', error);
    return 'Erro ao registrar entrada na oficina. Tente novamente.';
  }
}

export async function processarSaidaOficina(
  cadastro: string,
  dataSaida: string,
  observacaoServico: string
): Promise<string> {
  try {
    // Buscar viatura na oficina
    const oficinaQuery = query(
      collection(db, 'oficina'),
      where('cadastro', '==', cadastro),
      where('status', '==', 'na-oficina')
    );
    const oficinaSnapshot = await getDocs(oficinaQuery);
    
    if (oficinaSnapshot.empty) {
      return `A viatura ${cadastro} não está registrada na oficina ou já teve sua saída processada.`;
    }

    const viaturaDoc = oficinaSnapshot.docs[0];
    
    // Atualizar com dados de saída
    await updateDoc(doc(db, 'oficina', viaturaDoc.id), {
      dataSaida,
      observacaoServico,
      status: 'os-pendente'
    });

    const viatura = viaturaDoc.data() as ViaturaNaOficina;
    
    return `✅ Saída registrada com sucesso!\n\nViatura: ${viatura.cadastro}\nPlaca: ${viatura.placa}\nOficina: ${viatura.oficina}\nServiço realizado: ${observacaoServico}\n\nStatus: Aguardando criação de OS`;
  } catch (error) {
    console.error('Erro ao registrar saída da oficina:', error);
    return 'Erro ao registrar saída da oficina. Tente novamente.';
  }
}

export async function listarViaturasNaOficina(): Promise<string> {
  try {
    const oficinaQuery = query(
      collection(db, 'oficina'),
      where('status', '==', 'na-oficina')
    );
    const oficinaSnapshot = await getDocs(oficinaQuery);
    
    if (oficinaSnapshot.empty) {
      return 'Nenhuma viatura está atualmente na oficina.';
    }

    const viaturas = oficinaSnapshot.docs.map(doc => doc.data() as ViaturaNaOficina);
    
    let texto = '🔧 Viaturas na oficina:\n\n';
    viaturas.forEach((viatura, index) => {
      texto += `${index + 1}. ${viatura.cadastro} - ${viatura.placa}\n`;
      texto += `   Oficina: ${viatura.oficina}\n`;
      texto += `   Entrada: ${new Date(viatura.dataEntrada).toLocaleDateString()}\n`;
      texto += `   Serviço: ${viatura.servicoRealizar}\n\n`;
    });
    
    return texto;
  } catch (error) {
    console.error('Erro ao listar viaturas na oficina:', error);
    return 'Erro ao consultar viaturas na oficina.';
  }
}

export async function listarOficinas(): Promise<Oficina[]> {
  try {
    const snapshot = await getDocs(collection(db, 'oficinas'));
    return snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome } as Oficina));
  } catch (error) {
    console.error('Erro ao buscar oficinas:', error);
    return [];
  }
}

export async function buscarServicosPorTipo(tipoServico: string): Promise<string> {
  // Solicitar autenticação para esta funcionalidade
  return 'Para buscar serviços, é necessário autenticação.\n\n🔐 Por favor, informe sua matrícula e senha de usuário com acesso ao GESTÃO E LOGÍSTICA.';
}

export async function consultarOSPorNumero(numeroOS: string): Promise<string> {
  // Solicitar autenticação para esta funcionalidade
  return 'Para consultar OS, é necessário autenticação.\n\n🔐 Por favor, informe sua matrícula e senha de usuário com acesso ao GESTÃO E LOGÍSTICA.';
}
