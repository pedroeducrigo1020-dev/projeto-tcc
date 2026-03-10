from flask import Flask, render_template, request, jsonify, session, send_file
import secrets
import os
import tempfile
from datetime import datetime
from investimentos import InvestimentoFactory, ParametrosSimulacao, CalculadorIR, Formatador
from fpdf import FPDF

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

formatador = Formatador()

@app.route('/')
def index(): return render_template('index.html')

@app.route('/simulacao')
def simulacao():
    investimentos = InvestimentoFactory.todos()
    return render_template('simulacao.html', investimentos=investimentos)

@app.route('/comparacao')
def comparacao(): return render_template('comparacao.html')

@app.route('/calculadora')
def calculadora(): return render_template('calculadora.html')

@app.route('/historico')
def historico(): return render_template('historico.html')

@app.route('/informacoes')
def informacoes(): return render_template('informacoes.html')

@app.route('/api/simular', methods=['POST'])
def api_simular():
    try:
        data = request.get_json()
        if not data: return jsonify({'erro': 'Dados não fornecidos'}), 400
        investimento_id = int(data.get('investimento_id', -1))
        inv = InvestimentoFactory.por_id(investimento_id)
        if not inv: return jsonify({'erro': 'Investimento inválido'}), 400
        valor_inicial = float(data.get('valor_inicial', 0))
        meses = int(data.get('meses', 12))
        aporte_mensal = float(data.get('aporte_mensal', 0))
        taxa_cdi = float(data.get('taxa_cdi', 10)) / 100
        percentual_cdi = float(data.get('percentual_cdi', 100)) / 100
        ipca = float(data.get('ipca', 4)) / 100
        taxa_prefixada = float(data.get('taxa_prefixada', 5)) / 100
        inflacao = float(data.get('inflacao', 4)) / 100
        if valor_inicial <= 0: return jsonify({'erro': 'Valor inicial deve ser maior que zero'}), 400
        if meses <= 0: return jsonify({'erro': 'Período deve ser maior que zero'}), 400
        params = ParametrosSimulacao(
            valor_inicial=valor_inicial, meses=meses, aporte_mensal=aporte_mensal,
            taxa_cdi=taxa_cdi, percentual_cdi=percentual_cdi, ipca=ipca,
            taxa_prefixada=taxa_prefixada, inflacao=inflacao
        )
        resultado = inv.calcular(params)
        if 'historico' not in session: session['historico'] = []
        session['historico'].append({
            'nome': resultado.nome, 'valor': resultado.total_investido,
            'montante': resultado.montante_liquido, 'rentabilidade': resultado.rentabilidade_liquida,
            'data': datetime.now().strftime('%d/%m/%Y %H:%M')
        })
        if len(session['historico']) > 20: session['historico'] = session['historico'][-20:]
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
                'projecoes': [
                    {'mes': p.mes, 'data': p.data, 'montante': p.montante,
                     'investido': p.investido, 'rendimento': p.rendimento,
                     'rentabilidade': p.rentabilidade_acumulada}
                    for p in resultado.projecoes
                ]
            }
        })
    except Exception as e: return jsonify({'erro': str(e)}), 500

@app.route('/api/comparar', methods=['POST'])
def api_comparar():
    try:
        data = request.get_json()
        if not data: return jsonify({'erro': 'Dados não fornecidos'}), 400
        valor_inicial = float(data.get('valor_inicial', 10000))
        meses = int(data.get('meses', 12))
        aporte_mensal = float(data.get('aporte_mensal', 0))
        taxa_cdi = float(data.get('taxa_cdi', 10)) / 100
        ipca = float(data.get('ipca', 4)) / 100
        inflacao = float(data.get('inflacao', 4)) / 100
        params = ParametrosSimulacao(
            valor_inicial=valor_inicial, meses=meses, aporte_mensal=aporte_mensal,
            taxa_cdi=taxa_cdi, percentual_cdi=1.0, ipca=ipca,
            taxa_prefixada=0.05, inflacao=inflacao
        )
        investimentos = InvestimentoFactory.todos()
        resultados = []
        for i, inv in enumerate(investimentos):
            try:
                r = inv.calcular(params)
                resultados.append({
                    'id': i, 'nome': r.nome, 'indexador': r.indexador,
                    'montante': r.montante_liquido, 'rentabilidade': r.rentabilidade_liquida,
                    'rentabilidade_real': r.rentabilidade_real,
                    'volatilidade': r.volatilidade, 'sharpe_ratio': r.sharpe_ratio,
                    'tipo_ir': 'Isento' if r.imposto_pago == 0 else 'Tributado'
                })
            except Exception as e:
                print(f"Erro ao comparar {inv.nome}: {e}")
                continue
        resultados.sort(key=lambda x: x['montante'], reverse=True)
        return jsonify({'sucesso': True, 'resultados': resultados})
    except Exception as e: return jsonify({'erro': str(e)}), 500

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
        else: return jsonify({'erro': 'Tipo de conversão inválido'}), 400
        return jsonify({'sucesso': True, 'descricao': desc, 'original': taxa, 'equivalente': round(equivalente, 2)})
    except Exception as e: return jsonify({'erro': str(e)}), 500

@app.route('/api/historico')
def api_historico(): return jsonify({'historico': session.get('historico', [])})

