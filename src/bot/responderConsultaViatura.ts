import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { BotResponse, Viatura } from './types';

export async function responderConsultaViatura(input: string): Promise<BotResponse> {
  const regex = /cav(?:alaria)?[\s\-]?(\d+)/i;
  const match = input.match(regex);

  if (!match) {
    return { type: 'text', text: 'Por favor, informe o identificador da viatura (ex: CAV-13).' };
  }

  const cavId = `CAV-${match[1]}`;

  const querySnapshot = await getDocs(collection(db, 'frota'));

  const viaturas: Viatura[] = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Viatura, 'id'>)
  }));

  const viatura = viaturas.find(v => v.MODELO.toUpperCase() === cavId.toUpperCase());

  if (!viatura) {
    return { type: 'text', text: `Não encontrei a viatura ${cavId} na frota.` };
  }

  return { type: 'show_viatura_modal', viatura: viatura };
}
