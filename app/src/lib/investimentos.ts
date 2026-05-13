import {
  TipoIndexador,
  TipoIR,
  type ParametrosSimulacao,
  type ResultadoSimulacao,
  type EvolucaoMensal,
  type InvestimentoInfo,
} from "@/types";

// Tabela regressiva de IR
const TABELA_IR: [number, number][] = [
  [180, 22.5],
  [360, 20.0],
  [720, 17.5],
  [Infinity, 15.0],
];

const VOLATILIDADE_POR_INDEXADOR: Record<TipoIndexador, number> = {
  [TipoIndexador.CDI]: 0.03,
  [TipoIndexador.IPCA]: 0.05,
  [TipoIndexador.CDI_IPCA]: 0.04,
  [TipoIndexador.PREFIXADO]: 0.01,
};

// Calculador de IR
export function calcularAliquotaIR(dias: number): number {
  for (const [limite, aliquota] of TABELA_IR) {
    if (dias <= limite) return aliquota;
  }
  return TABELA_IR[TABELA_IR.length - 1][1];
}

export function calcularImposto(lucro: number, dias: number): [number, number] {
  const aliquota = calcularAliquotaIR(dias);
  return [aliquota, lucro * (aliquota / 100)];
}

export function taxaEquivalente(
  taxa: number,
  dias: number,
  paraCDB: boolean = true
): number {
  const aliquota = calcularAliquotaIR(dias) / 100;
  if (paraCDB) {
    return taxa / (1 - aliquota);
  }
  return taxa * (1 - aliquota);
}

// Investimentos disponíveis
export const INVESTIMENTOS: InvestimentoInfo[] = [
  {
    id: "1",
    nome: "CDB",
    tipo_ir: TipoIR.REGRESSIVO,
    tipo_indexador: TipoIndexador.CDI,
    carencia_dias: 0,
    tem_fgc: true,
    descricao: "Certificado de Depósito Bancário",
    icon: "landmark",
  },
  {
    id: "2",
    nome: "LCI",
    tipo_ir: TipoIR.ISENTO,
    tipo_indexador: TipoIndexador.CDI,
    carencia_dias: 90,
    tem_fgc: true,
    descricao: "Letra de Crédito Imobiliário",
    icon: "home",
  },
  {
    id: "3",
    nome: "LCA",
    tipo_ir: TipoIR.ISENTO,
    tipo_indexador: TipoIndexador.CDI,
    carencia_dias: 90,
    tem_fgc: true,
    descricao: "Letra de Crédito do Agronegócio",
    icon: "wheat",
  },
  {
    id: "4",
    nome: "LCD",
    tipo_ir: TipoIR.ISENTO,
    tipo_indexador: TipoIndexador.CDI,
    carencia_dias: 90,
    tem_fgc: true,
    descricao: "Letra de Câmbio",
    icon: "banknote",
  },
  {
    id: "5",
    nome: "CRI",
    tipo_ir: TipoIR.ISENTO,
    tipo_indexador: TipoIndexador.IPCA,
    carencia_dias: 30,
    tem_fgc: false,
    descricao: "Certificado de Recebíveis Imobiliários",
    icon: "building",
  },
  {
    id: "6",
    nome: "CRA",
    tipo_ir: TipoIR.ISENTO,
    tipo_indexador: TipoIndexador.IPCA,
    carencia_dias: 30,
    tem_fgc: false,
    descricao: "Certificado de Recebíveis do Agronegócio",
    icon: "sprout",
  },
  {
    id: "7",
    nome: "IPCA+",
    tipo_ir: TipoIR.REGRESSIVO,
    tipo_indexador: TipoIndexador.IPCA,
    carencia_dias: 0,
    tem_fgc: false,
    descricao: "Título atrelado ao IPCA",
    icon: "trending-up",
  },
  {
    id: "8",
    nome: "CDB Híbrido",
    tipo_ir: TipoIR.REGRESSIVO,
    tipo_indexador: TipoIndexador.CDI_IPCA,
    carencia_dias: 0,
    tem_fgc: true,
    descricao: "CDB com indexação mista CDI/IPCA",
    icon: "git-merge",
  },
  {
    id: "9",
    nome: "Tesouro Selic",
    tipo_ir: TipoIR.REGRESSIVO,
    tipo_indexador: TipoIndexador.CDI,
    carencia_dias: 0,
    tem_fgc: false,
    descricao: "Título público pós-fixado",
    icon: "shield",
  },
  {
    id: "10",
    nome: "Tesouro Prefixado",
    tipo_ir: TipoIR.REGRESSIVO,
    tipo_indexador: TipoIndexador.PREFIXADO,
    carencia_dias: 0,
    tem_fgc: false,
    descricao: "Título público com taxa prefixada",
    icon: "lock",
  },
  {
    id: "11",
    nome: "Debênture Incentivada",
    tipo_ir: TipoIR.ISENTO,
    tipo_indexador: TipoIndexador.IPCA,
    carencia_dias: 30,
    tem_fgc: false,
    descricao: "Título corporativo incentivado",
    icon: "file-text",
  },
  {
    id: "12",
    nome: "Debênture Não Incentivada",
    tipo_ir: TipoIR.REGRESSIVO,
    tipo_indexador: TipoIndexador.IPCA,
    carencia_dias: 30,
    tem_fgc: false,
    descricao: "Título corporativo não incentivado",
    icon: "file-minus",
  },
];

