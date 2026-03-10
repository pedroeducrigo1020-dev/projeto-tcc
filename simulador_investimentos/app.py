from flask import Flask, render_template, request, jsonify, session, send_file
import secrets
import os
from datetime import datetime
from investimentos import InvestimentoFactory, ParametrosSimulacao, CalculadorIR
from fpdf import FPDF
import locale
import tempfile

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==================== ROTAS DE PÁGINAS ====================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simulacao')
def simulacao():
    investimentos = InvestimentoFactory.todos()
    return render_template('simulacao.html', investimentos=investimentos)

@app.route('/comparacao')
def comparacao():
    return render_template('comparacao.html')

@app.route('/calculadora')
def calculadora():
    return render_template('calculadora.html')

@app.route('/historico')
def historico():
    return render_template('historico.html')

@app.route('/informacoes')
def informacoes():
    return render_template('informacoes.html')

# ==================== API ====================

@app.route('/api/simular', methods=['POST'])
def api_simular():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'erro': 'Dados não fornecidos'}), 400

        investimento_id = int(data.get('investimento_id', -1))
        inv = InvestimentoFactory.por_id(investimento_id)
        if not inv:
            return jsonify({'erro': 'Investimento inválido'}), 400

        valor_inicial = float(data.get('valor_inicial', 0))
        meses = int(data.get('meses', 12))
        aporte_mensal = float(data.get('aporte_mensal', 0))
        taxa_cdi = float(data.get('taxa_cdi', 10)) / 100
        percentual_cdi = float(data.get('percentual_cdi', 100)) / 100
        ipca = float(data.get('ipca', 4)) / 100
        taxa_prefixada = float(data.get('taxa_prefixada', 5)) / 100
        inflacao = float(data.get('inflacao', 4)) / 100

        if valor_inicial <= 0:
            return jsonify({'erro': 'Valor inicial deve ser maior que zero'}), 400
        if meses <= 0:
            return jsonify({'erro': 'Período deve ser maior que zero'}), 400

        params = ParametrosSimulacao(
            valor_inicial=valor_inicial,
            meses=meses,
            aporte_mensal=aporte_mensal,
            taxa_cdi=taxa_cdi,
            percentual_cdi=percentual_cdi,
            ipca=ipca,
            taxa_prefixada=taxa_prefixada,
            inflacao=inflacao
        )

        resultado = inv.calcular(params)

        # Salvar histórico
        if 'historico' not in session:
            session['historico'] = []
        session['historico'].append({
            'nome': resultado.nome,
            'valor': resultado.total_investido,
            'montante': resultado.montante_liquido,
            'rentabilidade': resultado.rentabilidade_liquida,
            'data': datetime.now().strftime('%d/%m/%Y %H:%M')
        })
        if len(session['historico']) > 20:
            session['historico'] = session['historico'][-20:]

        return jsonify({
            'sucesso': True,
            'resultado': {
                'nome': resultado.nome,
                'montante_bruto': resultado.montante_bruto,
                'montante_liquido': resultado.montante_liquido,
                'total_investido': resultado.total_investido,
                'lucro_liquido': resultado.lucro_liquido,
                'rentabilidade_liquida': resultado.rentabilidade_liquida,
                'rentabilidade_real': resultado.rentabilidade_real,
                'aliquota_ir': resultado.aliquota_ir,
                'imposto_pago': resultado.imposto_pago,
                'indexador': resultado.indexador,
                'meses': resultado.meses,
                'data': resultado.data,
                'taxa_anual': resultado.taxa_anual,
                'aporte_mensal': resultado.aporte_mensal,
                'volatilidade': resultado.volatilidade,
                'sharpe_ratio': resultado.sharpe_ratio,
                'inflacao_total': resultado.inflacao_total,
                'montante_real': resultado.montante_real,
                'projecoes': [
                    {
                        'mes': p.mes,
                        'data': p.data,
                        'montante': p.montante,
                        'investido': p.investido,
                        'rendimento': p.rendimento,
                        'rentabilidade': p.rentabilidade_acumulada
                    } for p in resultado.projecoes
                ]
            }
        })

    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/comparar', methods=['POST'])
