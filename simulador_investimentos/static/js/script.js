// Utilitários de formatação
const Formatador = {
    moeda: (valor) => {
        if (isNaN(valor) || valor === null) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(valor);
    },
    porcentagem: (valor, casas = 2) => {
        if (isNaN(valor) || valor === null) return '0,00%';
        return valor.toFixed(casas).replace('.', ',') + '%';
    },
    data: (dataStr) => {
        try {
            return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return dataStr;
        }
    },
    numero: (valor) => {
        if (isNaN(valor) || valor === null) return '0';
        return new Intl.NumberFormat('pt-BR').format(valor);
    }
};

// Loading
const Loading = {
    show: () => {
        const l = document.getElementById('loading');
        if (l) l.classList.add('active');
    },
    hide: () => {
        const l = document.getElementById('loading');
        if (l) l.classList.remove('active');
    }
};

// Notificações
const Notificacao = {
    show: (mensagem, tipo = 'success', tempo = 3000) => {
        const n = document.createElement('div');
        n.className = `alert alert-${tipo}`;
        const icones = { success: 'check-circle', warning: 'exclamation-triangle', danger: 'exclamation-circle', info: 'info-circle' };
        n.innerHTML = `<i class="fas fa-${icones[tipo] || 'info-circle'}"></i><span>${mensagem}</span>`;
        n.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        document.body.appendChild(n);
        setTimeout(() => {
            n.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => n.remove(), 300);
        }, tempo);
    }
};

// Máscara de moeda
function mascaraMoeda(el) {
    el.addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length === 0) { e.target.value = ''; return; }
        v = (parseInt(v) / 100).toFixed(2);
        e.target.value = Formatador.moeda(v).replace('R$', '').trim();
    });
}

// Inicialização
let menuToggle;
document.addEventListener('DOMContentLoaded', () => {
    // Máscaras de moeda
    document.querySelectorAll('.moeda').forEach(mascaraMoeda);

    // Animação nos cards
    document.querySelectorAll('.card').forEach((c, i) => {
        c.style.animation = `slideIn 0.5s ease ${i * 0.1}s both`;
    });

    // Menu mobile
    menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', navMenu.classList.contains('active'));
        });
    }

    // Fechar menu ao clicar em link (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
});

