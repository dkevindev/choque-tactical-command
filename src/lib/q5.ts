export const Q5_POSTOS = ['CEL PM','TEN-CEL PM','MAJ PM','CAP PM','1º TEN PM','2º TEN PM','SUBTEN PM','1º SGT PM','2º SGT PM','3º SGT PM','CB PM','SD PM'] as const;
export type Q5Posto = typeof Q5_POSTOS[number];

export function normalizarPosto(raw?: string): Q5Posto | null {
  const s = (raw || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[º°ª.]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/TEN[ -]?CEL|TC\b/.test(s)) return 'TEN-CEL PM';
  if (/^CEL|CORONEL/.test(s)) return 'CEL PM';
  if (/^MAJ/.test(s)) return 'MAJ PM';
  if (/^CAP/.test(s)) return 'CAP PM';
  if (/^1 ?TEN/.test(s)) return '1º TEN PM';
  if (/^2 ?TEN/.test(s)) return '2º TEN PM';
  if (/SUB ?TEN|ST\b/.test(s)) return 'SUBTEN PM';
  if (/^1 ?SGT/.test(s)) return '1º SGT PM';
  if (/^2 ?SGT/.test(s)) return '2º SGT PM';
  if (/^3 ?SGT/.test(s)) return '3º SGT PM';
  if (/^CB|CABO/.test(s)) return 'CB PM';
  if (/^SD|SOLDADO/.test(s)) return 'SD PM';
  return null;
}

export const Q5_UNIDADES = ['RPMONT', '1ESQ', '2ESQ', '3PEL/2ESQ'] as const;
export type Q5Unidade = typeof Q5_UNIDADES[number];
export const lerUnidadeBruta = (p: any): string => String(p?.['UNIDADE"RPMONT"'] || p?.UNIDADE || p?.Unidade || p?.unidade || '').trim();
export function normalizarUnidade(raw?: string): Q5Unidade | null {
  const s = (raw || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[º°ª.\s\-_]/g, '');
  if (!s) return null;
  if (/3PEL/.test(s)) return '3PEL/2ESQ';
  if (/^1ESQ/.test(s)) return '1ESQ';
  if (/^2ESQ/.test(s)) return '2ESQ';
  if (s === 'RPMONT') return 'RPMONT';
  return null;
}

