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
    // Buscar dados da viatura
    const viaturasSnapshot = await getDocs(collection(db, 'frota'));
    const viatura = viaturasSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Viatura))
      .find(v => v.CADASTRO.toLowerCase() === cadastro.toLowerCase());
    
    if (!viatura) {
      return `Viatura ${cadastro} não encontrada na frota.`;
    }

    // Verificar se a viatura já está na oficina
    const oficinaQuery = query(
      collection(db, 'oficina'),
      where('cadastro', '==', viatura.CADASTRO),
      where('status', '==', 'na-oficina')
    );
    const oficinaSnapshot = await getDocs(oficinaQuery);
    
    if (!oficinaSnapshot.empty) {
      return `A viatura ${cadastro} já está registrada na oficina.`;
    }

    // Registrar entrada na oficina
    await addDoc(collection(db, 'oficina'), {
      cadastro: viatura.CADASTRO,
      placa: viatura.PLACA,
      modelo: viatura.MODELO,
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
  try {
    const oficinaSnapshot = await getDocs(collection(db, 'oficina'));
    const servicos: ViaturaNaOficina[] = [];
    
    oficinaSnapshot.forEach((doc) => {
      const data = doc.data() as ViaturaNaOficina;
      const servicoTexto = (data.servicoRealizar || '').toLowerCase();
      const observacaoTexto = (data.observacaoServico || '').toLowerCase();
      const busca = tipoServico.toLowerCase();
      
      if (servicoTexto.includes(busca) || observacaoTexto.includes(busca)) {
        servicos.push({ id: doc.id, ...data });
      }
    });

    if (servicos.length === 0) {
      return `Nenhum serviço encontrado relacionado a "${tipoServico}".`;
    }

    let texto = `🔍 Serviços encontrados para "${tipoServico}":\n\n`;
    servicos.forEach((servico, index) => {
      texto += `${index + 1}. ${servico.cadastro} - ${servico.placa}\n`;
      texto += `   📅 Entrada: ${new Date(servico.dataEntrada).toLocaleDateString()}\n`;
      if (servico.dataSaida) {
        texto += `   📅 Saída: ${new Date(servico.dataSaida).toLocaleDateString()}\n`;
      }
      texto += `   🏭 Oficina: ${servico.oficina}\n`;
      texto += `   🔧 Serviço: ${servico.servicoRealizar}\n`;
      if (servico.observacaoServico) {
        texto += `   ✅ Realizado: ${servico.observacaoServico}\n`;
      }
      texto += `   📊 Status: ${servico.status === 'na-oficina' ? 'Na oficina' : servico.status === 'os-pendente' ? 'OS Pendente' : servico.status}\n\n`;
    });
    
    return texto;
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    return 'Erro ao buscar serviços. Tente novamente.';
  }
}

export async function consultarOSPorNumero(numeroOS: string): Promise<string> {
  try {
    console.log(`Buscando OS: ${numeroOS}`);
    
    // Buscar em todas as coleções possíveis onde podem estar as OS
    const collections = ['ordens-servico', 'ordem-servico', 'os', 'motorizado'];
    let osEncontrada = null;
    
    for (const collectionName of collections) {
      try {
        const osSnapshot = await getDocs(collection(db, collectionName));
        console.log(`Verificando coleção: ${collectionName}, documentos: ${osSnapshot.size}`);
        
        osSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`Documento ${doc.id}:`, data);
          
          // Tentar várias propriedades onde pode estar o número da OS
          const possibleFields = ['numeroOS', 'numero', 'osNumero', 'id', 'number'];
          
          for (const field of possibleFields) {
            if (data[field] && data[field].toString() === numeroOS) {
              osEncontrada = { id: doc.id, ...data, collection: collectionName };
              console.log(`OS encontrada na coleção ${collectionName}:`, osEncontrada);
              return; // Para os loops
            }
          }
          
          // Também verificar se o ID do documento é o número da OS
          if (doc.id === numeroOS) {
            osEncontrada = { id: doc.id, ...data, collection: collectionName };
            console.log(`OS encontrada por ID:`, osEncontrada);
            return;
          }
        });
        
        if (osEncontrada) break;
      } catch (error) {
        console.log(`Coleção ${collectionName} não existe ou erro:`, error);
        continue;
      }
    }

    if (!osEncontrada) {
      return `❌ OS número ${numeroOS} não encontrada.\n\nVerifique se o número está correto e tente novamente.`;
    }

    let texto = `📄 **Ordem de Serviço ${numeroOS}**\n\n`;
    texto += `🆔 ID: ${osEncontrada.id}\n`;
    texto += `📁 Coleção: ${osEncontrada.collection}\n`;
    texto += `🚗 Viatura: ${osEncontrada.cadastro || osEncontrada.viatura || 'N/A'}\n`;
    texto += `📅 Data: ${osEncontrada.data ? new Date(osEncontrada.data).toLocaleDateString() : osEncontrada.createdAt ? new Date(osEncontrada.createdAt).toLocaleDateString() : 'N/A'}\n`;
    texto += `👤 Solicitante: ${osEncontrada.solicitante || osEncontrada.usuario || 'N/A'}\n`;
    texto += `🔧 Serviço: ${osEncontrada.servicoSolicitado || osEncontrada.servico || osEncontrada.defeito || 'N/A'}\n`;
    
    if (osEncontrada.observacao || osEncontrada.observacoes) {
      texto += `📝 Observação: ${osEncontrada.observacao || osEncontrada.observacoes}\n`;
    }
    
    texto += `📊 Status: ${osEncontrada.status || 'Pendente'}\n`;
    
    return texto;
  } catch (error) {
    console.error('Erro ao consultar OS:', error);
    return `❌ Erro ao consultar ordem de serviço ${numeroOS}.\n\nTente novamente mais tarde.`;
  }
}