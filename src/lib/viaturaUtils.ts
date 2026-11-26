
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { filtrarViaturasPorTipo } from './viaturasServico';

export interface ViaturaBasica {
  id: string;
  PLACA: string;
  CADASTRO?: string;
  MODELO?: string;
  tipo?: 'leve' | 'pesada';
  UTILIZACAO?: string;
  operacional?: boolean;
}

// Cache para evitar múltiplas consultas
let viaturasCache: ViaturaBasica[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const buscarTodasViaturas = async (atualizar = false): Promise<ViaturaBasica[]> => {
  const agora = Date.now();
  
  // Verificar se o cache ainda é válido
  if (!atualizar && viaturasCache && (agora - cacheTimestamp) < CACHE_DURATION) {
    return viaturasCache;
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'frota'));
    const viaturas: ViaturaBasica[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ViaturaBasica[];

    // Atualizar cache
    viaturasCache = viaturas;
    cacheTimestamp = agora;

    return viaturas;
  } catch (error) {
    console.error('Erro ao buscar viaturas:', error);
    return [];
  }
};

export const buscarViaturasLeves = async (atualizar = false): Promise<ViaturaBasica[]> => {
  const todasViaturas = await buscarTodasViaturas(atualizar);
  return filtrarViaturasPorTipo(todasViaturas, 'leve');
};

export const buscarViaturasPesadas = async (atualizar = false): Promise<ViaturaBasica[]> => {
  const todasViaturas = await buscarTodasViaturas(atualizar);
  return filtrarViaturasPorTipo(todasViaturas, 'pesada');
};

export const isFroteLeve = (viatura: ViaturaBasica): boolean => {
  return viatura.tipo === 'leve';
};

export const isFrotePesada = (viatura: ViaturaBasica): boolean => {
  return viatura.tipo === 'pesada';
};

export const getPlacasViaturasLeves = async (): Promise<string[]> => {
  const viaturasLeves = await buscarViaturasLeves();
  return viaturasLeves.map(v => v.PLACA);
};

export const getPlacasViaturasPesadas = async (): Promise<string[]> => {
  const viaturasPesadas = await buscarViaturasPesadas();
  return viaturasPesadas.map(v => v.PLACA);
};

// Limpar cache quando necessário (ex: após alterações na categorização)
export const limparCacheViaturas = (): void => {
  viaturasCache = null;
  cacheTimestamp = 0;
};
