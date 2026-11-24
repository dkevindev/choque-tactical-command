import {
  collection, doc, getDocs, query, where, writeBatch, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { registrarEvento } from '@/lib/auditoria';

/* ------------------------------------------------------------------ */
/* Tipos e listas fixas                                                */
/* ------------------------------------------------------------------ */

export const COL_SOLIPEDES = 'solipedes';
export const COL_HISTORICO = 'solipedes_historico';

export const CATEGORIAS = {
  POMON: 'Policiamento montado (POMON)',
  ADAPTACAO: 'Em fase de adaptação',
  POTROS_DOMA: 'Potros apartados / doma',
  PROJETOS_SOCIAIS: 'Projetos sociais (CF)',
  EQUOTERAPIA: 'Equoterapia',
  COMPETICAO_HIPICA: 'Competição hípica (DH)',
  REPRODUCAO: 'Éguas para reprodução',
  INSERVIVEL: 'Inservível',
  DESTACADO: 'Destacado fora do RPMont',
  BAIXADO: 'Baixado (saiu do efetivo)',
} as const;
export type Categoria = keyof typeof CATEGORIAS;

export const LOCAIS = {
  RPMONT: 'RPMont (Fortaleza)',
  CRATO: 'Crato',
  UECE: 'À disposição da UECE',
} as const;
export type Local = keyof typeof LOCAIS;

export const SITUACOES_CARGA = {
  CARGA_TOMBO: 'Em carga (tombo)',
  CARGA_BCG: 'Em carga (BCG)',
  PENDENTE: 'Para incluir em carga',
  DESCARGA: 'Descarga',
} as const;
export type SituacaoCarga = keyof typeof SITUACOES_CARGA;

export const SEXOS = { MACHO: 'Macho', FEMEA: 'Fêmea' } as const;
export type Sexo = keyof typeof SEXOS;

export const RACAS = ['MESTIÇO', 'SRD', 'PSL', 'PSI', 'BH', 'QM', 'MANGALARGA'];
export const PELAGENS = [
  'ALAZÃ', 'ALAZÃ PERSA', 'ALAZÃ TOBIANA', 'APPALOOSA', 'BAIA', 'BAIA AMARILHO',
  'CASTANHA', 'CASTANHA MANCHA', 'CASTANHA PERSA', 'CASTANHA TOBIANA', 'LOBUNA',
  'NEVADA', 'PAMPA', 'TORDILHA', 'ZAINA',
];

export const MOTIVOS_MOVIMENTACAO = [
  'Mudança de emprego/categoria',
  'Transferência de local',
  'Inclusão em carga',
  'Descarga',
  'Concluiu adaptação',
  'Concluiu doma',
  'Declarado inservível',
  'Óbito',
  'Doação / cessão',
  'Outro',
];

export interface Solipede {
  id: string;
  registro: string;          // "EG 065" (EG = égua, CV = cavalo)
  nome: string;
  raca: string;
  sexo: Sexo;
  pelagem: string;
  anoNascimento: number;
  dataNascimento?: string;   // YYYY-MM-DD quando se sabe o dia
  categoria: Categoria;
  local: Local;
  situacaoCarga: SituacaoCarga;
  documentoCarga?: string;   // "TOMBO Nº 024221" ou "BCG Nº 212/2017"
  observacoes?: string;
  atualizadoEm?: Timestamp;
}

export type TipoEventoHistorico = 'IMPORTACAO' | 'CADASTRO' | 'EDICAO' | 'MOVIMENTACAO';

export interface EventoHistorico {
  id: string;
  solipedeId: string;
  registro: string;
  nome: string;
  tipo: TipoEventoHistorico;
  descricao: string;
  motivo?: string;
  documento?: string;
  dataMovimentacao?: string; // data informada pelo usuário (YYYY-MM-DD)
  antes?: Record<string, unknown>;
  depois?: Record<string, unknown>;
  autor?: string;
  criadoEm?: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

export const idDoRegistro = (registro: string) =>
  registro.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const normalizarRegistro = (registro: string) => {
  const m = registro.toUpperCase().replace(/\s+/g, '').match(/^(EG|CV)(\d+)$/);
  return m ? `${m[1]} ${m[2].padStart(3, '0')}` : registro.toUpperCase().trim();
};

export const idade = (s: Pick<Solipede, 'anoNascimento' | 'dataNascimento'>) => {
  const hoje = new Date();
  if (s.dataNascimento) {
    const n = new Date(`${s.dataNascimento}T00:00:00`);
    let anos = hoje.getFullYear() - n.getFullYear();
    if (hoje.getMonth() < n.getMonth() || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate())) anos--;
    return anos;
  }
  return hoje.getFullYear() - s.anoNascimento;
};

export const formatarNascimento = (s: Pick<Solipede, 'anoNascimento' | 'dataNascimento'>) => {
  if (!s.dataNascimento) return String(s.anoNascimento);
  const [a, m, d] = s.dataNascimento.split('-');
  return `${d}/${m}/${a}`;
};

export const formatarDataBR = (iso?: string) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

export const formatarTimestamp = (t?: Timestamp) =>
  t?.toDate ? t.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

/** Animais que estão no efetivo (não baixados). */
export const ativo = (s: Solipede) => s.categoria !== 'BAIXADO';

/** Pendências que o sistema aponta para o setor resolver. */
export const pendencias = (s: Solipede): string[] => {
  const lista: string[] = [];
  if (s.situacaoCarga === 'PENDENTE') lista.push('Falta incluir em carga');
  if (s.situacaoCarga === 'DESCARGA' && ativo(s) && s.local !== 'UECE')
    lista.push('Consta descarga, mas está no efetivo');
  if ((s.situacaoCarga === 'CARGA_BCG' || s.situacaoCarga === 'CARGA_TOMBO') && !s.documentoCarga)
    lista.push('Sem número do documento de carga');
  if (s.registro.startsWith('EG') && s.sexo === 'MACHO') lista.push('Registro EG, mas sexo macho');
  if (s.registro.startsWith('CV') && s.sexo === 'FEMEA') lista.push('Registro CV, mas sexo fêmea');
  return lista;
};

export const autorAtual = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
      || JSON.parse(localStorage.getItem('policialLogado') || 'null');
    if (!u) return 'Desconhecido';
    const nome = u['NOME DE GUERRA1'] || u['NOME DE GUERRA'] || u.NOME || u.nome || '';
    const mat = u['Matrícula'] ?? u['MATRÍCULA'] ?? u.matricula;
    return [u['Post/Grad'], nome].filter(Boolean).join(' ') + (mat ? ` (${mat})` : '');
  } catch {
    return 'Desconhecido';
  }
};