@app.route('/api/gerar-pdf', methods=['POST'])
def api_gerar_pdf():
    try:
        data = request.get_json()
        if not data or 'resultado' not in data: return jsonify({'erro': 'Dados do resultado não fornecidos'}), 400
        r = data['resultado']
        pdf = FPDF()
        pdf.add_page()
        cor_primaria = (67, 97, 238)
        cor_secundaria = (63, 55, 201)
        cor_sucesso = (76, 201, 240)
        cor_fundo_titulo = (240, 240, 240)
        pdf.set_fill_color(*cor_primaria)
        pdf.rect(0, 0, 210, 40, 'F')
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('Helvetica', 'B', 24)
        pdf.cell(0, 30, 'Relatório de Simulação', ln=True, align='C')
        pdf.ln(10)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', 'B', 14)
        pdf.cell(0, 10, f"Investimento: {r['nome']}", ln=True)
        pdf.set_font('Helvetica', '', 12)
        pdf.cell(0, 8, f"Data da simulação: {r['data']}", ln=True)
        pdf.cell(0, 8, f"Período: {r['meses']} meses", ln=True)
        pdf.cell(0, 8, f"Indexador: {r['indexador']}", ln=True)
        pdf.ln(5)
        pdf.set_fill_color(*cor_fundo_titulo)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, "Parâmetros da Simulação", ln=True, fill=True)
        pdf.set_font('Helvetica', '', 12)
        pdf.cell(0, 7, f"Valor inicial: {formatador.moeda(r['total_investido'])}", ln=True)
        if r['aporte_mensal'] > 0:
            pdf.cell(0, 7, f"Aporte mensal: {formatador.moeda(r['aporte_mensal'])}", ln=True)
        pdf.cell(0, 7, f"Taxa anual: {formatador.porcentagem(r['taxa_anual'])}", ln=True)
        pdf.ln(5)
        pdf.set_fill_color(*cor_secundaria)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, "Resultados Financeiros", ln=True, fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Helvetica', '', 12)
        def linha(label, valor, cor=None):
            pdf.set_font('Helvetica', '', 12)
            pdf.cell(80, 7, label, 0)
            if cor: pdf.set_text_color(*cor)
            pdf.cell(0, 7, valor, ln=True)
            pdf.set_text_color(0, 0, 0)
        linha("Montante bruto:", formatador.moeda(r['montante_bruto']))
        linha("Montante líquido:", formatador.moeda(r['montante_liquido']), cor_sucesso)
        linha("Total investido:", formatador.moeda(r['total_investido']))
        linha("Lucro líquido:", formatador.moeda(r['lucro_liquido']))
        pdf.ln(3)
        linha("Rentabilidade líquida:", formatador.porcentagem(r['rentabilidade_liquida']))
        linha("Rentabilidade real:", formatador.porcentagem(r['rentabilidade_real']))
        if r['imposto_pago'] > 0:
            linha(f"IR pago ({r['aliquota_ir']:.1f}%):", formatador.moeda(r['imposto_pago']))
        else:
            pdf.set_text_color(*cor_sucesso)
            pdf.cell(0, 7, "✅ Isento de Imposto de Renda", ln=True)
            pdf.set_text_color(0, 0, 0)
        pdf.ln(3)
        pdf.set_fill_color(*cor_fundo_titulo)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, "Análise de Risco", ln=True, fill=True)
        pdf.set_font('Helvetica', '', 12)
        pdf.cell(0, 7, f"Volatilidade: {formatador.porcentagem(r['volatilidade'])}", ln=True)
        sharpe = r['sharpe_ratio']
        if sharpe > 1:
            classificacao = "Excelente"
            cor_sharpe = cor_sucesso
        elif sharpe > 0.5:
            classificacao = "Bom"
            cor_sharpe = (255, 193, 7)
        elif sharpe > 0:
            classificacao = "Regular"
            cor_sharpe = (255, 193, 7)
        else:
            classificacao = "Ruim"
            cor_sharpe = (220, 53, 69)
        pdf.set_text_color(*cor_sharpe)
        pdf.cell(0, 7, f"Índice Sharpe: {sharpe:.3f} ({classificacao})", ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(5)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 8, "Projeções Mensais (primeiros 12 meses)", ln=True)
        pdf.set_font('Helvetica', '', 10)
        pdf.set_fill_color(200, 200, 200)
        pdf.cell(20, 7, "Mês", 1, 0, 'C', 1)
        pdf.cell(30, 7, "Data", 1, 0, 'C', 1)
        pdf.cell(40, 7, "Montante", 1, 0, 'C', 1)
        pdf.cell(40, 7, "Investido", 1, 0, 'C', 1)
        pdf.cell(30, 7, "Rend. %", 1, 1, 'C', 1)
        for p in r['projecoes'][:12]:
            pdf.cell(20, 6, str(p['mes']), 1, 0, 'C')
            pdf.cell(30, 6, p['data'], 1, 0, 'C')
            pdf.cell(40, 6, formatador.moeda(p['montante']), 1, 0, 'R')
            pdf.cell(40, 6, formatador.moeda(p['investido']), 1, 0, 'R')
            pdf.cell(30, 6, f"{p['rentabilidade']:.2f}%", 1, 1, 'R')
        pdf.ln(10)
        pdf.set_y(-30)
        pdf.set_font('Helvetica', 'I', 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, "Documento gerado automaticamente pelo Simulador de Investimentos.", 0, 1, 'C')
        pdf.cell(0, 5, "As simulações são apenas ilustrativas. Consulte um especialista.", 0, 1, 'C')
        nome_arquivo = f"simulacao_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        caminho = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)
        pdf.output(caminho)
        return jsonify({'sucesso': True, 'arquivo': nome_arquivo})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        caminho = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(caminho): return jsonify({'erro': 'Arquivo não encontrado'}), 404
        return send_file(caminho, as_attachment=True, download_name=filename)
    except Exception as e: return jsonify({'erro': str(e)}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)