from flask import Flask, render_template, request, jsonify, session, send_file
import os
import secrets
from datetime import datetime
import locale
from investimentos import *

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Configuração para uploads
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Inicializar componentes
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
    """Página inicial"""
    return render_template('index.html')

@app.route('/simulacao')
def simulacao():
    """Página de nova simulação"""
    return render_template('simulacao.html', 
                         investimentos=InvestimentoFactory.criar_todos())

@app.route('/comparacao')
def comparacao():
    """Página de comparação"""
    return render_template('comparacao.html')

@app.route('/historico')
def historico():
    """Página de histórico"""
    return render_template('historico.html')

@app.route('/calculadora')
def calculadora():
    """Página da calculadora de taxas"""
    return render_template('calculadora.html')

@app.route('/informacoes')
def informacoes():
    """Página de informações"""
    return render_template('informacoes.html')

# ==================== API ENDPOINTS ====================

@app.route('/api/simular', methods=['POST'])
def api_simular():
    """API para realizar simulação"""
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({'erro': 'Dados não fornecidos'}), 400
        
        # Obter investimento selecionado
        investimentos = InvestimentoFactory.criar_todos()
        investimento = investimentos.get(dados.get('tipo_investimento'))
        
        if not investimento:
            return jsonify({'erro': 'Tipo de investimento inválido'}), 400
        
        # Criar parâmetros
        params = ParametrosSimulacao(
            valor_inicial=float(dados.get('valor_inicial', 0)),
            meses=int(dados.get('meses', 1)),
            aporte_mensal=float(dados.get('aporte_mensal', 0)),
            taxa_cdi_anual=float(dados.get('taxa_cdi', 10)) / 100,
            percentual_cdi=float(dados.get('percentual_cdi', 100)) / 100,
            ipca_projetado=float(dados.get('ipca', 4)) / 100,
            taxa_prefixada=float(dados.get('taxa_prefixada', 5)) / 100
        )
        
        # Validar parâmetros
        if params.valor_inicial <= 0:
            return jsonify({'erro': 'Valor inicial deve ser maior que zero'}), 400
        if params.meses <= 0:
            return jsonify({'erro': 'Período deve ser maior que zero'}), 400
        
        # Calcular resultado
        resultado = investimento.calcular_rendimento(params)
        
        # Salvar no histórico da sessão
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
        
        # Manter apenas últimas 50 simulações
        if len(historico) > 50:
            historico = historico[-50:]
        
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
                'aporte_mensal': resultado.aporte_mensal
            }
        })
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/comparar', methods=['POST'])
def api_comparar():
    """API para comparar todos investimentos"""
    try:
        dados = request.get_json()
        
        params = ParametrosSimulacao(
            valor_inicial=float(dados.get('valor_inicial', 10000)),
            meses=int(dados.get('meses', 12)),
            aporte_mensal=float(dados.get('aporte_mensal', 0)),
            taxa_cdi_anual=float(dados.get('taxa_cdi', 10)) / 100,
            ipca_projetado=float(dados.get('ipca', 4)) / 100
        )
        
        investimentos = InvestimentoFactory.criar_todos()
        resultados = []
        
        for key, inv in investimentos.items():
            try:
                # Ajustar parâmetros específicos
                if inv.tipo_indexador == TipoIndexador.IPCA:
                    params.taxa_prefixada = 0.05
                elif inv.tipo_indexador == TipoIndexador.CDI_IPCA:
                    params.taxa_prefixada = 0.03
                
                resultado = inv.calcular_rendimento(params)
                resultados.append({
                    'id': key,
                    'nome': resultado.nome_investimento,
                    'indexador': resultado.indexador,
                    'montante': resultado.montante_liquido,
                    'rentabilidade': resultado.rentabilidade_liquida,
                    'imposto': resultado.imposto_pago,
                    'aliquota_ir': resultado.aliquota_ir,
                    'lucro': resultado.lucro_liquido,
                    'tipo_ir': 'Isento' if resultado.imposto_pago == 0 else 'Tributado'
                })
            except Exception as e:
                print(f"Erro ao calcular {inv.nome}: {e}")
                continue
        
        # Ordenar por melhor resultado
        resultados.sort(key=lambda x: x['montante'], reverse=True)
        
        return jsonify({
            'sucesso': True,
            'resultados': resultados
        })
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/taxas-equivalentes', methods=['POST'])
def api_taxas_equivalentes():
    """API para calculadora de taxas equivalentes"""
    try:
        dados = request.get_json()
        tipo = dados.get('tipo')
        taxa = float(dados.get('taxa', 0))
        dias = int(dados.get('dias', 360))
        
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
            ipca = float(dados.get('ipca', 4))
            taxa_total = (1 + ipca/100) * (1 + taxa/100) - 1
            taxa_cdb = CalculadorIR.taxa_equivalente(taxa_total * 100, dias, para_cdb=True)
            resultado = {
                'original': taxa,
                'equivalente': round(taxa_cdb, 2),
                'descricao': f'IPCA+{taxa:.2f}% → CDB {taxa_cdb:.2f}%'
            }
        
        return jsonify({'sucesso': True, 'resultado': resultado})
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/historico')
def api_historico():
    """Retorna histórico de simulações"""
    historico = session.get('historico', [])
    return jsonify({'historico': historico})

@app.route('/api/gerar-relatorio', methods=['POST'])
def api_gerar_relatorio():
    """Gera relatório PDF da última simulação"""
    try:
        dados = request.get_json()
        formato = dados.get('formato', 'pdf')
        
        # Criar resultado a partir dos dados
        resultado_dict = dados.get('resultado', {})
        
        resultado = ResultadoSimulacao(
            nome_investimento=resultado_dict.get('nome_investimento', ''),
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
            data=datetime.now(),
            taxa_anual=float(resultado_dict.get('taxa_anual', 0)),
            aporte_mensal=float(resultado_dict.get('aporte_mensal', 0))
        )
        
        # Gerar relatório
        gerador = GeradorRelatorio(formatador)
        nome_arquivo = gerador.gerar(resultado, formato=formato)
        
        if nome_arquivo and os.path.exists(nome_arquivo):
            # Mover para pasta de uploads
            novo_nome = os.path.join(app.config['UPLOAD_FOLDER'], 
                                    os.path.basename(nome_arquivo))
            os.rename(nome_arquivo, novo_nome)
            
            return jsonify({
                'sucesso': True,
                'arquivo': os.path.basename(novo_nome)
            })
        else:
            return jsonify({'erro': 'Não foi possível gerar o relatório'}), 500
            
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    """Download de arquivos gerados"""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({'erro': 'Arquivo não encontrado'}), 404
        return send_file(filepath, as_attachment=True)
    except Exception as e:
        return jsonify({'erro': str(e)}), 404

@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)