const limpar = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;

const CAMPOS_LEGIVEIS: Record<string, string> = {
  nome: 'nome', raca: 'raça', sexo: 'sexo', pelagem: 'pelagem', anoNascimento: 'ano de nascimento',
  dataNascimento: 'data de nascimento', categoria: 'categoria', local: 'local',
  situacaoCarga: 'situação de carga', documentoCarga: 'documento de carga', observacoes: 'observações',
  registro: 'registro',
};

export const rotuloValor = (campo: string, valor: unknown) => {
  if (valor === undefined || valor === null || valor === '') return '—';
  if (campo === 'categoria') return CATEGORIAS[valor as Categoria] ?? String(valor);
  if (campo === 'local') return LOCAIS[valor as Local] ?? String(valor);
  if (campo === 'situacaoCarga') return SITUACOES_CARGA[valor as SituacaoCarga] ?? String(valor);
  if (campo === 'sexo') return SEXOS[valor as Sexo] ?? String(valor);
  if (campo === 'dataNascimento') return formatarDataBR(String(valor));
  return String(valor);
};

export const rotuloCampo = (campo: string) => CAMPOS_LEGIVEIS[campo] ?? campo;

const diferencas = (antes: Partial<Solipede>, depois: Partial<Solipede>) => {
  const a: Record<string, unknown> = {};
  const d: Record<string, unknown> = {};
  Object.keys(CAMPOS_LEGIVEIS).forEach((k) => {
    const va = (antes as Record<string, unknown>)[k] ?? null;
    const vd = (depois as Record<string, unknown>)[k] ?? null;
    if ((va === '' ? null : va) !== (vd === '' ? null : vd)) { a[k] = va; d[k] = vd; }
  });
  return { antes: a, depois: d };
};

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export async function listarSolipedes(): Promise<Solipede[]> {
  const snap = await getDocs(collection(db, COL_SOLIPEDES));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Solipede, 'id'>) }))
    .sort((a, b) => a.registro.localeCompare(b.registro, 'pt-BR', { numeric: true }));
}