// Cálculo de taxa mensal por tipo de investimento
function calcularTaxaMensal(
  investimento: InvestimentoInfo,
  params: ParametrosSimulacao
): number {
  switch (investimento.tipo_indexador) {
    case TipoIndexador.CDI:
      return (params.taxa_cdi_anual * params.percentual_cdi) / 12;

    case TipoIndexador.IPCA: {
      const taxaAnual = (1 + params.ipca_projetado) * (1 + params.taxa_prefixada) - 1;
      return (1 + taxaAnual) ** (1 / 12) - 1;
    }

    case TipoIndexador.PREFIXADO:
      return (1 + params.taxa_prefixada) ** (1 / 12) - 1;

    case TipoIndexador.CDI_IPCA: {
      const pesoCDI = 0.5;
      const pesoIPCA = 0.5;
      const taxaCDIAnual = params.taxa_cdi_anual * params.percentual_cdi;
      const taxaIPCAAnual = (1 + params.ipca_projetado) * (1 + params.taxa_prefixada) - 1;
      const taxaAnual = taxaCDIAnual * pesoCDI + taxaIPCAAnual * pesoIPCA;
      return taxaAnual / 12;
    }

    default:
      return 0;
  }
}

// Cálculo de taxa anual
function calcularTaxaAnual(
  investimento: InvestimentoInfo,
  params: ParametrosSimulacao
): number {
  switch (investimento.tipo_indexador) {
    case TipoIndexador.CDI:
      return params.taxa_cdi_anual * params.percentual_cdi;
    case TipoIndexador.IPCA:
      return (1 + params.ipca_projetado) * (1 + params.taxa_prefixada) - 1;
    case TipoIndexador.PREFIXADO:
      return params.taxa_prefixada;
    case TipoIndexador.CDI_IPCA: {
      const taxaCDIAnual = params.taxa_cdi_anual * params.percentual_cdi;
      const taxaIPCAAnual = (1 + params.ipca_projetado) * (1 + params.taxa_prefixada) - 1;
      return taxaCDIAnual * 0.5 + taxaIPCAAnual * 0.5;
    }
    default:
      return 0;
  }
}

// Índice de Sharpe
function calcularSharpe(
  investimento: InvestimentoInfo,
  rentabilidadeLiquidaAnual: number,
  params: ParametrosSimulacao
): number {
  const taxaLivreRisco = params.taxa_cdi_anual;
  const volatilidade = VOLATILIDADE_POR_INDEXADOR[investimento.tipo_indexador] || 0.03;
  if (volatilidade === 0) return 0;
  return (rentabilidadeLiquidaAnual - taxaLivreRisco) / volatilidade;
}

