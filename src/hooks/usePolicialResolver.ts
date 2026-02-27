import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

export interface PolicialResolvido {
  nome: string;
  postGrad: string;
  nomeGuerra: string;
  matricula: string;
  numeral?: number;
  quadro?: string;
  funcao?: string;
}

// Cache global para evitar múltiplas queries
let cacheGlobal: Map<string, PolicialResolvido> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const carregarTodosPoliciais = async (): Promise<Map<string, PolicialResolvido>> => {
  const agora = Date.now();
  if (cacheGlobal && (agora - cacheTimestamp) < CACHE_TTL) {
    return cacheGlobal;
  }

  const snapshot = await getDocs(collection(db, 'policiais'));
  const mapa = new Map<string, PolicialResolvido>();

  snapshot.forEach((doc) => {
    const data = doc.data();
    mapa.set(doc.id, {
      nome: data.NOME || '',
      postGrad: data['Post/Grad'] || '',
      nomeGuerra: data['NOME DE GUERRA'] || data.NOME || '',
      matricula: String(data['Matrícula'] || data.Matrícula || ''),
      numeral: data.NUMERAL,
      quadro: data.quadro,
      funcao: data['FUNÇÃO'] || '',
    });
  });

  cacheGlobal = mapa;
  cacheTimestamp = agora;
  return mapa;
};

export const invalidarCachePoliciais = () => {
  cacheGlobal = null;
  cacheTimestamp = 0;
};

export const resolverNomePolicial = (
  mapa: Map<string, PolicialResolvido>,
  policialId: string | undefined,
  fallbackPatente?: string,
  fallbackNome?: string
): string => {
  if (!policialId) {
    return fallbackPatente && fallbackNome
      ? `${fallbackPatente} ${fallbackNome}`.trim()
      : fallbackNome || 'Desconhecido';
  }

  const dados = mapa.get(policialId);
  if (dados) {
    return `${dados.postGrad} ${dados.nomeGuerra}`.trim();
  }

  return fallbackPatente && fallbackNome
    ? `${fallbackPatente} ${fallbackNome}`.trim()
    : fallbackNome || 'Desconhecido';
};

export const usePolicialResolver = () => {
  const [policiaisMap, setPoliciaisMap] = useState<Map<string, PolicialResolvido>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    carregarTodosPoliciais()
      .then((mapa) => {
        if (mounted) {
          setPoliciaisMap(mapa);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar policiais para resolver:', err);
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return { policiaisMap, loading, resolverNome: (id?: string, fallbackPatente?: string, fallbackNome?: string) => resolverNomePolicial(policiaisMap, id, fallbackPatente, fallbackNome) };
};