// Simulação
async function realizarSimulacao() {
    const tipo = document.getElementById('tipo_investimento')?.value;
    if (!tipo) {
        Notificacao.show('Selecione um tipo de investimento!', 'warning');
        return;
    }

    Loading.show();
    try {
        const valorInicial = (document.getElementById('valor_inicial')?.value.replace(/\D/g, '') || '0') / 100;
        const aporteMensal = (document.getElementById('aporte_mensal')?.value.replace(/\D/g, '') || '0') / 100;

        const dados = {
            tipo_investimento: tipo,
            valor_inicial: parseFloat(valorInicial),
            meses: parseInt(document.getElementById('meses')?.value) || 1,
            aporte_mensal: parseFloat(aporteMensal),
            taxa_cdi: parseFloat(document.getElementById('taxa_cdi')?.value) || 10,
            percentual_cdi: parseFloat(document.getElementById('percentual_cdi')?.value) || 100,
            ipca: parseFloat(document.getElementById('ipca')?.value) || 4,
            taxa_prefixada: parseFloat(document.getElementById('taxa_prefixada')?.value) || 5
        };

        if (dados.valor_inicial <= 0) {
            Notificacao.show('Valor inicial deve ser maior que zero', 'warning');
            Loading.hide();
            return;
        }

        const resp = await fetch('/api/simular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await resp.json();
        if (result.sucesso) {
            exibirResultado(result.resultado);
            carregarEvolucaoMensal(dados);
            Notificacao.show('Simulação realizada com sucesso!', 'success');
        } else {
            Notificacao.show(result.erro || 'Erro ao realizar simulação', 'danger');
        }
    } catch (error) {
        Notificacao.show('Erro de conexão com o servidor', 'danger');
    } finally {
        Loading.hide();
    }
}

function exibirResultado(r) {
    const container = document.getElementById('resultado-container');
    if (!container) return;

    const carenciaMsg = r.carencia_atendida
        ? ''
        : `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Atenção: este investimento tem carência de ${r.carencia_dias} dias. O prazo informado (${r.meses * 30} dias) não atende à carência.</div>`;

    const impostoHTML = r.imposto_pago > 0
        ? `<div class="result-item"><div class="result-label">IR Pago</div><div class="result-value" style="color: var(--warning-color);">${Formatador.moeda(r.imposto_pago)}</div><small>Alíquota: ${r.aliquota_ir.toFixed(1)}%</small></div>`
        : `<div class="result-item"><div class="result-label">Imposto de Renda</div><div class="result-value" style="color: var(--success-color);">ISENTO</div><small>✅ Investimento isento de IR</small></div>`;

    const sharpeHTML = `<div class="result-item"><div class="result-label">Índice de Sharpe</div><div class="result-value" style="font-size: 1.2rem;">${r.indice_sharpe.toFixed(3)}</div><small>Relação risco/retorno</small></div>`;

    const valorRealHTML = `<div class="result-item"><div class="result-label">Valor Real (ajustado IPCA)</div><div class="result-value" style="font-size: 1.2rem;">${Formatador.moeda(r.valor_real)}</div><small>Poder de compra corrigido</small></div>`;

    container.innerHTML = `
        <div class="card result-card">
            <div class="card-header">
                <i class="fas fa-chart-pie"></i>
                <h2>Resultado da Simulação - ${r.nome_investimento}</h2>
            </div>
            ${carenciaMsg}
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Total Investido</div>
                    <div class="result-value">${Formatador.moeda(r.total_investido)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Montante Bruto</div>
                    <div class="result-value">${Formatador.moeda(r.montante_bruto)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Montante Líquido</div>
                    <div class="result-value">${Formatador.moeda(r.montante_liquido)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Rendimento Líquido</div>
                    <div class="result-value">${Formatador.moeda(r.lucro_liquido)}</div>
                </div>
            </div>
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Rentabilidade Bruta</div>
                    <div class="result-value">${Formatador.porcentagem(r.rentabilidade_bruta)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Rentabilidade Líquida</div>
                    <div class="result-value">${Formatador.porcentagem(r.rentabilidade_liquida)}</div>
                </div>
                ${impostoHTML}
            </div>
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Taxa Anual</div>
                    <div class="result-value">${Formatador.porcentagem(r.taxa_anual)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Indexador</div>
                    <div class="result-value" style="font-size: 1.2rem;">${r.indexador}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Período</div>
                    <div class="result-value" style="font-size: 1.2rem;">${r.meses} meses</div>
                </div>
                ${sharpeHTML}
                ${valorRealHTML}
            </div>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <div><strong>${r.nome_investimento}</strong> • Simulação em ${r.data}</div>
            </div>
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end; flex-wrap: wrap;">
                <button class="btn btn-outline" onclick="gerarRelatorio('pdf')">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
                <button class="btn btn-outline" onclick="gerarRelatorio('txt')">
                    <i class="fas fa-file-alt"></i> TXT
                </button>
                <button class="btn btn-success" onclick="window.location.href='/simulacao'">
                    <i class="fas fa-redo"></i> Nova Simulação
                </button>
            </div>
        </div>
    `;

    const graphDiv = document.createElement('div');
    graphDiv.className = 'chart-container';
    graphDiv.innerHTML = '<canvas id="grafico-evolucao"></canvas>';
    container.querySelector('.card').appendChild(graphDiv);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.ultimoResultado = r;
}

async function carregarEvolucaoMensal(dados) {
    try {
        const resp = await fetch('/api/evolucao-mensal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const result = await resp.json();
        if (result.sucesso) criarGraficoEvolucao(result.evolucao);
    } catch (e) { console.error(e); }
}

function criarGraficoEvolucao(evolucao) {
    const canvas = document.getElementById('grafico-evolucao');
    if (!canvas) return;
    if (window.evolucaoChart) window.evolucaoChart.destroy();

    window.evolucaoChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: evolucao.map(e => `Mês ${e.mes}`),
            datasets: [
                {
                    label: 'Saldo Bruto (R$)',
                    data: evolucao.map(e => e.saldo_bruto),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52,152,219,0.1)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Total Investido (R$)',
                    data: evolucao.map(e => e.total_investido),
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46,204,113,0.1)',
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Evolução Mensal do Investimento' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => Formatador.moeda(v) }
                }
            }
        }
    });
}