def api_comparar():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'erro': 'Dados não fornecidos'}), 400

        valor_inicial = float(data.get('valor_inicial', 10000))
        meses = int(data.get('meses', 12))
        aporte_mensal = float(data.get('aporte_mensal', 0))
        taxa_cdi = float(data.get('taxa_cdi', 10)) / 100
        ipca = float(data.get('ipca', 4)) / 100
        inflacao = float(data.get('inflacao', 4)) / 100

        params = ParametrosSimulacao(
            valor_inicial=valor_inicial,
            meses=meses,
            aporte_mensal=aporte_mensal,
            taxa_cdi=taxa_cdi,
            percentual_cdi=1.0,
            ipca=ipca,
            taxa_prefixada=0.05,
            inflacao=inflacao
        )

        investimentos = InvestimentoFactory.todos()
        resultados = []

        for i, inv in enumerate(investimentos):
            try:
                r = inv.calcular(params)
                resultados.append({
                    'id': i,
                    'nome': r.nome,
                    'indexador': r.indexador,
                    'montante': r.montante_liquido,
                    'rentabilidade': r.rentabilidade_liquida,
                    'rentabilidade_real': r.rentabilidade_real,
                    'volatilidade': r.volatilidade,
                    'sharpe_ratio': r.sharpe_ratio,
                    'tipo_ir': 'Isento' if r.imposto_pago == 0 else 'Tributado'
                })
            except Exception as e:
                print(f"Erro ao comparar {inv.nome}: {e}")
                continue

        resultados.sort(key=lambda x: x['montante'], reverse=True)
        return jsonify({'sucesso': True, 'resultados': resultados})

    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/taxas', methods=['POST'])
def api_taxas():
    try:
        data = request.get_json()
        tipo = data.get('tipo')
        taxa = float(data.get('taxa', 0))
        dias = int(data.get('dias', 360))
        ipca = float(data.get('ipca', 4))

        aliquota = CalculadorIR.aliquota(dias) / 100

        if tipo == 'cdb_para_isento':
            equivalente = taxa * (1 - aliquota)
            desc = f'CDB {taxa:.2f}% → LCI/LCA {equivalente:.2f}%'
        elif tipo == 'isento_para_cdb':
            equivalente = taxa / (1 - aliquota)
            desc = f'LCI/LCA {taxa:.2f}% → CDB {equivalente:.2f}%'
        elif tipo == 'ipca_para_cdb':
            taxa_total = (1 + ipca/100) * (1 + taxa/100) - 1
            equivalente = (taxa_total * 100) / (1 - aliquota)
            desc = f'IPCA+{taxa:.2f}% → CDB {equivalente:.2f}%'
        else:
            return jsonify({'erro': 'Tipo inválido'}), 400

        return jsonify({
            'sucesso': True,
            'descricao': desc,
            'original': taxa,
            'equivalente': round(equivalente, 2)
        })
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/historico')
def api_historico():
    return jsonify({'historico': session.get('historico', [])})

# ==================== RELATÓRIO PDF ====================

def formatar_moeda_br(valor):
    try:
        return locale.currency(valor, grouping=True, symbol='R$')
    except:
        return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def formatar_porcentagem_br(valor):
    return f"{valor:.2f}%".replace(".", ",")

