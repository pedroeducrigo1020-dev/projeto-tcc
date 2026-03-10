// Utilitários de formatação
const Formatador = {
    moeda: (valor) => {
        if (isNaN(valor) || valor === null) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    },
    
    porcentagem: (valor, casas = 2) => {
        if (isNaN(valor) || valor === null) return '0,00%';
        return valor.toFixed(casas).replace('.', ',') + '%';
    },
    
    data: (dataStr) => {
        try {
            return new Date(dataStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dataStr;
        }
    },
    
    numero: (valor) => {
        if (isNaN(valor) || valor === null) return '0';
        return new Intl.NumberFormat('pt-BR').format(valor);
    }
};

// Gerenciador de Loading
const Loading = {
    show: () => {
        let loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('active');
        }
    },
    
    hide: () => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('active');
        }
    }
};

// Sistema de Notificações
const Notificacao = {
    show: (mensagem, tipo = 'success', tempo = 3000) => {
        const notification = document.createElement('div');
        notification.className = `alert alert-${tipo}`;
        
        const icones = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'exclamation-circle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icones[tipo] || 'info-circle'}"></i>
            <span>${mensagem}</span>
        `;
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, tempo);
    }
};

// Formulários Dinâmicos
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar máscaras de moeda
    const inputsMoeda = document.querySelectorAll('.moeda');
    inputsMoeda.forEach(input => {
        input.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length === 0) {
                e.target.value = '';
                return;
            }
            valor = (parseInt(valor) / 100).toFixed(2);
            e.target.value = Formatador.moeda(valor).replace('R$', '').trim();
        });
        
        // Formatar valor inicial se existir
        if (input.value) {
            let valor = input.value.replace(/\D/g, '');
            if (valor.length > 0) {
                valor = (parseInt(valor) / 100).toFixed(2);
                input.value = Formatador.moeda(valor).replace('R$', '').trim();
            }
        }
    });
    
    // Animação nos cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animation = `slideIn 0.5s ease ${index * 0.1}s both`;
    });
});

// Funções para simulação
async function realizarSimulacao() {
    const form = document.getElementById('form-simulacao');
    if (!form) return;
    
    const tipoInvestimento = document.getElementById('tipo_investimento')?.value;
    if (!tipoInvestimento) {
        Notificacao.show('Selecione um tipo de investimento!', 'warning');
        return;
    }
    
    Loading.show();
    
    try {
        const valorInicial = document.getElementById('valor_inicial')?.value.replace(/\D/g, '') || '0';
        const aporteMensal = document.getElementById('aporte_mensal')?.value.replace(/\D/g, '') || '0';
        
        const dados = {
            tipo_investimento: tipoInvestimento,
            valor_inicial: parseFloat(valorInicial) / 100 || 0,
            meses: parseInt(document.getElementById('meses')?.value) || 1,
            aporte_mensal: parseFloat(aporteMensal) / 100 || 0,
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
        
        const response = await fetch('/api/simular', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        
        if (result.sucesso) {
            exibirResultado(result.resultado);
            Notificacao.show('Simulação realizada com sucesso!', 'success');
        } else {
            Notificacao.show(result.erro || 'Erro ao realizar simulação', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        Notificacao.show('Erro de conexão com o servidor', 'danger');
    } finally {
        Loading.hide();
    }
}

function exibirResultado(resultado) {
    const container = document.getElementById('resultado-container');
    if (!container) return;
    
    const impostoHTML = resultado.imposto_pago > 0 ? `
        <div class="result-item">
            <div class="result-label">IR Pago</div>
            <div class="result-value" style="color: var(--warning-color);">${Formatador.moeda(resultado.imposto_pago)}</div>
            <small>Alíquota: ${resultado.aliquota_ir.toFixed(1)}%</small>
        </div>
    ` : `
        <div class="result-item">
            <div class="result-label">Imposto de Renda</div>
            <div class="result-value" style="color: var(--success-color);">ISENTO</div>
            <small>✅ Investimento isento de IR</small>
        </div>
    `;
    
    container.innerHTML = `
        <div class="card result-card">
            <div class="card-header">
                <i class="fas fa-chart-pie"></i>
                <h2>Resultado da Simulação - ${resultado.nome_investimento}</h2>
            </div>
            
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Total Investido</div>
                    <div class="result-value">${Formatador.moeda(resultado.total_investido)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Montante Bruto</div>
                    <div class="result-value">${Formatador.moeda(resultado.montante_bruto)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Montante Líquido</div>
                    <div class="result-value">${Formatador.moeda(resultado.montante_liquido)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Rendimento Líquido</div>
                    <div class="result-value">${Formatador.moeda(resultado.lucro_liquido)}</div>
                </div>
            </div>
            
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Rentabilidade Bruta</div>
                    <div class="result-value">${Formatador.porcentagem(resultado.rentabilidade_bruta)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Rentabilidade Líquida</div>
                    <div class="result-value">${Formatador.porcentagem(resultado.rentabilidade_liquida)}</div>
                </div>
                ${impostoHTML}
            </div>
            
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Taxa Anual</div>
                    <div class="result-value">${Formatador.porcentagem(resultado.taxa_anual)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Indexador</div>
                    <div class="result-value" style="font-size: 1.2rem;">${resultado.indexador}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Período</div>
                    <div class="result-value" style="font-size: 1.2rem;">${resultado.meses} meses</div>
                </div>
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>${resultado.nome_investimento}</strong> • Simulação realizada em ${resultado.data}
                </div>
            </div>
            
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end; flex-wrap: wrap;">
                <button class="btn btn-outline" onclick="gerarRelatorio('pdf')">
                    <i class="fas fa-file-pdf"></i> Gerar PDF
                </button>
                <button class="btn btn-outline" onclick="gerarRelatorio('txt')">
                    <i class="fas fa-file-alt"></i> Gerar TXT
                </button>
            </div>
        </div>
    `;
    
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.ultimoResultado = resultado;
}

async function gerarRelatorio(formato) {
    if (!window.ultimoResultado) {
        Notificacao.show('Nenhum resultado para gerar relatório', 'warning');
        return;
    }
    
    Loading.show();
    
    try {
        const response = await fetch('/api/gerar-relatorio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                formato: formato,
                resultado: window.ultimoResultado
            })
        });
        
        const result = await response.json();
        
        if (result.sucesso) {
            window.open(`/download/${result.arquivo}`, '_blank');
            Notificacao.show('Relatório gerado com sucesso!', 'success');
        } else {
            Notificacao.show(result.erro || 'Erro ao gerar relatório', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        Notificacao.show('Erro ao gerar relatório', 'danger');
    } finally {
        Loading.hide();
    }
}

// Funções para comparação
async function realizarComparacao() {
    Loading.show();
    
    try {
        const valorInicial = document.getElementById('comp_valor_inicial')?.value.replace(/\D/g, '') || '1000000';
        const aporte = document.getElementById('comp_aporte')?.value.replace(/\D/g, '') || '0';
        
        const dados = {
            valor_inicial: parseFloat(valorInicial) / 100 || 10000,
            meses: parseInt(document.getElementById('comp_meses')?.value) || 12,
            aporte_mensal: parseFloat(aporte) / 100 || 0,
            taxa_cdi: parseFloat(document.getElementById('comp_taxa_cdi')?.value) || 10,
            ipca: parseFloat(document.getElementById('comp_ipca')?.value) || 4
        };
        
        const response = await fetch('/api/comparar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        
        if (result.sucesso) {
            exibirComparacao(result.resultados);
            criarGraficoComparativo(result.resultados);
            Notificacao.show('Comparação realizada com sucesso!', 'success');
        } else {
            Notificacao.show(result.erro || 'Erro ao realizar comparação', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        Notificacao.show('Erro ao realizar comparação', 'danger');
    } finally {
        Loading.hide();
    }
}

function exibirComparacao(resultados) {
    const container = document.getElementById('comparacao-container');
    if (!container) return;
    
    let html = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-chart-bar"></i>
                <h2>Resultado da Comparação</h2>
            </div>
            
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
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    resultados.forEach((r, index) => {
        const medalha = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊';
        const cor = index === 0 ? 'style="color: #f1c40f;"' : '';
        
        html += `
            <tr>
                <td><span ${cor}>${medalha} ${index + 1}º</span></td>
                <td><strong>${r.nome}</strong></td>
                <td>${r.indexador}</td>
                <td class="result-value">${Formatador.moeda(r.montante)}</td>
                <td>${Formatador.moeda(r.lucro)}</td>
                <td>${Formatador.porcentagem(r.rentabilidade)}</td>
                <td><span class="investimento-tag ${r.tipo_ir === 'Isento' ? 'tag-isento' : 'tag-tributado'}">${r.tipo_ir}</span></td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="alert alert-success" style="margin-top: 1rem;">
                <i class="fas fa-trophy"></i>
                <div>
                    <strong>Melhor opção:</strong> ${resultados[0].nome} com ${Formatador.moeda(resultados[0].montante)} 
                    (${Formatador.porcentagem(resultados[0].rentabilidade)})
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function criarGraficoComparativo(resultados) {
    const canvas = document.getElementById('grafico-comparativo');
    if (!canvas) return;
    
    if (window.comparacaoChart) {
        window.comparacaoChart.destroy();
    }
    
    window.comparacaoChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: resultados.map(r => r.nome),
            datasets: [
                {
                    label: 'Montante Final (R$)',
                    data: resultados.map(r => r.montante),
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: '#2980b9',
                    borderWidth: 2,
                    borderRadius: 8,
                    yAxisID: 'y'
                },
                {
                    label: 'Rentabilidade (%)',
                    data: resultados.map(r => r.rentabilidade),
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
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
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Comparativo de Investimentos',
                    font: { size: 16, weight: '600' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.label.includes('R$')) {
                                label += Formatador.moeda(context.raw);
                            } else {
                                label += context.raw.toFixed(2) + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Valor (R$)',
                        font: { weight: '600' }
                    },
                    ticks: {
                        callback: (value) => Formatador.moeda(value)
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Rentabilidade (%)',
                        font: { weight: '600' }
                    },
                    grid: { drawOnChartArea: false },
                    ticks: {
                        callback: (value) => value + '%'
                    }
                }
            }
        }
    });
}

// Funções para calculadora de taxas
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
        const dados = {
            tipo: tipo,
            taxa: taxa,
            dias: dias,
            ipca: ipca
        };
        
        const response = await fetch('/api/taxas-equivalentes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        
        if (result.sucesso) {
            exibirResultadoTaxa(result.resultado);
        } else {
            Notificacao.show(result.erro || 'Erro ao calcular', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        Notificacao.show('Erro ao calcular taxa', 'danger');
    } finally {
        Loading.hide();
    }
}

function exibirResultadoTaxa(resultado) {
    const container = document.getElementById('resultado-taxa');
    if (!container) return;
    
    container.innerHTML = `
        <div class="alert alert-success">
            <i class="fas fa-calculator"></i>
            <div>
                <strong>Resultado:</strong> ${resultado.descricao}<br>
                <span style="font-size: 1.2rem; font-weight: 600;">Taxa equivalente: ${resultado.equivalente.toFixed(2)}%</span>
            </div>
        </div>
    `;
}

// Funções para histórico
async function carregarHistorico() {
    const container = document.getElementById('historico-container');
    if (!container) return;
    
    Loading.show();
    
    try {
        const response = await fetch('/api/historico');
        const data = await response.json();
        
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
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Nenhuma simulação realizada ainda. Faça sua primeira simulação!</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <span>Erro ao carregar histórico.</span>
            </div>
        `;
    } finally {
        Loading.hide();
    }
}