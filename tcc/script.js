/* ================================================================
   DADOS (Mantidos)
   ================================================================ */
const INVESTIMENTOS = [
  {id:"1", nome:"CDB",                       ir:"tributado", idx:"CDI",      carencia:0,  fgc:true},
  {id:"2", nome:"LCI",                       ir:"isento",    idx:"CDI",      carencia:90, fgc:true},
  {id:"3", nome:"LCA",                       ir:"isento",    idx:"CDI",      carencia:90, fgc:true},
  {id:"4", nome:"LCD",                       ir:"isento",    idx:"CDI",      carencia:90, fgc:true},
  {id:"5", nome:"CRI",                       ir:"isento",    idx:"IPCA",     carencia:30, fgc:false},
  {id:"6", nome:"CRA",                       ir:"isento",    idx:"IPCA",     carencia:30, fgc:false},
  {id:"7", nome:"IPCA+",                     ir:"tributado", idx:"IPCA",     carencia:0,  fgc:false},
  {id:"8", nome:"CDB Híbrido",               ir:"tributado", idx:"CDI/IPCA", carencia:0,  fgc:true},
  {id:"9", nome:"Tesouro Selic",             ir:"tributado", idx:"CDI",      carencia:0,  fgc:false},
  {id:"10",nome:"Tesouro Prefixado",         ir:"tributado", idx:"Prefixado",carencia:0,  fgc:false},
  {id:"11",nome:"Debênture Incentivada",     ir:"isento",    idx:"IPCA",     carencia:30, fgc:false},
  {id:"12",nome:"Debênture Não Incentivada", ir:"tributado", idx:"IPCA",     carencia:30, fgc:false},
];

const GUIA_INFO = [
  {icon:"🏦",nome:"CDB",desc:"Emitido por bancos para captar recursos. Comum e acessível.",items:["FGC até R$ 250 mil","IR regressivo: 22,5% até 15%","Indexação: CDI, IPCA ou prefixado","Liquidez diária (maioria)"]},
  {icon:"🏠",nome:"LCI / LCA",desc:"Lastro em créditos imobiliários (LCI) ou agronegócio (LCA). Isentos de IR.",items:["ISENTO de Imposto de Renda","Carência mínima de 90 dias","FGC até R$ 250 mil","Ideal para curto/médio prazo"]},
  {icon:"🏗",nome:"CRI / CRA",desc:"Certificados de recebíveis imobiliários (CRI) ou agrícolas (CRA).",items:["ISENTO de Imposto de Renda","Indexação: IPCA+ ou prefixado","Liquidez geralmente no vencimento","Ideal para médio/longo prazo"]},
  {icon:"📈",nome:"IPCA+",desc:"Título público com proteção real contra inflação.",items:["Garantido pelo Tesouro Nacional","Indexação: IPCA + taxa prefixada","IR regressivo","Ideal para longo prazo"]},
  {icon:"🛡",nome:"Tesouro Selic / Prefixado",desc:"Títulos públicos federais pós ou pré-fixados.",items:["Garantido pelo Tesouro Nacional","IR regressivo","Liquidez diária (Selic)","Ideal para reserva de emergência"]},
  {icon:"📄",nome:"Debêntures",desc:"Dívida de empresas. Incentivadas são isentas de IR.",items:["IPCA ou CDI geralmente","Risco de crédito da empresa","Isenção IR (incentivadas)","Prazo longo, baixa liquidez"]},
];

/* ================================================================
   TOAST
   ================================================================ */
