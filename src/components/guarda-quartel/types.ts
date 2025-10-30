export interface PolicialEscalado {
  id: string;
  posto: string;
  numeral: string;
  nomeGuerra: string;
  horario?: string;
  observacao?: string;
}

export interface FuncaoServico {
  id: string;
  nome: string;
  policiais: PolicialEscalado[];
  ordem: number;
  removivel: boolean;
  preDefinida: boolean;
}
