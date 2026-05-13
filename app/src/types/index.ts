export const TipoIndexador = {
  CDI: "CDI",
  IPCA: "IPCA",
  PREFIXADO: "Prefixado",
  CDI_IPCA: "CDI/IPCA",
} as const;

export type TipoIndexador = typeof TipoIndexador[keyof typeof TipoIndexador];

export const TipoIR = {
  ISENTO: "Isento",
  REGRESSIVO: "Tabela Regressiva",
} as const;

export type TipoIR = typeof TipoIR[keyof typeof TipoIR];

export interface ParametrosSimulacao {
  valor_inicial: number;
  meses: number;
  aporte_mensal: number;
  taxa_cdi_anual: number;
  percentual_cdi: number;
  ipca_projetado: number;
  taxa_prefixada: number;
}

export interface ResultadoSimulacao {
  nome_investimento: string;
  montante_bruto: number;
  montante_liquido: number;
  total_investido: number;
  lucro_bruto: number;
  lucro_liquido: number;
  rentabilidade_bruta: number;
  rentabilidade_liquida: number;
  aliquota_ir: number;
  imposto_pago: number;
  indexador: string;
  meses: number;
  data: string;
  taxa_anual: number;
  aporte_mensal: number;
  indice_sharpe: number;
  carencia_dias: number;
  carencia_atendida: boolean;
  valor_real: number;
}

export interface EvolucaoMensal {
  mes: number;
  saldo_bruto: number;
  total_investido: number;
}

export interface InvestimentoInfo {
  id: string;
  nome: string;
  tipo_ir: TipoIR;
  tipo_indexador: TipoIndexador;
  carencia_dias: number;
  tem_fgc: boolean;
  descricao: string;
  icon: string;
}