function toast(msg, tipo='info', ms=3200) {
  const icons = {success:'✅',error:'⛔',warn:'⚠️',info:'ℹ️'};
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.setAttribute('role','status');
  el.innerHTML = `<span>${icons[tipo]||'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(40px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),350); }, ms);
}

/* ================================================================
   MODAL
   ================================================================ */
let _modalCallback = null;
function abrirModal(titulo, corpo, onConfirm) {
  document.getElementById('modal-title').textContent = titulo;
  document.getElementById('modal-body').textContent = corpo;
  _modalCallback = onConfirm;
  document.getElementById('modal').classList.add('open');
  document.getElementById('modal-cancel').focus();
}
document.getElementById('modal-cancel').onclick = () => { document.getElementById('modal').classList.remove('open'); _modalCallback = null; };
document.getElementById('modal-confirm').onclick = () => { document.getElementById('modal').classList.remove('open'); if(_modalCallback) _modalCallback(); _modalCallback = null; };
document.getElementById('modal').addEventListener('click', e => { if(e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('open'); });

/* ================================================================
   PROGRESSO
   ================================================================ */
function startProgress(wrapId, barId, durMs=500) {
  const wrap = document.getElementById(wrapId), bar = document.getElementById(barId);
  wrap.classList.add('show'); bar.style.width='0';
  let pct=0;
  const iv = setInterval(()=>{ pct = Math.min(pct+8, 90); bar.style.width=pct+'%'; }, durMs/12);
  return () => { clearInterval(iv); bar.style.width='100%'; setTimeout(()=>{ wrap.classList.remove('show'); bar.style.width='0'; },300); };
}

/* ================================================================
   NAVEGAÇÃO
   ================================================================ */
const PAGES = [
  {id:"home",       label:"🏠 Início"},
  {id:"simulacao",  label:"🧮 Simular"},
  {id:"comparacao", label:"⚖️ Comparar"},
  {id:"calculadora",label:"📐 Taxas"},
  {id:"historico",  label:"📜 Histórico"},
  {id:"guia",       label:"📖 Guia"},
];

function buildNav() {
  const nav = document.getElementById('nav');
  PAGES.forEach(p => {
    const btn = document.createElement('button');
    const parts = p.label.split(' ');
    btn.innerHTML = `${parts[0]} <span>${parts.slice(1).join(' ')}</span>`;
    btn.onclick = () => goTo(p.id);
    btn.id = `nav-${p.id}`;
    btn.setAttribute('aria-label', parts.slice(1).join(' '));
    nav.appendChild(btn);
  });
}

function goTo(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
  document.getElementById(`page-${id}`).classList.add('active');
  const navBtn = document.getElementById(`nav-${id}`);
  if (navBtn) { navBtn.classList.add('active'); navBtn.setAttribute('aria-current','page'); }
  window.scrollTo(0,0);
  if (id === 'historico') renderHistorico();
}

document.addEventListener('keydown', e => {
  if (e.target.classList.contains('card-action') && (e.key==='Enter'||e.key===' ')) e.target.click();
});

/* ================================================================
   TEMA
   ================================================================ */
function initTheme() {
  const saved = localStorage.getItem('theme');
  const pref = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  setTheme(saved || pref);
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('theme-btn').textContent = t==='dark' ? '☀️' : '🌙';
  document.getElementById('theme-btn').setAttribute('aria-label', t==='dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
  localStorage.setItem('theme', t);
}
document.getElementById('theme-btn').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  setTheme(cur==='dark' ? 'light' : 'dark');
};

/* ================================================================
   FORMATADORES
   ================================================================ */
const fmt = {
  moeda: v => (isNaN(v)||v===null) ? 'R$ 0,00' : Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
  pct:   (v,d=2) => (isNaN(v)||v===null) ? '0,00 %' : Number(v).toFixed(d).replace('.',',')+' %',
  num:   v => (isNaN(v)||v===null) ? '0' : Number(v).toLocaleString('pt-BR'),
};

/* ================================================================
   VALIDAÇÃO
   ================================================================ */
function validarCampo(id, errId, condicao, msg) {
  const el = document.getElementById(id);
  const err = document.getElementById(errId);
  const ok = condicao(parseFloat(el.value));
  el.classList.toggle('input-error', !ok);
  if (err) { err.classList.toggle('show', !ok); if(!ok) err.textContent = msg; }
  return ok;
}

function validarFormSim() {
  const v1 = validarCampo('s-valor',    's-valor-err',  v=>v>0,              'Valor inicial deve ser maior que zero.');
  const v2 = validarCampo('s-meses',    's-meses-err',  v=>v>=1&&v<=480,     'Período deve ser entre 1 e 480 meses.');
  const v3 = validarCampo('s-cdi',      's-cdi-err',    v=>v>=0&&v<=100,     'CDI deve ser entre 0% e 100%.');
  const v4 = validarCampo('s-perc-cdi', 's-pcdi-err',   v=>v>=1&&v<=200,     'Percentual deve ser entre 1% e 200%.');
  return v1 && v2 && v3 && v4;
}

/* ================================================================
   CÁLCULO FINANCEIRO
   ================================================================ */
function aliquotaIR(dias) {
  if (dias <= 180) return 22.5;
  if (dias <= 360) return 20.0;
  if (dias <= 720) return 17.5;
  return 15.0;
}

function taxaMensalInv(inv, p) {
  const cdiDecimal = p.cdi / 100;
  const percCdiDecimal = p.percCdi / 100;
  const cdiEfetivo = cdiDecimal * percCdiDecimal;
  const cdiMensal = cdiEfetivo / 12;

  const ipcaDecimal = p.ipca / 100;
  const prefixDecimal = p.prefix / 100;
  const ipcaAnual = (1 + ipcaDecimal) * (1 + prefixDecimal) - 1;
  const ipcaMensal = Math.pow(1 + ipcaAnual, 1/12) - 1;

  const prefixMensal = Math.pow(1 + prefixDecimal, 1/12) - 1;

  switch (inv.idx) {
    case 'CDI':      return cdiMensal;
    case 'IPCA':     return ipcaMensal;
    case 'Prefixado':return prefixMensal;
    case 'CDI/IPCA': {
      const cdiAnual = cdiEfetivo;
      const mediaAnual = cdiAnual * 0.5 + ipcaAnual * 0.5;
      return Math.pow(1 + mediaAnual, 1/12) - 1;
    }
    default: return 0;
  }
}

function simular(inv, p) {
  const tm = taxaMensalInv(inv, p);
  let montante = p.valor * Math.pow(1 + tm, p.meses);
  if (p.aporte > 0) {
    if (tm > 0) {
      montante += p.aporte * ((Math.pow(1 + tm, p.meses) - 1) / tm);
    } else {
      montante += p.aporte * p.meses;
    }
  }

  const totalInvestido = p.valor + p.aporte * p.meses;
  const lucroBruto = Math.max(0, montante - totalInvestido);

  let ir = 0, imposto = 0;
  if (inv.ir === 'tributado' && lucroBruto > 0) {
    ir = aliquotaIR(p.meses * 30);
    imposto = lucroBruto * (ir / 100);
  }
  const liquido = montante - imposto;
  const lucroLiq = liquido - totalInvestido;

  const rentBruta = totalInvestido > 0 ? (montante / totalInvestido - 1) * 100 : 0;
  const rentLiq   = totalInvestido > 0 ? (liquido   / totalInvestido - 1) * 100 : 0;

  const rentLiqAnual = p.meses > 0 ? (Math.pow(1 + rentLiq/100, 12/p.meses) - 1) : 0;
  const volat = {CDI:0.03, IPCA:0.05, 'CDI/IPCA':0.04, Prefixado:0.01}[inv.idx] || 0.03;
  const sharpe = volat > 0 ? (rentLiqAnual - (p.cdi/100)) / volat : 0;

  const valorReal = p.ipca > 0 ? liquido / Math.pow(1 + p.ipca/100, p.meses/12) : liquido;

  return {
    nome: inv.nome, idx: inv.idx, ir: inv.ir,
    montante, liquido, totalInvestido, lucroBruto, lucroLiq,
    rentBruta, rentLiq, alIR: ir, imposto,
    sharpe: Math.round(sharpe * 1000) / 1000,
    carencia: inv.carencia, carenciaOk: p.meses * 30 >= inv.carencia,
    valorReal, meses: p.meses,
    taxaAnual: taxaMensalInv(inv, p) * 12 * 100,
    data: new Date().toLocaleString('pt-BR'),
  };
}

function evolucaoMensal(inv, p) {
  const tm = taxaMensalInv(inv, p);
  const ev = [];
  let saldo = p.valor;
  let invest = p.valor;
  for (let m = 1; m <= p.meses; m++) {
    saldo = saldo * (1 + tm) + p.aporte;
    invest += p.aporte;
    ev.push({ mes: m, saldo: Math.round(saldo * 100) / 100, invest: Math.round(invest * 100) / 100 });
  }
  return ev;
}

/* ================================================================
   SIMULAÇÃO (Lógica mantida)
   ================================================================ */
let invSelecionado = null;
let chartSim = null;
let lastResultado = null;

function buildInvPicker() {
  const el = document.getElementById('inv-picker');
  el.innerHTML = '';
  INVESTIMENTOS.forEach(inv => {
    const div = document.createElement('div');
    div.className = 'inv-item';
    div.id = `inv-${inv.id}`;
    div.setAttribute('role','option');
    div.setAttribute('tabindex','0');
    div.setAttribute('aria-label', `${inv.nome} — ${inv.ir === 'isento' ? 'Isento de IR' : 'IR regressivo'}`);
    div.innerHTML = `
      <div class="inv-name">${inv.nome}</div>
      <div class="inv-badges">
        <span class="badge ${inv.ir==='isento'?'badge-green':'badge-gray'}">${inv.ir==='isento'?'Isento':'Tributado'}</span>
        <span class="badge badge-teal">${inv.idx}</span>
      </div>
      ${inv.carencia ? `<div class="inv-carencia">⏳ Carência: ${inv.carencia}d</div>` : ''}
      ${inv.fgc ? `<div class="inv-carencia">🛡 FGC</div>` : ''}
    `;
    div.onclick = () => selectInv(inv);
    div.onkeydown = e => { if(e.key==='Enter'||e.key===' ') selectInv(inv); };
    el.appendChild(div);
  });
}

function selectInv(inv) {
  invSelecionado = inv;
  document.querySelectorAll('.inv-item').forEach(d => { d.classList.remove('selected'); d.setAttribute('aria-selected','false'); });
  const el = document.getElementById(`inv-${inv.id}`);
  el.classList.add('selected');
  el.setAttribute('aria-selected','true');
  document.getElementById('inv-alert').style.display = 'none';
  document.getElementById('sim-global-error').style.display = 'none';
  toast(`${inv.nome} selecionado`, 'info', 1800);
}

function getParams() {
  return {
    valor:   parseFloat(document.getElementById('s-valor').value)    || 1000,
    meses:   parseInt(document.getElementById('s-meses').value)      || 12,
    aporte:  parseFloat(document.getElementById('s-aporte').value)   || 0,
    cdi:     parseFloat(document.getElementById('s-cdi').value)      || 10.5,
    percCdi: parseFloat(document.getElementById('s-perc-cdi').value) || 100,
    ipca:    parseFloat(document.getElementById('s-ipca').value)     || 4.5,
    prefix:  parseFloat(document.getElementById('s-prefix').value)   || 5,
  };
}

function executarSimulacao() {
  if (!invSelecionado) {
    document.getElementById('inv-alert').style.display = 'flex';
    const errBox = document.getElementById('sim-global-error');
    errBox.style.display = 'flex';
    document.getElementById('sim-error-msg').textContent = 'Selecione um tipo de investimento antes de simular.';
    errBox.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  if (!validarFormSim()) {
    const errBox = document.getElementById('sim-global-error');
    errBox.style.display = 'flex';
    document.getElementById('sim-error-msg').textContent = 'Corrija os campos destacados em vermelho antes de continuar.';
    return;
  }
  document.getElementById('sim-global-error').style.display = 'none';

  const btn = document.getElementById('btn-simular');
  btn.innerHTML = '<span class="spinner"></span> Calculando...';
  btn.disabled = true;

  const stopProg = startProgress('prog-wrap','prog-bar',500);

  setTimeout(() => {
    const p = getParams();
    const res = simular(invSelecionado, p);
    lastResultado = res;
    renderResultado(res, invSelecionado, p);
    salvarHistorico(res);
    stopProg();
    btn.innerHTML = '▶ Simular';
    btn.disabled = false;
    toast('Simulação concluída com sucesso!', 'success');
  }, 500);
}

function renderResultado(res, inv, p) {
  const ca = document.getElementById('carencia-alert');
  if (!res.carenciaOk && res.carencia > 0) {
    ca.style.display = 'flex';
    document.getElementById('carencia-msg').textContent =
      `Atenção: carência de ${res.carencia} dias não atendida para ${inv.nome}. Prazo informado: ${p.meses * 30} dias. Possível perda de rendimento ou bloqueio de resgate.`;
  } else {
    ca.style.display = 'none';
  }

  document.getElementById('res-titulo').textContent = `Resultado — ${res.nome} (${res.meses} meses)`;

  const stats = [
    {label:'Total Investido',  value:fmt.moeda(res.totalInvestido), hi:false},
    {label:'Montante Bruto',   value:fmt.moeda(res.montante),       hi:false},
    {label:'Montante Líquido', value:fmt.moeda(res.liquido),        hi:true},
    {label:'Lucro Líquido',    value:fmt.moeda(res.lucroLiq),       hi:true},
    {label:'Rentab. Bruta',    value:fmt.pct(res.rentBruta),        hi:false},
    {label:'Rentab. Líquida',  value:fmt.pct(res.rentLiq),          hi:true},
    {label:'IR Pago',          value:res.imposto>0 ? `${fmt.moeda(res.imposto)} (${res.alIR}%)` : '✅ ISENTO', hi:false},
    {label:'Índice Sharpe',    value:res.sharpe.toFixed(3),         hi:false},
  ];

  document.getElementById('res-stats').innerHTML = stats.map(s => `
    <div class="stat-box ${s.hi?'highlight':''}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
    </div>
  `).join('');

  document.getElementById('result-section').classList.add('visible');
  document.getElementById('result-section').scrollIntoView({behavior:'smooth', block:'start'});

  const ev = evolucaoMensal(inv, p);
  const labels = ev.map(e => `Mês ${e.mes}`);

  if (chartSim) chartSim.destroy();
  const ctx = document.getElementById('chart-sim').getContext('2d');
  chartSim = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Saldo Bruto', data:ev.map(e=>e.saldo), borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.1)', tension:.35, fill:true, pointRadius:ev.length>60?0:3},
        {label:'Total Investido', data:ev.map(e=>e.invest), borderColor:'#64748b', backgroundColor:'rgba(100,116,139,.08)', tension:.1, fill:true, pointRadius:0, borderDash:[6,3]},
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{position:'top'},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmt.moeda(c.raw)}`}}
      },
      scales:{y:{ticks:{callback:v=>fmt.moeda(v)}, grid:{color:'rgba(37,99,235,.08)'}}}
    }
  });
}

