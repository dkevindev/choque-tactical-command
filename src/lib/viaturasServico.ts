import type { ViaturaBasica } from './viaturaUtils';

// A classificação da frota, não o uso operacional, define a lista de serviço.
export const filtrarViaturasPorTipo = (
  viaturas: ViaturaBasica[],
  tipo: 'leve' | 'pesada',
): ViaturaBasica[] => viaturas.filter(viatura => viatura.tipo === tipo);