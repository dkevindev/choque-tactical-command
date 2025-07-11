import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { BotResponse, Viatura } from './types';

// Regex para capturar "cav", "cavalaria" + número
const viaturaRegex = /\bcav(?:alaria)?\s*-?\s*(\d{1,3})\b/i;

// Exemplo parcial, expanda até 100 palavras depois
const keywords = [
  'mostrar', 'exibir', 'dados', 'informações', 'ficha', 'abrir', 'consultar', 'detalhes',
  'ver', 'pesquisar', 'localizar', 'status', 'situação', 'relatório', 'lista',
  'registro', 'visualizar', 'buscar', 'resumo', 'perfil'
];

function hasKeyword(text: string, keys: string[]): boolean {
  const textLower = text.toLowerCase();
  return keys.some(kw => textLower.includes(kw));
}

async function getViaturasFromFirestore(): Promise<Viatura[]> {
  const snapshot = await getDocs(collection(db, 'frota'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Viatura) }));
}

export async function responder(inputText: string): Promise<BotResponse> {
  const match = inputText.match(viaturaRegex);
  if (!match) {
    return { type: 'text', text: 'Desculpe, não entendi sua solicitação.' };
  }

  // Formata número com zero à esquerda se precisar
  const numero = match[1].padStart(2, '0');
  const cadastro = `CAV - ${numero}`;

  const viaturas = await getViaturasFromFirestore();

  const viaturaEncontrada = viaturas.find(
    v => String(v.CADASTRO).trim().toLowerCase() === cadastro.toLowerCase()
  );

  if (!viaturaEncontrada) {
    return { type: 'text', text: `Não encontrei a viatura ${cadastro} na base.` };
  }

  if (hasKeyword(inputText, keywords)) {
    return { type: 'show_viatura_modal', viatura: viaturaEncontrada };
  } else {
    return {
      type: 'text',
      text: `Encontrei a viatura ${cadastro}. Se quiser, posso mostrar os dados completos, diga "mostrar dados da ${cadastro}".`
    };
  }
}