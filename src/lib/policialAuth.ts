import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

export interface PolicialAuth {
  id: string;
  NOME: string;
  Matrícula: string | number;
  nomeGuerra1?: string;
  acessos?: { gestaoLogistica?: boolean; cavbot?: boolean; reservaArmamento?: boolean; guardaQuartel?: boolean };
  primeiroAcesso?: boolean;
  senhaDefault?: boolean;
}

export async function verificarPolicial(mat: string, pass: string): Promise<PolicialAuth | null> {
  try {
    let snap = await getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(mat))));
    if (snap.empty) {
      snap = await getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', mat)));
    }
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data: any = d.data();
    const primeiroAcesso = data.primeiroAcesso !== false || !data.senha;
    const senhaDefault = data.senha ? String(data.senha) === String(data.Matrícula) : true;
    const senhaOk = primeiroAcesso ? pass === String(mat) : String(data.senha) === String(pass);
    if (!senhaOk) return null;
    return {
      id: d.id,
      NOME: data.NOME,
      Matrícula: data.Matrícula,
      nomeGuerra1: data['NOME DE GUERRA1'] || data['NOME DE GUERRA'] || data.NOME,
      acessos: data.acessos || {},
      primeiroAcesso,
      senhaDefault,
    };
  } catch (e) {
    console.error('verificarPolicial:', e);
    return null;
  }
}

const allowedOperacionaisLegacy = ['05', '06', '08', '11', '12', '13'];
export function isViaturaOperacional(v: { CADASTRO?: string; operacional?: boolean }): boolean {
  if (typeof v.operacional === 'boolean') return v.operacional;
  const c = String(v.CADASTRO || '');
  const digits = (c.match(/\d+/g) || []).join('');
  return allowedOperacionaisLegacy.some(n => digits.includes(n));
}
