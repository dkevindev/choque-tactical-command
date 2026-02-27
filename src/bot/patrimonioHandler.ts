// src/bot/patrimonioHandler.ts
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { BotResponse } from './types';

interface ItemPatrimonio {
  id: string;
  nome: string;
  descricao: string;
  secaoNome: string;
  categoria: string;
  valor: number;
  numeroTombo: string;
}

export async function responderConsultaPatrimonio(input: string): Promise<BotResponse> {
  const inputLower = input.toLowerCase();

  // Extrair possíveis termos de busca
  const termos = inputLower
    .replace(/patrimônio|patrimonio|tombo|localizar|item|buscar|encontrar|onde está|onde fica/g, '')
    .trim();

  if (!termos || termos.length < 2) {
    return {
      type: 'text',
      text: '📦 **Consulta de Patrimônio**\n\nPara consultar um item, você pode:\n\n1️⃣ **Usar o botão "📷 Escanear Patrimônio"** para ler o QR Code do tombo\n\n2️⃣ **Digitar**: "patrimônio [descrição ou número do tombo]"\n\nExemplo: "patrimônio mesa escritório" ou "patrimônio 001234"',
    };
  }

  try {
    const itensSnapshot = await getDocs(collection(db, 'patrimonio_itens'));
    const itens = itensSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ItemPatrimonio[];

    // Buscar por número do tombo ou descrição
    const itemEncontrado = itens.find(item => 
      item.numeroTombo.toLowerCase().includes(termos) ||
      item.descricao.toLowerCase().includes(termos) ||
      item.nome.toLowerCase().includes(termos)
    );

    if (itemEncontrado) {
      const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemEncontrado.valor);
      
      return {
        type: 'text',
        text: `✅ **Item Encontrado!**\n\n📦 **${itemEncontrado.nome}**\n\n🏷️ **Tombo:** ${itemEncontrado.numeroTombo}\n📍 **Seção:** ${itemEncontrado.secaoNome}\n🏷️ **Categoria:** ${itemEncontrado.categoria || 'Não definida'}\n💰 **Valor:** ${valor}\n\n📝 **Descrição:**\n${itemEncontrado.descricao}`,
      };
    }

    // Se não encontrou exato, buscar similares
    const similares = itens.filter(item => 
      item.nome.toLowerCase().includes(termos.split(' ')[0]) ||
      item.descricao.toLowerCase().includes(termos.split(' ')[0])
    ).slice(0, 3);

    if (similares.length > 0) {
      const lista = similares.map(item => 
        `• ${item.nome} (Tombo: ${item.numeroTombo}) - ${item.secaoNome}`
      ).join('\n');

      return {
        type: 'text',
        text: `⚠️ **Item não encontrado exatamente**\n\nNão encontrei um item com "${termos}", mas encontrei itens similares:\n\n${lista}\n\nDigite o número do tombo ou descrição mais específica para buscar.`,
      };
    }

    return {
      type: 'text',
      text: `❌ **Item não encontrado**\n\nNenhum item cadastrado com "${termos}".\n\n💡 **Dica:** Use o botão "📷 Escanear Patrimônio" para ler o QR Code do tombo diretamente.`,
    };

  } catch (error) {
    console.error('Erro ao consultar patrimônio:', error);
    return {
      type: 'text',
      text: '❌ Erro ao consultar patrimônio. Tente novamente.',
    };
  }
}

export async function buscarPatrimonioPorDescricao(descricao: string): Promise<ItemPatrimonio | null> {
  try {
    const itensSnapshot = await getDocs(collection(db, 'patrimonio_itens'));
    const itens = itensSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ItemPatrimonio[];

    const descLower = descricao.toLowerCase().trim();
    return itens.find(item => 
      item.descricao.toLowerCase().trim() === descLower ||
      item.descricao.toLowerCase().includes(descLower)
    ) || null;
  } catch (error) {
    console.error('Erro ao buscar patrimônio:', error);
    return null;
  }
}
