import math
from datetime import datetime, timedelta
from typing import List, Tuple, Optional
from enum import Enum
import locale
from dataclasses import dataclass, field
from abc import ABC, abstractmethod

# Configuração de locale para formato brasileiro
try:
    locale.setlocale(locale.LC_ALL, 'pt_BR.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_ALL, 'Portuguese_Brazil.1252')
    except:
        pass

# ==================== ENUMS ====================

class TipoIndexador(Enum):
    CDI = "CDI"
    IPCA = "IPCA"
    PREFIXADO = "Prefixado"

class TipoIR(Enum):
    ISENTO = "Isento"
    REGRESSIVO = "Tabela Regressiva"

# Tabela de IR (dias, alíquota %)
TABELA_IR = [
    (180, 22.5),
    (360, 20.0),
    (720, 17.5),
    (float('inf'), 15.0)
]

# ==================== CLASSES DE DADOS ====================

@dataclass
class ProjecaoMensal:
    mes: int
    data: str
    montante: float
    investido: float
    rendimento: float
    rentabilidade_acumulada: float
    imposto: float = 0

@dataclass
class ResultadoSimulacao:
    nome: str
    montante_bruto: float
    montante_liquido: float
    total_investido: float
    lucro_bruto: float
    lucro_liquido: float
    rentabilidade_bruta: float
    rentabilidade_liquida: float
    rentabilidade_real: float
    aliquota_ir: float
    imposto_pago: float
    indexador: str
    meses: int
    data: str
    taxa_anual: float
    aporte_mensal: float
    projecoes: List[ProjecaoMensal] = field(default_factory=list)
    volatilidade: float = 0
    sharpe_ratio: float = 0
    inflacao_total: float = 0
    montante_real: float = 0

@dataclass
class ParametrosSimulacao:
    valor_inicial: float
    meses: int
    aporte_mensal: float = 0
    taxa_cdi: float = 0.10
    percentual_cdi: float = 1.0
    ipca: float = 0.04
    taxa_prefixada: float = 0.05
    inflacao: float = 0.04   # inflação anual esperada

# ==================== CALCULADOR DE IR ====================

class CalculadorIR:
    @staticmethod
    def aliquota(dias: int) -> float:
        for limite, ali in TABELA_IR:
            if dias <= limite:
                return ali
        return 15.0

# ==================== ANALISADOR DE RISCO ====================

class AnalisadorRisco:
    @staticmethod
    def volatilidade(valores: List[float]) -> float:
        if len(valores) < 2:
            return 0.0
        retornos = []
        for i in range(1, len(valores)):
            if valores[i-1] == 0:
                continue
            retornos.append((valores[i] - valores[i-1]) / valores[i-1])
        if not retornos:
            return 0.0
        media = sum(retornos) / len(retornos)
        variancia = sum((r - media) ** 2 for r in retornos) / len(retornos)
        volat_mensal = math.sqrt(variancia)
        return volat_mensal * math.sqrt(12) * 100

    @staticmethod
    def sharpe(rentabilidade: float, risco: float) -> float:
        if risco <= 0:
            return 0.0
        return (rentabilidade/100 - 0.10) / (risco/100)

# ==================== CLASSE BASE ====================

class Investimento(ABC):
    def __init__(self, nome: str, tipo_ir: TipoIR, indexador: TipoIndexador):
        self.nome = nome
        self.tipo_ir = tipo_ir
        self.indexador = indexador

    @abstractmethod
    def taxa_mensal(self, params: ParametrosSimulacao) -> float:
        pass

    def taxa_anual(self, params: ParametrosSimulacao) -> float:
        tm = self.taxa_mensal(params)
        return (1 + tm) ** 12 - 1

    def calcular(self, params: ParametrosSimulacao) -> ResultadoSimulacao:
        tm = self.taxa_mensal(params)

        # Montante final com valor inicial e aportes
        montante = params.valor_inicial * (1 + tm) ** params.meses
        if params.aporte_mensal > 0 and tm > 0:
            montante += params.aporte_mensal * (((1 + tm) ** params.meses - 1) / tm)
        elif params.aporte_mensal > 0:
            montante += params.aporte_mensal * params.meses

        total_investido = params.valor_inicial + params.aporte_mensal * params.meses
        lucro_bruto = montante - total_investido

        # IR
        if self.tipo_ir != TipoIR.ISENTO:
            dias = params.meses * 30
            aliquota_ir = CalculadorIR.aliquota(dias)
            imposto = lucro_bruto * (aliquota_ir / 100)
        else:
            aliquota_ir = 0.0
            imposto = 0.0

        montante_liquido = montante - imposto
        lucro_liquido = montante_liquido - total_investido

        # Rentabilidades percentuais
        if params.valor_inicial > 0:
            rent_bruta = (montante / params.valor_inicial - 1) * 100
            rent_liquida = (montante_liquido / params.valor_inicial - 1) * 100
        else:
            rent_bruta = rent_liquida = 0.0

        # Inflação no período
        inflacao_total = ((1 + params.inflacao) ** (params.meses / 12) - 1) * 100
        rent_real = rent_liquida - inflacao_total
        montante_real = montante_liquido / (1 + inflacao_total/100)

        # Projeções mensais
        projecoes = []
        montante_atual = params.valor_inicial
        total_investido_atual = params.valor_inicial
        imposto_acumulado = 0.0

        for mes in range(1, params.meses + 1):
            rendimento_mes = montante_atual * tm
            montante_atual += rendimento_mes

            if mes > 1 and params.aporte_mensal > 0:
                montante_atual += params.aporte_mensal
                total_investido_atual += params.aporte_mensal

            if self.tipo_ir != TipoIR.ISENTO:
                imposto_mes = rendimento_mes * (aliquota_ir / 100)
                imposto_acumulado += imposto_mes

            rent_acum = (montante_atual / params.valor_inicial - 1) * 100 if params.valor_inicial > 0 else 0

            projecoes.append(ProjecaoMensal(
                mes=mes,
                data=(datetime.now() + timedelta(days=30*mes)).strftime('%m/%Y'),
                montante=montante_atual,
                investido=total_investido_atual,
                rendimento=rendimento_mes,
                rentabilidade_acumulada=rent_acum,
                imposto=imposto_acumulado
            ))

        # Risco
        valores = [p.montante for p in projecoes]
        volatilidade = AnalisadorRisco.volatilidade(valores)
        sharpe = AnalisadorRisco.sharpe(rent_liquida, volatilidade)

        return ResultadoSimulacao(
            nome=self.nome,
            montante_bruto=montante,
            montante_liquido=montante_liquido,
            total_investido=total_investido,
            lucro_bruto=lucro_bruto,
            lucro_liquido=lucro_liquido,
            rentabilidade_bruta=rent_bruta,
            rentabilidade_liquida=rent_liquida,
            rentabilidade_real=rent_real,
            aliquota_ir=aliquota_ir,
            imposto_pago=imposto,
            indexador=self.indexador.value,
            meses=params.meses,
            data=datetime.now().strftime('%d/%m/%Y %H:%M'),
            taxa_anual=self.taxa_anual(params) * 100,
            aporte_mensal=params.aporte_mensal,
            projecoes=projecoes,
            volatilidade=volatilidade,
            sharpe_ratio=sharpe,
            inflacao_total=inflacao_total,
            montante_real=montante_real
        )

# ==================== IMPLEMENTAÇÕES CONCRETAS ====================

class CDB(Investimento):
    def __init__(self):
        super().__init__("CDB", TipoIR.REGRESSIVO, TipoIndexador.CDI)
    def taxa_mensal(self, params):
        return (params.taxa_cdi * params.percentual_cdi) / 12

class LCI(Investimento):
    def __init__(self):
        super().__init__("LCI", TipoIR.ISENTO, TipoIndexador.CDI)
    def taxa_mensal(self, params):
        return (params.taxa_cdi * params.percentual_cdi) / 12

class LCA(Investimento):
    def __init__(self):
        super().__init__("LCA", TipoIR.ISENTO, TipoIndexador.CDI)
    def taxa_mensal(self, params):
        return (params.taxa_cdi * params.percentual_cdi) / 12

class CRI(Investimento):
    def __init__(self):
        super().__init__("CRI", TipoIR.ISENTO, TipoIndexador.IPCA)
    def taxa_mensal(self, params):
        taxa_anual = (1 + params.ipca) * (1 + params.taxa_prefixada) - 1
        return (1 + taxa_anual) ** (1/12) - 1

class CRA(Investimento):
    def __init__(self):
        super().__init__("CRA", TipoIR.ISENTO, TipoIndexador.IPCA)
    def taxa_mensal(self, params):
        taxa_anual = (1 + params.ipca) * (1 + params.taxa_prefixada) - 1
        return (1 + taxa_anual) ** (1/12) - 1

class IPCAPlus(Investimento):
    def __init__(self):
        super().__init__("IPCA+", TipoIR.REGRESSIVO, TipoIndexador.IPCA)
    def taxa_mensal(self, params):
        taxa_anual = (1 + params.ipca) * (1 + params.taxa_prefixada) - 1
        return (1 + taxa_anual) ** (1/12) - 1

class Prefixado(Investimento):
    def __init__(self):
        super().__init__("Prefixado", TipoIR.REGRESSIVO, TipoIndexador.PREFIXADO)
    def taxa_mensal(self, params):
        return (1 + params.taxa_prefixada) ** (1/12) - 1

# ==================== FACTORY ====================

class InvestimentoFactory:
    @staticmethod
    def todos() -> List[Investimento]:
        return [CDB(), LCI(), LCA(), CRI(), CRA(), IPCAPlus(), Prefixado()]

    @staticmethod
    def por_id(id: int) -> Optional[Investimento]:
        lista = InvestimentoFactory.todos()
        return lista[id] if 0 <= id < len(lista) else None