import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

const SALT = 'dkcode-galeria-privada-v1';
export const STORAGE_KEY = 'galeria_privada_ok';

export async function hashSenha(senha: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${senha}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const configRef = () => doc(db, 'galeria_config', 'acesso');

export async function senhaCadastrada(): Promise<boolean> {
  const snap = await getDoc(configRef());
  return snap.exists() && !!(snap.data() as any)?.senhaHash;
}

export async function definirSenha(senha: string): Promise<void> {
  await setDoc(configRef(), { senhaHash: await hashSenha(senha), atualizadoEm: new Date() }, { merge: true });
}

export async function validarSenha(senha: string): Promise<boolean> {
  const snap = await getDoc(configRef());
  if (!snap.exists()) return false;
  const hash = (snap.data() as any)?.senhaHash;
  return !!hash && hash === (await hashSenha(senha));
}

export async function alterarSenha(atual: string, nova: string): Promise<boolean> {
  if (!(await validarSenha(atual))) return false;
  await definirSenha(nova);
  return true;
}