@app.route('/api/gerar-relatorio', methods=['POST'])
def api_gerar_relatorio():
    try:
        data = request.get_json()
        resultado = data.get('resultado')
        if not resultado:
            return jsonify({'erro': 'Resultado não fornecido'}), 400

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font('helvetica', 'B', 16)
        pdf.cell(190, 10, 'Relatório de Simulação', 0, 1, 'C')
        pdf.ln(10)

        pdf.set_font('helvetica', 'B', 12)
        pdf.cell(190, 8, f"Investimento: {resultado['nome']}", 0, 1)
        pdf.set_font('helvetica', '', 10)
        pdf.cell(190, 6, f"Data da simulação: {resultado['data']}", 0, 1)
        pdf.cell(190, 6, f"Período: {resultado['meses']} meses", 0, 1)
        pdf.cell(190, 6, f"Valor inicial: {formatar_moeda_br(resultado['total_investido'])}", 0, 1)
        if resultado['aporte_mensal'] > 0:
            pdf.cell(190, 6, f"Aporte mensal: {formatar_moeda_br(resultado['aporte_mensal'])}", 0, 1)
        pdf.ln(5)

        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(190, 6, 'Resultados:', 0, 1)
        pdf.set_font('helvetica', '', 10)
        pdf.cell(190, 5, f"Montante bruto: {formatar_moeda_br(resultado['montante_bruto'])}", 0, 1)
        pdf.cell(190, 5, f"Montante líquido: {formatar_moeda_br(resultado['montante_liquido'])}", 0, 1)
        pdf.cell(190, 5, f"Montante real (ajustado inflação): {formatar_moeda_br(resultado.get('montante_real', resultado['montante_liquido']))}", 0, 1)
        pdf.cell(190, 5, f"Rentabilidade líquida: {formatar_porcentagem_br(resultado['rentabilidade_liquida'])}", 0, 1)
        pdf.cell(190, 5, f"Rentabilidade real: {formatar_porcentagem_br(resultado.get('rentabilidade_real', 0))}", 0, 1)
        pdf.cell(190, 5, f"IR pago: {formatar_moeda_br(resultado['imposto_pago'])} (alíquota {resultado['aliquota_ir']:.1f}%)", 0, 1)
        pdf.ln(5)

        # Métricas de risco
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(190, 6, 'Análise de Risco:', 0, 1)
        pdf.set_font('helvetica', '', 10)
        pdf.cell(190, 5, f"Volatilidade: {formatar_porcentagem_br(resultado.get('volatilidade', 0))}", 0, 1)
        pdf.cell(190, 5, f"Índice de Sharpe: {resultado.get('sharpe_ratio', 0):.3f}", 0, 1)
        pdf.ln(5)

        # Projeções mensais (primeiras 12)
        projecoes = resultado.get('projecoes', [])
        if projecoes:
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(190, 6, 'Projeções Mensais (primeiros 12 meses):', 0, 1)
            pdf.set_font('helvetica', '', 8)
            pdf.cell(20, 5, 'Mês', 1, 0, 'C')
            pdf.cell(30, 5, 'Data', 1, 0, 'C')
            pdf.cell(40, 5, 'Montante', 1, 0, 'C')
            pdf.cell(30, 5, 'Rendimento', 1, 0, 'C')
            pdf.cell(30, 5, 'Rent. Acum.', 1, 1, 'C')
            for p in projecoes[:12]:
                pdf.cell(20, 5, str(p['mes']), 1, 0, 'C')
                pdf.cell(30, 5, p['data'], 1, 0, 'C')
                pdf.cell(40, 5, formatar_moeda_br(p['montante']), 1, 0, 'C')
                pdf.cell(30, 5, formatar_moeda_br(p['rendimento']), 1, 0, 'C')
                pdf.cell(30, 5, formatar_porcentagem_br(p['rentabilidade']), 1, 1, 'C')

        # Salvar PDF em arquivo temporário
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', dir=UPLOAD_FOLDER) as tmp:
            pdf.output(tmp.name)
            filename = os.path.basename(tmp.name)

        return jsonify({'sucesso': True, 'arquivo': filename})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'erro': 'Arquivo não encontrado'}), 404
        return send_file(filepath, as_attachment=True, download_name='relatorio.pdf')
    except Exception as e:
        return jsonify({'erro': str(e)}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)