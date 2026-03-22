from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_session import Session
import os
import secrets
from datetime import datetime
import locale
import logging
from investimentos import *

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Configuração da sessão no servidor
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_FILE_DIR'] = './flask_session'
Session(app)

# Configuração de uploads
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Cache do factory de investimentos
_investimentos_cache = None

def get_investimentos():
    global _investimentos_cache
    if _investimentos_cache is None:
        _investimentos_cache = InvestimentoFactory.criar_todos()
    return _investimentos_cache

# Formatador
formatador = Formatador()

# Configurar locale
try:
    locale.setlocale(locale.LC_ALL, 'pt_BR.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_ALL, 'Portuguese_Brazil.1252')
    except:
        pass

# ==================== ROTAS PRINCIPAIS ====================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simulacao')
def simulacao():
    return render_template('simulacao.html', investimentos=get_investimentos())

@app.route('/comparacao')
def comparacao():
    return render_template('comparacao.html')

@app.route('/historico')
def historico():
    return render_template('historico.html')

@app.route('/calculadora')
def calculadora():
    return render_template('calculadora.html')

@app.route('/informacoes')
def informacoes():
    return render_template('informacoes.html')

# ==================== API ENDPOINTS ====================

@app.route('/api/simular', methods=['POST'])
def api_simular():
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({'erro': 'Dados não fornecidos'}), 400

        tipo = dados.get('tipo_investimento')
        if not tipo:
            return jsonify({'erro': 'Tipo de investimento não selecionado'}), 400

        investimentos = get_investimentos()
        investimento = investimentos.get(tipo)
        if not investimento:
            return jsonify({'erro': 'Tipo de investimento inválido'}), 400

        # Validações
        valor_inicial = float(dados.get('valor_inicial', 0))
        meses = int(dados.get('meses', 1))
        aporte_mensal = float(dados.get('aporte_mensal', 0))
        taxa_cdi = float(dados.get('taxa_cdi', 10))
        percentual_cdi = float(dados.get('percentual_cdi', 100))
        ipca = float(dados.get('ipca', 4))
        taxa_prefixada = float(dados.get('taxa_prefixada', 5))

        if valor_inicial <= 0:
            return jsonify({'erro': 'Valor inicial deve ser maior que zero'}), 400
        if meses <= 0:
            return jsonify({'erro': 'Período deve ser maior que zero'}), 400
        if aporte_mensal < 0:
            return jsonify({'erro': 'Aporte mensal não pode ser negativo'}), 400
        if taxa_cdi < 0:
            return jsonify({'erro': 'Taxa CDI inválida'}), 400

        params = ParametrosSimulacao(
            valor_inicial=valor_inicial,
            meses=meses,
            aporte_mensal=aporte_mensal,
            taxa_cdi_anual=taxa_cdi / 100,
            percentual_cdi=percentual_cdi / 100,
            ipca_projetado=ipca / 100,
            taxa_prefixada=taxa_prefixada / 100
        )

        # Verificar carência
        dias = meses * 30
        if dias < investimento.carencia_dias:
            logging.warning(f"Simulação com carência não atendida: {investimento.nome} ({dias} < {investimento.carencia_dias})")

        resultado = investimento.calcular_rendimento(params)

        # Salvar no histórico (apenas últimas 20)
        if 'historico' not in session:
            session['historico'] = []

        historico = session['historico']
        historico.append({
            'nome': resultado.nome_investimento,
            'valor_inicial': resultado.total_investido,
            'montante': resultado.montante_liquido,
            'rentabilidade': resultado.rentabilidade_liquida,
            'data': datetime.now().strftime('%d/%m/%Y %H:%M')
        })
        if len(historico) > 20:
            historico = historico[-20:]
        session['historico'] = historico

        return jsonify({
            'sucesso': True,
            'resultado': {
                'nome_investimento': resultado.nome_investimento,
                'montante_bruto': resultado.montante_bruto,
                'montante_liquido': resultado.montante_liquido,
                'total_investido': resultado.total_investido,
                'lucro_bruto': resultado.lucro_bruto,
                'lucro_liquido': resultado.lucro_liquido,
                'rentabilidade_bruta': resultado.rentabilidade_bruta,
                'rentabilidade_liquida': resultado.rentabilidade_liquida,
                'aliquota_ir': resultado.aliquota_ir,
                'imposto_pago': resultado.imposto_pago,
                'indexador': resultado.indexador,
                'meses': resultado.meses,
                'data': resultado.data.strftime('%d/%m/%Y %H:%M'),
                'taxa_anual': resultado.taxa_anual,
                'aporte_mensal': resultado.aporte_mensal,
                'carencia_dias': investimento.carencia_dias,
                'carencia_atendida': dias >= investimento.carencia_dias,
                'indice_sharpe': resultado.indice_sharpe,
                'valor_real': resultado.montante_liquido / (1 + params.ipca_projetado) ** (meses / 12)
            }
        })

    except Exception as e:
        logging.exception("Erro em /api/simular")
        return jsonify({'erro': 'Erro interno no servidor'}), 500

@app.route('/api/evolucao-mensal', methods=['POST'])
def api_evolucao_mensal():
    """Retorna a evolução mensal do investimento para gerar gráfico"""
    try:
        dados = request.get_json()
        tipo = dados.get('tipo_investimento')
        if not tipo:
            return jsonify({'erro': 'Tipo não informado'}), 400

        investimentos = get_investimentos()
        investimento = investimentos.get(tipo)
        if not investimento:
            return jsonify({'erro': 'Investimento inválido'}), 400

        valor_inicial = float(dados.get('valor_inicial', 0))
        meses = int(dados.get('meses', 1))
        aporte_mensal = float(dados.get('aporte_mensal', 0))
        taxa_cdi = float(dados.get('taxa_cdi', 10))
        percentual_cdi = float(dados.get('percentual_cdi', 100))
        ipca = float(dados.get('ipca', 4))
        taxa_prefixada = float(dados.get('taxa_prefixada', 5))

        params = ParametrosSimulacao(
            valor_inicial=valor_inicial,
            meses=meses,
            aporte_mensal=aporte_mensal,
            taxa_cdi_anual=taxa_cdi / 100,
            percentual_cdi=percentual_cdi / 100,
            ipca_projetado=ipca / 100,
            taxa_prefixada=taxa_prefixada / 100
        )

        # Calcula mês a mês (considerando aportes no início de cada mês)
        evolucao = []
        saldo = valor_inicial
        total_investido_acum = valor_inicial
        taxa_mensal = investimento.calcular_taxa_mensal(params)

        for mes in range(1, meses + 1):
            # Aplica rendimento do mês
            saldo *= (1 + taxa_mensal)
            # Se não for o último mês, adiciona aporte para o próximo
            if mes < meses:
                saldo += aporte_mensal
                total_investido_acum += aporte_mensal

            evolucao.append({
                'mes': mes,
                'saldo_bruto': round(saldo, 2),
                'total_investido': round(total_investido_acum, 2)
            })

        return jsonify({'sucesso': True, 'evolucao': evolucao})

    except Exception as e:
        logging.exception("Erro em /api/evolucao-mensal")
        return jsonify({'erro': str(e)}), 500

@app.route('/api/comparar', methods=['POST'])
def api_comparar():
    try:
        dados = request.get_json()
        valor_inicial = float(dados.get('valor_inicial', 10000))
        meses = int(dados.get('meses', 12))
        aporte_mensal = float(dados.get('aporte_mensal', 0))
        taxa_cdi = float(dados.get('taxa_cdi', 10))
        ipca = float(dados.get('ipca', 4))

        if valor_inicial <= 0 or meses <= 0:
            return jsonify({'erro': 'Valor inicial e período devem ser positivos'}), 400

        params = ParametrosSimulacao(
            valor_inicial=valor_inicial,
            meses=meses,
            aporte_mensal=aporte_mensal,
            taxa_cdi_anual=taxa_cdi / 100,
            ipca_projetado=ipca / 100
        )

        investimentos = get_investimentos()
        resultados = []

        for key, inv in investimentos.items():
            try:
                # Ajustes específicos
                if inv.tipo_indexador == TipoIndexador.IPCA:
                    params.taxa_prefixada = 0.05
                elif inv.tipo_indexador == TipoIndexador.CDI_IPCA:
                    params.taxa_prefixada = 0.03
                # Para CDI, usar percentual padrão 100%
                if hasattr(inv, 'percentual_cdi'):
                    params.percentual_cdi = 1.0

                resultado = inv.calcular_rendimento(params)
                dias = meses * 30
                carencia_ok = dias >= inv.carencia_dias
                resultados.append({
                    'id': key,
                    'nome': resultado.nome_investimento,
                    'indexador': resultado.indexador,
                    'montante': resultado.montante_liquido,
                    'rentabilidade': resultado.rentabilidade_liquida,
                    'imposto': resultado.imposto_pago,
                    'aliquota_ir': resultado.aliquota_ir,
                    'lucro': resultado.lucro_liquido,
                    'tipo_ir': 'Isento' if resultado.imposto_pago == 0 else 'Tributado',
                    'carencia_atendida': carencia_ok,
                    'carencia_dias': inv.carencia_dias,
                    'indice_sharpe': resultado.indice_sharpe
                })
            except Exception as e:
                logging.error(f"Erro ao calcular {inv.nome}: {e}")
                continue

        resultados.sort(key=lambda x: x['montante'], reverse=True)
        return jsonify({'sucesso': True, 'resultados': resultados})

    except Exception as e:
        logging.exception("Erro em /api/comparar")
        return jsonify({'erro': 'Erro interno no servidor'}), 500

@app.route('/api/taxas-equivalentes', methods=['POST'])
def api_taxas_equivalentes():
    try:
        dados = request.get_json()
        tipo = dados.get('tipo')
        taxa = float(dados.get('taxa', 0))
        dias = int(dados.get('dias', 360))
        ipca = float(dados.get('ipca', 4))

        if taxa <= 0:
            return jsonify({'erro': 'Taxa deve ser maior que zero'}), 400
        if dias <= 0:
            return jsonify({'erro': 'Prazo deve ser maior que zero'}), 400

        resultado = {}
        if tipo == 'cdb_para_isento':
            taxa_isento = CalculadorIR.taxa_equivalente(taxa, dias, para_cdb=False)
            resultado = {
                'original': taxa,
                'equivalente': round(taxa_isento, 2),
                'descricao': f'CDB {taxa:.2f}% → LCI/LCA {taxa_isento:.2f}%'
            }
        elif tipo == 'isento_para_cdb':
            taxa_cdb = CalculadorIR.taxa_equivalente(taxa, dias, para_cdb=True)
            resultado = {
                'original': taxa,
                'equivalente': round(taxa_cdb, 2),
                'descricao': f'LCI/LCA {taxa:.2f}% → CDB {taxa_cdb:.2f}%'
            }
        elif tipo == 'ipca_para_cdb':
            ipca_decimal = ipca / 100
            taxa_decimal = taxa / 100
            taxa_total = (1 + ipca_decimal) * (1 + taxa_decimal) - 1
            taxa_cdb = CalculadorIR.taxa_equivalente(taxa_total * 100, dias, para_cdb=True)
            resultado = {
                'original': taxa,
                'equivalente': round(taxa_cdb, 2),
                'descricao': f'IPCA+{taxa:.2f}% → CDB {taxa_cdb:.2f}%'
            }
        else:
            return jsonify({'erro': 'Tipo de conversão inválido'}), 400

        return jsonify({'sucesso': True, 'resultado': resultado})

    except Exception as e:
        logging.exception("Erro em /api/taxas-equivalentes")
        return jsonify({'erro': 'Erro interno no servidor'}), 500

@app.route('/api/historico')
def api_historico():
    return jsonify({'historico': session.get('historico', [])})

@app.route('/api/gerar-relatorio', methods=['POST'])
def api_gerar_relatorio():
    try:
        dados = request.get_json()
        formato = dados.get('formato', 'pdf')
        resultado_dict = dados.get('resultado', {})

        if not resultado_dict.get('nome_investimento'):
            return jsonify({'erro': 'Dados do resultado inválidos'}), 400

        # Converter data
        data_str = resultado_dict.get('data', datetime.now().strftime('%d/%m/%Y %H:%M'))
        try:
            data_obj = datetime.strptime(data_str, '%d/%m/%Y %H:%M')
        except:
            data_obj = datetime.now()

        resultado = ResultadoSimulacao(
            nome_investimento=resultado_dict['nome_investimento'],
            montante_bruto=float(resultado_dict.get('montante_bruto', 0)),
            montante_liquido=float(resultado_dict.get('montante_liquido', 0)),
            total_investido=float(resultado_dict.get('total_investido', 0)),
            lucro_bruto=float(resultado_dict.get('lucro_bruto', 0)),
            lucro_liquido=float(resultado_dict.get('lucro_liquido', 0)),
            rentabilidade_bruta=float(resultado_dict.get('rentabilidade_bruta', 0)),
            rentabilidade_liquida=float(resultado_dict.get('rentabilidade_liquida', 0)),
            aliquota_ir=float(resultado_dict.get('aliquota_ir', 0)),
            imposto_pago=float(resultado_dict.get('imposto_pago', 0)),
            indexador=resultado_dict.get('indexador', ''),
            meses=int(resultado_dict.get('meses', 0)),
            data=data_obj,
            taxa_anual=float(resultado_dict.get('taxa_anual', 0)),
            aporte_mensal=float(resultado_dict.get('aporte_mensal', 0)),
            indice_sharpe=float(resultado_dict.get('indice_sharpe', 0))
        )

        gerador = GeradorRelatorio(formatador)
        nome_arquivo = gerador.gerar(resultado, formato=formato)

        if nome_arquivo and os.path.exists(nome_arquivo):
            novo_nome = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(nome_arquivo))
            os.rename(nome_arquivo, novo_nome)
            return jsonify({'sucesso': True, 'arquivo': os.path.basename(novo_nome)})
        else:
            return jsonify({'erro': 'Não foi possível gerar o relatório'}), 500

    except Exception as e:
        logging.exception("Erro em /api/gerar-relatorio")
        return jsonify({'erro': 'Erro interno no servidor'}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'erro': 'Nome de arquivo inválido'}), 400
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except Exception as e:
        logging.exception("Erro no download")
        return jsonify({'erro': 'Arquivo não encontrado'}), 404

@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)