// Simulação principal
export function simularInvestimento(
  investimento: InvestimentoInfo,
  params: ParametrosSimulacao
): ResultadoSimulacao {
  const taxaMensal = calcularTaxaMensal(investimento, params);

  // Montante com juros compostos + aportes
  let montante = params.valor_inicial * (1 + taxaMensal) ** params.meses;

  if (params.aporte_mensal > 0 && taxaMensal > 0) {
    montante +=
      params.aporte_mensal *
      (((1 + taxaMensal) ** params.meses - 1) / taxaMensal);
  } else if (params.aporte_mensal > 0) {
    montante += params.aporte_mensal * params.meses;
  }

  const totalInvestido =
    params.valor_inicial + params.aporte_mensal * params.meses;
  const lucroBruto = montante - totalInvestido;

  // IR
  let aliquotaIR = 0;
  let imposto = 0;
  if (investimento.tipo_ir === TipoIR.REGRESSIVO) {
    const dias = params.meses * 30;
    [aliquotaIR, imposto] = calcularImposto(lucroBruto, dias);
  }

  const montanteLiquido = montante - imposto;
  const lucroLiquido = montanteLiquido - totalInvestido;

  const rentBruta =
    params.valor_inicial > 0 ? (montante / params.valor_inicial - 1) * 100 : 0;
  const rentLiquida =
    params.valor_inicial > 0
      ? (montanteLiquido / params.valor_inicial - 1) * 100
      : 0;

  const rentLiquidaAnual =
    params.meses > 0
      ? (1 + rentLiquida / 100) ** (12 / params.meses) - 1
      : 0;

  const sharpe = calcularSharpe(investimento, rentLiquidaAnual, params);
  const dias = params.meses * 30;

  const valorReal =
    montanteLiquido / (1 + params.ipca_projetado) ** (params.meses / 12);

  return {
    nome_investimento: investimento.nome,
    montante_bruto: montante,
    montante_liquido: montanteLiquido,
    total_investido: totalInvestido,
    lucro_bruto: lucroBruto,
    lucro_liquido: lucroLiquido,
    rentabilidade_bruta: rentBruta,
    rentabilidade_liquida: rentLiquida,
    aliquota_ir: aliquotaIR,
    imposto_pago: imposto,
    indexador: investimento.tipo_indexador,
    meses: params.meses,
    data: new Date().toLocaleString("pt-BR"),
    taxa_anual: calcularTaxaAnual(investimento, params) * 100,
    aporte_mensal: params.aporte_mensal,
    indice_sharpe: Math.round(sharpe * 1000) / 1000,
    carencia_dias: investimento.carencia_dias,
    carencia_atendida: dias >= investimento.carencia_dias,
    valor_real: valorReal,
  };
}

// Evolução mensal para gráficos
export function calcularEvolucaoMensal(
  investimento: InvestimentoInfo,
  params: ParametrosSimulacao
): EvolucaoMensal[] {
  const taxaMensal = calcularTaxaMensal(investimento, params);
  const evolucao: EvolucaoMensal[] = [];
  let saldo = params.valor_inicial;
  let totalInvestido = params.valor_inicial;

  for (let mes = 1; mes <= params.meses; mes++) {
    saldo *= 1 + taxaMensal;
    if (mes < params.meses) {
      saldo += params.aporte_mensal;
      totalInvestido += params.aporte_mensal;
    }

    evolucao.push({
      mes,
      saldo_bruto: Math.round(saldo * 100) / 100,
      total_investido: Math.round(totalInvestido * 100) / 100,
    });
  }

  return evolucao;
}

// Comparar todos os investimentos
export function compararInvestimentos(
  params: ParametrosSimulacao
): ResultadoSimulacao[] {
  const resultados: ResultadoSimulacao[] = [];

  for (const inv of INVESTIMENTOS) {
    const resultado = simularInvestimento(inv, params);
    resultados.push(resultado);
  }

  return resultados.sort((a, b) => b.montante_liquido - a.montante_liquido);
}

// Formatadores
export const Formatador = {
  moeda: (valor: number): string => {
    if (isNaN(valor) || valor === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(valor);
  },
  porcentagem: (valor: number, casas = 2): string => {
    if (isNaN(valor) || valor === null) return "0,00%";
    return valor.toFixed(casas).replace(".", ",") + "%";
  },
  numero: (valor: number): string => {
    if (isNaN(valor) || valor === null) return "0";
    return new Intl.NumberFormat("pt-BR").format(valor);
  },
};
