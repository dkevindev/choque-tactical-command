import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

export const buscarPolicialPorId = async (policialId: string): Promise<any | null> => {
  try {
    // 1. Tentar buscar diretamente pelo ID do documento
    const docRef = doc(db, 'policiais', policialId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    
    // 2. Fallback: buscar por campo 'id'
    let querySnap = await getDocs(
      query(collection(db, 'policiais'), where('id', '==', policialId))
    );
    
    if (!querySnap.empty) {
      return { id: querySnap.docs[0].id, ...querySnap.docs[0].data() };
    }
    
    // 3. Fallback: buscar por 'usuarioId'
    querySnap = await getDocs(
      query(collection(db, 'policiais'), where('usuarioId', '==', policialId))
    );
    
    if (!querySnap.empty) {
      return { id: querySnap.docs[0].id, ...querySnap.docs[0].data() };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar policial:', error);
    return null;
  }
};

export const getPostGradOrder = (postGrad: string): number => {
  const ordem: Record<string, number> = {
    'TEN CEL': 1, 'TENCEL': 1, 'MAJ': 2, 'CAP': 3, '1º TEN': 4, '2º TEN': 5,
    'SUBTEN': 6, '1º SGT': 7, '2º SGT': 8, '3º SGT': 9, 'CB': 10, 'SD': 11
  };
  return ordem[postGrad] || 999;
};

export const sortByHierarquia = (a: any, b: any): number => {
  const aIsCmt = a['FUNÇÃO']?.includes('CMT RPMONT');
  const bIsCmt = b['FUNÇÃO']?.includes('CMT RPMONT');
  if (aIsCmt && !bIsCmt) return -1;
  if (!aIsCmt && bIsCmt) return 1;

  const orderDiff = getPostGradOrder(a['Post/Grad'] || '') - getPostGradOrder(b['Post/Grad'] || '');
  if (orderDiff !== 0) return orderDiff;

  // Mesma graduação: quem foi promovido primeiro é mais antigo
  const dateA = a.dataUltimaPromocao ? new Date(a.dataUltimaPromocao).getTime() : Infinity;
  const dateB = b.dataUltimaPromocao ? new Date(b.dataUltimaPromocao).getTime() : Infinity;
  if (dateA !== dateB) return dateA - dateB;

  // Mesmo posto e data: ordenar por numeral
  const numA = Number(a.NUMERAL || a.numeral || 9999);
  const numB = Number(b.NUMERAL || b.numeral || 9999);
  return numA - numB;
};

export const formatarNomePolicial = (policial: any): string => {
  if (!policial) return 'Desconhecido';
  const postGrad = policial['Post/Grad'] || policial.postGrad || policial.patente || '';
  const nomeGuerra = policial['NOME DE GUERRA'] || policial.nomeGuerra || '';
  return `${postGrad} ${nomeGuerra}`.trim() || 'Desconhecido';
};
