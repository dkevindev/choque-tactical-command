import { responderConsultaViatura } from './responderConsultaViatura';
import { handleEntradaOficina, handleSaidaOficina } from './oficinaHandler';
import { responderConsultaPatrimonio } from './patrimonioHandler';
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
  {
    name: 'entrada_oficina',
    patterns: ['registrar entrada', 'entrada oficina', 'levar oficina', 'deixar oficina', 'entrada na oficina', 'colocar oficina', 'mandar oficina'],
    handler: handleEntradaOficina,
  },
  {
    name: 'saida_oficina',
    patterns: ['registrar saída', 'saída oficina', 'retirar oficina', 'buscar oficina', 'saída da oficina', 'pegar oficina', 'finalizar serviço'],
    handler: handleSaidaOficina,
  },
  {
    name: 'consultar_patrimonio',
    patterns: ['patrimônio', 'patrimonio', 'tombo', 'localizar item', 'onde está o', 'onde fica o'],
    handler: responderConsultaPatrimonio,
  },
];
