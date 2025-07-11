export interface Viatura {
  id: string;
  CADASTRO: string;
  CHASSI: string;
  GOODCARD: string;
  KM: number;
  KMOLEO: number;
  MODELO: string;
  OBS: string;
  ORD: number;
  PLACA: string;
  PREFIXO: number;
  RADIO: number;
  RENAVAM: number;
  SALDO: number;
  SITUACAO: string;
  UTILIZACAO: string;
}

export type BotResponse =
  | { type: 'text'; text: string }
  | { type: 'show_viatura_modal'; viatura: Viatura };