async function gerarRelatorio(formato) {
    if (!window.ultimoResultado) {
        Notificacao.show('Nenhum resultado para gerar relatório', 'warning');
        return;
    }
    Loading.show();
    try {
        const resp = await fetch('/api/gerar-relatorio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formato, resultado: window.ultimoResultado })
        });
        const result = await resp.json();
        if (result.sucesso) {
            window.open(`/download/${result.arquivo}`, '_blank');
            Notificacao.show('Relatório gerado com sucesso!', 'success');
        } else {
            Notificacao.show(result.erro || 'Erro ao gerar relatório', 'danger');
        }
    } catch (error) {
        Notificacao.show('Erro ao gerar relatório', 'danger');
    } finally {
        Loading.hide();
    }
}

// Comparação
async function realizarComparacao() {
    Loading.show();
    try {
        const valorInicial = (document.getElementById('comp_valor_inicial')?.value.replace(/\D/g, '') || '1000000') / 100;
        const aporte = (document.getElementById('comp_aporte')?.value.replace(/\D/g, '') || '0') / 100;

        const dados = {
            valor_inicial: parseFloat(valorInicial),
            meses: parseInt(document.getElementById('comp_meses')?.value) || 12,
            aporte_mensal: parseFloat(aporte),
            taxa_cdi: parseFloat(document.getElementById('comp_taxa_cdi')?.value) || 10,
            ipca: parseFloat(document.getElementById('comp_ipca')?.value) || 4
        };

        const resp = await fetch('/api/comparar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await resp.json();
        if (result.sucesso) {
            exibirComparacao(result.resultados);
            criarGraficoComparativo(result.resultados);
            Notificacao.show('Comparação realizada com sucesso!', 'success');
        } else {
            Notificacao.show(result.erro || 'Erro ao realizar comparação', 'danger');
        }
    } catch (error) {
        Notificacao.show('Erro ao realizar comparação', 'danger');
    } finally {
        Loading.hide();
    }
}

function exibirComparacao(resultados) {
    const container = document.getElementById('comparacao-container');
    if (!container) return;

    const botoes = `
        <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="ordenarComparacao('montante')">
                <i class="fas fa-sort-amount-down"></i> Ordenar por Montante
            </button>
            <button class="btn btn-outline btn-sm" onclick="ordenarComparacao('sharpe')">
                <i class="fas fa-chart-line"></i> Ordenar por Sharpe
            </button>
            <button class="btn btn-outline btn-sm" onclick="exportarCSV()">
                <i class="fas fa-file-csv"></i> Exportar CSV
            </button>
        </div>
    `;
    container.innerHTML = botoes;
    window.resultadosComparacao = resultados;
    ordenarComparacao('montante');
}

function ordenarComparacao(criterio) {
    if (!window.resultadosComparacao) return;
    const sorted = [...window.resultadosComparacao].sort((a, b) =>
        criterio === 'montante' ? b.montante - a.montante : b.indice_sharpe - a.indice_sharpe
    );
    const container = document.getElementById('comparacao-container');
    const botoesDiv = container.querySelector('div:first-child');
    container.innerHTML = '';
    if (botoesDiv) container.appendChild(botoesDiv);
    container.insertAdjacentHTML('beforeend', gerarTabelaComparacao(sorted));
}

function gerarTabelaComparacao(resultados) {
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Posição</th>
                        <th>Investimento</th>
                        <th>Indexador</th>
                        <th>Montante Final</th>
                        <th>Rendimento</th>
                        <th>Rentabilidade</th>
                        <th>IR</th>
                        <th>Sharpe</th>
                        <th>Carência</th>
                    </tr>
                </thead>
                <tbody>
    `;

    resultados.forEach((r, i) => {
        const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📊';
        const carenciaIcon = r.carencia_atendida ? '✅' : '⚠️';
        const carenciaTitle = r.carencia_atendida ? 'Carência ok' : `Carência de ${r.carencia_dias} dias não atendida`;
        const destaque = i === 0 ? 'style="background: rgba(46, 204, 113, 0.1);"' : '';

        html += `
            <tr ${destaque}>
                <td><span ${i === 0 ? 'style="color:#f1c40f;"' : ''}>${medalha} ${i + 1}º</span></td>
                <td><strong>${r.nome}</strong></td>
                <td>${r.indexador}</td>
                <td class="result-value">${Formatador.moeda(r.montante)}</td>
                <td>${Formatador.moeda(r.lucro)}</td>
                <td>${Formatador.porcentagem(r.rentabilidade)}</td>
                <td><span class="investimento-tag ${r.tipo_ir === 'Isento' ? 'tag-isento' : 'tag-tributado'}">${r.tipo_ir}</span></td>
                <td>${r.indice_sharpe ? r.indice_sharpe.toFixed(3) : 'N/A'}</td>
                <td title="${carenciaTitle}">${carenciaIcon}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    return html;
}

function exportarCSV() {
    if (!window.resultadosComparacao) return;
    let csv = "Posição,Investimento,Indexador,Montante,Rendimento,Rentabilidade,IR,Sharpe,Carência\n";
    window.resultadosComparacao.forEach((r, i) => {
        csv += `${i + 1},${r.nome},${r.indexador},${r.montante},${r.lucro},${r.rentabilidade},${r.tipo_ir},${r.indice_sharpe},${r.carencia_atendida}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'comparacao_investimentos.csv';
    link.click();
}

function criarGraficoComparativo(resultados) {
    const canvas = document.getElementById('grafico-comparativo');
    if (!canvas) return;
    if (window.comparacaoChart) window.comparacaoChart.destroy();

    window.comparacaoChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: resultados.map(r => r.nome),
            datasets: [
                {
                    label: 'Montante Final (R$)',
                    data: resultados.map(r => r.montante),
                    backgroundColor: 'rgba(52,152,219,0.7)',
                    borderColor: '#2980b9',
                    borderWidth: 2,
                    borderRadius: 8,
                    yAxisID: 'y'
                },
                {
                    label: 'Rentabilidade (%)',
                    data: resultados.map(r => r.rentabilidade),
                    backgroundColor: 'rgba(46,204,113,0.7)',
                    borderColor: '#27ae60',
                    borderWidth: 2,
                    borderRadius: 8,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Comparativo de Investimentos' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.dataset.label.includes('R$') ? Formatador.moeda(ctx.raw) : ctx.raw.toFixed(2) + '%'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    ticks: { callback: (v) => Formatador.moeda(v) }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { callback: (v) => v + '%' }
                }
            }
        }
    });
}

// Taxas equivalentes
async function calcularTaxaEquivalente() {
    const tipo = document.getElementById('tipo_conversao')?.value;
    const taxa = parseFloat(document.getElementById('taxa_original')?.value) || 0;
    const dias = parseInt(document.getElementById('prazo_dias')?.value) || 360;
    const ipca = parseFloat(document.getElementById('ipca_projetado')?.value) || 4;

    if (taxa <= 0) {
        Notificacao.show('Digite uma taxa válida!', 'warning');
        return;
    }

    Loading.show();
    try {
        const resp = await fetch('/api/taxas-equivalentes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, taxa, dias, ipca })
        });
        const result = await resp.json();
        if (result.sucesso) {
            document.getElementById('resultado-taxa').innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-calculator"></i>
                    <div>
                        <strong>Resultado:</strong> ${result.resultado.descricao}<br>
                        <span style="font-size: 1.2rem; font-weight: 600;">Taxa equivalente: ${result.resultado.equivalente.toFixed(2)}%</span>
                    </div>
                </div>
            `;
        } else {
            Notificacao.show(result.erro || 'Erro ao calcular', 'danger');
        }
    } catch (error) {
        Notificacao.show('Erro ao calcular taxa', 'danger');
    } finally {
        Loading.hide();
    }
}

// Histórico
async function carregarHistorico() {
    const container = document.getElementById('historico-container');
    if (!container) return;

    Loading.show();
    try {
        const resp = await fetch('/api/historico');
        const data = await resp.json();

        if (data.historico && data.historico.length > 0) {
            let html = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Investimento</th>
                                <th>Valor Inicial</th>
                                <th>Resultado</th>
                                <th>Rentabilidade</th>
                                <th>Lucro</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            data.historico.slice().reverse().forEach(item => {
                const lucro = item.montante - item.valor_inicial;
                html += `
                    <tr>
                        <td>${item.data}</td>
                        <td><strong>${item.nome}</strong></td>
                        <td>${Formatador.moeda(item.valor_inicial)}</td>
                        <td class="result-value">${Formatador.moeda(item.montante)}</td>
                        <td>${Formatador.porcentagem(item.rentabilidade)}</td>
                        <td>${Formatador.moeda(lucro)}</td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Nenhuma simulação realizada ainda. <a href="/simulacao">Faça sua primeira simulação!</a>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Erro ao carregar histórico.
            </div>
        `;
    } finally {
        Loading.hide();
    }
}
