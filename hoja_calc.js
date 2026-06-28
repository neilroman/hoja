(function() {
  var DEN = {
    'Acero A36':0.000007850,'Acero Inox':0.000007900,
    'Aluminio':0.000002700,'Hierro fundido':0.000007200,
    'Cobre':0.000008960,'Laton':0.000008500,'Titanio':0.000004500
  };
  var MATS = Object.keys(DEN);
  var PF = 1.10, SK = 'calc_mat_v7';
  var sheets = [], ai = 0;
  var expandedRow = null; // rid of expanded row

  /* ── INIT ── */
  function init() {
    var s = localStorage.getItem(SK);
    if (s) { try { sheets = JSON.parse(s); } catch(e) { sheets = []; } }
    if (!sheets.length) sheets = [ns('Hoja 1')];
    renderTabs(); loadSheet(0);
  }

  function ns(n) {
    return {name:n, plano:'', cantidad:'', fmontaje:'', fsoldadura:'',
            autor:'', soldador:'', chkL:false, chkP:false, rows:[]};
  }

  /* ── TABS ── */
  function renderTabs() {
    var bar = document.getElementById('caSbar');
    bar.innerHTML = '';
    for (var i = 0; i < sheets.length; i++) {
      (function(idx) {
        var t = document.createElement('div'), a = idx === ai;
        t.style.cssText = 'padding:5px 14px;border:1px solid '+(a?'#1d4ed8':'#d1d5db')+
          ';border-radius:8px;background:'+(a?'#eff6ff':'#fff')+
          ';cursor:pointer;font-size:13px;color:'+(a?'#1e40af':'#6b7280')+
          ';font-weight:'+(a?'600':'400')+';margin-right:4px';
        t.textContent = sheets[idx].name;
        t.title = 'Doble clic para renombrar';
        t.onclick    = function() { switchSheet(idx); };
        t.ondblclick = function() { renameSheet(idx); };
        bar.appendChild(t);
      })(i);
    }
  }

  function switchSheet(i) { cap(); ai = i; expandedRow = null; renderTabs(); loadSheet(i); }

  /* ── CAPTURE ── */
  function cap() {
    var s = sheets[ai]; if (!s) return;
    s.plano      = gv('caPlano');
    s.cantidad   = gv('caCantidad');
    s.fmontaje   = gv('caFmontaje');
    s.fsoldadura = gv('caFsoldadura');
    s.autor      = gv('caAutor');
    s.soldador   = gv('caSoldador');
    s.chkL = gk('caChkL'); s.chkP = gk('caChkP');
    var t = document.getElementById('caTitle').textContent.trim();
    if (t) s.name = t;
    s.rows = capRows();
  }
  function gv(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function gk(id) { var e = document.getElementById(id); return e ? e.checked : false; }

  function capRows() {
    var rows = [], trs = document.querySelectorAll('#caTbody tr[data-rid]');
    for (var i = 0; i < trs.length; i++) {
      var tr  = trs[i];
      var rid = tr.getAttribute('data-rid');
      var existing = getRowData(rid);
      rows.push({
        rid:    rid,
        plano:  tr.querySelector('.cp') ? tr.querySelector('.cp').value : (existing ? existing.plano : ''),
        mat:    tr.querySelector('.cm') ? tr.querySelector('.cm').value : (existing ? existing.mat : MATS[0]),
        largo:  tr.querySelector('.cl') ? tr.querySelector('.cl').value : (existing ? existing.largo : ''),
        ancho:  tr.querySelector('.ca') ? tr.querySelector('.ca').value : (existing ? existing.ancho : ''),
        alto:   tr.querySelector('.ce') ? tr.querySelector('.ce').value : (existing ? existing.alto : ''),
        cant:   tr.querySelector('.cc') ? tr.querySelector('.cc').value : (existing ? existing.cant : 1),
        npolin: tr.querySelector('.cnp') ? tr.querySelector('.cnp').value : (existing ? existing.npolin : ''),
        img:    existing ? existing.img : '',
        ldims:  existing ? existing.ldims : []
      });
    }
    return rows;
  }

  function getRowData(rid) {
    var s = sheets[ai];
    if (!s || !s.rows) return null;
    for (var i = 0; i < s.rows.length; i++) {
      if (String(s.rows[i].rid) === String(rid)) return s.rows[i];
    }
    return null;
  }

  /* ── LOAD SHEET ── */
  function loadSheet(i) {
    var s = sheets[i];
    document.getElementById('caTitle').textContent  = s.name;
    document.getElementById('caPlano').value      = s.plano      || '';
    document.getElementById('caCantidad').value   = s.cantidad   || '';
    document.getElementById('caFmontaje').value   = s.fmontaje   || '';
    document.getElementById('caFsoldadura').value = s.fsoldadura || '';
    document.getElementById('caAutor').value      = s.autor      || '';
    document.getElementById('caSoldador').value   = s.soldador   || '';
    document.getElementById('caChkL').checked = !!s.chkL;
    document.getElementById('caChkP').checked = !!s.chkP;
    updChk();
    document.getElementById('caTbody').innerHTML = '';
    var rows = (s.rows && s.rows.length) ? s.rows : [{rid:'1'}];
    for (var j = 0; j < rows.length; j++) addRow(rows[j]);
    recalc();
  }

  /* ── ADD ROW (list mode) ── */
  var _rc = 0;
  function addRow(data) {
    _rc++;
    var d   = data || {};
    var rid = d.rid || String(_rc);
    var l   = gk('caChkL'), p = gk('caChkP');

    var peso = calcPeso(d, l, p);
    var pesoStr = peso > 0 ? peso.toFixed(3)+' kg' : '-';

    var tr = document.createElement('tr');
    tr.setAttribute('data-rid', rid);
    tr.style.cssText = 'cursor:pointer;border-bottom:1px solid #e5e7eb';
    tr.innerHTML = buildListRow(d, rid, pesoStr, l, p);
    tr.onclick = function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' ||
          e.target.closest('button') || e.target.closest('.no-expand')) return;
      toggleExpand(rid);
    };
    document.getElementById('caTbody').appendChild(tr);

    // detail row (hidden)
    var trD = document.createElement('tr');
    trD.setAttribute('data-detail', rid);
    trD.style.display = 'none';
    trD.innerHTML = '<td colspan="8" style="padding:0;background:#f8faff;border-bottom:2px solid #bfdbfe">' +
      '<div style="padding:1rem">' + buildDetailPanel(d, rid, l, p) + '</div></td>';
    document.getElementById('caTbody').appendChild(trD);

    renum();
  }

  function buildListRow(d, rid, pesoStr, l, p) {
    var imgThumb = d.img
      ? '<img src="'+d.img+'" style="width:36px;height:28px;object-fit:cover;border-radius:3px;border:1px solid #d1d5db;vertical-align:middle"/>'
      : '<span style="font-size:10px;color:#9ca3af;vertical-align:middle">Sin foto</span>';

    var td = 'padding:8px 10px;vertical-align:middle;font-size:13px;';
    var extraInfo = '';
    if (l && d.ldims && d.ldims.length) {
      extraInfo = '<span style="font-size:11px;color:#1e40af;margin-left:8px">['+d.ldims.length+' dim(s) llanta]</span>';
    }
    if (p && d.npolin) {
      extraInfo = '<span style="font-size:11px;color:#92400e;margin-left:8px">['+d.npolin+' polin(es)]</span>';
    }

    return '<td style="'+td+'text-align:center;width:28px;color:#9ca3af;font-size:12px" class="rnum"></td>'+
      '<td style="'+td+'">'+imgThumb+'</td>'+
      '<td style="'+td+'font-weight:500;color:#111827">'+(d.plano||'<span style="color:#9ca3af">Sin ref.</span>')+extraInfo+'</td>'+
      '<td style="'+td+'color:#6b7280">'+(d.mat||MATS[0])+'</td>'+
      '<td style="'+td+'color:#6b7280;text-align:center">'+(d.cant||1)+'</td>'+
      '<td style="'+td+'font-weight:600;color:#1e40af;text-align:right">'+pesoStr+'</td>'+
      '<td style="'+td+'width:60px;text-align:center" class="no-expand">'+
        '<button onclick="caDelRow(this,\''+rid+'\')" title="Eliminar" style="width:26px;height:26px;border:none;background:none;cursor:pointer;color:#9ca3af;border-radius:4px">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>'+
        '</button>'+
        '<span style="font-size:16px;color:#9ca3af;vertical-align:middle">&#9660;</span>'+
      '</td>';
  }

  function buildDetailPanel(d, rid, l, p) {
    var cs = 'padding:7px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827;font-size:13px;width:100%';
    var matOpts = '';
    for (var i = 0; i < MATS.length; i++) {
      matOpts += '<option value="'+MATS[i]+'"'+(MATS[i]===(d.mat||MATS[0])?' selected':'')+'>'+MATS[i]+'</option>';
    }

    var lBtn = l
      ? '<button onclick="caOpenLDim(\''+rid+'\')" style="padding:6px 14px;border:1px solid #1d4ed8;border-radius:8px;background:#eff6ff;color:#1e40af;cursor:pointer;font-size:12px;font-weight:600">+ Dimensiones llanta</button>'
      : '';
    var lDimsPreview = '';
    if (l && d.ldims && d.ldims.length) {
      lDimsPreview = '<div style="margin-top:6px">';
      for (var di = 0; di < d.ldims.length; di++) {
        var dm = d.ldims[di];
        lDimsPreview += '<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;font-size:11px;color:#1e40af">'+(di+1)+'. '+dm.ancho+'x'+dm.largo+' e:'+dm.esp+'mm</span>';
      }
      lDimsPreview += '</div>';
    }

    var polinSection = '';
    if (p) {
      var np = parseInt(d.npolin)||0, cant = parseInt(d.cant)||1;
      var marks = '';
      for (var pi = 1; pi <= np; pi++) {
        marks += '<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;background:#fef9c3;border:1px solid #fcd34d;border-radius:4px;font-size:11px;color:#92400e">P'+pi+' &times; '+cant+' = '+(pi*cant)+' uds</span>';
      }
      polinSection = '<div style="grid-column:1/-1">'+
        '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">NUM. POLINES</label>'+
        '<input class="cnp" type="number" value="'+(d.npolin||'')+'" min="1" placeholder="0" oninput="caOnNPolinChange(this,\''+rid+'\')" style="width:80px;'+cs+'"/>'+
        '<div class="polin-marks" style="margin-top:6px">'+marks+'</div>'+
      '</div>';
    }

    var imgSection = '<div style="grid-column:1/-1">'+
      '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:6px">FOTO DEL PLANO</label>'+
      '<div class="img-wrap" style="display:flex;align-items:center;gap:10px">'+
        (d.img
          ? '<img class="ci-prev" src="'+d.img+'" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #d1d5db;cursor:pointer" onclick="caViewImg(this)"/>'
          : '<div class="ci-prev" style="width:80px;height:60px;border:2px dashed #d1d5db;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px">Sin foto</div>')+
        '<button onclick="caPickImg(this,\''+rid+'\')" style="padding:6px 14px;border:1px solid #9ca3af;border-radius:8px;background:#f0f2f5;color:#374151;cursor:pointer;font-size:12px">+ Cargar imagen</button>'+
        '<input type="file" accept="image/*" style="display:none" onchange="caLoadImg(this,\''+rid+'\')"/>'+
      '</div>'+
    '</div>';

    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem">'+
      '<div>'+
        '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">PLANO / REF.</label>'+
        '<input class="cp" type="text" value="'+(d.plano||'')+'" placeholder="PLA-001" oninput="caRecalcRid(\''+rid+'\')" style="'+cs+'"/>'+
      '</div>'+
      '<div>'+
        '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">MATERIAL</label>'+
        '<select class="cm" onchange="caRecalcRid(\''+rid+'\')" style="'+cs+'">'+matOpts+'</select>'+
      '</div>'+
      '<div>'+
        '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">LARGO mm</label>'+
        '<input class="cl" type="number" value="'+(d.largo||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalcRid(\''+rid+'\')" style="'+cs+'"/>'+
      '</div>'+
      '<div>'+
        '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">ANCHO mm</label>'+
        '<input class="ca" type="number" value="'+(d.ancho||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalcRid(\''+rid+'\')" style="'+cs+'"/>'+
      '</div>'+
      '<div>'+
        '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">ALTO / ESP. mm</label>'+
        '<input class="ce" type="number" value="'+(d.alto||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalcRid(\''+rid+'\')" style="'+cs+'"/>'+
      '</div>'+
      '<div>'+
        '<label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">CANTIDAD</label>'+
        '<input class="cc" type="number" value="'+(d.cant||1)+'" placeholder="1" min="1" step="1" oninput="caOnCantChange(this,\''+rid+'\')" style="'+cs+'"/>'+
      '</div>'+
      (l ? '<div style="grid-column:1/-1"><label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:6px">DIMENSIONES LLANTA</label>'+lBtn+lDimsPreview+'</div>' : '')+
      (p ? polinSection : '')+
      imgSection+
    '</div>';
  }

  function toggleExpand(rid) {
    // save current expanded inputs first
    if (expandedRow && expandedRow !== rid) {
      syncDetailToData(expandedRow);
      refreshListRow(expandedRow);
      var oldD = document.querySelector('tr[data-detail="'+expandedRow+'"]');
      if (oldD) oldD.style.display = 'none';
      var oldArr = document.querySelector('tr[data-rid="'+expandedRow+'"] .arr');
      if (oldArr) oldArr.textContent = '\u25BC';
    }
    var detailTr = document.querySelector('tr[data-detail="'+rid+'"]');
    if (!detailTr) return;
    var isOpen = detailTr.style.display !== 'none';
    if (isOpen) {
      syncDetailToData(rid);
      refreshListRow(rid);
      detailTr.style.display = 'none';
      expandedRow = null;
      var arr = document.querySelector('tr[data-rid="'+rid+'"] .arr');
      if (arr) arr.textContent = '\u25BC';
    } else {
      detailTr.style.display = '';
      expandedRow = rid;
      var arr2 = document.querySelector('tr[data-rid="'+rid+'"] .arr');
      if (arr2) arr2.textContent = '\u25B2';
    }
  }

  function syncDetailToData(rid) {
    var detailTr = document.querySelector('tr[data-detail="'+rid+'"]');
    if (!detailTr) return;
    var s = sheets[ai]; if (!s) return;
    var row = getRowByRid(rid);
    if (!row) return;
    var panel = detailTr.querySelector('td > div');
    if (!panel) return;
    if (panel.querySelector('.cp')) row.plano = panel.querySelector('.cp').value;
    if (panel.querySelector('.cm')) row.mat   = panel.querySelector('.cm').value;
    if (panel.querySelector('.cl')) row.largo = panel.querySelector('.cl').value;
    if (panel.querySelector('.ca')) row.ancho = panel.querySelector('.ca').value;
    if (panel.querySelector('.ce')) row.alto  = panel.querySelector('.ce').value;
    if (panel.querySelector('.cc')) row.cant  = panel.querySelector('.cc').value;
    if (panel.querySelector('.cnp')) row.npolin = panel.querySelector('.cnp').value;
    // img already saved on load
  }

  function getRowByRid(rid) {
    var s = sheets[ai]; if (!s || !s.rows) return null;
    for (var i = 0; i < s.rows.length; i++) {
      if (String(s.rows[i].rid) === String(rid)) return s.rows[i];
    }
    return null;
  }

  function refreshListRow(rid) {
    var listTr = document.querySelector('tr[data-rid="'+rid+'"]');
    if (!listTr) return;
    var row = getRowByRid(rid);
    if (!row) return;
    var l = gk('caChkL'), p = gk('caChkP');
    var peso = calcPeso(row, l, p);
    var pesoStr = peso > 0 ? peso.toFixed(3)+' kg' : '-';
    listTr.innerHTML = buildListRow(row, rid, pesoStr, l, p);
    listTr.onclick = function(e) {
      if (e.target.tagName==='BUTTON'||e.target.tagName==='INPUT'||e.target.closest('button')||e.target.closest('.no-expand')) return;
      toggleExpand(rid);
    };
    var arr = listTr.querySelector('.arr');
    if (arr && expandedRow === rid) arr.textContent = '\u25B2';
  }

  function calcPeso(d, l, p) {
    var ok = (l || p) && !(l && p);
    if (!ok) return 0;
    var largo = parseFloat(d.largo)||0, ancho=parseFloat(d.ancho)||0;
    var alto  = parseFloat(d.alto)||0,  cant=parseFloat(d.cant)||1;
    if (!largo || !ancho || !alto) return 0;
    var peso = largo * ancho * alto * (DEN[d.mat] || DEN[MATS[0]]) * cant;
    if (p) peso = peso * PF;
    return peso;
  }

  function renum() {
    var trs = document.querySelectorAll('#caTbody tr[data-rid]');
    var n = 1;
    for (var i = 0; i < trs.length; i++) {
      var c = trs[i].querySelector('.rnum');
      if (c) { c.textContent = n; n++; }
    }
  }

  /* ── CHECK ── */
  window.caOnChk = function(w) {
    if (w==='L') { if (gk('caChkL')) document.getElementById('caChkP').checked=false; }
    else         { if (gk('caChkP')) document.getElementById('caChkL').checked=false; }
    updChk(); recalc();
  };

  function updChk() {
    var l=gk('caChkL'), p=gk('caChkP');
    var ll=document.getElementById('caLblL'), lp=document.getElementById('caLblP');
    ll.style.background=l?'#eff6ff':'#fff'; ll.style.color=l?'#1e40af':'#111827'; ll.style.borderColor=l?'#1d4ed8':'#d1d5db';
    lp.style.background=p?'#fef9c3':'#fff'; lp.style.color=p?'#92400e':'#111827'; lp.style.borderColor=p?'#fcd34d':'#d1d5db';
    var st=document.getElementById('caChkSt');
    if (l&&p)        { st.textContent='Marca solo una opcion'; st.style.background='#fee2e2'; st.style.color='#991b1b'; st.style.borderColor='#fca5a5'; }
    else if (!l&&!p) { st.textContent='Sin tipo seleccionado'; st.style.background='#fee2e2'; st.style.color='#991b1b'; st.style.borderColor='#fca5a5'; }
    else             { st.textContent=l?'Llanta activa':'Polin activo'; st.style.background='#dcfce7'; st.style.color='#166534'; st.style.borderColor='#86efac'; }
  }

  /* ── RECALC ── */
  function recalc() {
    var l=gk('caChkL'), p=gk('caChkP'), total=0;
    var s = sheets[ai]; if (!s || !s.rows) { document.getElementById('caTotal').textContent='0.000 kg'; return; }
    for (var i=0; i<s.rows.length; i++) {
      var peso = calcPeso(s.rows[i], l, p);
      total += peso;
      var cell = document.querySelector('tr[data-rid="'+s.rows[i].rid+'"] td:nth-child(6)');
      if (cell) { cell.textContent = peso>0 ? peso.toFixed(3)+' kg' : '-'; cell.style.color = peso>100?'#991b1b':'#1e40af'; }
    }
    document.getElementById('caTotal').textContent = total.toFixed(3)+' kg';
  }

  window.caRecalc = function() { recalc(); };
  window.caRecalcRid = function(rid) {
    syncDetailToData(rid);
    recalc();
    refreshListRow(rid);
  };

  /* ── DELETE ROW ── */
  window.caDelRow = function(btn, rid) {
    var listTr   = document.querySelector('tr[data-rid="'+rid+'"]');
    var detailTr = document.querySelector('tr[data-detail="'+rid+'"]');
    if (listTr)   listTr.remove();
    if (detailTr) detailTr.remove();
    var s = sheets[ai];
    if (s && s.rows) {
      for (var i=0; i<s.rows.length; i++) {
        if (String(s.rows[i].rid)===String(rid)) { s.rows.splice(i,1); break; }
      }
    }
    if (expandedRow===rid) expandedRow=null;
    renum(); recalc();
  };

  /* ── ADD ROW BUTTON ── */
  window.caAddRow = function() {
    _rc++;
    var rid = String(_rc);
    var s = sheets[ai];
    var newRow = {rid:rid, plano:'', mat:MATS[0], largo:'', ancho:'', alto:'', cant:1, npolin:'', img:'', ldims:[]};
    if (!s.rows) s.rows = [];
    s.rows.push(newRow);
    addRow(newRow);
    // auto-expand new row
    setTimeout(function(){ toggleExpand(rid); }, 50);
  };

  /* ── POLIN CHANGE ── */
  window.caOnNPolinChange = function(inp, rid) {
    syncDetailToData(rid);
    var row = getRowByRid(rid);
    if (!row) return;
    var np   = parseInt(inp.value)||0;
    var cant = parseInt(row.cant)||1;
    row.npolin = String(np);
    var markDiv = inp.closest('div').querySelector('.polin-marks');
    if (!markDiv) return;
    var marks = '';
    for (var pi=1; pi<=np; pi++) marks += '<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;background:#fef9c3;border:1px solid #fcd34d;border-radius:4px;font-size:11px;color:#92400e">P'+pi+' &times; '+cant+' = '+(pi*cant)+' uds</span>';
    markDiv.innerHTML = marks;
    refreshListRow(rid);
  };

  window.caOnCantChange = function(inp, rid) {
    syncDetailToData(rid);
    recalc();
    refreshListRow(rid);
    // refresh polin marks
    var row = getRowByRid(rid);
    if (!row) return;
    var np = parseInt(row.npolin)||0, cant = parseInt(inp.value)||1;
    var detailTr = document.querySelector('tr[data-detail="'+rid+'"]');
    if (!detailTr) return;
    var markDiv = detailTr.querySelector('.polin-marks');
    if (!markDiv) return;
    var marks = '';
    for (var pi=1; pi<=np; pi++) marks += '<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;background:#fef9c3;border:1px solid #fcd34d;border-radius:4px;font-size:11px;color:#92400e">P'+pi+' &times; '+cant+' = '+(pi*cant)+' uds</span>';
    markDiv.innerHTML = marks;
  };

  /* ── LLANTA DIMS MODAL ── */
  window.caOpenLDim = function(rid) {
    var row = getRowByRid(rid);
    if (!row) return;
    var dims = row.ldims || [];
    var rows = '';
    for (var i=0; i<dims.length; i++) {
      rows += ldimRowHtml(i+1, dims[i].ancho, dims[i].largo, dims[i].esp);
    }
    if (!rows) rows = ldimRowHtml(1,'','','');
    document.getElementById('caLdimBody').innerHTML = rows;
    document.getElementById('caLdimRid').value = rid;
    document.getElementById('caLdimOv').style.display = 'flex';
  };

  function ldimRowHtml(n, a, l, e) {
    return '<div class="ldim-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">'+
      '<span style="font-size:12px;color:#6b7280;min-width:18px;font-weight:600">'+n+'.</span>'+
      '<div style="display:flex;flex-direction:column;gap:2px">'+
        '<label style="font-size:10px;color:#9ca3af">ANCHO mm</label>'+
        '<input class="ld-a" type="number" value="'+(a||'')+'" placeholder="0" style="width:80px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"/>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;gap:2px">'+
        '<label style="font-size:10px;color:#9ca3af">LARGO mm</label>'+
        '<input class="ld-l" type="number" value="'+(l||'')+'" placeholder="0" style="width:80px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"/>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;gap:2px">'+
        '<label style="font-size:10px;color:#9ca3af">ESPESOR mm</label>'+
        '<input class="ld-e" type="number" value="'+(e||'')+'" placeholder="0" style="width:80px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"/>'+
      '</div>'+
      '<button onclick="caRemLDimRow(this)" style="margin-top:14px;width:26px;height:26px;border:none;background:#fee2e2;color:#991b1b;border-radius:4px;cursor:pointer;font-weight:700;font-size:14px">x</button>'+
    '</div>';
  }

  window.caRemLDimRow = function(btn) {
    var wrap = btn.parentElement.parentElement;
    btn.parentElement.remove();
    renumLDims(wrap);
  };
  function renumLDims(wrap) {
    var rows = wrap.querySelectorAll('.ldim-row');
    for (var i=0; i<rows.length; i++) rows[i].querySelector('span').textContent=(i+1)+'.';
  }
  window.caAddLDimRow = function() {
    var body = document.getElementById('caLdimBody');
    var n = body.querySelectorAll('.ldim-row').length+1;
    var div = document.createElement('div');
    div.innerHTML = ldimRowHtml(n,'','','');
    body.appendChild(div.firstChild);
  };
  window.caSaveLDims = function() {
    var rid  = document.getElementById('caLdimRid').value;
    var row  = getRowByRid(rid);
    if (!row) return;
    var rows = document.querySelectorAll('#caLdimBody .ldim-row');
    var dims = [];
    for (var i=0; i<rows.length; i++) {
      var a=rows[i].querySelector('.ld-a').value;
      var l=rows[i].querySelector('.ld-l').value;
      var e=rows[i].querySelector('.ld-e').value;
      if (a||l||e) dims.push({ancho:a, largo:l, esp:e});
    }
    row.ldims = dims;
    // refresh detail panel preview
    var detailTr = document.querySelector('tr[data-detail="'+rid+'"]');
    if (detailTr) {
      var lBtn = '<button onclick="caOpenLDim(\''+rid+'\')" style="padding:6px 14px;border:1px solid #1d4ed8;border-radius:8px;background:#eff6ff;color:#1e40af;cursor:pointer;font-size:12px;font-weight:600">+ Dimensiones llanta</button>';
      var preview = '<div style="margin-top:6px">';
      for (var d=0; d<dims.length; d++) preview += '<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;font-size:11px;color:#1e40af">'+(d+1)+'. '+dims[d].ancho+'x'+dims[d].largo+' e:'+dims[d].esp+'mm</span>';
      preview += '</div>';
      var lSection = detailTr.querySelector('.ldim-section');
      if (lSection) lSection.innerHTML = lBtn+preview;
    }
    refreshListRow(rid);
    document.getElementById('caLdimOv').style.display='none';
  };
  window.caCloseLDim = function() { document.getElementById('caLdimOv').style.display='none'; };

  /* ── IMAGE ── */
  window.caPickImg = function(btn, rid) { btn.nextElementSibling.click(); };
  window.caLoadImg = function(inp, rid) {
    var file = inp.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var src = ev.target.result;
      var row = getRowByRid(rid);
      if (row) row.img = src;
      // update preview in detail
      var wrap = inp.closest('.img-wrap');
      if (wrap) {
        var prev = wrap.querySelector('.ci-prev');
        if (prev) {
          if (prev.tagName === 'IMG') { prev.src = src; }
          else {
            var img = document.createElement('img');
            img.className = 'ci-prev';
            img.src = src;
            img.style.cssText = 'width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #d1d5db;cursor:pointer';
            img.onclick = function(){ caViewImg(this); };
            prev.parentNode.replaceChild(img, prev);
          }
        }
      }
      refreshListRow(rid);
    };
    reader.readAsDataURL(file);
    inp.value='';
  };
  window.caViewImg = function(img) {
    var w = window.open('','_blank','width=900,height=700');
    w.document.write('<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="'+img.src+'" style="max-width:100%;max-height:100vh"/></body></html>');
    w.document.close();
  };

  /* ── MODALS ── */
  window.caNew = function() {
    document.getElementById('caNewName').value='Hoja '+(sheets.length+1);
    document.getElementById('caOv').style.display='flex';
    setTimeout(function(){ document.getElementById('caNewName').focus(); },60);
  };
  window.caCloseM    = function() { document.getElementById('caOv').style.display='none'; };
  window.caConfirmNew = function() {
    var n = document.getElementById('caNewName').value.trim()||('Hoja '+(sheets.length+1));
    cap(); sheets.push(ns(n)); ai=sheets.length-1; expandedRow=null;
    sl(); renderTabs(); loadSheet(ai); caCloseM();
  };
  function renameSheet(i) {
    var n=prompt('Renombrar hoja:',sheets[i].name);
    if (n&&n.trim()){ sheets[i].name=n.trim(); if(i===ai) document.getElementById('caTitle').textContent=n.trim(); renderTabs(); sl(); }
  }

  /* ── SAVE / LOAD ── */
  function sl() { try { localStorage.setItem(SK, JSON.stringify(sheets)); } catch(e){} }

  window.caSave = function() {
    cap();
    // sync any open detail
    if (expandedRow) syncDetailToData(expandedRow);
    sl();
    var blob = new Blob([JSON.stringify(sheets,null,2)],{type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (sheets[ai].name||'calculo')+'_materiales.json';
    a.click();
  };
  window.caLoad = function() { document.getElementById('caFileIn').click(); };
  window.caReadFile = function(e) {
    var f=e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){
      try {
        var d=JSON.parse(ev.target.result);
        if(Array.isArray(d)){ sheets=d; ai=0; expandedRow=null; sl(); renderTabs(); loadSheet(0); }
        else alert('Formato no reconocido.');
      } catch(ex){ alert('Error al leer el archivo.'); }
    };
    r.readAsText(f); e.target.value='';
  };

  /* ── PDF ── */
  window.caPDF = function() {
    if (expandedRow) syncDetailToData(expandedRow);
    cap();
    var s=sheets[ai], l=s.chkL, p=s.chkP;
    var tipo=l?'L - Llanta':(p?'P - Polin':'Sin tipo');
    var ok=(l||p)&&!(l&&p), total=0, tbody='';
    for (var i=0; i<(s.rows||[]).length; i++) {
      var r=s.rows[i];
      var peso=calcPeso(r,l,p);
      if(ok) total+=peso;
      var pstr=ok&&peso>0?peso.toFixed(3)+' kg':'-';
      var hi=(ok&&peso>100)?';color:#991b1b':'';
      var imgTd=r.img?'<td><img src="'+r.img+'" style="width:55px;height:42px;object-fit:cover;border-radius:3px"/></td>':'<td style="color:#9ca3af;font-size:10px">-</td>';
      var extraTd='';
      if(l&&r.ldims&&r.ldims.length){
        extraTd='<td style="font-size:10px">';
        for(var d=0;d<r.ldims.length;d++){ var dm=r.ldims[d]; extraTd+=(d+1)+'. '+dm.ancho+'x'+dm.largo+' e:'+dm.esp+'<br/>'; }
        extraTd+='</td>';
      } else if(l) extraTd='<td>-</td>';
      if(p){
        var np=parseInt(r.npolin)||0, cant=parseInt(r.cant)||1;
        extraTd='<td style="font-size:10px">';
        for(var pi=1;pi<=np;pi++) extraTd+='P'+pi+': '+(pi*cant)+' uds<br/>';
        extraTd+=(np?'':'</td>'); if(np) extraTd+='</td>';
        if(!np) extraTd='<td>-</td>';
      }
      tbody+='<tr><td>'+(i+1)+'</td><td>'+(r.plano||'')+'</td>'+imgTd+'<td>'+(r.mat||'')+'</td>'+
        '<td>'+(parseFloat(r.largo)||'')+'</td><td>'+(parseFloat(r.ancho)||'')+'</td><td>'+(parseFloat(r.alto)||'')+'</td>'+
        '<td>'+(r.cant||1)+'</td>'+extraTd+
        '<td style="text-align:right;font-weight:700'+hi+'">'+pstr+'</td></tr>';
    }
    var bgT=l?'#dbeafe':(p?'#fef9c3':'#fee2e2');
    var coT=l?'#1e40af':(p?'#92400e':'#991b1b');
    var brT=l?'#93c5fd':(p?'#fcd34d':'#fca5a5');
    var extraTh=l?'<th>Dims. Llanta</th>':(p?'<th>Polines</th>':'');
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+s.name+'</title>'+
      '<style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:1.5cm}'+
      '.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:10px}'+
      'h1{font-size:16px;color:#1e3a5f;margin:0}'+
      '.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 1.5rem;margin-bottom:10px;font-size:10px}'+
      '.meta div{background:#f8fafc;padding:5px 8px;border-radius:4px;border:1px solid #e5e7eb}'+
      '.meta div b{display:block;color:#1e3a5f;font-size:9px;text-transform:uppercase;margin-bottom:2px}'+
      '.tipo{display:inline-block;padding:3px 12px;border-radius:5px;font-weight:700;background:'+bgT+';color:'+coT+';border:1px solid '+brT+';margin-bottom:10px}'+
      'table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#e0e8f5;padding:6px 7px;text-align:left;font-size:10px;text-transform:uppercase}'+
      'td{padding:5px 7px;border-bottom:1px solid #e5e7eb;vertical-align:middle}tr:nth-child(even) td{background:#f9fafb}'+
      '.tot{text-align:right;margin-top:10px;font-size:14px;font-weight:700;color:#1e3a5f}'+
      '.foot{margin-top:1.5rem;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:6px}'+
      '@media print{@page{margin:1.2cm}}</style></head><body>'+
      '<div class="hdr"><h1>'+s.name+'</h1><span style="font-size:10px;color:#6b7280">Hoja de Calculo de Materiales</span></div>'+
      '<div class="meta">'+
        '<div><b>Plano</b>'+(s.plano||'-')+'</div>'+
        '<div><b>Cantidad</b>'+(s.cantidad||'-')+'</div>'+
        '<div><b>Elaborado por</b>'+(s.autor||'-')+'</div>'+
        '<div><b>Soldado por</b>'+(s.soldador||'-')+'</div>'+
        '<div><b>Fecha Montaje</b>'+(s.fmontaje||'-')+'</div>'+
        '<div><b>Fecha Soldadura</b>'+(s.fsoldadura||'-')+'</div>'+
      '</div>'+
      '<div class="tipo">Tipo: '+tipo+'</div>'+
      '<table><thead><tr><th>#</th><th>Plano</th><th>Foto</th><th>Material</th>'+
      '<th>Largo</th><th>Ancho</th><th>Alto</th><th>Cant.</th>'+extraTh+'<th>Peso kg</th>'+
      '</tr></thead><tbody>'+tbody+'</tbody></table>'+
      '<div class="tot">Peso total: '+total.toFixed(3)+' kg</div>'+
      '<div class="foot">Generado: '+new Date().toLocaleString('es-ES')+' | Factor polin x1.10</div>'+
      '</body></html>';
    var win=window.open('','_blank'); win.document.write(html); win.document.close();
    setTimeout(function(){ win.print(); },600);
  };

  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); }
  else { init(); }
})();
