const Formatador = {
    moeda: (valor) => {
        if (isNaN(valor) || valor === null) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    },
    percentual: (valor) => {
        if (isNaN(valor) || valor === null) return '0,00%';
        return valor.toFixed(2).replace('.', ',') + '%';
    },
    numero: (valor, casas = 2) => {
        if (isNaN(valor) || valor === null) return '0';
        return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
    }
};

const Loading = {
    show: () => document.getElementById('loading')?.classList.add('active'),
    hide: () => document.getElementById('loading')?.classList.remove('active')
};

const Notificacao = {
    show: (msg, tipo = 'success') => {
        const notif = document.createElement('div');
        notif.className = `alert alert-${tipo}`;
        notif.innerHTML = `<i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${msg}</span>`;
        notif.style.position = 'fixed';
        notif.style.top = '20px';
        notif.style.right = '20px';
        notif.style.zIndex = '10000';
        notif.style.minWidth = '300px';
        notif.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notif.style.animation = 'slideIn 0.3s ease';
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
};

const Graficos = {
    charts: {},
    criarEvolucao: (canvasId, projecoes) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (Graficos.charts[canvasId]) Graficos.charts[canvasId].destroy();
        Graficos.charts[canvasId] = new Chart(canvas, {
            type: 'line',
            data: {
                labels: projecoes.map(p => `Mês ${p.mes}`),
                datasets: [
                    { label: 'Montante', data: projecoes.map(p => p.montante), borderColor: '#4361ee', backgroundColor: 'rgba(67,97,238,0.1)', borderWidth: 3, fill: true, tension: 0.4 },
                    { label: 'Investido', data: projecoes.map(p => p.investido), borderColor: '#4cc9f0', borderWidth: 2, borderDash: [5,5], fill: false, tension: 0.4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Formatador.moeda(ctx.raw)}` } } },
                scales: { y: { ticks: { callback: (v) => Formatador.moeda(v) } } }
            }
        });
    },
    criarComparativo: (canvasId, resultados) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (Graficos.charts[canvasId]) Graficos.charts[canvasId].destroy();
        Graficos.charts[canvasId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: resultados.map(r => r.nome),
                datasets: [
                    { label: 'Montante Final', data: resultados.map(r => r.montante), backgroundColor: '#4361ee', borderRadius: 8, yAxisID: 'y' },
                    { label: 'Rentabilidade %', data: resultados.map(r => r.rentabilidade), backgroundColor: '#4cc9f0', borderRadius: 8, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.dataset.label.includes('Montante')
                                ? `${ctx.dataset.label}: ${Formatador.moeda(ctx.raw)}`
                                : `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`
                        }
                    }
                },
                scales: {
                    y: { position: 'left', ticks: { callback: (v) => Formatador.moeda(v) } },
                    y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + '%' } }
                }
            }
        });
    }
};

function aplicarMascaraMoeda(input) {
    input.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        if (valor) {
            valor = (parseInt(valor) / 100).toFixed(2);
            e.target.value = Formatador.moeda(valor).replace('R$', '').trim();
        } else e.target.value = '';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.moeda').forEach(aplicarMascaraMoeda);
    if (window.location.pathname === '/historico') carregarHistorico();
});

async function simular() {
    const investimentoCard = document.querySelector('.investimento-card.selected');
    if (!investimentoCard) { Notificacao.show('Selecione um investimento!', 'warning'); return; }
    const investimentoId = investimentoCard.dataset.id;
    Loading.show();
    try {
        const valorInicial = document.getElementById('valor_inicial')?.value.replace(/\D/g, '') || '0';
        const aporteMensal = document.getElementById('aporte_mensal')?.value.replace(/\D/g, '') || '0';
        const dados = {
            investimento_id: parseInt(investimentoId),
            valor_inicial: parseFloat(valorInicial) / 100 || 0,
            meses: parseInt(document.getElementById('meses')?.value) || 12,
            aporte_mensal: parseFloat(aporteMensal) / 100 || 0,
            taxa_cdi: parseFloat(document.getElementById('taxa_cdi')?.value) || 10,
            percentual_cdi: parseFloat(document.getElementById('percentual_cdi')?.value) || 100,
            ipca: parseFloat(document.getElementById('ipca')?.value) || 4,
            taxa_prefixada: parseFloat(document.getElementById('taxa_prefixada')?.value) || 5,
            inflacao: parseFloat(document.getElementById('inflacao')?.value) || 4
        };
        if (dados.valor_inicial <= 0) { Notificacao.show('Valor inicial deve ser maior que zero', 'warning'); Loading.hide(); return; }
        const response = await fetch('/api/simular', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
        });
        const result = await response.json();
        if (result.sucesso) { exibirResultado(result.resultado); Notificacao.show('Simulação concluída!'); }
        else { Notificacao.show(result.erro || 'Erro na simulação', 'danger'); }
    } catch (error) { console.error(error); Notificacao.show('Erro de conexão', 'danger'); }
    finally { Loading.hide(); }
}

function exibirResultado(r) {
    const container = document.getElementById('resultado-container');
    if (!container) return;
    const riscoClass = r.volatilidade < 5 ? 'success' : (r.volatilidade < 15 ? 'warning' : 'danger');
    const riscoTexto = r.volatilidade < 5 ? 'Baixo' : (r.volatilidade < 15 ? 'Médio' : 'Alto');
    const irHtml = r.imposto_pago > 0
        ? `<div class="resultado-item"><div class="resultado-label">IR Pago</div><div class="resultado-valor warning">${Formatador.moeda(r.imposto_pago)}</div><small>Alíquota: ${r.aliquota_ir.toFixed(1)}%</small></div>`
        : `<div class="resultado-item"><div class="resultado-label">Imposto de Renda</div><div class="resultado-valor success">ISENTO</div></div>`;
    let sharpeClass = 'danger', sharpeText = 'Ruim';
    if (r.sharpe_ratio > 1) { sharpeClass = 'success'; sharpeText = 'Excelente'; }
    else if (r.sharpe_ratio > 0.5) { sharpeClass = 'warning'; sharpeText = 'Bom'; }
    else if (r.sharpe_ratio > 0) { sharpeClass = 'warning'; sharpeText = 'Regular'; }
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><i class="fas fa-chart-line"></i><h2>Resultado - ${r.nome}</h2></div>
            <div class="resultados-grid">
                <div class="resultado-item"><div class="resultado-label">Total Investido</div><div class="resultado-valor">${Formatador.moeda(r.total_investido)}</div></div>
                <div class="resultado-item"><div class="resultado-label">Montante Líquido</div><div class="resultado-valor success">${Formatador.moeda(r.montante_liquido)}</div></div>
                <div class="resultado-item"><div class="resultado-label">Rentabilidade</div><div class="resultado-valor success">${Formatador.percentual(r.rentabilidade_liquida)}</div></div>
                <div class="resultado-item"><div class="resultado-label">Rentabilidade Real</div><div class="resultado-valor ${r.rentabilidade_real > 0 ? 'success' : 'danger'}">${Formatador.percentual(r.rentabilidade_real)}</div></div>
            </div>
            <div class="resultados-grid">
                ${irHtml}
                <div class="resultado-item"><div class="resultado-label">Volatilidade</div><div class="resultado-valor" style="color: var(--${riscoClass})">${Formatador.percentual(r.volatilidade)}</div><small>Risco ${riscoTexto}</small></div>
                <div class="resultado-item"><div class="resultado-label">Sharpe Ratio</div><div class="resultado-valor" style="color: var(--${sharpeClass})">${r.sharpe_ratio.toFixed(3)}</div><small>${sharpeText}</small></div>
                <div class="resultado-item"><div class="resultado-label">Período</div><div class="resultado-valor">${r.meses} meses</div></div>
            </div>
            <div class="chart-container"><canvas id="grafico-evolucao"></canvas></div>
            <div style="margin-top:1.5rem; display:flex; gap:1rem; justify-content:flex-end;">
                <button class="btn btn-outline" onclick="gerarPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
            </div>
        </div>
    `;
    if (r.projecoes && r.projecoes.length) setTimeout(() => Graficos.criarEvolucao('grafico-evolucao', r.projecoes), 100);
    window.ultimoResultado = r;
}

async function comparar() {
    Loading.show();
    try {
        const valorInicial = document.getElementById('comp_valor')?.value.replace(/\D/g, '') || '1000000';
        const aporteMensal = document.getElementById('comp_aporte')?.value.replace(/\D/g, '') || '0';
        const dados = {
            valor_inicial: parseFloat(valorInicial) / 100 || 10000,
            meses: parseInt(document.getElementById('comp_meses')?.value) || 12,
            aporte_mensal: parseFloat(aporteMensal) / 100 || 0,
            taxa_cdi: parseFloat(document.getElementById('comp_cdi')?.value) || 10,
            ipca: parseFloat(document.getElementById('comp_ipca')?.value) || 4,
            inflacao: parseFloat(document.getElementById('comp_inflacao')?.value) || 4
        };
        const response = await fetch('/api/comparar', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
        });
        const result = await response.json();
        if (result.sucesso) { exibirComparacao(result.resultados); Notificacao.show('Comparação concluída!'); }
        else { Notificacao.show(result.erro || 'Erro na comparação', 'danger'); }
    } catch (error) { console.error(error); Notificacao.show('Erro de conexão', 'danger'); }
    finally { Loading.hide(); }
}

function exibirComparacao(resultados) {
    const container = document.getElementById('comparacao-container');
    if (!container) return;
    let html = `
        <div class="card">
            <div class="card-header"><i class="fas fa-chart-bar"></i><h2>Comparação de Investimentos</h2></div>
            <div class="table-container"><table><thead><tr><th>#</th><th>Investimento</th><th>Montante</th><th>Rentab.</th><th>Real</th><th>Risco</th><th>Sharpe</th></tr></thead><tbody>
    `;
    resultados.forEach((r, i) => {
        const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`;
        const riscoClass = r.volatilidade < 5 ? 'success' : (r.volatilidade < 15 ? 'warning' : 'danger');
        const riscoBg = riscoClass === 'success' ? '#d4edda' : (riscoClass === 'warning' ? '#fff3cd' : '#f8d7da');
        html += `<tr><td><strong>${medalha}</strong></td><td><strong>${r.nome}</strong></td><td>${Formatador.moeda(r.montante)}</td><td>${Formatador.percentual(r.rentabilidade)}</td><td>${Formatador.percentual(r.rentabilidade_real)}</td><td><span class="tag" style="background:${riscoBg};">${r.volatilidade.toFixed(1)}%</span></td><td>${r.sharpe_ratio.toFixed(3)}</td></tr>`;
    });
    html += `</tbody></table></div><div class="chart-container"><canvas id="grafico-comparativo"></canvas></div></div>`;
    container.innerHTML = html;
    setTimeout(() => Graficos.criarComparativo('grafico-comparativo', resultados), 100);
}

async function calcularTaxa() {
    const tipo = document.getElementById('tipo_conversao')?.value;
    const taxa = parseFloat(document.getElementById('taxa_original')?.value) || 0;
    const dias = parseInt(document.getElementById('prazo_dias')?.value) || 360;
    const ipca = parseFloat(document.getElementById('ipca_projetado')?.value) || 4;
    if (taxa <= 0) { Notificacao.show('Digite uma taxa válida!', 'warning'); return; }
    Loading.show();
    try {
        const response = await fetch('/api/taxas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, taxa, dias, ipca })
        });
        const result = await response.json();
        if (result.sucesso) {
            document.getElementById('resultado-taxa').innerHTML = `<div class="alert alert-success"><i class="fas fa-check-circle"></i><div><strong>Resultado:</strong><br>${result.descricao}</div></div>`;
            Notificacao.show('Cálculo realizado!');
        } else { Notificacao.show(result.erro || 'Erro no cálculo', 'danger'); }
    } catch (error) { console.error(error); Notificacao.show('Erro de conexão', 'danger'); }
    finally { Loading.hide(); }
}

async function carregarHistorico() {
    const container = document.getElementById('historico-container');
    if (!container) return;
    Loading.show();
    try {
        const response = await fetch('/api/historico');
        const data = await response.json();
        if (data.historico && data.historico.length > 0) {
            let html = `<div class="table-container"><table><thead><tr><th>Data</th><th>Investimento</th><th>Valor Inicial</th><th>Resultado</th><th>Rentabilidade</th><th>Lucro</th></tr></thead><tbody>`;
            data.historico.slice().reverse().forEach(item => {
                const lucro = item.montante - item.valor;
                html += `<tr><td>${item.data}</td><td><strong>${item.nome}</strong></td><td>${Formatador.moeda(item.valor)}</td><td style="color:var(--success);font-weight:600;">${Formatador.moeda(item.montante)}</td><td>${Formatador.percentual(item.rentabilidade)}</td><td>${Formatador.moeda(lucro)}</td></tr>`;
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
        } else { container.innerHTML = `<div class="alert alert-info"><i class="fas fa-info-circle"></i> Nenhuma simulação encontrada. Faça sua primeira simulação!</div>`; }
    } catch (error) { console.error(error); container.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Erro ao carregar histórico.</div>`; }
    finally { Loading.hide(); }
}

async function gerarPDF() {
    if (!window.ultimoResultado) { Notificacao.show('Nenhum resultado para gerar PDF', 'warning'); return; }
    Loading.show();
    try {
        const response = await fetch('/api/gerar-pdf', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resultado: window.ultimoResultado })
        });
        const result = await response.json();
        if (result.sucesso) { window.location.href = `/download/${result.arquivo}`; Notificacao.show('PDF gerado com sucesso!'); }
        else { Notificacao.show(result.erro || 'Erro ao gerar PDF', 'danger'); }
    } catch (error) { console.error(error); Notificacao.show('Erro de conexão', 'danger'); }
    finally { Loading.hide(); }
}

function selecionarInvestimento(element) {
    document.querySelectorAll('.investimento-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
}