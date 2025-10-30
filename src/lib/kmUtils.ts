/**
 * Verifica se um valor é numérico
 */
export const isNumeric = (value: string | number): boolean => {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    return !isNaN(parseFloat(value)) && isFinite(Number(value));
  }
  return false;
};

/**
 * Calcula a KM rodada
 */
export const calcularKmRodada = (kmAtual: string | number, kmAnterior: number): number | null => {
  if (!isNumeric(kmAtual)) return null;
  
  const kmAtualNum = typeof kmAtual === 'number' ? kmAtual : parseFloat(kmAtual);
  return kmAtualNum - kmAnterior;
};

/**
 * Calcula litros por KM
 */
export const calcularLitrosPorKm = (litros: number, kmRodada: number): number | null => {
  if (!litros || !kmRodada || kmRodada === 0) return null;
  return litros / kmRodada;
};

/**
 * Formata um valor para exibição (se null ou undefined, retorna "-")
 */
export const formatarValorOuTraco = (valor: string | number | null | undefined): string => {
  if (valor === null || valor === undefined || valor === '') return '-';
  return String(valor);
};

/**
 * Lista fixa de viaturas para o controle de KM
 */
export const VIATURAS_CONTROLE_KM = [
  'CAV 05',
  'CAV 06',
  'CAV 08',
  'CAV 11',
  'CAV 12',
  'CAV 13',
  'T/A 01',
  'T/A 02',
  'TL 75',
  'TP/ÔNIBUS',
  'OII 6398',
  'PNK 8927',
  'PMF 8020',
  'PMN 9507',
];