export const norm = (s?: string) => (s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export interface Q5Categoria {
  id: string; titulo: string; sub?: string; tipo: 'afastamento' | 'funcao';
  prioridade: number; situacoes: string[]; funcoes: string[]; usaAtestados?: boolean;
}

export const Q5_CATEGORIAS_PADRAO: Q5Categoria[] = [
  { id: 'c01', titulo: '1. FÉRIAS', tipo: 'afastamento', prioridade: 2, situacoes: ['FÉRIAS'], funcoes: [] },
  { id: 'c02', titulo: '2. VIAGEM / MISSÃO POLICIAL', tipo: 'afastamento', prioridade: 5, situacoes: ['TRANSITO'], funcoes: [] },
  { id: 'c03', titulo: '3. LTS', sub: 'Licença para Tratamento de Saúde', tipo: 'afastamento', prioridade: 1, situacoes: ['LICENÇA TRATAMENTO DE SAUDE', 'LTS'], funcoes: ['LTS'], usaAtestados: true },
  { id: 'c04', titulo: '4. LICENÇAS DIVERSAS', sub: 'Paternidade, Luto, Dispensa, Núpcias', tipo: 'afastamento', prioridade: 3, situacoes: ['LICENÇA PATERNIDADE', 'LICENÇA MATERNIDADE', 'LUTO', 'NUPCIAS', 'RECOMPENSA MILITAR'], funcoes: [] },
  { id: 'c05', titulo: '5. SERVIÇOS LEVES', tipo: 'afastamento', prioridade: 6, situacoes: ['READAPTAÇÃO FUNCIONAL'], funcoes: [] },
  { id: 'c06', titulo: '6. À DISPOSIÇÃO', sub: 'De outras unidades / outros órgãos', tipo: 'afastamento', prioridade: 4, situacoes: ['A DISP. DE OUTROS ORGÃOS'], funcoes: ['A DISP DE OUTROS'] },
  { id: 'c07', titulo: '7. CURSANDO / INSTRUÇÃO', sub: 'Instrutor ou discente', tipo: 'afastamento', prioridade: 5, situacoes: ['CURSANDO', 'INSTRUTOR'], funcoes: [] },
  { id: 'c08', titulo: '8. RESPONDENDO PAD/CD/CJ', sub: 'Cumprindo expediente na unidade', tipo: 'afastamento', prioridade: 7, situacoes: ['RESP. PROCESSO'], funcoes: ['RESP A PROCESSO (PAD/CD...)'] },
  { id: 'c09', titulo: '9. AFASTADOS PREVENTIVAMENTE', sub: 'Afastado totalmente das funções', tipo: 'afastamento', prioridade: 4, situacoes: ['RECOLHIDO PRES. MILITAR', 'AFASTADO PREVENTIVAMENTE'], funcoes: [] },
  { id: 'c10', titulo: '10. AGREGADO REF/RR', sub: 'Ainda no efetivo da unidade', tipo: 'afastamento', prioridade: 4, situacoes: ['AGREGADO', 'AGREGADO - AGUARDANDO RESERVA'], funcoes: ['RR AGUARDANDO'] },
  { id: 'c11', titulo: '11. GUARDA QUARTEL', sub: '24/72 – adjuntos, sentinelas, permanentes, enfermeiros', tipo: 'funcao', prioridade: 10, situacoes: [], funcoes: ['GUARDA DO QUARTEL', 'SENTINELA CAVALARICO', 'FISCAL DE DIA'] },
  { id: 'c12', titulo: '12. ARMEIROS', sub: 'Escala 24/72', tipo: 'funcao', prioridade: 10, situacoes: [], funcoes: ['ARMEIRO'] },
  { id: 'c13', titulo: '13. RELATORISTA', sub: 'Escala 24/72', tipo: 'funcao', prioridade: 10, situacoes: [], funcoes: ['RELATORISTA'] },
  { id: 'c14', titulo: '14. MOTORISTAS ADM', sub: 'Comandante, Subcomandante, expediente', tipo: 'funcao', prioridade: 10, situacoes: [], funcoes: ['MOTORISTA ADM'] },
  { id: 'c15', titulo: '15. SAI – RESERVADO', tipo: 'funcao', prioridade: 10, situacoes: [], funcoes: ['SAI - RESERVADO'] },
  { id: 'c16', titulo: '16. ATIVIDADE-MEIO', tipo: 'funcao', prioridade: 10, situacoes: [], funcoes: ['AUXILIAR 1ª SECAO', 'AUXILIAR 3ª SECAO', 'AUXILIAR 4ª SECAO', 'AUXILIAR 5ª SECAO', 'AUXILIAR 6ª SECAO', 'AUXILIAR DO DMV', 'AUXILIAR DE MEDICO VETERINARIO', 'FERRADOR', 'SELEIRO', 'CORREEIRO', 'TRATORISTA', 'FISCAL DE BAIA', 'PROJETOS SOCIAIS'] },
];

export interface Q5Policial {
  id: string; NOME?: string; 'Post/Grad'?: string; SITUAÇÃO?: string; 'FUNÇÃO'?: string; Matrícula?: any;
  'NOME DE GUERRA1'?: string; inicioSituacao?: string | null; fimSituacao?: string | null;
  inicioFerias?: string | null; fimFerias?: string | null; publicacaoFerias?: string; observacao?: string; [k: string]: any;
}
export interface Q5Atestado { policialId: string; dataInicio: string; dataFim: string; dias?: number; cid?: string; cidDescricao?: string; }

export interface Q5Registro {
  policial: Q5Policial; posto: Q5Posto; categoriaId: string; origem: string;
  inicio?: string | null; fim?: string | null; dias?: number | null; detalhe?: string;
}
export interface Q5Inconsistencia { policial: Q5Policial; motivo: string; tipo?: 'unidade' | 'posto' | 'semInicio' | 'fimVencido' | 'feriasVencidas' | 'naoLigada' | 'simultanea'; }
export interface Q5Resultado {
  efetivo: Q5Registro[]; porCategoria: Record<string, Q5Registro[]>; inconsistencias: Q5Inconsistencia[];
}

const d = (s?: string | null) => (s ? String(s).slice(0, 10) : '');
const vigente = (ref: string, ini?: string | null, fim?: string | null) => (!ini || d(ini) <= ref) && (!fim || d(fim) >= ref);
const diasEntre = (a?: string | null, b?: string | null) => a && b ? Math.round((new Date(d(b)).getTime() - new Date(d(a)).getTime()) / 864e5) + 1 : null;

/** Calcula o Q5 para a data de referência (yyyy-MM-dd). */
export function calcularQ5(policiais: Q5Policial[], atestados: Q5Atestado[], ref: string, cats: Q5Categoria[]): Q5Resultado {
  const porCategoria: Record<string, Q5Registro[]> = Object.fromEntries(cats.map(c => [c.id, []]));
  const efetivo: Q5Registro[] = [];
  const inconsistencias: Q5Inconsistencia[] = [];
  const hoje = new Date().toISOString().slice(0, 10);
  const afast = [...cats].filter(c => c.tipo === 'afastamento').sort((a, b) => a.prioridade - b.prioridade);
  const funcs = cats.filter(c => c.tipo === 'funcao');
  const todasSit = new Set(cats.flatMap(c => c.situacoes.map(norm)));
  const atPorPol = new Map<string, Q5Atestado[]>();
  atestados.forEach(a => { if (!atPorPol.has(a.policialId)) atPorPol.set(a.policialId, []); atPorPol.get(a.policialId)!.push(a); });

  for (const p of policiais) {
    if (p.aDisposicao) continue;
    const posto = normalizarPosto(p['Post/Grad']);
    if (!posto) { inconsistencias.push({ policial: p, tipo: 'posto', motivo: `Posto/graduação não reconhecido: "${p['Post/Grad'] || 'vazio'}"` }); continue; }
    if (!normalizarUnidade(lerUnidadeBruta(p))) inconsistencias.push({ policial: p, tipo: 'unidade', motivo: `Unidade não reconhecida: "${lerUnidadeBruta(p) || 'vazia'}"` });
    const base = { policial: p, posto };
    efetivo.push({ ...base, categoriaId: 'efetivo', origem: 'Cadastro de policiais' });
    const sit = norm(p.SITUAÇÃO); const fun = norm(p['FUNÇÃO']);
    const ehAtual = ref >= hoje;
    const candidatos: Q5Registro[] = [];

    for (const c of afast) {
      const sits = c.situacoes.map(norm);
      const ehFer = sit.includes('FERIAS');
      if (ehFer && sits.includes(sit) && p.fimFerias && !vigente(ref, p.inicioFerias, p.fimFerias)) continue;
      if (sit && sits.includes(sit) && (ehAtual ? (!p.fimSituacao || d(p.fimSituacao) >= ref) && (!p.inicioSituacao || d(p.inicioSituacao) <= ref) : vigente(ref, p.inicioSituacao, p.fimSituacao) && !!p.inicioSituacao)) {
        const ehFerias = sit.includes('FERIAS');
        const ini = ehFerias ? p.inicioFerias || p.inicioSituacao : p.inicioSituacao;
        const fim = ehFerias ? p.fimFerias || p.fimSituacao : p.fimSituacao;
        candidatos.push({ ...base, categoriaId: c.id, origem: `Situação: ${p.SITUAÇÃO}`, inicio: ini, fim, dias: diasEntre(ini, fim), detalhe: ehFerias && p.publicacaoFerias ? `Publicação: ${p.publicacaoFerias}` : undefined });
        continue;
      }
      if (c.situacoes.some(s => norm(s).includes('FERIAS')) && p.inicioFerias && p.fimFerias && vigente(ref, p.inicioFerias, p.fimFerias)) {
        candidatos.push({ ...base, categoriaId: c.id, origem: 'Módulo de férias', inicio: p.inicioFerias, fim: p.fimFerias, dias: diasEntre(p.inicioFerias, p.fimFerias), detalhe: p.publicacaoFerias ? `Publicação: ${p.publicacaoFerias}` : undefined });
        continue;
      }
      if (c.usaAtestados) {
        const a = (atPorPol.get(p.id) || []).find(x => vigente(ref, x.dataInicio, x.dataFim));
        if (a) { candidatos.push({ ...base, categoriaId: c.id, origem: 'Atestado médico', inicio: a.dataInicio, fim: a.dataFim, dias: a.dias ?? diasEntre(a.dataInicio, a.dataFim), detalhe: a.cid ? `CID ${a.cid}${a.cidDescricao ? ' – ' + a.cidDescricao : ''}` : undefined }); continue; }
      }
      if (fun && c.funcoes.map(norm).includes(fun) && ehAtual) candidatos.push({ ...base, categoriaId: c.id, origem: `Função: ${p['FUNÇÃO']} (cadastro atual)` });
    }

    if (candidatos.length) {
      porCategoria[candidatos[0].categoriaId].push(candidatos[0]);
      const outras = [...new Set(candidatos.slice(1).map(c => c.categoriaId))].filter(id => id !== candidatos[0].categoriaId);
      if (outras.length) inconsistencias.push({ policial: p, tipo: 'simultanea', motivo: `Situações simultâneas: contado em ${cats.find(c => c.id === candidatos[0].categoriaId)?.titulo}; também se encaixa em ${outras.map(id => cats.find(c => c.id === id)?.titulo).join(', ')}` });
    } else {
      const f = funcs.find(c => c.funcoes.map(norm).includes(fun));
      if (f) porCategoria[f.id].push({ ...base, categoriaId: f.id, origem: `Função: ${p['FUNÇÃO']}${ehAtual ? '' : ' (cadastro atual)'}` });
    }

    if (sit && sit !== 'MONTADO' && sit !== 'EM ATIVIDADE' && !sit.startsWith('MONTADO') && !todasSit.has(sit) && !sit.includes('DISPOSI')) inconsistencias.push({ policial: p, tipo: 'naoLigada', motivo: `Situação "${p.SITUAÇÃO}" não está ligada a nenhuma categoria do Q5` });
    if (sit && todasSit.has(sit) && !p.inicioSituacao && !sit.includes('FERIAS')) inconsistencias.push({ policial: p, tipo: 'semInicio', motivo: `Situação "${p.SITUAÇÃO}" sem data de início` });
    if (sit.includes('FERIAS') && p.fimFerias && d(p.fimFerias) < hoje) inconsistencias.push({ policial: p, tipo: 'feriasVencidas', motivo: `Férias terminaram em ${d(p.fimFerias)} mas a situação continua FÉRIAS` });
    if (p.fimSituacao && d(p.fimSituacao) < hoje && sit && sit !== 'MONTADO' && sit !== 'EM ATIVIDADE') inconsistencias.push({ policial: p, tipo: 'fimVencido', motivo: `Situação "${p.SITUAÇÃO}" com fim em ${d(p.fimSituacao)} ainda não retirada` });
  }
  return { efetivo, porCategoria, inconsistencias };
}

/** Nome de guerra sem o posto repetido (ex.: posto "CB" + "CB GALDINO" -> "CB GALDINO"). */
export function nomeExibicao(p: Q5Policial): string {
  const posto = String(p['Post/Grad'] || '').trim();
  const nome = String(p['NOME DE GUERRA1'] || p.NOME || '').trim();
  const base = posto.replace(/\s*PM$/i, '').trim();
  if (!posto) return nome;
  const nu = norm(nome).replace(/[º°ª.]/g, ''); const bu = norm(base).replace(/[º°ª.]/g, '');
  if (bu && (nu === bu || nu.startsWith(bu + ' '))) return nome;
  return `${posto} ${nome}`;
}
