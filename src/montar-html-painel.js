const movimentos = $('Buscar Pendentes de Categorização').all().map(i => i.json);
const conciliacoes = $('Buscar Conciliações Recentes').all().map(i => i.json);
const todasMovimentacoes = $('Buscar Todas as Movimentações').all().map(i => i.json);

const contas = ["Conta Banco A", "Conta Banco A - Cartão de Crédito", "Conta Banco B"]; // TODO: substitua pelos nomes reais das suas contas

const categoriasEntrada = ["Consultoria", "Planos de saúde", "Evento", "Reembolso", "Investimento de mainha", "Transferência Entre Contas", "Outros"];
const categoriasSaida = ["Pró labore", "Custo da empresa", "Impostos", "Custo de aquisição de cliente", "Reembolso", "Transferência Entre Contas", "Outros"];

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const LOGO_BASE64 = ""; // TODO: cole aqui a logo em base64 (ver README para o passo a passo de geracao)

function formatMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function periodoStart(c) {
  return c.property_período_de_referência ? c.property_período_de_referência.start : null;
}

function mesAnoKey(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

function mesAnoLabel(key) {
  const [ano, mes] = key.split('-');
  return meses[parseInt(mes, 10) - 1] + ' de ' + ano;
}

function toArray(valor) {
  if (!valor) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function getNome(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.replace(/^=/, '').trim();
  if (Array.isArray(valor)) return valor.map(getNome).join(', ');
  if (typeof valor === 'object' && valor.name) return String(valor.name).replace(/^=/, '').trim();
  return String(valor).replace(/^=/, '').trim();
}

function diaKey(isoStr) {
  if (!isoStr) return null;
  return isoStr.slice(0, 10);
}

function formatDiaBR(dia) {
  const [ano, mes, d] = dia.split('-');
  return `${d}/${mes}/${ano}`;
}

function conciliacaoMaisRecente(conta) {
  const doConta = conciliacoes.filter(c => getNome(c.property_conta_bancária) === conta);
  if (doConta.length === 0) return null;
  doConta.sort((a, b) => new Date(periodoStart(b) || 0) - new Date(periodoStart(a) || 0));
  return doConta[0];
}

function statusBadge(c) {
  if (!c) return '<span class="badge badge-gray">Sem conciliação</span>';
  if (c.property_status === 'Conciliado') return '<span class="badge badge-ok">✓ bate</span>';
  if (c.property_status === 'Em Divergência') return '<span class="badge badge-alerta">Diferença ' + formatMoeda(c.property_diferença) + '</span>';
  return '<span class="badge badge-atencao">' + (c.property_status || 'Pendente') + '</span>';
}

// ---- Pendências de conciliação: tudo que NÃO está "Conciliado" ----
const pendentes = conciliacoes.filter(c => c.property_status !== 'Conciliado');
pendentes.sort((a, b) => new Date(periodoStart(b) || 0) - new Date(periodoStart(a) || 0));

function pendentesDaConta(conta) {
  return pendentes.filter(c => getNome(c.property_conta_bancária) === conta).length;
}

const mesesDisponiveis = Array.from(new Set(pendentes.map(c => mesAnoKey(periodoStart(c))).filter(Boolean))).sort().reverse();

// ---- Dashboard: só movimentações de períodos "Conciliado" ----
const conciliacoesConciliadasIds = new Set(
  conciliacoes.filter(c => c.property_status === 'Conciliado').map(c => c.id)
);

const todasProcessadas = todasMovimentacoes
  .filter(m => {
    const conciliacaoId = toArray(m.property_conciliação)[0];
    return conciliacaoId && conciliacoesConciliadasIds.has(conciliacaoId);
  })
  .map(m => ({
    id: m.id,
    d: (m.property_data && m.property_data.start) ? m.property_data.start.slice(0, 10) : null,
    v: m.property_valor || 0,
    cat: m.property_categoria || 'Sem categoria',
    conta: m.property_conta || 'Outro'
  }))
  .filter(m => m.d);

const datasValidas = todasProcessadas.map(m => m.d).sort();
const dataMin = datasValidas.length ? datasValidas[0] : '';
const dataMax = datasValidas.length ? datasValidas[datasValidas.length - 1] : '';

const cardsContas = contas.map(conta => {
  const c = conciliacaoMaisRecente(conta);
  const saldo = c ? formatMoeda(c.property_saldo_do_extrato) : '—';
  const qtdPendente = pendentesDaConta(conta);
  const avisoPendencia = qtdPendente > 0
    ? `<div class="card-aviso">⚠️ ${qtdPendente} período(s) pendente(s)</div>`
    : '';
  return `
  <div class="card">
    <div class="card-title">${conta}</div>
    <div class="card-saldo">${saldo}</div>
    <div class="card-status">${statusBadge(c)}</div>${avisoPendencia}
  </div>`;
}).join('');

// ---- Todas as conciliações (por dia), com suporte a filtro por mês ----
const todosMesesConciliacao = [];

const linhasConciliacoes = conciliacoes
  .slice()
  .sort((a, b) => new Date(periodoStart(b) || 0) - new Date(periodoStart(a) || 0))
  .map(c => {
    const movsDoPeriodo = todasMovimentacoes.filter(m => toArray(m.property_conciliação)[0] === c.id);

    const porDia = {};
    movsDoPeriodo.forEach(m => {
      const dia = diaKey(m.property_data ? m.property_data.start : null);
      if (!dia) return;
      if (!porDia[dia]) porDia[dia] = { entradas: 0, saidas: 0 };
      const v = m.property_valor || 0;
      if (v >= 0) porDia[dia].entradas += v;
      else porDia[dia].saidas += Math.abs(v);
    });

    const diasOrdenados = Object.keys(porDia).sort();
    let saldoAcumulado = c.property_saldo_inicial || 0;
    const ultimoDia = diasOrdenados[diasOrdenados.length - 1];

    return diasOrdenados.map(dia => {
      const { entradas, saidas } = porDia[dia];
      const movimentoDia = entradas - saidas;
      saldoAcumulado += movimentoDia;
      const isUltimoDia = dia === ultimoDia;
      const statusColuna = isUltimoDia
        ? statusBadge(c)
        : '<span class="badge badge-gray">acompanhamento</span>';
      const mesKey = dia.slice(0, 7);
      todosMesesConciliacao.push(mesKey);
      return `
      <tr data-mes="${mesKey}">
        <td><b>${formatDiaBR(dia)}</b></td>
        <td>${statusColuna}</td>
        <td>${formatMoeda(saldoAcumulado)}</td>
        <td style="color:${movimentoDia < 0 ? '#c0392b' : '#1e8e4a'}">${formatMoeda(movimentoDia)}</td>
      </tr>`;
    }).join('');
  })
  .join('');

const mesesDisponiveisConciliacao = Array.from(new Set(todosMesesConciliacao)).sort().reverse();
const opcoesMesConciliacao = mesesDisponiveisConciliacao.map(key => `<option value="${key}">${mesAnoLabel(key)}</option>`).join('');

const linhasPendentes = pendentes.map(c => `
  <tr data-mes="${mesAnoKey(periodoStart(c)) || ''}">
    <td><b>${c.property_conta_período || ''}</b></td>
    <td>${c.property_conta_bancária || ''}</td>
    <td>${statusBadge(c)}</td>
    <td>${formatMoeda(c.property_saldo_do_extrato)}</td>
    <td>${formatMoeda(c.property_diferença)}</td>
  </tr>`).join('');

const opcoesMes = mesesDisponiveis.map(key => `<option value="${key}">${mesAnoLabel(key)}</option>`).join('');

// ---- Pendências de categorização, com suporte a filtro por mês ----
const mesesDisponiveisCategoria = Array.from(
  new Set(movimentos.map(m => mesAnoKey(m.property_data ? m.property_data.start : null)).filter(Boolean))
).sort().reverse();
const opcoesMesCategoria = mesesDisponiveisCategoria.map(key => `<option value="${key}">${mesAnoLabel(key)}</option>`).join('');

const linhasMovimentos = movimentos.map(m => {
  const listaCategorias = (m.property_valor || 0) >= 0 ? categoriasEntrada : categoriasSaida;
  const opcoesCategoria = listaCategorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  const mesKey = mesAnoKey(m.property_data ? m.property_data.start : null) || '';
  return `
  <tr data-mes="${mesKey}">
    <td>${formatData(m.property_data ? m.property_data.start : null)}</td>
    <td>${m.property_descrição}</td>
    <td><span class="tag">${m.property_conta}</span></td>
    <td class="valor" style="color:${m.property_valor < 0 ? '#c0392b' : '#1e8e4a'}">${formatMoeda(m.property_valor)}</td>
    <td>
      <select name="categoria" data-id="${m.id}">
        <option value="">-- selecione --</option>
        ${opcoesCategoria}
      </select>
    </td>
  </tr>`;
}).join('');

// ---- Transferências entre Contas (categorizadas ou não, conciliadas ou não) ----
const movsTransferencia = todasMovimentacoes.filter(m => m.property_categoria === 'Transferência Entre Contas');

const totalEntradasTransferencia = movsTransferencia
  .filter(m => (m.property_valor || 0) > 0)
  .reduce((s, m) => s + (m.property_valor || 0), 0);
const totalSaidasTransferencia = movsTransferencia
  .filter(m => (m.property_valor || 0) < 0)
  .reduce((s, m) => s + Math.abs(m.property_valor || 0), 0);
const diferencaTransferencia = totalEntradasTransferencia - totalSaidasTransferencia;

const mesesDisponiveisTransferencia = Array.from(
  new Set(movsTransferencia.map(m => mesAnoKey(m.property_data ? m.property_data.start : null)).filter(Boolean))
).sort().reverse();
const opcoesMesTransferencia = mesesDisponiveisTransferencia.map(key => `<option value="${key}">${mesAnoLabel(key)}</option>`).join('');

const linhasTransferencias = movsTransferencia
  .slice()
  .sort((a, b) => new Date(a.property_data ? a.property_data.start : 0) - new Date(b.property_data ? b.property_data.start : 0))
  .map(m => {
    const dataIso = m.property_data ? m.property_data.start : null;
    const mesKey = mesAnoKey(dataIso) || '';
    const conciliacaoId = toArray(m.property_conciliação)[0];
    const conciliacaoDaMov = conciliacaoId ? conciliacoes.find(c => c.id === conciliacaoId) : null;
    const statusMov = conciliacaoDaMov ? statusBadge(conciliacaoDaMov) : '<span class="badge badge-gray">Não conciliado</span>';
    return `
    <tr data-mes="${mesKey}">
      <td>${formatData(dataIso)}</td>
      <td>${m.property_descrição || ''}</td>
      <td><span class="tag">${m.property_conta || ''}</span></td>
      <td class="valor" style="color:${(m.property_valor || 0) < 0 ? '#c0392b' : '#1e8e4a'}">${formatMoeda(m.property_valor)}</td>
      <td>${statusMov}</td>
    </tr>`;
  }).join('');

const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conciliação Financeira | Solutions on Sales</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  :root {
    --roxo-escuro: #200757;
    --roxo: #3c1e85;
    --laranja: #ff9c36;
    --preto: #231f20;
    --off-white: #f8f8f6;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Montserrat', -apple-system, Arial, sans-serif;
    background: var(--off-white);
    margin: 0;
    color: var(--preto);
  }

  header {
    background: linear-gradient(120deg, var(--roxo-escuro) 0%, var(--roxo) 100%);
    color: #fff;
    padding: 20px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .marca { display: flex; align-items: center; gap: 14px; }
  .marca .nome { font-size: 15px; font-weight: 600; line-height: 1.3; }
  .marca .tagline { font-size: 11px; font-weight: 400; opacity: 0.75; letter-spacing: 0.04em; }
  header .actions button {
    background: var(--laranja);
    border: none;
    color: var(--preto);
    padding: 10px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
  }
  header .actions button:hover { filter: brightness(0.93); }

  .tabs { display: flex; gap: 4px; background: #fff; padding: 0 28px; border-bottom: 1px solid #e8e6ef; flex-wrap: wrap; }
  .tab {
    padding: 15px 18px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #7a7590;
    border-bottom: 3px solid transparent;
    transition: 0.15s;
  }
  .tab:hover { color: var(--roxo); }
  .tab.active { color: var(--roxo-escuro); border-bottom-color: var(--laranja); font-weight: 700; }

  .content { padding: 28px; max-width: 1200px; margin: 0 auto; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .card { background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(32,7,87,0.07); border-top: 3px solid var(--roxo); }
  .card-title { font-size: 11px; color: var(--roxo); letter-spacing: 0.09em; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
  .card-saldo { font-size: 24px; font-weight: 700; margin-bottom: 10px; color: var(--roxo-escuro); }
  .card-aviso { margin-top: 10px; font-size: 12px; font-weight: 600; color: #a05c00; }

  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-ok { background: #e6f6ec; color: #1e8e4a; }
  .badge-alerta { background: #fdeaea; color: #c0392b; }
  .badge-atencao { background: rgba(255,156,54,0.18); color: #a05c00; }
  .badge-gray { background: #eeecf3; color: #7a7590; }

  .tag { display: inline-block; background: rgba(60,30,133,0.09); color: var(--roxo); border-radius: 6px; padding: 3px 9px; font-size: 11px; font-weight: 600; }
  .tag-saida { background: #fdeaea; color: #c0392b; }
  .tag-entrada { background: #e6f6ec; color: #1e8e4a; }

  h2 { font-size: 15px; margin: 28px 0 14px; color: var(--roxo-escuro); text-transform: uppercase; letter-spacing: 0.06em; }
  h3 { font-size: 13px; color: var(--roxo-escuro); margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }

  .filtro-mes, .filtro-periodo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
  .filtro-mes label, .filtro-periodo label { font-size: 13px; font-weight: 600; color: var(--roxo-escuro); }
  .filtro-mes select, .filtro-periodo input[type="date"] {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #d8d4e3;
    font-family: inherit;
    font-size: 13px;
    background: #fff;
  }

  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(32,7,87,0.07); margin-bottom: 18px; }
  th, td { padding: 12px 14px; border-bottom: 1px solid #f0eef5; font-size: 13.5px; text-align: left; }
  th { background: var(--roxo-escuro); color: #fff; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; }
  tbody tr:hover { background: #faf9fc; }
  td.valor { text-align: right; font-weight: 600; }

  select[name="categoria"] { padding: 7px; border-radius: 6px; border: 1px solid #d8d4e3; width: 100%; font-family: inherit; font-size: 13px; }
  select:focus { outline: 2px solid var(--laranja); border-color: var(--laranja); }

  .btn { background: var(--roxo-escuro); color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn:hover { background: var(--roxo); }

  .import-box {
    background: #fff; border-radius: 12px; padding: 18px; margin-bottom: 28px;
    box-shadow: 0 2px 8px rgba(32,7,87,0.07); display: flex; align-items: center;
    justify-content: space-between; flex-wrap: wrap; gap: 12px; border-left: 4px solid var(--laranja);
  }
  .import-box b { color: var(--roxo-escuro); font-size: 14px; }
  .import-box a { text-decoration: none; background: var(--laranja); color: var(--preto); padding: 11px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; }
  .import-box a:hover { filter: brightness(0.93); }

  .vazio { padding: 24px; text-align: center; color: #7a7590; font-size: 13px; background: #fff; border-radius: 10px; }

  .dash-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .dash-card { background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(32,7,87,0.07); }
  .dash-card-valor { font-size: 22px; font-weight: 700; margin-top: 6px; }
  .dash-card-entrada .dash-card-valor { color: #1e8e4a; }
  .dash-card-saida .dash-card-valor { color: #c0392b; }
  .dash-card-saldo { border-top: 3px solid var(--laranja); }

  .chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 28px; }
  .chart-box { background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(32,7,87,0.07); }
  .chart-box-full { grid-column: 1 / -1; }
  .chart-box canvas { max-height: 280px; }
  @media (max-width: 800px) { .chart-grid { grid-template-columns: 1fr; } }

  #status-msg { font-size: 13px; font-weight: 600; color: var(--roxo); }

  footer { text-align: center; padding: 24px; font-size: 11px; color: #9a95ad; letter-spacing: 0.05em; }
</style>
</head>
<body>
  <header>
    <div class="marca">
      <img src="data:image/png;base64,${LOGO_BASE64}" alt="Solutions on Sales" style="height:42px; display:block; padding-right:14px; border-right:2px solid var(--laranja);">
      <div>
        <div class="nome">Conciliação Financeira</div>
        <div class="tagline">método.organização.resultado</div>
      </div>
    </div>
    <div class="actions">
      <button onclick="window.location.reload()">Atualizar</button>
    </div>
  </header>

  <div class="tabs">
    <div class="tab active" data-tab="conciliacao" onclick="mudarAba('conciliacao')">Conciliação</div>
    <div class="tab" data-tab="pendencias-periodo" onclick="mudarAba('pendencias-periodo')">Pendências de Conciliação (${pendentes.length})</div>
    <div class="tab" data-tab="pendencias-categoria" onclick="mudarAba('pendencias-categoria')">Pendências de Categorização (${movimentos.length})</div>
    <div class="tab" data-tab="transferencias" onclick="mudarAba('transferencias')">Transferências entre Contas</div>
    <div class="tab" data-tab="dashboard" onclick="mudarAba('dashboard')">Dashboard</div>
  </div>

  <div class="content">
    <div class="tab-panel active" id="tab-conciliacao">
      <div class="cards">${cardsContas}</div>

      <div class="import-box">
        <b>Importar novo extrato bancário (OFX)</b>
        <a href="https://SEU-DOMINIO-N8N/form/SEU-FORM-ID" target="_blank">+ Importar extrato</a>
      </div>

      <h2>Todas as conciliações</h2>
      ${mesesDisponiveisConciliacao.length > 0 ? `
      <div class="filtro-mes">
        <label for="select-mes-conciliacao">Filtrar por mês:</label>
        <select id="select-mes-conciliacao" onchange="filtrarPorMesConciliacao(this.value)">
          <option value="todos">Todos os meses</option>
          ${opcoesMesConciliacao}
        </select>
      </div>` : ''}
      <table>
        <thead><tr><th>Período</th><th>Status</th><th>Saldo do Dia</th><th>Movimento do Dia</th></tr></thead>
        <tbody id="tabela-conciliacoes">${linhasConciliacoes}</tbody>
      </table>
    </div>

    <div class="tab-panel" id="tab-pendencias-periodo">
      <h2>Períodos pendentes de conciliação</h2>${mesesDisponiveis.length > 0 ? `
      <div class="filtro-mes">
        <label for="select-mes">Filtrar por mês:</label>
        <select id="select-mes" onchange="filtrarPorMes(this.value)">
          <option value="todos">Todos os meses</option>
          ${opcoesMes}
        </select>
      </div>` : ''}
      ${pendentes.length > 0 ? `
      <table id="tabela-pendencias">
        <thead><tr><th>Período</th><th>Conta</th><th>Status</th><th>Saldo do Extrato</th><th>Diferença</th></tr></thead>
        <tbody>${linhasPendentes}</tbody>
      </table>` : '<div class="vazio">🎉 Nenhuma pendência de conciliação! Tudo certo por aqui.</div>'}
    </div>

    <div class="tab-panel" id="tab-pendencias-categoria">
      <h2>Movimentações pendentes de categorização</h2>
      ${mesesDisponiveisCategoria.length > 0 ? `
      <div class="filtro-mes">
        <label for="select-mes-categoria">Filtrar por mês:</label>
        <select id="select-mes-categoria" onchange="filtrarPorMesCategoria(this.value)">
          <option value="todos">Todos os meses</option>
          ${opcoesMesCategoria}
        </select>
      </div>` : ''}
      <form id="form-categorizar">
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th>Valor</th><th>Categoria</th></tr></thead>
          <tbody id="tabela-categorizacao">${linhasMovimentos}</tbody>
        </table>
        <button type="submit" class="btn">Salvar categorização</button>
      </form>
      <p id="status-msg"></p>
    </div>

    <div class="tab-panel" id="tab-transferencias">
      <h2>Transferências entre Contas <span style="font-size:11px; text-transform:none; color:#7a7590; font-weight:500;">(categorizadas, conciliadas ou não)</span></h2>
      <div class="dash-cards">
        <div class="dash-card dash-card-saida">
          <div class="card-title">Total Enviado (saída de contas)</div>
          <div class="dash-card-valor">${formatMoeda(totalSaidasTransferencia)}</div>
        </div>
        <div class="dash-card dash-card-entrada">
          <div class="card-title">Total Recebido (ex: cartão)</div>
          <div class="dash-card-valor">${formatMoeda(totalEntradasTransferencia)}</div>
        </div>
        <div class="dash-card dash-card-saldo">
          <div class="card-title">Diferença</div>
          <div class="dash-card-valor" style="color:${Math.abs(diferencaTransferencia) < 0.01 ? '#1e8e4a' : '#c0392b'}">${formatMoeda(diferencaTransferencia)}</div>
        </div>
      </div>
      ${mesesDisponiveisTransferencia.length > 0 ? `
      <div class="filtro-mes">
        <label for="select-mes-transferencia">Filtrar por mês:</label>
        <select id="select-mes-transferencia" onchange="filtrarPorMesTransferencia(this.value)">
          <option value="todos">Todos os meses</option>
          ${opcoesMesTransferencia}
        </select>
      </div>` : ''}
      ${movsTransferencia.length > 0 ? `
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody id="tabela-transferencias">${linhasTransferencias}</tbody>
      </table>` : '<div class="vazio">Nenhuma transferência entre contas categorizada ainda.</div>'}
    </div>

    <div class="tab-panel" id="tab-dashboard">
      <h2>Visão geral financeira <span style="font-size:11px; text-transform:none; color:#7a7590; font-weight:500;">(apenas períodos conciliados · exclui transferências entre contas)</span></h2>

      ${todasProcessadas.length > 0 ? `
      <div class="filtro-periodo">
        <label for="dash-inicio">De:</label>
        <input type="date" id="dash-inicio" value="${dataMin}">
        <label for="dash-fim">Até:</label>
        <input type="date" id="dash-fim" value="${dataMax}">
      </div>

      <div class="dash-cards">
        <div class="dash-card dash-card-entrada">
          <div class="card-title">Total de Entradas</div>
          <div class="dash-card-valor" id="dash-total-entradas">R$ 0,00</div>
        </div>
        <div class="dash-card dash-card-saida">
          <div class="card-title">Total de Saídas</div>
          <div class="dash-card-valor" id="dash-total-saidas">R$ 0,00</div>
        </div>
        <div class="dash-card dash-card-saldo">
          <div class="card-title">Saldo Líquido</div>
          <div class="dash-card-valor" id="dash-saldo">R$ 0,00</div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-box"><h3>Saídas por categoria</h3><canvas id="chart-saidas-cat"></canvas></div>
        <div class="chart-box"><h3>Entradas por categoria</h3><canvas id="chart-entradas-cat"></canvas></div>
        <div class="chart-box"><h3>Ranking de categorias</h3><canvas id="chart-ranking"></canvas></div>
        <div class="chart-box"><h3>Evolução mensal</h3><canvas id="chart-evolucao"></canvas></div>
        <div class="chart-box chart-box-full"><h3>Comparativo por conta</h3><canvas id="chart-contas"></canvas></div>
      </div>

      <h2>Resumo por categoria</h2>
      <table>
        <thead><tr><th>Categoria</th><th>Tipo</th><th>Total</th><th>% do total</th><th>Nº de lançamentos</th></tr></thead>
        <tbody id="tabela-dashboard-corpo"></tbody>
      </table>

      <h2>Análise Vertical de Gastos <span style="font-size:11px; text-transform:none; color:#7a7590; font-weight:500;">(% de cada categoria no total de saídas do período)</span></h2>
      <table>
        <thead><tr><th>Categoria</th><th>Total Gasto</th><th>% do Total</th></tr></thead>
        <tbody id="tabela-analise-vertical"></tbody>
      </table>

      <h2>Análise Horizontal de Gastos <span style="font-size:11px; text-transform:none; color:#7a7590; font-weight:500;">(evolução de cada categoria mês a mês)</span></h2>
      <div id="tabela-analise-horizontal-wrapper" style="overflow-x:auto;"></div>
      ` : '<div class="vazio">Ainda não há movimentações de períodos conciliados para exibir aqui.</div>'}
    </div>
  </div>

  <footer>SOLUTIONS ON SALES · PAINEL FINANCEIRO INTERNO</footer>

  <script type="application/json" id="dados-movimentos">${JSON.stringify(todasProcessadas)}</script>
  <script>
    var dashboardInicializado = false;
    var MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

    function mudarAba(nome) {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      document.querySelector('.tab[data-tab="' + nome + '"]').classList.add('active');
      document.getElementById('tab-' + nome).classList.add('active');
      if (nome === 'dashboard' && !dashboardInicializado && document.getElementById('dash-inicio')) {
        atualizarDashboard();
        dashboardInicializado = true;
      }
    }

    function filtrarPorMesConciliacao(mes) {
      var linhas = document.querySelectorAll('#tabela-conciliacoes tr');
      linhas.forEach(function(tr) {
        if (mes === 'todos' || tr.getAttribute('data-mes') === mes) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      });
    }

    function filtrarPorMes(mes) {
      var linhas = document.querySelectorAll('#tabela-pendencias tbody tr');
      linhas.forEach(function(tr) {
        if (mes === 'todos' || tr.getAttribute('data-mes') === mes) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      });
    }

    function filtrarPorMesCategoria(mes) {
      var linhas = document.querySelectorAll('#tabela-categorizacao tr');
      linhas.forEach(function(tr) {
        if (mes === 'todos' || tr.getAttribute('data-mes') === mes) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      });
    }

    function filtrarPorMesTransferencia(mes) {
      var linhas = document.querySelectorAll('#tabela-transferencias tr');
      linhas.forEach(function(tr) {
        if (mes === 'todos' || tr.getAttribute('data-mes') === mes) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      });
    }

    var TODOS_MOVS = JSON.parse(document.getElementById('dados-movimentos').textContent);
    var CORES = ['#200757','#3c1e85','#ff9c36','#7a5fb3','#ffbf7a','#5b3aa0','#c9a0ff','#a05c00','#4a90d9','#e07b39'];
    var chartSaidas, chartEntradas, chartRanking, chartEvolucao, chartContas;

    function formatBRL(v) {
      return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function agruparPorCategoria(lista) {
      var agrupado = {};
      lista.forEach(function(m) {
        var cat = m.cat;
        if (!agrupado[cat]) agrupado[cat] = { total: 0, qtd: 0 };
        agrupado[cat].total += Math.abs(m.v);
        agrupado[cat].qtd += 1;
      });
      return agrupado;
    }

    function agruparPorMes(lista) {
      var agrupado = {};
      lista.forEach(function(m) {
        var mes = m.d.slice(0, 7);
        if (!agrupado[mes]) agrupado[mes] = { entradas: 0, saidas: 0 };
        if (m.v > 0) agrupado[mes].entradas += m.v;
        else agrupado[mes].saidas += Math.abs(m.v);
      });
      return agrupado;
    }

    function agruparPorConta(lista) {
      var agrupado = {};
      lista.forEach(function(m) {
        var conta = m.conta;
        if (!agrupado[conta]) agrupado[conta] = { entradas: 0, saidas: 0 };
        if (m.v > 0) agrupado[conta].entradas += m.v;
        else agrupado[conta].saidas += Math.abs(m.v);
      });
      return agrupado;
    }

    function destruirGrafico(chart) {
      if (chart) chart.destroy();
    }

    function atualizarDashboard() {
      var inicio = document.getElementById('dash-inicio').value;
      var fim = document.getElementById('dash-fim').value;
      var filtrados = TODOS_MOVS.filter(function(m) {
        return (!inicio || m.d >= inicio) && (!fim || m.d <= fim) && m.cat !== 'Transferência Entre Contas';
      });

      var entradas = filtrados.filter(function(m) { return m.v > 0; });
      var saidas = filtrados.filter(function(m) { return m.v < 0; });

      var totalEntradas = entradas.reduce(function(s, m) { return s + m.v; }, 0);
      var totalSaidas = saidas.reduce(function(s, m) { return s + Math.abs(m.v); }, 0);
      var saldo = totalEntradas - totalSaidas;

      document.getElementById('dash-total-entradas').textContent = formatBRL(totalEntradas);
      document.getElementById('dash-total-saidas').textContent = formatBRL(totalSaidas);
      var saldoEl = document.getElementById('dash-saldo');
      saldoEl.textContent = formatBRL(saldo);
      saldoEl.style.color = saldo >= 0 ? '#1e8e4a' : '#c0392b';

      var catSaidas = agruparPorCategoria(saidas);
      var labelsSaidas = Object.keys(catSaidas);
      destruirGrafico(chartSaidas);
      chartSaidas = new Chart(document.getElementById('chart-saidas-cat'), {
        type: 'doughnut',
        data: { labels: labelsSaidas, datasets: [{ data: labelsSaidas.map(function(c) { return catSaidas[c].total; }), backgroundColor: CORES }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
      });

      var catEntradas = agruparPorCategoria(entradas);
      var labelsEntradas = Object.keys(catEntradas);
      destruirGrafico(chartEntradas);
      chartEntradas = new Chart(document.getElementById('chart-entradas-cat'), {
        type: 'doughnut',
        data: { labels: labelsEntradas, datasets: [{ data: labelsEntradas.map(function(c) { return catEntradas[c].total; }), backgroundColor: CORES }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
      });

      var todasCategorias = agruparPorCategoria(filtrados);
      var rankingArr = Object.keys(todasCategorias).map(function(c) { return { cat: c, total: todasCategorias[c].total }; });
      rankingArr.sort(function(a, b) { return b.total - a.total; });
      rankingArr = rankingArr.slice(0, 6);
      destruirGrafico(chartRanking);
      chartRanking = new Chart(document.getElementById('chart-ranking'), {
        type: 'bar',
        data: { labels: rankingArr.map(function(r) { return r.cat; }), datasets: [{ label: 'Total movimentado', data: rankingArr.map(function(r) { return r.total; }), backgroundColor: '#3c1e85' }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } } }
      });

      var porMes = agruparPorMes(filtrados);
      var mesesOrdenados = Object.keys(porMes).sort();
      destruirGrafico(chartEvolucao);
      chartEvolucao = new Chart(document.getElementById('chart-evolucao'), {
        type: 'line',
        data: {
          labels: mesesOrdenados,
          datasets: [
            { label: 'Entradas', data: mesesOrdenados.map(function(m) { return porMes[m].entradas; }), borderColor: '#1e8e4a', backgroundColor: '#1e8e4a', tension: 0.3 },
            { label: 'Saídas', data: mesesOrdenados.map(function(m) { return porMes[m].saidas; }), borderColor: '#c0392b', backgroundColor: '#c0392b', tension: 0.3 }
          ]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
      });

      var porConta = agruparPorConta(filtrados);
      var contasOrdenadas = Object.keys(porConta);
      destruirGrafico(chartContas);
      chartContas = new Chart(document.getElementById('chart-contas'), {
        type: 'bar',
        data: {
          labels: contasOrdenadas,
          datasets: [
            { label: 'Entradas', data: contasOrdenadas.map(function(c) { return porConta[c].entradas; }), backgroundColor: '#1e8e4a' },
            { label: 'Saídas', data: contasOrdenadas.map(function(c) { return porConta[c].saidas; }), backgroundColor: '#c0392b' }
          ]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
      });

      var linhasTabela = '';
      Object.keys(catSaidas).forEach(function(c) {
        var pct = totalSaidas > 0 ? (catSaidas[c].total / totalSaidas * 100).toFixed(1) : '0.0';
        linhasTabela += '<tr><td>' + c + '</td><td><span class="tag tag-saida">Saída</span></td><td>' + formatBRL(catSaidas[c].total) + '</td><td>' + pct + '%</td><td>' + catSaidas[c].qtd + '</td></tr>';
      });
      Object.keys(catEntradas).forEach(function(c) {
        var pct = totalEntradas > 0 ? (catEntradas[c].total / totalEntradas * 100).toFixed(1) : '0.0';
        linhasTabela += '<tr><td>' + c + '</td><td><span class="tag tag-entrada">Entrada</span></td><td>' + formatBRL(catEntradas[c].total) + '</td><td>' + pct + '%</td><td>' + catEntradas[c].qtd + '</td></tr>';
      });
      document.getElementById('tabela-dashboard-corpo').innerHTML = linhasTabela || '<tr><td colspan="5">Nenhuma movimentação no período.</td></tr>';

      // ---- Análise Vertical de Gastos ----
      var catsOrdenadasVert = Object.keys(catSaidas).sort(function(a, b) { return catSaidas[b].total - catSaidas[a].total; });
      var linhasVertical = catsOrdenadasVert.map(function(c) {
        var pct = totalSaidas > 0 ? (catSaidas[c].total / totalSaidas * 100) : 0;
        return '<tr><td>' + c + '</td><td>' + formatBRL(catSaidas[c].total) + '</td><td>' +
          '<div style="display:flex; align-items:center; gap:8px;">' +
          '<div style="flex:1; background:#eeecf3; border-radius:4px; height:8px; overflow:hidden;">' +
          '<div style="height:100%; background:#c0392b; width:' + Math.min(pct, 100).toFixed(1) + '%;"></div></div>' +
          '<span>' + pct.toFixed(1) + '%</span></div></td></tr>';
      }).join('');
      linhasVertical += '<tr style="font-weight:700; background:#faf9fc;"><td>Total</td><td>' + formatBRL(totalSaidas) + '</td><td>100.0%</td></tr>';
      document.getElementById('tabela-analise-vertical').innerHTML = catsOrdenadasVert.length
        ? linhasVertical
        : '<tr><td colspan="3">Nenhum gasto no período.</td></tr>';

      // ---- Análise Horizontal de Gastos ----
      var matrizHorizontal = {};
      var mesesHorizontalSet = {};
      saidas.forEach(function(m) {
        var mesRef = m.d.slice(0, 7);
        mesesHorizontalSet[mesRef] = true;
        if (!matrizHorizontal[m.cat]) matrizHorizontal[m.cat] = {};
        matrizHorizontal[m.cat][mesRef] = (matrizHorizontal[m.cat][mesRef] || 0) + Math.abs(m.v);
      });
      var mesesHorizontalOrdenados = Object.keys(mesesHorizontalSet).sort();
      var wrapperHorizontal = document.getElementById('tabela-analise-horizontal-wrapper');

      if (mesesHorizontalOrdenados.length === 0) {
        wrapperHorizontal.innerHTML = '<div class="vazio">Nenhum gasto no período.</div>';
      } else {
        var temMaisDeUmMes = mesesHorizontalOrdenados.length > 1;
        var theadHtml = '<th>Categoria</th>' + mesesHorizontalOrdenados.map(function(mesRef) {
          var partes = mesRef.split('-');
          return '<th>' + MESES_ABREV[parseInt(partes[1], 10) - 1] + '/' + partes[0] + '</th>';
        }).join('') + (temMaisDeUmMes ? '<th>Variação</th>' : '');

        var catsHorizontal = Object.keys(matrizHorizontal).sort(function(a, b) {
          var totalA = mesesHorizontalOrdenados.reduce(function(s, mesRef) { return s + (matrizHorizontal[a][mesRef] || 0); }, 0);
          var totalB = mesesHorizontalOrdenados.reduce(function(s, mesRef) { return s + (matrizHorizontal[b][mesRef] || 0); }, 0);
          return totalB - totalA;
        });

        var corpoHtml = catsHorizontal.map(function(cat) {
          var valores = mesesHorizontalOrdenados.map(function(mesRef) { return matrizHorizontal[cat][mesRef] || 0; });
          var celulas = valores.map(function(v) { return '<td>' + formatBRL(v) + '</td>'; }).join('');
          var variacaoHtml = '';
          if (temMaisDeUmMes) {
            var primeiro = valores[0];
            var ultimo = valores[valores.length - 1];
            if (primeiro > 0) {
              var variacao = ((ultimo - primeiro) / primeiro) * 100;
              var cor = variacao > 0 ? '#c0392b' : (variacao < 0 ? '#1e8e4a' : '#7a7590');
              var seta = variacao > 0 ? '▲' : (variacao < 0 ? '▼' : '—');
              variacaoHtml = '<td style="color:' + cor + '; font-weight:600;">' + seta + ' ' + Math.abs(variacao).toFixed(1) + '%</td>';
            } else if (ultimo > 0) {
              variacaoHtml = '<td style="color:#c0392b; font-weight:600;">Novo</td>';
            } else {
              variacaoHtml = '<td>—</td>';
            }
          }
          return '<tr><td><b>' + cat + '</b></td>' + celulas + variacaoHtml + '</tr>';
        }).join('');

        var totalRow = '<tr style="font-weight:700; background:#faf9fc;"><td>Total</td>' +
          mesesHorizontalOrdenados.map(function(mesRef) {
            var totalMes = catsHorizontal.reduce(function(s, cat) { return s + (matrizHorizontal[cat][mesRef] || 0); }, 0);
            return '<td>' + formatBRL(totalMes) + '</td>';
          }).join('');
        if (temMaisDeUmMes) {
          var totalPrimeiro = catsHorizontal.reduce(function(s, cat) { return s + (matrizHorizontal[cat][mesesHorizontalOrdenados[0]] || 0); }, 0);
          var totalUltimo = catsHorizontal.reduce(function(s, cat) { return s + (matrizHorizontal[cat][mesesHorizontalOrdenados[mesesHorizontalOrdenados.length - 1]] || 0); }, 0);
          var variacaoTotal = totalPrimeiro > 0 ? ((totalUltimo - totalPrimeiro) / totalPrimeiro) * 100 : 0;
          var corTotal = variacaoTotal > 0 ? '#c0392b' : (variacaoTotal < 0 ? '#1e8e4a' : '#7a7590');
          var setaTotal = variacaoTotal > 0 ? '▲' : (variacaoTotal < 0 ? '▼' : '—');
          totalRow += '<td style="color:' + corTotal + ';">' + setaTotal + ' ' + Math.abs(variacaoTotal).toFixed(1) + '%</td>';
        }
        totalRow += '</tr>';

        wrapperHorizontal.innerHTML = '<table><thead><tr>' + theadHtml + '</tr></thead><tbody>' + corpoHtml + totalRow + '</tbody></table>';
      }
    }

    if (document.getElementById('dash-inicio')) {
      document.getElementById('dash-inicio').addEventListener('change', atualizarDashboard);
      document.getElementById('dash-fim').addEventListener('change', atualizarDashboard);
    }

    var formCategorizar = document.getElementById('form-categorizar');
    if (formCategorizar) {
      formCategorizar.addEventListener('submit', async function(e) {
        e.preventDefault();
        var selects = document.querySelectorAll('select[name="categoria"]');
        var itens = [];
        var linhasParaRemover = [];
        selects.forEach(function(sel) {
          if (sel.value) {
            itens.push({ id: sel.getAttribute('data-id'), categoria: sel.value });
            linhasParaRemover.push(sel.closest('tr'));
          }
        });
        if (itens.length === 0) {
          document.getElementById('status-msg').textContent = 'Selecione ao menos uma categoria.';
          return;
        }
        document.getElementById('status-msg').textContent = 'Salvando ' + itens.length + ' movimentação(ões)...';
        try {
          const resp = await fetch('/webhook/painelconciliacao/categorizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: itens })
          });
          if (resp.ok) {
            linhasParaRemover.forEach(function(tr) { tr.remove(); });
            document.getElementById('status-msg').textContent = itens.length + ' movimentação(ões) categorizada(s) com sucesso!';
            var tabCategoria = document.querySelector('.tab[data-tab="pendencias-categoria"]');
            if (tabCategoria) {
              var restantes = document.querySelectorAll('#form-categorizar tbody tr').length;
              tabCategoria.textContent = 'Pendências de Categorização (' + restantes + ')';
            }
          } else {
            document.getElementById('status-msg').textContent = 'Erro ao salvar. Tente novamente.';
          }
        } catch (err) {
          document.getElementById('status-msg').textContent = 'Erro de conexão ao salvar.';
        }
      });
    }
  </script>
</body>
</html>`;

return [{ json: { html } }];
