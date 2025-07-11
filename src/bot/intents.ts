import { responderConsultaViatura } from './responderConsultaViatura';
import type { BotResponse } from './types';

export interface Intent {
  name: string;
  patterns: string[];
  handler: (input: string) => Promise<BotResponse> | BotResponse;
}

export const intents: Intent[] = [
  {
    name: 'consulta_viatura',
    patterns: ['dados da', 'mostrar viatura', 'cavalaria', 'cav-'],
    handler: responderConsultaViatura,
  },
];
