import os
import sys
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any
from enum import Enum
import locale
from dataclasses import dataclass
from abc import ABC, abstractmethod

# Configuração de locale para formato brasileiro
try:
    locale.setlocale(locale.LC_ALL, 'pt_BR.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_ALL, 'Portuguese_Brazil.1252')
    except:
        pass

# ==================== CONSTANTES E ENUMS ====================

class TipoIndexador(Enum):
    CDI = "CDI"
    IPCA = "IPCA"
    PREFIXADO = "Prefixado"
    CDI_IPCA = "CDI/IPCA"

class TipoIR(Enum):
    ISENTO = "Isento"
    REGRESSIVO = "Tabela Regressiva"

# Tabela de IR compartilhada (dias, alíquota)
TABELA_IR = [
    (180, 22.5),   # até 180 dias: 22.5%
    (360, 20.0),   # 181 a 360 dias: 20%
    (720, 17.5),   # 361 a 720 dias: 17.5%
    (float('inf'), 15.0)  # acima de 720 dias: 15%
]

# ==================== CLASSES DE DADOS ====================

@dataclass
class ResultadoSimulacao:
    """Classe para armazenar resultados de simulação"""
    nome_investimento: str
    montante_bruto: float
    montante_liquido: float
    total_investido: float
    lucro_bruto: float
    lucro_liquido: float
    rentabilidade_bruta: float
    rentabilidade_liquida: float
    aliquota_ir: float
    imposto_pago: float
    indexador: str
    meses: int
    data: datetime
    taxa_mensal: float = 0
    taxa_anual: float = 0
    aporte_mensal: float = 0

@dataclass
class ParametrosSimulacao:
    """Classe para parâmetros de simulação"""
    valor_inicial: float
    meses: int
    aporte_mensal: float = 0
    taxa_cdi_anual: float = 0.10
    percentual_cdi: float = 1.0
    ipca_projetado: float = 0.04
    taxa_prefixada: float = 0.05

# ==================== SINGLETON DE FORMATAÇÃO ====================

class Formatador:
    """Singleton para formatação de valores"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def moeda(self, valor: float) -> str:
        """Formata valor para moeda brasileira"""
        try:
            return locale.currency(valor, grouping=True, symbol='R$')
        except:
            return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    def porcentagem(self, valor: float, casas: int = 2) -> str:
        """Formata valor para porcentagem"""
        return f"{valor:.{casas}f}%".replace(".", ",")

# ==================== CALCULADOR DE IR ====================

class CalculadorIR:
    """Classe para cálculos de IR"""
    
    @staticmethod
    def calcular_aliquota(dias: int) -> float:
        for limite, aliquota in TABELA_IR:
            if dias <= limite:
                return aliquota
        return TABELA_IR[-1][1]
    
    @staticmethod
    def calcular_imposto(lucro: float, dias: int) -> Tuple[float, float]:
        aliquota = CalculadorIR.calcular_aliquota(dias)
        return aliquota, lucro * (aliquota / 100)
    
    @staticmethod
    def taxa_equivalente(taxa: float, dias: int, para_cdb: bool = True) -> float:
        aliquota = CalculadorIR.calcular_aliquota(dias) / 100
        if para_cdb:
            return taxa / (1 - aliquota)
        else:
            return taxa * (1 - aliquota)

# ==================== CLASSE BASE DE INVESTIMENTO ====================

class Investimento(ABC):
    """Classe base abstrata para todos os investimentos"""
    
    def __init__(self, nome: str, tipo_ir: TipoIR, tipo_indexador: TipoIndexador, 
                 carencia_dias: int = 0, tem_fgc: bool = True):
        self.nome = nome
        self.tipo_ir = tipo_ir
        self.tipo_indexador = tipo_indexador
        self.carencia_dias = carencia_dias
        self.tem_fgc = tem_fgc
        self.formatador = Formatador()
    
    @abstractmethod
    def calcular_taxa_mensal(self, params: ParametrosSimulacao) -> float:
        pass
    
    def calcular_taxa_anual(self, params: ParametrosSimulacao) -> float:
        return self.calcular_taxa_mensal(params) * 12
    
    def calcular_montante(self, params: ParametrosSimulacao, taxa_mensal: float) -> Tuple[float, float]:
        montante = params.valor_inicial * (1 + taxa_mensal) ** params.meses
        
        if params.aporte_mensal > 0 and taxa_mensal > 0:
            montante += params.aporte_mensal * (((1 + taxa_mensal) ** params.meses - 1) / taxa_mensal)
        elif params.aporte_mensal > 0:
            montante += params.aporte_mensal * params.meses
        
        total_investido = params.valor_inicial + (params.aporte_mensal * params.meses)
        return montante, total_investido
    
    def calcular_ir(self, lucro: float, meses: int) -> Tuple[float, float]:
        if self.tipo_ir == TipoIR.ISENTO:
            return 0, 0
        return CalculadorIR.calcular_imposto(lucro, meses * 30)
    
    def calcular_rendimento(self, params: ParametrosSimulacao) -> ResultadoSimulacao:
        try:
            taxa_mensal = self.calcular_taxa_mensal(params)
            montante, total_investido = self.calcular_montante(params, taxa_mensal)
            
            lucro_bruto = montante - total_investido
            aliquota_ir, imposto = self.calcular_ir(lucro_bruto, params.meses)
            
            montante_liquido = montante - imposto
            lucro_liquido = montante_liquido - total_investido
            
            rent_bruta = (montante / params.valor_inicial - 1) * 100 if params.valor_inicial > 0 else 0
            rent_liquida = (montante_liquido / params.valor_inicial - 1) * 100 if params.valor_inicial > 0 else 0
            
            return ResultadoSimulacao(
                nome_investimento=self.nome,
                montante_bruto=montante,
                montante_liquido=montante_liquido,
                total_investido=total_investido,
                lucro_bruto=lucro_bruto,
                lucro_liquido=lucro_liquido,
                rentabilidade_bruta=rent_bruta,
                rentabilidade_liquida=rent_liquida,
                aliquota_ir=aliquota_ir,
                imposto_pago=imposto,
                indexador=self.tipo_indexador.value,
                meses=params.meses,
                data=datetime.now(),
                taxa_mensal=taxa_mensal * 100,
                taxa_anual=self.calcular_taxa_anual(params) * 100,
                aporte_mensal=params.aporte_mensal
            )
        except Exception as e:
            raise Exception(f"Erro ao calcular rendimento do {self.nome}: {e}")
    
    def verificar_carencia(self, meses: int) -> Tuple[bool, str]:
        dias = meses * 30
        if dias < self.carencia_dias:
            return False, f"⚠️ Carência de {self.carencia_dias} dias não atendida (atual: {dias} dias)"
        return True, "✅ Carência ok"
    
    def obter_info(self) -> Dict[str, Any]:
        return {
            'nome': self.nome,
            'tipo_ir': self.tipo_ir.value,
            'indexador': self.tipo_indexador.value,
            'carencia_dias': self.carencia_dias,
            'carencia_meses': self.carencia_dias // 30,
            'tem_fgc': self.tem_fgc
        }

# ==================== IMPLEMENTAÇÕES CONCRETAS ====================

class InvestimentoCDI(Investimento):
    def __init__(self, nome: str, tipo_ir: TipoIR, carencia_dias: int = 0):
        super().__init__(nome, tipo_ir, TipoIndexador.CDI, carencia_dias)
    
    def calcular_taxa_mensal(self, params: ParametrosSimulacao) -> float:
        return (params.taxa_cdi_anual * params.percentual_cdi) / 12
    
    def calcular_taxa_anual(self, params: ParametrosSimulacao) -> float:
        return params.taxa_cdi_anual * params.percentual_cdi

class InvestimentoIPCA(Investimento):
    def __init__(self, nome: str, tipo_ir: TipoIR, carencia_dias: int = 0):
        super().__init__(nome, tipo_ir, TipoIndexador.IPCA, carencia_dias)
    
    def calcular_taxa_mensal(self, params: ParametrosSimulacao) -> float:
        taxa_anual = (1 + params.ipca_projetado) * (1 + params.taxa_prefixada) - 1
        return (1 + taxa_anual) ** (1/12) - 1
    
    def calcular_taxa_anual(self, params: ParametrosSimulacao) -> float:
        return (1 + params.ipca_projetado) * (1 + params.taxa_prefixada) - 1

class InvestimentoHibrido(Investimento):
    def __init__(self, nome: str, tipo_ir: TipoIR, carencia_dias: int = 0):
        super().__init__(nome, tipo_ir, TipoIndexador.CDI_IPCA, carencia_dias)
    
    def calcular_taxa_mensal(self, params: ParametrosSimulacao) -> float:
        peso_cdi = 0.5
        peso_ipca = 0.5
        
        taxa_cdi_anual = params.taxa_cdi_anual * params.percentual_cdi
        taxa_ipca_anual = (1 + params.ipca_projetado) * (1 + params.taxa_prefixada) - 1
        
        taxa_anual = (taxa_cdi_anual * peso_cdi) + (taxa_ipca_anual * peso_ipca)
        return taxa_anual / 12

# ==================== FACTORY DE INVESTIMENTOS ====================

class InvestimentoFactory:
    @staticmethod
    def criar_todos() -> Dict[str, Investimento]:
        return {
            '1': InvestimentoCDI("CDB", TipoIR.REGRESSIVO),
            '2': InvestimentoCDI("LCI", TipoIR.ISENTO, 90),
            '3': InvestimentoCDI("LCA", TipoIR.ISENTO, 90),
            '4': InvestimentoCDI("LCD", TipoIR.ISENTO, 90),
            '5': InvestimentoIPCA("CRI", TipoIR.ISENTO, 30),
            '6': InvestimentoIPCA("CRA", TipoIR.ISENTO, 30),
            '7': InvestimentoIPCA("IPCA+", TipoIR.REGRESSIVO),
            '8': InvestimentoHibrido("CDB Híbrido", TipoIR.REGRESSIVO),
        }

# ==================== GERADOR DE RELATÓRIOS ====================

class GeradorRelatorio:
    """Classe para gerar relatórios em PDF ou TXT"""
    
    def __init__(self, formatador: Formatador):
        self.formatador = formatador
        self.fpdf_disponivel = self._verificar_fpdf()
    
    def _verificar_fpdf(self) -> bool:
        """Verifica se a biblioteca fpdf2 está disponível"""
        try:
            from fpdf import FPDF
            return True
        except ImportError:
            return False
    
    def _formatar_moeda(self, valor: float) -> str:
        """Formata valor para moeda"""
        return self.formatador.moeda(valor)
    
    def gerar_txt(self, resultado: ResultadoSimulacao) -> Optional[str]:
        """Gera relatório em TXT"""
        try:
            nome = f"relatorio_{resultado.nome_investimento}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            
            with open(nome, 'w', encoding='utf-8') as f:
                f.write("=" * 60 + "\n")
                f.write("RELATÓRIO DE INVESTIMENTO\n".center(60))
                f.write("=" * 60 + "\n\n")
                
                f.write(f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
                f.write(f"Investimento: {resultado.nome_investimento}\n")
                f.write(f"Indexador: {resultado.indexador}\n")
                f.write(f"Período: {resultado.meses} meses ({resultado.meses * 30} dias)\n")
                if resultado.aporte_mensal > 0:
                    f.write(f"Aporte Mensal: {self._formatar_moeda(resultado.aporte_mensal)}\n")
                f.write("-" * 60 + "\n\n")
                
                f.write("RESULTADOS FINANCEIROS:\n")
                f.write("-" * 40 + "\n")
                f.write(f"Valor Inicial: {self._formatar_moeda(resultado.total_investido)}\n")
                f.write(f"Montante Bruto: {self._formatar_moeda(resultado.montante_bruto)}\n")
                f.write(f"Montante Líquido: {self._formatar_moeda(resultado.montante_liquido)}\n")
                f.write(f"Rendimento Líquido: {self._formatar_moeda(resultado.lucro_liquido)}\n\n")
                
                f.write("RENTABILIDADES:\n")
                f.write("-" * 40 + "\n")
                f.write(f"Rentabilidade Bruta: {resultado.rentabilidade_bruta:.2f}%\n")
                f.write(f"Rentabilidade Líquida: {resultado.rentabilidade_liquida:.2f}%\n")
                if resultado.taxa_anual > 0:
                    f.write(f"Taxa Anual: {resultado.taxa_anual:.2f}%\n\n")
                
                if resultado.imposto_pago > 0:
                    f.write("IMPOSTO DE RENDA:\n")
                    f.write("-" * 40 + "\n")
                    f.write(f"Alíquota: {resultado.aliquota_ir:.1f}%\n")
                    f.write(f"Imposto Pago: {self._formatar_moeda(resultado.imposto_pago)}\n\n")
                else:
                    f.write("✅ INVESTIMENTO ISENTO DE IR\n\n")
                
                f.write("=" * 60 + "\n")
                f.write("DOCUMENTO GERADO AUTOMATICAMENTE\n".center(60))
                f.write("=" * 60 + "\n")
            
            return nome
            
        except Exception as e:
            print(f"Erro ao gerar TXT: {e}")
            return None
    
    def gerar_pdf_completo(self, resultado: ResultadoSimulacao) -> Optional[str]:
        """Gera relatório em PDF versão completa"""
        if not self.fpdf_disponivel:
            return None
        
        try:
            from fpdf import FPDF
            
            pdf = FPDF()
            pdf.add_page()
            
            # Cabeçalho
            pdf.set_fill_color(41, 128, 185)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font('helvetica', 'B', 20)
            pdf.cell(190, 20, 'RELATÓRIO DE INVESTIMENTO', 0, 1, 'C', 1)
            pdf.ln(5)
            
            # Data
            pdf.set_text_color(100, 100, 100)
            pdf.set_font('helvetica', 'I', 10)
            pdf.cell(190, 6, f'Gerado em: {datetime.now().strftime("%d/%m/%Y %H:%M")}', 0, 1, 'R')
            pdf.ln(5)
            
            # Dados do Investimento
            pdf.set_fill_color(236, 240, 241)
            pdf.set_text_color(52, 73, 94)
            pdf.set_font('helvetica', 'B', 14)
            pdf.cell(190, 10, 'DADOS DO INVESTIMENTO', 0, 1, 'L', 1)
            pdf.ln(2)
            
            pdf.set_text_color(0, 0, 0)
            pdf.set_font('helvetica', '', 11)
            pdf.cell(50, 7, 'Tipo:', 0, 0)
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 7, resultado.nome_investimento, 0, 1)
            
            pdf.set_font('helvetica', '', 11)
            pdf.cell(50, 7, 'Indexador:', 0, 0)
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 7, resultado.indexador, 0, 1)
            
            pdf.set_font('helvetica', '', 11)
            pdf.cell(50, 7, 'Período:', 0, 0)
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 7, f'{resultado.meses} meses', 0, 1)
            pdf.ln(5)
            
            # Resultados Financeiros
            pdf.set_fill_color(236, 240, 241)
            pdf.set_text_color(52, 73, 94)
            pdf.set_font('helvetica', 'B', 14)
            pdf.cell(190, 10, 'RESULTADOS FINANCEIROS', 0, 1, 'L', 1)
            pdf.ln(2)
            
            dados = [
                ('Valor Inicial:', resultado.total_investido),
                ('Montante Bruto:', resultado.montante_bruto),
                ('Montante Líquido:', resultado.montante_liquido),
                ('Rendimento Líquido:', resultado.lucro_liquido)
            ]
            
            for label, valor in dados:
                pdf.set_font('helvetica', '', 11)
                pdf.cell(50, 7, label, 0, 0)
                pdf.set_font('helvetica', 'B', 11)
                pdf.cell(0, 7, self._formatar_moeda(valor), 0, 1)
            pdf.ln(3)
            
            # Rentabilidades
            pdf.set_font('helvetica', '', 11)
            pdf.cell(50, 7, 'Rent. Bruta:', 0, 0)
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 7, f'{resultado.rentabilidade_bruta:.2f}%', 0, 1)
            
            pdf.set_font('helvetica', '', 11)
            pdf.cell(50, 7, 'Rent. Líquida:', 0, 0)
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 7, f'{resultado.rentabilidade_liquida:.2f}%', 0, 1)
            
            if resultado.imposto_pago > 0:
                pdf.ln(3)
                pdf.set_font('helvetica', 'B', 11)
                pdf.cell(0, 7, f'IR Pago: {self._formatar_moeda(resultado.imposto_pago)} ({resultado.aliquota_ir:.1f}%)', 0, 1)
            else:
                pdf.ln(3)
                pdf.set_font('helvetica', 'B', 11)
                pdf.set_text_color(39, 174, 96)
                pdf.cell(0, 7, '✅ INVESTIMENTO ISENTO DE IR', 0, 1)
            
            nome = f"relatorio_{resultado.nome_investimento}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf.output(nome)
            return nome
            
        except Exception as e:
            print(f"Erro no PDF: {e}")
            return None
    
    def gerar(self, resultado: ResultadoSimulacao, formato: str = 'pdf') -> Optional[str]:
        """Gera relatório no formato especificado"""
        if formato == 'txt':
            return self.gerar_txt(resultado)
        elif formato == 'pdf':
            return self.gerar_pdf_completo(resultado)
        else:
            return None