const ordenarHistorico = (l: EventoHistorico[]) =>
  l.sort((a, b) => (b.criadoEm?.toMillis?.() ?? Infinity) - (a.criadoEm?.toMillis?.() ?? Infinity));

export async function historicoDoSolipede(solipedeId: string): Promise<EventoHistorico[]> {
  // Sem orderBy na consulta para não exigir índice composto no Firestore.
  const snap = await getDocs(query(collection(db, COL_HISTORICO), where('solipedeId', '==', solipedeId)));
  return ordenarHistorico(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventoHistorico, 'id'>) })));
}

export async function historicoGeral(): Promise<EventoHistorico[]> {
  const snap = await getDocs(collection(db, COL_HISTORICO));
  return ordenarHistorico(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventoHistorico, 'id'>) })));
}

/* ------------------------------------------------------------------ */
/* Escrita (sempre grava o histórico na mesma operação)                */
/* ------------------------------------------------------------------ */

export type DadosSolipede = Omit<Solipede, 'id' | 'atualizadoEm'>;

export async function cadastrarSolipede(dados: DadosSolipede) {
  const registro = normalizarRegistro(dados.registro);
  const id = idDoRegistro(registro);
  const existentes = await getDocs(query(collection(db, COL_SOLIPEDES), where('registro', '==', registro)));
  if (!existentes.empty) throw new Error(`Já existe um animal com o registro ${registro}.`);

  const autor = autorAtual();
  const batch = writeBatch(db);
  const novo = limpar({ ...dados, registro, atualizadoEm: serverTimestamp() });
  batch.set(doc(db, COL_SOLIPEDES, id), novo);
  batch.set(doc(collection(db, COL_HISTORICO)), limpar({
    solipedeId: id, registro, nome: dados.nome, tipo: 'CADASTRO' as const,
    descricao: `Cadastro do animal (${CATEGORIAS[dados.categoria]} – ${LOCAIS[dados.local]})`,
    autor, criadoEm: serverTimestamp(),
  }));
  await batch.commit();
  registrarEvento({ tipo: 'solipede_cadastro', descricao: `Cadastro ${registro} ${dados.nome}`, origem: 'Cavalhada', autor });
  return id;
}

/** Edição dos dados de identificação (nome, raça, pelagem, nascimento, observações). */
export async function editarSolipede(atual: Solipede, dados: Partial<DadosSolipede>) {
  const { antes, depois } = diferencas(atual, { ...atual, ...dados });
  if (Object.keys(depois).length === 0) return;
  const autor = autorAtual();
  const batch = writeBatch(db);
  const atualizacao: Record<string, unknown> = { atualizadoEm: serverTimestamp() };
  Object.keys(depois).forEach((k) => { atualizacao[k] = depois[k] ?? null; });
  batch.update(doc(db, COL_SOLIPEDES, atual.id), atualizacao);
  batch.set(doc(collection(db, COL_HISTORICO)), limpar({
    solipedeId: atual.id, registro: atual.registro, nome: (dados.nome ?? atual.nome),
    tipo: 'EDICAO' as const,
    descricao: `Correção de dados: ${Object.keys(depois).map(rotuloCampo).join(', ')}`,
    antes, depois, autor, criadoEm: serverTimestamp(),
  }));
  await batch.commit();
}