function resetSimulacao() {
  document.getElementById('result-section').classList.remove('visible');
  invSelecionado = null;
  document.querySelectorAll('.inv-item').forEach(d => { d.classList.remove('selected'); d.removeAttribute('aria-selected'); });
  document.getElementById('inv-alert').style.display = 'none';
  document.getElementById('sim-global-error').style.display = 'none';
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('input.input-error').forEach(e => e.classList.remove('input-error'));
}

function exportarTXT() {
  if (!lastResultado) return;
  const r = lastResultado;
  const txt = [
    '═══════════════════════════════════════',
    '   RELATÓRIO DE SIMULAÇÃO',
    '═══════════════════════════════════════',
    `Data           : ${r.data}`,
    `Investimento   : ${r.nome}`,
    `Indexador      : ${r.idx}`,
    `Período        : ${r.meses} meses`,
    ``,
    'RESULTADOS:',
    `Total Investido     : ${fmt.moeda(r.totalInvestido)}`,
    `Montante Bruto      : ${fmt.moeda(r.montante)}`,
    `Montante Líquido    : ${fmt.moeda(r.liquido)}`,
    `Lucro Líquido       : ${fmt.moeda(r.lucroLiq)}`,
    `Rentabilidade Bruta : ${fmt.pct(r.rentBruta)}`,
    `Rentabilidade Líq.  : ${fmt.pct(r.rentLiq)}`,
    r.imposto > 0 ? `IR Pago             : ${fmt.moeda(r.imposto)} (${r.alIR}%)` : 'IR                  : ISENTO',
    `Índice Sharpe       : ${r.sharpe.toFixed(3)}`,
    `Valor Real (–IPCA)  : ${fmt.moeda(r.valorReal)}`,
    ``,
    '⚠️ Simulação ilustrativa. Consulte um especialista.',
  ].join('\n');

  const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio_${r.nome.replace(/\s+/g,'_')}_${r.meses}meses.txt`;
  a.click();
  toast('Relatório exportado!', 'success');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('page-simulacao').classList.contains('active')) {
    if (!['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName) || e.target.tagName === 'INPUT') {
      if (e.target.tagName === 'INPUT') executarSimulacao();
    }
  }
});

/* ================================================================
   COMPARAÇÃO (Lógica mantida)
   ================================================================ */
let compResultados = [];
let compSortMode = 'montante';
let chartComp = null;

function buildCompList() {
  const el = document.getElementById('comp-list');
  if (el) el.innerHTML = INVESTIMENTOS.map(i => `<span>✅ ${i.nome}</span>`).join('');
}

function executarComparacao() {
  const p = {
    valor:   parseFloat(document.getElementById('c-valor').value)   || 10000,
    meses:   parseInt(document.getElementById('c-meses').value)     || 12,
    aporte:  parseFloat(document.getElementById('c-aporte').value)  || 0,
    cdi:     parseFloat(document.getElementById('c-cdi').value)     || 10.5,
    percCdi: parseFloat(document.getElementById('c-perc').value)    || 100,
    ipca:    parseFloat(document.getElementById('c-ipca').value)    || 4.5,
    prefix:  parseFloat(document.getElementById('c-prefix').value)  || 5,
  };

  if (p.valor <= 0 || p.meses < 1) { toast('Verifique os parâmetros da comparação.','error'); return; }

  const btn = document.getElementById('btn-comparar');
  btn.innerHTML = '<span class="spinner"></span> Comparando...';
  btn.disabled = true;
  const stopProg = startProgress('prog-wrap-c','prog-bar-c',600);

  setTimeout(() => {
    compResultados = INVESTIMENTOS.map(inv => simular(inv, p));
    renderComparacao();
    document.getElementById('comp-results').style.display = 'block';
    document.getElementById('comp-results').scrollIntoView({behavior:'smooth', block:'start'});
    stopProg();
    btn.innerHTML = '⚖ Comparar Todos';
    btn.disabled = false;
    toast('Comparação concluída!', 'success');
  }, 600);
}

function renderComparacao() {
  const sorted = [...compResultados].sort((a,b) =>
    compSortMode === 'montante' ? b.liquido - a.liquido : b.sharpe - a.sharpe
  );

  if (chartComp) chartComp.destroy();
  const ctx = document.getElementById('chart-comp').getContext('2d');
  const colors = sorted.map((_,i) => `hsl(217, ${70-i*2}%, ${50+i*2}%)`);
  chartComp = new Chart(ctx, {
    type:'bar',
    data:{
      labels:sorted.map(r=>r.nome),
      datasets:[{
        label:'Montante Líquido',
        data:sorted.map(r=>r.liquido),
        backgroundColor:colors.map(c=>c.replace(')',',0.8')),
        borderColor:colors,
        borderWidth:1, borderRadius:6,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{tooltip:{callbacks:{label:c=>fmt.moeda(c.raw)}}},
      scales:{y:{ticks:{callback:v=>fmt.moeda(v)}, grid:{color:'rgba(37,99,235,.08)'}}}
    }
  });

  const medals = ['🥇','🥈','🥉'];
  document.getElementById('comp-tbody').innerHTML = sorted.map((r,i) => `
    <tr ${i===0?'style="background:var(--accent-lt)"':''}>
      <td style="font-weight:700">${medals[i]||`${i+1}º`}</td>
      <td style="font-weight:700">${r.nome}</td>
      <td><span class="badge badge-teal">${r.idx}</span></td>
      <td style="text-align:right;font-weight:800;color:var(--accent)">${fmt.moeda(r.liquido)}</td>
      <td style="text-align:right">${fmt.pct(r.rentLiq)}</td>
      <td>${r.imposto===0 ? '<span class="badge badge-green">Isento</span>' : `<span class="badge badge-gray">${fmt.moeda(r.imposto)}</span>`}</td>
      <td style="text-align:right">${r.sharpe.toFixed(3)}</td>
      <td style="text-align:center" title="${r.carenciaOk?'Carência atendida':'Carência NÃO atendida'}">${r.carenciaOk?'✅':'❌'}</td>
    </tr>
  `).join('');
}

function toggleSort() {
  compSortMode = compSortMode === 'montante' ? 'sharpe' : 'montante';
  document.getElementById('btn-sort').textContent = compSortMode === 'montante' ? '🔃 Por Sharpe' : '🔃 Por Montante';
  if (compResultados.length) renderComparacao();
}

function exportarCSV() {
  if (!compResultados.length) { toast('Execute a comparação primeiro.','warn'); return; }
  const sorted = [...compResultados].sort((a,b)=>b.liquido-a.liquido);
  let csv = 'Pos,Investimento,Indexador,MontanteLiq,RentabLiq,Imposto,Sharpe,CarenciaOk\n';
  sorted.forEach((r,i) => {
    csv += `${i+1},"${r.nome}",${r.idx},${r.liquido.toFixed(2)},${r.rentLiq.toFixed(4)},${r.imposto.toFixed(2)},${r.sharpe},${r.carenciaOk}\n`;
  });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'comparacao_investimentos.csv';
  a.click();
  toast('CSV exportado!', 'success');
}

/* ================================================================
   CALCULADORA DE TAXAS (Lógica mantida)
   ================================================================ */
function toggleIpca() {
  const tipo = document.getElementById('tax-tipo').value;
  document.getElementById('ipca-group').style.display = tipo==='ipca_cdb' ? 'block' : 'none';
  document.getElementById('tax-result').style.display = 'none';
}

function calcularTaxaEquivalente() {
  const tipo = document.getElementById('tax-tipo').value;
  const taxa = parseFloat(document.getElementById('tax-taxa').value);
  const dias = parseInt(document.getElementById('tax-dias').value);
  const ipca = parseFloat(document.getElementById('tax-ipca').value) || 0;

  if (isNaN(taxa) || taxa < 0 || taxa > 100) {
    document.getElementById('tax-taxa-err').classList.add('show');
    document.getElementById('tax-taxa').classList.add('input-error');
    return;
  }
  document.getElementById('tax-taxa-err').classList.remove('show');
  document.getElementById('tax-taxa').classList.remove('input-error');

  if (isNaN(dias) || dias < 1) { toast('Prazo inválido.','error'); return; }

  const al = aliquotaIR(dias);
  const alDecimal = al / 100;
  let equiv = 0, desc = '';

  if (tipo === 'cdb_isento') {
    equiv = taxa * (1 - alDecimal);
    desc = `CDB ${taxa.toFixed(2)}%  →  LCI/LCA equivalente`;
  } else if (tipo === 'isento_cdb') {
    equiv = taxa / (1 - alDecimal);
    desc = `LCI/LCA ${taxa.toFixed(2)}%  →  CDB equivalente`;
  } else {
    const totalAnual = ((1 + ipca/100) * (1 + taxa/100) - 1) * 100;
    equiv = totalAnual / (1 - alDecimal);
    desc = `IPCA+${taxa.toFixed(2)}% com IPCA ${ipca.toFixed(1)}%  →  CDB equivalente`;
  }

  document.getElementById('tax-desc').textContent = desc;
  document.getElementById('tax-value').textContent = equiv.toFixed(2).replace('.',',') + '%';
  document.getElementById('tax-ir-info').textContent = `Alíquota de IR aplicada: ${al}% (prazo de ${dias} dias)`;
  document.getElementById('tax-result').style.display = 'block';
}

/* ================================================================
   HISTÓRICO (Lógica mantida)
   ================================================================ */
function salvarHistorico(r) {
  try {
    const hist = JSON.parse(localStorage.getItem('sim_hist') || '[]');
    hist.unshift({nome:r.nome, valor:r.totalInvestido, montante:r.liquido, rentab:r.rentLiq, data:r.data});
    localStorage.setItem('sim_hist', JSON.stringify(hist.slice(0, 20)));
  } catch(e) { console.warn('Não foi possível salvar histórico:', e); }
}

function renderHistorico() {
  const hist = JSON.parse(localStorage.getItem('sim_hist') || '[]');
  const el = document.getElementById('hist-content');
  if (!hist.length) {
    el.innerHTML = `
      <div class="hist-empty">
        <div class="big-icon">📜</div>
        <p>Nenhuma simulação realizada ainda.</p>
        <br>
        <a href="#" onclick="goTo('simulacao');return false;">Faça sua primeira simulação!</a>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table aria-label="Histórico de simulações">
        <thead><tr><th>#</th><th>Data</th><th>Investimento</th><th style="text-align:right">Total Investido</th><th style="text-align:right">Montante Líquido</th><th style="text-align:right">Rentabilidade</th></tr></thead>
        <tbody>
          ${hist.map((h,i)=>`
            <tr>
              <td style="color:var(--text-muted)">${hist.length-i}</td>
              <td style="color:var(--text-muted);font-size:.82rem;white-space:nowrap">${h.data}</td>
              <td style="font-weight:700">${h.nome}</td>
              <td style="text-align:right;color:var(--text-muted)">${fmt.moeda(h.valor)}</td>
              <td style="text-align:right;font-weight:800;color:var(--accent)">${fmt.moeda(h.montante)}</td>
              <td style="text-align:right;font-weight:700;color:${h.rentab>=0?'var(--success)':'var(--danger)'}">${fmt.pct(h.rentab)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top:.75rem;font-size:.75rem;color:var(--text-muted)">${hist.length} simulação(ões) salva(s) — máx. 20 registros.</p>
    </div>`;
}

function confirmarLimpar() {
  abrirModal(
    '🗑 Limpar Histórico',
    'Esta ação removerá todas as simulações salvas permanentemente. Não é possível desfazer.',
    () => {
      try { localStorage.removeItem('sim_hist'); } catch(e) {}
      renderHistorico();
      toast('Histórico apagado.', 'info');
    }
  );
}

/* ================================================================
   GUIA
   ================================================================ */
function buildGuia() {
  const el = document.getElementById('guia-cards');
  if (!el) return;
  el.innerHTML = GUIA_INFO.map(g => `
    <div class="card">
      <div class="card-title" style="font-size:1rem">${g.icon} ${g.nome}</div>
      <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:.75rem;line-height:1.5">${g.desc}</p>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:.4rem">
        ${g.items.map(it=>`<li style="font-size:.82rem;display:flex;align-items:flex-start;gap:.4rem"><span>✅</span>${it}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

/* ================================================================
   INIT (ATUALIZADO)
   ================================================================ */
(function init() {
  buildNav();
  initTheme();
  buildInvPicker();
  buildCompList();
  buildGuia();
  document.getElementById('nav-home').classList.add('active');
  document.getElementById('nav-home').setAttribute('aria-current','page');
})();