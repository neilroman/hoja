(function() {
  var DEN = {
    'Acero A36':0.000007850,'Acero Inox':0.000007900,
    'Aluminio':0.000002700,'Hierro fundido':0.000007200,
    'Cobre':0.000008960,'Laton':0.000008500,'Titanio':0.000004500
  };
  var MATS = Object.keys(DEN);
  var PF = 1.10, SK = 'calc_mat_v6';
  var sheets = [], ai = 0, rc = 0;

  function init() {
    var s = localStorage.getItem(SK);
    if (s) { try { sheets = JSON.parse(s); } catch(e) { sheets = []; } }
    if (!sheets.length) sheets = [ns('Hoja 1')];
    renderTabs(); loadSheet(0);
  }

  function ns(n) {
    return {name:n, plano:'', cantidad:'', fmontaje:'', fsoldadura:'',
            autor:'', fecha:'', chkL:false, chkP:false, rows:[]};
  }
  function today() { return new Date().toISOString().slice(0,10); }

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
        t.onclick = function() { switchSheet(idx); };
        t.ondblclick = function() { renameSheet(idx); };
        bar.appendChild(t);
      })(i);
    }
  }

  function switchSheet(i) { cap(); ai = i; renderTabs(); loadSheet(i); }

  function cap() {
    var s = sheets[ai]; if (!s) return;
    s.plano      = gv('caPlano');
    s.cantidad   = gv('caCantidad');
    s.fmontaje   = gv('caFmontaje');
    s.fsoldadura = gv('caFsoldadura');
    s.autor      = gv('caAutor');
    s.fecha      = gv('caFecha');
    s.chkL = gk('caChkL'); s.chkP = gk('caChkP');
    var t = document.getElementById('caTitle').textContent.trim();
    if (t) s.name = t;
    s.rows = capRows();
  }
  function gv(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function gk(id) { var el = document.getElementById(id); return el ? el.checked : false; }

  function capRows() {
    var rows = [], trs = document.querySelectorAll('#caTbody tr[data-rid]');
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      var imgEl = tr.querySelector('.ci-prev');
      rows.push({
        plano: tr.querySelector('.cp').value,
        mat:   tr.querySelector('.cm').value,
        largo: tr.querySelector('.cl').value,
        ancho: tr.querySelector('.ca').value,
        alto:  tr.querySelector('.ce').value,
        cant:  tr.querySelector('.cc').value,
        img:   imgEl ? (imgEl.dataset.src || '') : '',
        // llanta dims
        ldims: capLDims(tr),
        // polin markers stored per row
        npolin: tr.querySelector('.cnp') ? tr.querySelector('.cnp').value : ''
      });
    }
    return rows;
  }

  function capLDims(tr) {
    var dims = [];
    var rows = tr.querySelectorAll('.ldim-row');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      dims.push({
        ancho: r.querySelector('.ld-a') ? r.querySelector('.ld-a').value : '',
        largo: r.querySelector('.ld-l') ? r.querySelector('.ld-l').value : '',
        esp:   r.querySelector('.ld-e') ? r.querySelector('.ld-e').value : ''
      });
    }
    return dims;
  }

  function loadSheet(i) {
    var s = sheets[i];
    document.getElementById('caTitle').textContent  = s.name;
    document.getElementById('caPlano').value      = s.plano      || '';
    document.getElementById('caCantidad').value   = s.cantidad   || '';
    document.getElementById('caFmontaje').value   = s.fmontaje   || '';
    document.getElementById('caFsoldadura').value = s.fsoldadura || '';
    document.getElementById('caAutor').value      = s.autor      || '';
    document.getElementById('caFecha').value      = s.fecha      || '';
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
      opts += '<option value="'+MATS[i]+'"'+(MATS[i]===sel?' selected':'')+'>'+MATS[i]+'</option>';
    }
    var cs  = 'width:100%;border:none;background:transparent;color:#111827;font-size:12px;padding:2px 4px;font-family:inherit';
    var tds = 'padding:6px 8px;border-bottom:1px solid #d1d5db;vertical-align:top';

    var l = gk('caChkL'), p = gk('caChkP');

    // llanta dims html
    var ldimsHtml = buildLDimsHtml(d.ldims || [{}]);

    // polin markers html
    var npolinVal = d.npolin || '';
    var polinMarkHtml = buildPolinMarkers(parseInt(npolinVal) || 0, parseInt(d.cant) || 1);

    // image preview
    var imgSrc = d.img || '';
    var imgHtml = '<div style="position:relative">' +
      '<img class="ci-prev" src="'+(imgSrc||'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')+
      '" data-src="'+imgSrc+'" style="width:48px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #d1d5db;cursor:pointer;display:'+(imgSrc?'block':'none')+'" onclick="caViewImg(this)"/>'+
      '<button onclick="caPickImg(this)" style="font-size:11px;padding:3px 6px;border:1px solid #9ca3af;border-radius:4px;background:#f0f2f5;cursor:pointer;color:#374151;display:'+(imgSrc?'none':'block')+'">+ Foto</button>'+
      '<input type="file" accept="image/*" style="display:none" onchange="caLoadImg(this)"/>'+
      '</div>';

    var tr = document.createElement('tr');
    tr.setAttribute('data-rid', rc);
    tr.innerHTML =
      '<td style="'+tds+';text-align:center;color:#6b7280;font-size:12px;width:28px"></td>'+
      '<td style="'+tds+';min-width:80px"><input class="cp" type="text" value="'+esc(d.plano||'')+'" placeholder="PLA-001" oninput="caRecalc()" style="'+cs+'"/></td>'+
      '<td style="'+tds+'">' + imgHtml + '</td>'+
      '<td style="'+tds+';min-width:120px"><select class="cm" onchange="caRecalc()" style="'+cs+'">'+opts+'</select></td>'+
      '<td style="'+tds+';width:72px"><input class="cl" type="number" value="'+(d.largo||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalc()" style="'+cs+'"/></td>'+
      '<td style="'+tds+';width:72px"><input class="ca" type="number" value="'+(d.ancho||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalc()" style="'+cs+'"/></td>'+
      '<td style="'+tds+';width:72px"><input class="ce" type="number" value="'+(d.alto||'')+'" placeholder="0" min="0" step="0.1" oninput="caRecalc()" style="'+cs+'"/></td>'+
      '<td style="'+tds+';width:55px"><input class="cc" type="number" value="'+(d.cant||1)+'" placeholder="1" min="1" step="1" oninput="caOnCantChange(this)" style="'+cs+'"/></td>'+
      // llanta dims panel
      '<td class="td-ldim" style="'+tds+';min-width:200px;display:'+(l?'table-cell':'none')+'">'+
        '<div class="ldim-wrap">'+ldimsHtml+'</div>'+
        '<button onclick="caAddLDim(this)" style="font-size:11px;margin-top:4px;padding:2px 8px;border:1px solid #9ca3af;border-radius:4px;background:#f0f2f5;cursor:pointer;display:'+(l?'block':'none')+'">+ Dim</button>'+
      '</td>'+
      // polin panel
      '<td class="td-polin" style="'+tds+';min-width:160px;display:'+(p?'table-cell':'none')+'">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'+
          '<label style="font-size:11px;color:#6b7280">Num. polín:</label>'+
          '<input class="cnp" type="number" value="'+npolinVal+'" min="1" step="1" placeholder="0" oninput="caOnNPolinChange(this)" style="width:50px;border:1px solid #d1d5db;border-radius:4px;padding:2px 4px;font-size:12px"/>'+
        '</div>'+
        '<div class="polin-marks">'+polinMarkHtml+'</div>'+
      '</td>'+
      '<td style="'+tds+';text-align:right;width:95px"><span class="cv" style="font-weight:700;color:#1e40af;font-size:12px">-</span></td>'+
      '<td style="'+tds+';width:30px"><button onclick="caDelRow(this)" style="width:26px;height:26px;border:none;background:none;cursor:pointer;color:#6b7280;border-radius:4px">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>'+
      '</button></td>';

    document.getElementById('caTbody').appendChild(tr);
    renum(); recalc();
  }

  function buildLDimsHtml(dims) {
    if (!dims || !dims.length) dims = [{}];
    var h = '';
    for (var i = 0; i < dims.length; i++) {
      var d = dims[i] || {};
      h += '<div class="ldim-row" style="display:flex;gap:4px;align-items:center;margin-bottom:3px">'+
        '<span style="font-size:10px;color:#6b7280;min-width:12px">'+(i+1)+'.</span>'+
        '<input class="ld-a" type="number" value="'+(d.ancho||'')+'" placeholder="An" title="Ancho mm" style="width:48px;border:1px solid #d1d5db;border-radius:4px;padding:2px 4px;font-size:11px" oninput="caRecalc()"/>'+
        '<input class="ld-l" type="number" value="'+(d.largo||'')+'" placeholder="Lg" title="Largo mm" style="width:48px;border:1px solid #d1d5db;border-radius:4px;padding:2px 4px;font-size:11px" oninput="caRecalc()"/>'+
        '<input class="ld-e" type="number" value="'+(d.esp||'')+'" placeholder="Esp" title="Espesor mm" style="width:44px;border:1px solid #d1d5db;border-radius:4px;padding:2px 4px;font-size:11px" oninput="caRecalc()"/>'+
        '<button onclick="caRemLDim(this)" style="border:none;background:none;cursor:pointer;color:#9ca3af;padding:0 2px;font-size:14px;line-height:1">x</button>'+
      '</div>';
    }
    return h;
  }

  function buildPolinMarkers(nPolin, cant) {
    if (!nPolin || nPolin < 1) return '';
    var h = '';
    for (var p = 1; p <= nPolin; p++) {
      h += '<div style="margin-bottom:4px;padding:3px 6px;background:#fef9c3;border:1px solid #fcd34d;border-radius:4px;font-size:11px;color:#92400e">'+
        'Polin '+p+' &times; '+cant+' = <b>'+(p*cant)+'</b> uds'+
      '</div>';
    }
    return h;
  }

  function esc(s) { return String(s).replace(/"/g,'&quot;'); }

  window.caAddRow = function(d) { addRow(d); };
  window.caDelRow = function(b) { b.closest('tr').remove(); renum(); recalc(); };
  window.caRecalc = function() { recalc(); };

  window.caAddLDim = function(btn) {
    var wrap = btn.previousElementSibling;
    var cur  = wrap.querySelectorAll('.ldim-row').length;
    var div  = document.createElement('div');
    div.innerHTML = buildLDimsHtml([{}]);
    var newRow = div.querySelector('.ldim-row');
    // fix number
    newRow.querySelector('span').textContent = (cur+1)+'.';
    wrap.appendChild(newRow);
    recalc();
  };

  window.caRemLDim = function(btn) {
    var row  = btn.closest('.ldim-row');
    var wrap = row.parentElement;
    if (wrap.querySelectorAll('.ldim-row').length > 1) {
      row.remove();
      // renumber
      var rows = wrap.querySelectorAll('.ldim-row');
      for (var i = 0; i < rows.length; i++) rows[i].querySelector('span').textContent = (i+1)+'.';
      recalc();
    }
  };

  window.caOnCantChange = function(inp) {
    var tr    = inp.closest('tr');
    var cant  = parseInt(inp.value) || 1;
    var npEl  = tr.querySelector('.cnp');
    var np    = npEl ? (parseInt(npEl.value) || 0) : 0;
    var markDiv = tr.querySelector('.polin-marks');
    if (markDiv) markDiv.innerHTML = buildPolinMarkers(np, cant);
    recalc();
  };

  window.caOnNPolinChange = function(inp) {
    var tr    = inp.closest('tr');
    var np    = parseInt(inp.value) || 0;
    var cantEl = tr.querySelector('.cc');
    var cant  = cantEl ? (parseInt(cantEl.value) || 1) : 1;
    var markDiv = tr.querySelector('.polin-marks');
    if (markDiv) markDiv.innerHTML = buildPolinMarkers(np, cant);
  };

  // image handling
  window.caPickImg = function(btn) {
    var fileIn = btn.nextElementSibling;
    fileIn.click();
  };
  window.caLoadImg = function(inp) {
    var file = inp.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var src  = e.target.result;
      var btn  = inp.previousElementSibling;
      var img  = btn.previousElementSibling;
      img.src  = src;
      img.dataset.src = src;
      img.style.display = 'block';
      btn.style.display = 'none';
    };
    reader.readAsDataURL(file);
    inp.value = '';
  };
  window.caViewImg = function(img) {
    var w = window.open('','_blank','width=800,height=600');
    w.document.write('<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="'+img.src+'" style="max-width:100%;max-height:100vh"/></body></html>');
    w.document.close();
  };

  function renum() {
    var trs = document.querySelectorAll('#caTbody tr[data-rid]');
    for (var i = 0; i < trs.length; i++) trs[i].cells[0].textContent = i+1;
  }

  window.caOnChk = function(w) {
    if (w==='L') { if (gk('caChkL')) document.getElementById('caChkP').checked = false; }
    else         { if (gk('caChkP')) document.getElementById('caChkL').checked = false; }
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
    if (l && p)        { st.textContent='Marca solo una opcion'; st.style.background='#fee2e2'; st.style.color='#991b1b'; st.style.borderColor='#fca5a5'; }
    else if (!l && !p) { st.textContent='Sin tipo seleccionado'; st.style.background='#fee2e2'; st.style.color='#991b1b'; st.style.borderColor='#fca5a5'; }
    else               { st.textContent=l?'Llanta activa':'Polin activo'; st.style.background='#dcfce7'; st.style.color='#166534'; st.style.borderColor='#86efac'; }

    // show/hide columns in all rows
    var ldCols = document.querySelectorAll('.td-ldim');
    var pCols  = document.querySelectorAll('.td-polin');
    var ldBtns = document.querySelectorAll('.ldim-wrap');
    for (var i = 0; i < ldCols.length; i++) ldCols[i].style.display = l ? 'table-cell' : 'none';
    for (var j = 0; j < pCols.length;  j++) pCols[j].style.display  = p ? 'table-cell' : 'none';

    // show/hide header cols
    var thL = document.getElementById('thLlanta');
    var thP = document.getElementById('thPolin');
    if (thL) thL.style.display = l ? 'table-cell' : 'none';
    if (thP) thP.style.display = p ? 'table-cell' : 'none';
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
      if (!ok || largo===0 || ancho===0 || alto===0) {
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
    document.getElementById('caNewName').value = 'Hoja ' + (sheets.length+1);
    document.getElementById('caOv').style.display = 'flex';
    setTimeout(function(){ document.getElementById('caNewName').focus(); }, 60);
  };
  window.caCloseM  = function() { document.getElementById('caOv').style.display = 'none'; };
  window.caConfirmNew = function() {
    var n = document.getElementById('caNewName').value.trim() || ('Hoja '+(sheets.length+1));
    cap(); sheets.push(ns(n)); ai = sheets.length-1;
    sl(); renderTabs(); loadSheet(ai); caCloseM();
  };

  function renameSheet(i) {
    var n = prompt('Renombrar hoja:', sheets[i].name);
    if (n && n.trim()) {
      sheets[i].name = n.trim();
      if (i===ai) document.getElementById('caTitle').textContent = n.trim();
      renderTabs(); sl();
    }
  }

  function sl() { localStorage.setItem(SK, JSON.stringify(sheets)); }

  window.caSave = function() {
    cap(); sl();
    // strip images from saved JSON to keep size small — save separately
    var copy = JSON.parse(JSON.stringify(sheets));
    var blob = new Blob([JSON.stringify(copy, null, 2)], {type:'application/json'});
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
        if (Array.isArray(d)) { sheets=d; ai=0; sl(); renderTabs(); loadSheet(0); }
        else alert('Formato no reconocido.');
      } catch(ex) { alert('Error al leer el archivo.'); }
    };
    r.readAsText(f); e.target.value='';
  };

  window.caPDF = function() {
    cap();
    var s = sheets[ai], l = s.chkL, p = s.chkP;
    var tipo = l ? 'L - Llanta' : (p ? 'P - Polin' : 'Sin tipo');
    var ok   = (l||p) && !(l&&p);
    var total = 0, tbody = '';

    for (var i = 0; i < (s.rows||[]).length; i++) {
      var r     = s.rows[i];
      var largo = parseFloat(r.largo)||0, ancho=parseFloat(r.ancho)||0;
      var alto  = parseFloat(r.alto)||0,  cant =parseFloat(r.cant)||1;
      var peso  = largo*ancho*alto*(DEN[r.mat]||0)*cant;
      if (p) peso = peso*PF;
      var show = ok && largo>0 && ancho>0 && alto>0;
      if (show) total += peso;
      var pstr = show ? peso.toFixed(3)+' kg' : '-';
      var hi   = (show && peso>100) ? ';color:#991b1b' : '';

      var imgTd = r.img ? '<td><img src="'+r.img+'" style="width:60px;height:45px;object-fit:cover;border-radius:3px"/></td>' : '<td>-</td>';

      // llanta dims
      var ldTd = '';
      if (l && r.ldims && r.ldims.length) {
        ldTd = '<td style="font-size:10px">';
        for (var d = 0; d < r.ldims.length; d++) {
          var dim = r.ldims[d];
          if (dim.ancho || dim.largo || dim.esp) ldTd += (d+1)+'. '+dim.ancho+'x'+dim.largo+' e:'+dim.esp+'mm<br/>';
        }
        ldTd += '</td>';
      } else if (l) { ldTd = '<td>-</td>'; }

      // polin
      var pTd = '';
      if (p) {
        var np = parseInt(r.npolin)||0;
        if (np > 0) {
          pTd = '<td style="font-size:10px">';
          for (var pi = 1; pi <= np; pi++) pTd += 'P'+pi+': '+(pi*cant)+' uds<br/>';
          pTd += '</td>';
        } else pTd = '<td>-</td>';
      }

      tbody += '<tr>'+
        '<td>'+(i+1)+'</td>'+
        '<td>'+(r.plano||'')+'</td>'+
        imgTd +
        '<td>'+r.mat+'</td>'+
        '<td>'+(largo||'')+'</td><td>'+(ancho||'')+'</td><td>'+(alto||'')+'</td>'+
        '<td>'+cant+'</td>'+
        ldTd + pTd +
        '<td style="text-align:right;font-weight:700'+hi+'">'+pstr+'</td>'+
      '</tr>';
    }

    var bgT=l?'#dbeafe':(p?'#fef9c3':'#fee2e2');
    var coT=l?'#1e40af':(p?'#92400e':'#991b1b');
    var brT=l?'#93c5fd':(p?'#fcd34d':'#fca5a5');
    var extraTh = l ? '<th>Dimensiones (Llanta)</th>' : (p ? '<th>Polines</th>' : '');

    var html =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+s.name+'</title>'+
      '<style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:1.5cm}'+
      '.hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:10px}'+
      'h1{font-size:16px;color:#1e3a5f;margin:0}'+
      '.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 1rem;margin-bottom:10px;font-size:10px;color:#555}'+
      '.meta span b{color:#111}'+
      '.tipo{display:inline-block;padding:3px 12px;border-radius:5px;font-weight:700;background:'+bgT+';color:'+coT+';border:1px solid '+brT+';margin-bottom:10px;font-size:11px}'+
      'table{width:100%;border-collapse:collapse}'+
      'th{background:#1e3a5f;color:#e0e8f5;padding:6px 7px;text-align:left;font-size:10px;text-transform:uppercase}'+
      'td{padding:4px 7px;border-bottom:1px solid #e5e7eb;vertical-align:middle}'+
      'tr:nth-child(even) td{background:#f9fafb}'+
      '.tot{text-align:right;margin-top:10px;font-size:14px;font-weight:700;color:#1e3a5f}'+
      '.foot{margin-top:1.5rem;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:6px}'+
      '@media print{@page{margin:1.2cm}}</style></head><body>'+
      '<div class="hdr"><h1>'+s.name+'</h1><span style="font-size:10px;color:#6b7280">Hoja de Calculo de Materiales</span></div>'+
      '<div class="meta">'+
        '<span>Plano: <b>'+(s.plano||'-')+'</b></span>'+
        '<span>Cantidad: <b>'+(s.cantidad||'-')+'</b></span>'+
        '<span>Elaborado por: <b>'+(s.autor||'-')+'</b></span>'+
        '<span>Fecha: <b>'+(s.fecha||'-')+'</b></span>'+
        '<span>Fecha Montaje: <b>'+(s.fmontaje||'-')+'</b></span>'+
        '<span>Fecha Soldadura: <b>'+(s.fsoldadura||'-')+'</b></span>'+
      '</div>'+
      '<div class="tipo">Tipo: '+tipo+'</div>'+
      '<table><thead><tr>'+
        '<th>#</th><th>Plano</th><th>Foto</th><th>Material</th>'+
        '<th>Largo mm</th><th>Ancho mm</th><th>Alto mm</th><th>Cant.</th>'+
        extraTh+
        '<th>Peso kg</th>'+
      '</tr></thead><tbody>'+tbody+'</tbody></table>'+
      '<div class="tot">Peso total: '+total.toFixed(3)+' kg</div>'+
      '<div class="foot">Generado: '+new Date().toLocaleString('es-ES')+' | Factor polin x1.10 cuando P activo</div>'+
      '</body></html>';

    var win = window.open('','_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(function(){ win.print(); }, 600);
  };

  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
