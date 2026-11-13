import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { normalizarSerie } from '@/lib/auditoria';

export interface Registro { colecao: string; id: string; data: Record<string, any>; quando: Date | null; }

export const COLECOES_MATERIAL = [
  'materiais_belicos', 'materiais_disposicao', 'historico_material', 'movimentacoes_belicas',
  'cautelas_permanentes', 'cautelas_provisorias', 'cautelas_disposicao', 'baixas_materiais',
  'problemas_material', 'livros_reserva_armamento', 'eventos_auditoria',
];
export const COLECOES_POLICIAL = [
  'policiais_transferidos', 'transferencias_policiais', 'assentamentos', 'historico_promocoes',
  'atestados_medicos', 'servicosDiarios', 'oficina_controle', 'projetos_instrutores',
  'cautelas_permanentes', 'cautelas_provisorias', 'cautelas_disposicao', 'historico_material',
  'movimentacoes_belicas', 'materiais_belicos', 'baixas_materiais', 'problemas_material', 'eventos_auditoria',
];

export const ROTULOS: Record<string, string> = {
  materiais_belicos: 'Carga bélica', materiais_disposicao: 'Material à disposição',
  historico_material: 'Histórico do material', movimentacoes_belicas: 'Movimentação na reserva',
  cautelas_permanentes: 'Cautela permanente', cautelas_provisorias: 'Cautela provisória',
  cautelas_disposicao: 'Cautela à disposição', baixas_materiais: 'Baixa de material',
  problemas_material: 'Relato de problema', livros_reserva_armamento: 'Livro da reserva',
  eventos_auditoria: 'Histórico central', policiais_transferidos: 'Policial transferido',
  transferencias_policiais: 'Transferência', assentamentos: 'Assentamento',
  historico_promocoes: 'Promoção', atestados_medicos: 'Atestado médico',
  servicosDiarios: 'Serviço de motorista', oficina_controle: 'Oficina',
  projetos_instrutores: 'Projeto social (instrutor)',
};

const cache = new Map<string, { t: number; docs: Registro[] }>();

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  if (typeof v === 'string') {
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (m) return new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1]);
    const d = new Date(v); return isNaN(+d) ? null : d;
  }
  return null;
};
const CAMPOS_DATA = ['data', 'dataHora', 'dataCriacao', 'criadoEm', 'createdAt', 'dataInicio', 'inicio',
  'dataBaixa', 'dataTransferencia', 'dataEntrada', 'dataCautela', 'dataPromocao', 'dataAbertura', 'timestamp', 'atualizadoEm'];
export const extrairData = (d: Record<string, any>) => {
  for (const c of CAMPOS_DATA) { const x = toDate(d[c]); if (x) return x; }
  return null;
};

export async function carregar(col: string): Promise<Registro[]> {
  const c = cache.get(col);
  if (c && Date.now() - c.t < 60_000) return c.docs;
  try {
    const snap = await getDocs(collection(db, col));
    const docs = snap.docs.map(d => ({ colecao: col, id: d.id, data: d.data(), quando: extrairData(d.data()) }));
    cache.set(col, { t: Date.now(), docs });
    return docs;
  } catch (e) { console.warn('Sem acesso a', col, e); return []; }
}

const textoNormalizado = (o: unknown) => normalizarSerie(JSON.stringify(o ?? ''));

export async function buscarPorSerie(serie: string) {
  const alvo = normalizarSerie(serie);
  if (alvo.length < 2) return [];
  const all = await Promise.all(COLECOES_MATERIAL.map(carregar));
  return all.flat().filter(r => textoNormalizado(r.data).includes(alvo));
}

export const getNome = (p: any) => p?.['NOME'] || p?.nome || p?.['NOME COMPLETO'] || p?.nomeCompleto || '';
export const getGuerra = (p: any) => p?.['NOME DE GUERRA'] || p?.nomeGuerra || '';
export const getMatricula = (p: any) => String(p?.['MATRÍCULA'] ?? p?.matricula ?? p?.MATRICULA ?? '');
export const getNumeral = (p: any) => String(p?.['NUMERAL'] ?? p?.numeral ?? p?.['Nº'] ?? '');
export const getPosto = (p: any) => p?.['Post/Grad'] || p?.posto || '';
export const getSituacao = (p: any) => p?.['SITUAÇÃO'] || p?.situacao || '';

export async function buscarPoliciais(termo: string) {
  const t = termo.trim().toUpperCase();
  if (t.length < 2) return [];
  const pols = await carregar('policiais');
  return pols.filter(p => {
    const d = p.data;
    return [getNome(d), getGuerra(d), getMatricula(d), getNumeral(d)]
      .some(v => String(v).toUpperCase().includes(t));
  }).slice(0, 30);
}

export async function historicoPolicial(pol: Registro) {
  const mat = normalizarSerie(getMatricula(pol.data));
  const nome = normalizarSerie(getNome(pol.data));
  const all = await Promise.all(COLECOES_POLICIAL.map(carregar));
  return all.flat().filter(r => {
    const s = textoNormalizado(r.data);
    return s.includes(`"${pol.id}"`.toUpperCase()) || (mat.length >= 3 && new RegExp(`[^0-9A-Z]${mat}[^0-9A-Z]`).test(s))
      || (nome.length > 8 && s.includes(nome));
  });
}

export const fmt = (d: Date | null) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

const IGNORAR = new Set(['senha', 'senhaHash', 'password', 'foto', 'fotoUrl', 'assinatura']);
export function resumo(d: Record<string, any>, max = 8): string {
  return Object.entries(d)
    .filter(([k, v]) => !IGNORAR.has(k) && v !== '' && v !== null && v !== undefined && typeof v !== 'object')
    .slice(0, max).map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? 'sim' : 'não') : v}`).join(' • ');
}

export function statusMaterial(regs: Registro[]) {
  const mat = regs.find(r => r.colecao === 'materiais_belicos') || regs.find(r => r.colecao === 'materiais_disposicao');
  if (!mat) {
    if (regs.some(r => r.colecao === 'baixas_materiais')) return { label: 'BAIXADO', cor: 'destructive' as const };
    return { label: 'NÃO ESTÁ NO CADASTRO ATUAL', cor: 'secondary' as const };
  }
  const d = mat.data;
  if (mat.colecao === 'materiais_disposicao') return { label: 'À DISPOSIÇÃO (RECRUTAS)', cor: 'secondary' as const };
  if (d.baixado) return { label: `BAIXADO${d.destinoBaixa ? ' – ' + d.destinoBaixa : ''}`, cor: 'destructive' as const };
  if (d.transferido) return { label: `TRANSFERIDO${d.destinoTransferencia || d.destino ? ' – ' + (d.destinoTransferencia || d.destino) : ''}`, cor: 'destructive' as const };
  if (d.cautelado || d.policialAssociadoNome) return { label: `CAUTELADO – ${d.policialAssociadoNome || ''}`, cor: 'default' as const };
  return { label: 'NA CARGA (DISPONÍVEL)', cor: 'default' as const };
}
