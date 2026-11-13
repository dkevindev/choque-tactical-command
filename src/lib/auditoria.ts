import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

export const normalizarSerie = (s?: unknown) =>
  String(s ?? '').toUpperCase().replace(/\s+/g, '').trim();

export interface EventoAuditoria {
  tipo: string; // ex: material_cadastro, material_baixa, cautela, devolucao, servico_inicio
  descricao: string;
  numeroSerie?: string;
  materialId?: string;
  policialId?: string;
  policialMatricula?: string;
  policialNome?: string;
  antes?: Record<string, unknown>;
  depois?: Record<string, unknown>;
  origem?: string;
  autor?: string;
}

const limpar = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Grava no histórico central. Nunca lança erro (não bloqueia a ação principal). */
export async function registrarEvento(ev: EventoAuditoria) {
  try {
    await addDoc(collection(db, 'eventos_auditoria'), limpar({
      ...ev,
      policialMatricula: ev.policialMatricula ? String(ev.policialMatricula) : undefined,
      serieNormalizada: ev.numeroSerie ? normalizarSerie(ev.numeroSerie) : undefined,
      data: serverTimestamp(),
    }));
  } catch (e) {
    console.warn('Falha ao registrar evento de auditoria', e);
  }
}