export interface DadosMovimentacao {
  categoria: Categoria;
  local: Local;
  situacaoCarga: SituacaoCarga;
  documentoCarga?: string;
  motivo: string;
  documento?: string;        // BCG / ofício que autorizou a movimentação
  dataMovimentacao: string;  // YYYY-MM-DD
  observacao?: string;
}

/** Mudança de categoria, local ou situação de carga — o que é "movimentação" do animal. */
export async function movimentarSolipede(atual: Solipede, mov: DadosMovimentacao) {
  const novos = {
    categoria: mov.categoria, local: mov.local, situacaoCarga: mov.situacaoCarga,
    documentoCarga: mov.documentoCarga?.trim() || undefined,
  };
  const { antes, depois } = diferencas(atual, { ...atual, ...novos });
  if (Object.keys(depois).length === 0) throw new Error('Nada mudou: escolha uma nova categoria, local ou situação.');

  const autor = autorAtual();
  const partes = Object.keys(depois).map((k) => `${rotuloCampo(k)}: ${rotuloValor(k, antes[k])} → ${rotuloValor(k, depois[k])}`);
  const batch = writeBatch(db);
  batch.update(doc(db, COL_SOLIPEDES, atual.id), {
    ...Object.fromEntries(Object.keys(depois).map((k) => [k, depois[k] ?? null])),
    atualizadoEm: serverTimestamp(),
  });
  batch.set(doc(collection(db, COL_HISTORICO)), limpar({
    solipedeId: atual.id, registro: atual.registro, nome: atual.nome, tipo: 'MOVIMENTACAO' as const,
    descricao: partes.join(' | ') + (mov.observacao ? ` — ${mov.observacao}` : ''),
    motivo: mov.motivo, documento: mov.documento?.trim(), dataMovimentacao: mov.dataMovimentacao,
    antes, depois, autor, criadoEm: serverTimestamp(),
  }));
  await batch.commit();
  registrarEvento({
    tipo: 'solipede_movimentacao', descricao: `${atual.registro} ${atual.nome}: ${partes.join(' | ')}`,
    antes, depois, origem: 'Cavalhada', autor,
  });
}

/* ------------------------------------------------------------------ */
/* Importação da relação geral (PDF de 15/07/2026, já padronizada)     */
/* ------------------------------------------------------------------ */

export const DATA_RELACAO_IMPORTADA = '2026-07-15';

/**
 * Grava os animais da relação que ainda não existem no sistema.
 * Quem já está cadastrado (mesmo registro) é mantido como está.
 */
export async function importarRelacao(dados: DadosSolipede[]) {
  const existentes = new Set((await listarSolipedes()).map((s) => s.registro));
  const novos = dados.filter((d) => !existentes.has(d.registro));
  const autor = autorAtual();
  // Lote do Firestore aceita até 500 gravações; cada animal usa 2 (cadastro + histórico).
  for (let i = 0; i < novos.length; i += 200) {
    const batch = writeBatch(db);
    novos.slice(i, i + 200).forEach((d) => {
      const id = idDoRegistro(d.registro);
      batch.set(doc(db, COL_SOLIPEDES, id), limpar({ ...d, atualizadoEm: serverTimestamp() }));
      batch.set(doc(collection(db, COL_HISTORICO)), {
        solipedeId: id, registro: d.registro, nome: d.nome, tipo: 'IMPORTACAO',
        descricao: `Importado da Relação Geral da Cavalhada de ${formatarDataBR(DATA_RELACAO_IMPORTADA)}`,
        dataMovimentacao: DATA_RELACAO_IMPORTADA, autor, criadoEm: serverTimestamp(),
      });
    });
    await batch.commit();
  }
  if (novos.length) {
    registrarEvento({ tipo: 'solipede_importacao', descricao: `Importados ${novos.length} solípedes da relação geral`, origem: 'Cavalhada', autor });
  }
  return { importados: novos.length, jaExistiam: dados.length - novos.length };
}
