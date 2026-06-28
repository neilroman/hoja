(function() {
  var DEN = {
    'Acero A36':0.000007850,
    'Acero Inox':0.000007900,
    'Aluminio':0.000002700,
    'Hierro fundido':0.000007200,
    'Cobre':0.000008960,
    'Laton':0.000008500,
    'Titanio':0.000004500
  };
  var MATS = Object.keys(DEN);
  var PF = 1.10, SK = 'calc_mat_v5';
  var sheets = [], ai = 0, rc = 0;

  function init() {
    var s = localStorage.getItem(SK);
    if (s) { try { sheets = JSON.parse(s); } catch(e) { sheets = []; } }
    if (!sheets.length) sheets = [ns('Hoja 1')];
    renderTabs(); loadSheet(0);
  }

  function ns(n) {
    return {name:n, plano:'', obra:'', fecha:today(), autor:'', chkL:false, chkP:false, rows:[]};
  }
  function today() { return new Date().toISOString().slice(0,10); }

  function renderTabs() {
    var bar = document.getElementById('caSbar');
    bar.innerHTML = '';
    for (var i = 0; i < sheets.length; i++) {
      (function(idx) {
        var t = document.createElement('div'), a = idx === ai;
        t.style.cssText = 'padding:5px 14px;border:1px solid '+(a?'#1d4ed8':'#d1d5db')+';border-radius:8px;background:'+(a?'#eff6ff':'#fff')+';cursor:pointer;font-size:13px;color:'+(a?'#1e40af':'#6b7280')+';font-weight:'+(a?'600':'400')+';margin-right:4px';
        t.textContent = sheets[idx].name;
        t.title = 'Doble clic para renombrar';
        t.onclick = function() { switchSheet(idx); };
        t.ondblclick = function() { renameSheet(idx); };
        bar.appendChild(t);
      })(i);
    }
  }

  function switchSheet(i) { cap(); ai = i; renderTabs(); loadSheet(i); }

  function cap() {
    var s = sheets[ai]; if (!s) return;
    s.plano = gv('caPlano'); s.obra  = gv('caObra');
    s.fecha = gv('caFecha'); s.autor = gv('caAutor');
    s.chkL  = gk('caChkL'); s.chkP  = gk('caChkP');
    var t = document.getElementById('caTitle').textContent.trim();
    if (t) s.name = t;
    s.rows = capRows();
  }
  function gv(id) { return document.getElementById(id).value; }
  function gk(id) { return document.getElementById(id).checked; }

  function capRows() {
    var rows = [], trs = document.querySelectorAll('#caTbody tr[data-rid]');
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      rows.push({
        plano: tr.querySelector('.cp').value,
        mat:   tr.querySelector('.cm').value,
        largo: tr.querySelector('.cl').value,
        ancho: tr.querySelector('.ca').value,
        alto:  tr.querySelector('.ce').value,
        cant:  tr.querySelector('.cc').value
      });
    }
    return rows;
  }

  function loadSheet(i) {
    var s = sheets[i];
    document.getElementById('caTitle').textContent = s.name;
    document.getElementById('caPlano').value = s.plano || '';
    document.getElementById('caObra').value  = s.obra  || '';
    document.getElementById('caFecha').value = s.fecha || '';
    document.getElementById('caAutor').value = s.autor || '';
    document.getElementById('caChkL').checked = !!s.chkL;
    document.getElementById('caChkP').checked = !!s.chkP;
    updChk();
    document.getElementById('caTbody').innerHTML = '';
    rc = 0;
    var rows = (s.rows && s.rows.length) ? s.rows : [{}];
    for (var j = 0; j < rows.length; j++) addRow(rows[j]);
    recalc();
  }

  function addRow(data) {
    rc++;
    var d = data || {}, sel = d.mat || MATS[0], opts = '';
    for (var i = 0; i < MATS.length; i++) {
      opts += '<option value="' + MATS[i] + '"' + (MATS[i] === sel ? ' selected' : '') + '>' + MATS[i] + '</option>';
    }
    var cs = 'width:100%;border:none;background:transparent;color:#111827;font-size:13px;padding:3px 4px;font-family:inherit';
    var td = 'padding:6px 8px;border-bottom:1px solid #d1d5db';
    var tr = document.createElement('tr');
    tr.setAttribute('data-rid', rc);
    tr.innerHTML =
      '<td style="'+td+';text-align:center;color:#6b7280;font-size:12px;width:32px"></td>' +
      '<td style="'+td+'"><input class="cp" type="text" value="'+esc(d.plano||'')+'" placeholder="PLA-001" oninput="caRecalc()" style="'+cs+'"></td>' +
      '<td style="'+td+'"><select class="cm" onchange="caRecalc()" style="'+cs+'">'+opts+'</select></td>' +
      '<td style="'+td+'"><input class="cl" type="number" value="'+(d.largo||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalc()" style="'+cs+'"></td>' +
      '<td style="'+td+'"><input class="ca" type="number" value="'+(d.ancho||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalc()" style="'+cs+'"></td>' +
      '<td style="'+td+'"><input class="ce" type="number" value="'+(d.alto||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalc()" style="'+cs+'"></td>' +
      '<td style="'+td+'"><input class="cc" type="number" value="'+(d.cant||1)+'" placeholder="1" min="1" step="1" oninput="caRecalc()" style="'+cs+'"></td>' +
      '<td style="'+td+';text-align:right"><span class="cv" style="font-weight:700;color:#1e40af">-</span></td>' +
      '<td style="'+td+';width:34px"><button onclick="caDelRow(this)" style="width:28px;height:28px;border:none;background:none;cursor:pointer;color:#6b7280;border-radius:4px">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">' +
        '<polyline points="3 6 5 6 21 6"></polyline>' +
        '<path d="M19 6l-1 14H6L5 6"></path>' +
        '<path d="M10 11v6"></path><path d="M14 11v6"></path>' +
        '<path d="M9 6V4h6v2"></path></svg>' +
      '</button></td>';
    document.getElementById('caTbody').appendChild(tr);
    renum(); recalc();
  }

  function esc(s) { return String(s).replace(/"/g, '&quot;'); }

  window.caAddRow = function(d) { addRow(d); };
  window.caDelRow = function(b) { b.closest('tr').remove(); renum(); recalc(); };
  window.caRecalc = function() { recalc(); };

  function renum() {
    var trs = document.querySelectorAll('#caTbody tr[data-rid]');
    for (var i = 0; i < trs.length; i++) trs[i].cells[0].textContent = i + 1;
  }

  window.caOnChk = function(w) {
    if (w === 'L') { if (gk('caChkL')) document.getElementById('caChkP').checked = false; }
    else           { if (gk('caChkP')) document.getElementById('caChkL').checked = false; }
    updChk(); recalc();
  };

  function updChk() {
    var l = gk('caChkL'), p = gk('caChkP');
    var ll = document.getElementById('caLblL'), lp = document.getElementById('caLblP');
    ll.style.background  = l ? '#eff6ff' : '#fff';
    ll.style.color       = l ? '#1e40af' : '#111827';
    ll.style.borderColor = l ? '#1d4ed8' : '#d1d5db';
    lp.style.background  = p ? '#fef9c3' : '#fff';
    lp.style.color       = p ? '#92400e' : '#111827';
    lp.style.borderColor = p ? '#fcd34d' : '#d1d5db';
    var st = document.getElementById('caChkSt');
    if (l && p) {
      st.textContent = 'Marca solo una opcion';
      st.style.background = '#fee2e2'; st.style.color = '#991b1b'; st.style.borderColor = '#fca5a5';
    } else if (!l && !p) {
      st.textContent = 'Sin tipo seleccionado';
      st.style.background = '#fee2e2'; st.style.color = '#991b1b'; st.style.borderColor = '#fca5a5';
    } else {
      st.textContent = l ? 'Llanta activa' : 'Polin activo';
      st.style.background = '#dcfce7'; st.style.color = '#166534'; st.style.borderColor = '#86efac';
    }
  }

  function recalc() {
    var l = gk('caChkL'), p = gk('caChkP');
    var ok = (l || p) && !(l && p);
    var total = 0;
    var trs = document.querySelectorAll('#caTbody tr[data-rid]');
    for (var i = 0; i < trs.length; i++) {
      var tr    = trs[i];
      var mat   = tr.querySelector('.cm').value;
      var largo = parseFloat(tr.querySelector('.cl').value) || 0;
      var ancho = parseFloat(tr.querySelector('.ca').value) || 0;
      var alto  = parseFloat(tr.querySelector('.ce').value) || 0;
      var cant  = parseFloat(tr.querySelector('.cc').value) || 1;
      var cell  = tr.querySelector('.cv');
      if (!ok || largo === 0 || ancho === 0 || alto === 0) {
        cell.textContent = '-'; cell.style.color = '#1e40af'; continue;
      }
      var peso = largo * ancho * alto * (DEN[mat] || 0) * cant;
      if (p) peso = peso * PF;
      total += peso;
      cell.textContent = peso.toFixed(3) + ' kg';
      cell.style.color = peso > 100 ? '#991b1b' : '#1e40af';
    }
    document.getElementById('caTotal').textContent = total.toFixed(3) + ' kg';
  }

  window.caNew = function() {
    document.getElementById('caNewName').value = 'Hoja ' + (sheets.length + 1);
    document.getElementById('caOv').style.display = 'flex';
    setTimeout(function() { document.getElementById('caNewName').focus(); }, 60);
  };
  window.caCloseM = function() { document.getElementById('caOv').style.display = 'none'; };
  window.caConfirmNew = function() {
    var n = document.getElementById('caNewName').value.trim() || ('Hoja ' + (sheets.length + 1));
    cap(); sheets.push(ns(n)); ai = sheets.length - 1;
    sl(); renderTabs(); loadSheet(ai); caCloseM();
  };

  function renameSheet(i) {
    var n = prompt('Renombrar hoja:', sheets[i].name);
    if (n && n.trim()) {
      sheets[i].name = n.trim();
      if (i === ai) document.getElementById('caTitle').textContent = n.trim();
      renderTabs(); sl();
    }
  }

  function sl() { localStorage.setItem(SK, JSON.stringify(sheets)); }

  window.caSave = function() {
    cap(); sl();
    var blob = new Blob([JSON.stringify(sheets, null, 2)], {type: 'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'calculo_materiales.json';
    a.click();
  };

  window.caLoad = function() { document.getElementById('caFileIn').click(); };

  window.caReadFile = function(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      try {
        var d = JSON.parse(ev.target.result);
        if (Array.isArray(d)) { sheets = d; ai = 0; sl(); renderTabs(); loadSheet(0); }
        else { alert('Formato no reconocido.'); }
      } catch(ex) { alert('Error al leer el archivo.'); }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  window.caPDF = function() {
    cap();
    var s = sheets[ai], l = s.chkL, p = s.chkP;
    var tipo = l ? 'L - Llanta' : (p ? 'P - Polin' : 'Sin tipo');
    var ok = (l || p) && !(l && p);
    var total = 0, tbody = '';
    for (var i = 0; i < (s.rows || []).length; i++) {
      var r     = s.rows[i];
      var largo = parseFloat(r.largo) || 0;
      var ancho = parseFloat(r.ancho) || 0;
      var alto  = parseFloat(r.alto)  || 0;
      var cant  = parseFloat(r.cant)  || 1;
      var peso  = largo * ancho * alto * (DEN[r.mat] || 0) * cant;
      if (p) peso = peso * PF;
      var show = ok && largo > 0 && ancho > 0 && alto > 0;
      if (show) total += peso;
      var pstr = show ? peso.toFixed(3) + ' kg' : '-';
      var hi   = (show && peso > 100) ? ';color:#991b1b' : '';
      tbody += '<tr><td>' + (i+1) + '</td><td>' + (r.plano||'') + '</td><td>' + r.mat + '</td>' +
               '<td>' + (largo||'') + '</td><td>' + (ancho||'') + '</td><td>' + (alto||'') + '</td>' +
               '<td>' + cant + '</td><td style="text-align:right;font-weight:700' + hi + '">' + pstr + '</td></tr>';
    }
    var bgT = l ? '#dbeafe' : (p ? '#fef9c3' : '#fee2e2');
    var coT = l ? '#1e40af' : (p ? '#92400e' : '#991b1b');
    var brT = l ? '#93c5fd' : (p ? '#fcd34d' : '#fca5a5');
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + s.name + '</title>' +
      '<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:2cm}' +
      '.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:12px}' +
      'h1{font-size:18px;color:#1e3a5f;margin:0}' +
      '.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 2rem;margin-bottom:12px;font-size:11px;color:#555}' +
      '.tipo{display:inline-block;padding:4px 14px;border-radius:6px;font-weight:700;background:' + bgT + ';color:' + coT + ';border:1px solid ' + brT + ';margin-bottom:12px}' +
      'table{width:100%;border-collapse:collapse}' +
      'th{background:#1e3a5f;color:#e0e8f5;padding:7px 8px;text-align:left;font-size:11px;text-transform:uppercase}' +
      'td{padding:5px 8px;border-bottom:1px solid #e5e7eb}' +
      'tr:nth-child(even) td{background:#f9fafb}' +
      '.tot{text-align:right;margin-top:12px;font-size:15px;font-weight:700;color:#1e3a5f}' +
      '.foot{margin-top:2rem;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}' +
      '@media print{@page{margin:1.5cm}}</style></head><body>' +
      '<div class="hdr"><h1>' + s.name + '</h1><span style="font-size:11px;color:#6b7280">Hoja de Calculo de Materiales</span></div>' +
      '<div class="meta">' +
        '<span>Plano: <b>' + (s.plano||'-') + '</b></span>' +
        '<span>Obra: <b>' + (s.obra||'-') + '</b></span>' +
        '<span>Elaborado por: <b>' + (s.autor||'-') + '</b></span>' +
        '<span>Fecha: <b>' + (s.fecha||'-') + '</b></span>' +
      '</div>' +
      '<div class="tipo">Tipo: ' + tipo + '</div>' +
      '<table><thead><tr><th>#</th><th>Plano</th><th>Material</th>' +
      '<th>Largo mm</th><th>Ancho mm</th><th>Alto mm</th><th>Cant.</th><th>Peso kg</th>' +
      '</tr></thead><tbody>' + tbody + '</tbody></table>' +
      '<div class="tot">Peso total: ' + total.toFixed(3) + ' kg</div>' +
      '<div class="foot">Generado: ' + new Date().toLocaleString('es-ES') + ' | Factor polin x1.10 cuando P activo</div>' +
      '</body></html>';
    var win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(function() { win.print(); }, 500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
