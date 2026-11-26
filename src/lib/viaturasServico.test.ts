import { describe, test } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { filtrarViaturasPorTipo } from './viaturasServico';

describe('Viaturas disponíveis para seleção de serviço', () => {
  test('frota leve inclui CAV16 mesmo não operacional e sem marcação de uso', () => {
    const viaturas = [
      { id: '16', CADASTRO: 'CAV16', PLACA: 'ABC1D16', tipo: 'leve' as const, operacional: false },
      { id: '05', CADASTRO: 'CAV05', PLACA: 'ABC1D05', tipo: 'leve' as const, operacional: true },
      { id: '17', CADASTRO: 'CAV17', PLACA: 'ABC1D17', tipo: 'leve' as const },
      { id: '18', PLACA: 'ABC1D18', tipo: 'pesada' as const },
    ];
    deepStrictEqual(filtrarViaturasPorTipo(viaturas, 'leve').map(v => v.id), ['16', '05', '17']);
  });

  test('frota pesada inclui todas as categorizadas, independentemente do uso', () => {
    const viaturas = [
      { id: '20', PLACA: 'ABC1D20', tipo: 'pesada' as const, operacional: false },
      { id: '21', PLACA: 'ABC1D21', tipo: 'pesada' as const, operacional: true },
      { id: '22', PLACA: 'ABC1D22', tipo: 'pesada' as const },
      { id: '23', PLACA: 'ABC1D23' },
      { id: '16', PLACA: 'ABC1D16', tipo: 'leve' as const },
    ];
    deepStrictEqual(filtrarViaturasPorTipo(viaturas, 'pesada').map(v => v.id), ['20', '21', '22']);
  });
});