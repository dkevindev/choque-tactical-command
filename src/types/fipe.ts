
export interface ViaturaFipe {
  id: string;
  viaturaId: string;
  cadastro: string;
  placa: string;
  valorFipe: number; // Em centavos
  dataAtualizacao: string;
  ativo: boolean;
  historico?: {
    valorAnterior: number;
    dataAlteracao: string;
    usuarioAlteracao?: string;
  }[];
}

export interface SaldoAnual {
  valorFipe: number;
  limiteAnual: number; // 70% do FIPE
  gastoUltimos12Meses: number;
  saldoRestante: number;
  limitePorOS: number; // 20% do FIPE
}
