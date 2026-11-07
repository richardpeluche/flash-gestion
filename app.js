(function(){
'use strict';
/* ═════════ Utilidades ═════════ */
var $=function(id){ return document.getElementById(id); };
var K={ventas:'flash_ventas',prov:'flash_proveedores',prod:'flash_productos',cfg:'flash_cfg',draft:'flash_borrador'};
function load(k,def){ try{ var r=localStorage.getItem(k); return r?JSON.parse(r):def; }catch(e){ return def; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); if(window.FlashNube) FlashNube.cambio(k); return true; }catch(e){ toast('No se pudo guardar en este dispositivo'); return false; } }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function num(v){
  if(typeof v==='number') return isFinite(v)?v:0;
  var s=String(v==null?'':v).replace(/[^\d.,-]/g,'');
  if(s.indexOf(',')>-1 && s.indexOf('.')>-1) s=s.replace(/\./g,'').replace(',','.');
  else if(s.indexOf(',')>-1) s=s.replace(',','.');
  var n=parseFloat(s); return isNaN(n)?0:n;
}
var NF=new Intl.NumberFormat('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
function money(n){ n=Number(n)||0; return (n<0?'-$':'$')+NF.format(Math.abs(n)); }
function dec(n){ if(n===''||n==null) return ''; n=Number(n); if(!isFinite(n)) return ''; return String(Math.round(n*1000)/1000).replace('.',','); }
function decP(n){ if(n===''||n==null) return ''; n=Number(n); if(!isFinite(n)) return ''; var r=Math.round(n*1000)/1000; return (Math.round(r*100)===r*100?r.toFixed(2):String(r)).replace('.',','); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
/* data: de imagen comprobada antes de usarla como src */
function imgSegura(d){ return /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+\/=]+$/i.test(String(d||'')); }
function verImagen(src,titulo){ if(!imgSegura(src)) return; var w=window.open(); if(!w) return; var doc=w.document, im=doc.createElement('img');
  doc.title=titulo||'Referencia'; doc.body.style.cssText='margin:0;background:#111;display:grid;place-items:center;min-height:100vh';
  im.style.cssText='max-width:100%;max-height:100vh'; im.src=src; doc.body.appendChild(im); }
function hoyISO(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function fechaTxt(iso){ var p=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return p?p[3]+'/'+p[2]+'/'+p[1]:''; }
function telWA(t){
  var d=String(t||'').replace(/\D/g,'');
  if(!d) return '';
  if(d.indexOf('00')===0) d=d.slice(2);
  if(d.length===10 && d[0]==='0') return '593'+d.slice(1);
  if(d.length===9 && d[0]==='9') return '593'+d;
  return d;
}
function etq(n,modo){ return (modo==='compra'?'COMPRA ':'VENTAS ')+String(n).replace(/[^0-9A-Za-z-]/g,'').padStart(3,'0'); }
function etqDe(v){ return etq(v?v.num:0, v&&v.modo); }
function esCompra(v){ return !!v && v.modo==='compra'; }
var ESTADOS={borrador:'Sin enviar',cotizada:'Cotizado al cliente',enviada:'Enviada',produccion:'En producción',entregada:'Entregada',cobrada:'Comisión cobrada'};
var EST_COM={borrador:'Sin enviar',enviada:'Recibido',produccion:'En preparación',entregada:'Entregado',cobrada:'Pagado'};
function estTxt(e,modo){ return (modo==='compra'?EST_COM:ESTADOS)[e]||ESTADOS[e]||e; }
function estOpts(modo,sel){ return Object.keys(modo==='compra'?EST_COM:ESTADOS).map(function(k){ return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+estTxt(k,modo)+'</option>'; }).join(''); }
function esReal(e){ return e==='enviada'||e==='produccion'||e==='entregada'||e==='cobrada'; }

function toast(msg, accion, fn){
  var w=$('toasts'); w.innerHTML='';
  var t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status');
  t.appendChild(document.createTextNode(msg));
  if(accion){ var b=document.createElement('button'); b.textContent=accion; b.onclick=function(){ w.innerHTML=''; fn(); }; t.appendChild(b); }
  w.appendChild(t);
  clearTimeout(toast._t); toast._t=setTimeout(function(){ if(t.parentNode) t.remove(); }, accion?6000:3200);
}

/* ═════════ Datos ═════════ */
function ventas(){ return load(K.ventas,[]); }
function saveVentas(a){ return save(K.ventas,a); }
function provs(){ return load(K.prov,[]); }
function saveProvs(a){ return save(K.prov,a); }
function prods(){ return load(K.prod,[]); }
function saveProds(a){ return save(K.prod,a); }
function cfg(){ return load(K.cfg,{nombre:'',ultimoNum:0,ultimoProv:'',ultimoRespaldo:''}); }
function setCfg(o){ var c=cfg(); for(var k in o) c[k]=o[k]; save(K.cfg,c); return c; }
function provPorId(id){ return provs().filter(function(p){ return p.id===id; })[0]||null; }

function calc(items){
  var r={fab:0,pub:0,gan:0,uds:0};
  (items||[]).forEach(function(it){
    var q=num(it.qty), f=num(it.fab), p=num(it.pub);
    r.fab+=q*f; r.pub+=q*p; if(f>0) r.gan+=q*(p-f); else if(p>0) r.sinFab=true; r.uds+=q;
  });
  return r;
}
function siguienteNum(modo){
  var com=modo==='compra', m=num(cfg()[com?'ultimoNumCompra':'ultimoNum']);
  ventas().forEach(function(v){ if(esCompra(v)===com && num(v.num)>m) m=num(v.num); });
  return m+1;
}

/* ═════════ Pedido en curso ═════════ */
var cur=null;
var CLI_CAMPOS=['nombre','tel','dir','empresa','ruc','mail','atendido','mapa','lat','lng'];
function cliVacio(){ var o={}; CLI_CAMPOS.forEach(function(k){ o[k]=''; }); o.atendido=emp().rep||''; return o; }
function cliDe(c){ var o={}; c=c||{}; CLI_CAMPOS.forEach(function(k){ o[k]=String(c[k]||'').trim(); }); return o; }
var CLI_IDS={nombre:'fCli',tel:'fCliTel',dir:'fCliDir',empresa:'fCliEmp',ruc:'fCliRuc',mail:'fCliMail',atendido:'fCliAt',mapa:'fCliMapa'};
function totales(v){ var sub=calc(v.items).pub, t=num(v.iva), iv=Math.round(sub*t)/100, tot=sub+iv, ab=num(v.abono); return {sub:sub,tasa:t,iva:iv,total:tot,abono:ab,saldo:tot-ab}; }
function pedidoVacio(modo){
  return {id:null,imgs:[],abono:0,iva:num(cfg().ivaDef),modo:modo||'proveedor',num:siguienteNum(modo),fecha:hoyISO(),provId:cfg().ultimoProv||'',
          cli:cliVacio(),items:[],notas:'',estado:'borrador',sucio:false};
}
function persistirBorrador(){ save(K.draft,cur); }
function marcarSucio(){ cur.sucio=true; persistirBorrador(); }

function provEnApp(id){ return !!(window.FlashNube && FlashNube.conectado(id)); }
function pintarProvSelect(){
  var s=$('fProv'), ps=provs();
  var h='<option value="">'+(ps.length?'Elige un proveedor':'Primero agrega un proveedor')+'</option>';
  ps.forEach(function(p){ h+='<option value="'+esc(p.id)+'">'+esc(p.nombre)+(provEnApp(p.id)?' · En la app':'')+'</option>'; });
  h+='<option value="__nuevo">+ Agregar proveedor…</option>';
  s.innerHTML=h;
  s.value=(cur && provPorId(cur.provId))?cur.provId:'';
  pintarProvHint();
}
function pintarProvHint(){
  var p=provPorId(cur.provId), h=$('provHint');
  h.className='hint';
  if(!p){ h.textContent=provs().length?'':'Agrega tus proveedores una vez con su WhatsApp y quedan guardados.'; return; }
  if(!telWA(p.tel)){ h.className='hint warn'; h.textContent='Este proveedor no tiene WhatsApp registrado.'; return; }
  h.innerHTML=esc('WhatsApp: +'+telWA(p.tel)+(p.nota?' · '+p.nota:''))+(provEnApp(p.id)?'<span class="tag-app">En la app</span>':'');
}

function pintarModo(){
  var cli=cur.modo==='cliente', com=cur.modo==='compra';
  var ar=$('addRow'); if(com){ if(ar.nextElementSibling!==$('items')) $('items').before(ar); } else if(ar.previousElementSibling!==$('addSlotTop')) $('addSlotTop').after(ar);
  document.body.classList.toggle('modo-cli',cli); document.body.classList.toggle('modo-com',com);
  $('lblFab').textContent=com?'Total a pagar':'Total a precio de fábrica';
  $('dGainLbl').textContent=com?'Total a pagar':'Ganancia';
  var box=$('provBox'), slot=cli?$('provSlotCli'):$('provSlotTop'); if(box.parentNode!==slot) slot.appendChild(box);
  var im=$('imgSec'); if(cli){ if(im.parentNode!==$('imgSlotCli')) $('imgSlotCli').appendChild(im); } else if(im.nextElementSibling!==document.querySelector('main .totals')) document.querySelector('main .totals').before(im);
  $('lblPub').textContent=cli?'Subtotal':'Total al público';
  $('hNumCli').textContent=etqDe(cur);
  $('btnEnviar').innerHTML=com?'<svg class="ic"><use href="#i-wa"/></svg><span>Enviar <span class="solo-ancho">pedido</span></span>':cli?'<svg class="ic"><use href="#i-pdf"/></svg><span>Enviar <span class="solo-ancho">cotización</span></span>':'<svg class="ic"><use href="#i-wa"/></svg><span>Enviar <span class="solo-ancho">al proveedor</span></span>';
  $('lblProv').textContent=cli?'Proveedor (opcional, para calcular tu ganancia)':'Proveedor';
  $('lblNotas').textContent=cli?'Notas internas (no salen en la cotización)':'Notas para el proveedor';
  $('btnAceptado').hidden=!(cli && cur.id && (cur.estado==='cotizada'||cur.estado==='borrador'));
}
function pintarCabecera(){
  $('hTitulo').textContent=cur.modo==='cliente'?'Cotización':cur.modo==='compra'?'Compra':'Pedido';
  pintarModo();
  $('hNum').textContent=etqDe(cur);
  var e=$('hEstado'); e.className='chip st-'+cur.estado; e.textContent=estTxt(cur.estado,cur.modo);
  $('fEstado').innerHTML=estOpts(cur.modo,cur.estado); $('fEstado').value=cur.estado;
}
function pintarCliResumen(){ }
function _pintarCliResumenViejo(){
  return;
}
function pintarForm(){
  pintarCabecera(); pintarProvSelect();
  $('fFecha').value=cur.fecha; $('fFechaCli').value=cur.fecha; $('fAbono').value=num(cur.abono)>0?decP(cur.abono):'';
  cur.cli=Object.assign(cliVacio(),{atendido:''},cur.cli||{}); for(var k in CLI_IDS) $(CLI_IDS[k]).value=cur.cli[k]||'';
  $('fNotas').value=cur.notas;
  pintarCliResumen(); pintarItems(); pintarImgs(); pintarUbicOk('cliUbicOk',cur.cli); pintarViajes();
}

function itemHTML(it,i){
  if(cur.modo==='compra') return '<div class="item item-cli" data-i="'+i+'">'+
    '<div class="item-top"><input class="item-desc" data-k="desc" value="'+esc(it.desc)+'" placeholder="Descripción del producto" aria-label="Descripción">'+
    '<button class="del" data-del="'+i+'" aria-label="Quitar producto"><svg class="ic"><use href="#i-trash"/></svg></button></div>'+
    '<div class="item-nums">'+
      '<label class="mini"><span>Cant.</span><input data-k="qty" inputmode="numeric" value="'+esc(dec(it.qty))+'" placeholder="0"></label>'+
      '<label class="mini"><span>Precio c/u</span><input data-k="fab" inputmode="decimal" value="'+esc(decP(it.fab))+'" placeholder="0,00"></label>'+
      '<div class="mini"><span>Total</span><output data-t></output></div>'+
    '</div><span data-g hidden></span></div>';
  if(cur.modo==='cliente') return '<div class="item item-cli" data-i="'+i+'">'+
    '<div class="item-top"><input class="item-desc" data-k="desc" value="'+esc(it.desc)+'" placeholder="Descripción del producto o servicio" aria-label="Descripción">'+
    '<button class="del" data-del="'+i+'" aria-label="Quitar producto"><svg class="ic"><use href="#i-trash"/></svg></button></div>'+
    '<div class="item-nums">'+
      '<label class="mini"><span>Cant.</span><input data-k="qty" inputmode="numeric" value="'+esc(dec(it.qty))+'" placeholder="0"></label>'+
      '<label class="mini pub"><span>V. unit.</span><input data-k="pub" inputmode="decimal" value="'+esc(decP(it.pub))+'" placeholder="0,00"></label>'+
      '<div class="mini"><span>V. total</span><output data-t></output></div>'+
    '</div>'+
    '<div class="item-fab"><label>Fábrica c/u <input data-k="fab" inputmode="decimal" value="'+esc(decP(it.fab))+'" placeholder="0,00" aria-label="Precio de fábrica"></label><span data-g></span></div></div>';
  return '<div class="item" data-i="'+i+'">'+
    '<div class="item-top"><input class="item-desc" data-k="desc" value="'+esc(it.desc)+'" placeholder="Descripción del producto" aria-label="Descripción">'+
    '<button class="del" data-del="'+i+'" aria-label="Quitar producto"><svg class="ic"><use href="#i-trash"/></svg></button></div>'+
    (it.prodId?'<span class="tag-cat"><svg class="ic" style="width:14px;height:14px"><use href="#i-box"/></svg>Del catálogo</span>':'')+
    '<div class="item-nums">'+
      '<label class="mini"><span>Cantidad</span><input data-k="qty" inputmode="numeric" value="'+esc(dec(it.qty))+'" placeholder="0"></label>'+
      '<label class="mini"><span>Fábrica c/u</span><input data-k="fab" inputmode="decimal" value="'+esc(decP(it.fab))+'" placeholder="0,00"></label>'+
      '<label class="mini pub"><span>Tu precio c/u</span><input data-k="pub" inputmode="decimal" value="'+esc(decP(it.pub))+'" placeholder="0,00"></label>'+
    '</div>'+
    '<div class="item-gain" data-g></div></div>';
}
function pintarGananciaItem(i){
  var el=document.querySelector('.item[data-i="'+i+'"] [data-g]'); if(!el) return;
  var it=cur.items[i], q=num(it.qty), u=num(it.pub)-num(it.fab), g=q*u;
  if(cur.modo==='compra'){ var tc=el.closest('.item').querySelector('[data-t]'); if(tc) tc.textContent=money(q*num(it.fab)); return; }
  if(cur.modo==='cliente'){
    var tt=el.closest('.item').querySelector('[data-t]'); if(tt) tt.textContent=money(q*num(it.pub));
    if(!(num(it.fab)>0)){ el.className='falta'; el.textContent='Sin fábrica: no suma ganancia'; }
    else{ el.className=''; el.style.color=g<0?'var(--loss)':''; el.textContent=(g<0?'Pierdes ':'Ganas ')+money(Math.abs(g)); }
    return;
  }
  if(!(num(it.fab)>0)){ el.classList.remove('neg'); el.style.background='var(--warn-soft)'; el.style.color='oklch(0.42 0.1 70)';
    el.innerHTML='<span>Falta el precio de fábrica</span><b>—</b>'; return; }
  el.style.background=''; el.style.color='';
  el.classList.toggle('neg',g<0);
  el.innerHTML='<span class="unit">'+money(u)+' × '+NF.format(q).replace(/,00$/,'')+' u.</span><b class="money">'+(g<0?'Pierdes ':'Ganas ')+money(Math.abs(g))+'</b>';
}
function pintarItems(){
  var box=$('items');
  if(!cur.items.length){
    box.innerHTML='<div class="empty"><b>Aún no hay productos</b>Agrega un ítem manual, uno del catálogo o dicta el pedido.</div>';
  }else{
    box.innerHTML=cur.items.map(itemHTML).join('');
    cur.items.forEach(function(_,i){ pintarGananciaItem(i); });
  }
  pintarTotales();
}
var ultimaGan=null;
function pintarTotales(){
  var r=calc(cur.items);
  $('tFab').textContent=money(r.fab); $('tPub').textContent=money(r.pub);
  var ti=totales(cur); $('fIva').value=String(ti.tasa); $('tIva').textContent=money(ti.iva); $('tCli').textContent=money(ti.total); $('tSaldo').textContent=money(ti.saldo);
  $('tGain').textContent=money(r.gan);
  $('tGainRow').classList.toggle('neg',r.gan<0);
  $('tMargen').textContent=r.sinFab?'Falta precio de fábrica en algún producto':(r.fab>0?('Margen '+NF.format(r.gan/r.fab*100).replace(/,00$/,'')+'% sobre fábrica'):'—');
  var com=cur.modo==='compra', dv=com?r.fab:r.gan;
  var d=$('dGain'); d.textContent=money(dv); d.classList.toggle('neg',!com && r.gan<0);
  if(ultimaGan!==null && Math.abs(ultimaGan-dv)>0.004){ d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump'); }
  ultimaGan=dv;
  var n=cur.items.length;
  $('itemsCount').textContent=n?(n+(n===1?' producto':' productos')+' · '+NF.format(r.uds).replace(/,00$/,'')+' u.'):'';
}
function agregarItem(it, enfocar){
  cur.items.push({desc:it.desc||'',qty:it.qty==null?1:it.qty,fab:it.fab==null?'':it.fab,pub:it.pub==null?'':it.pub,prodId:it.prodId||''});
  marcarSucio(); pintarItems();
  if(enfocar){
    var last=document.querySelector('.item[data-i="'+(cur.items.length-1)+'"]');
    if(last){ var f=last.querySelector(it.desc?'[data-k="qty"]':'[data-k="desc"]'); if(f){ f.focus(); if(f.select) f.select(); } last.scrollIntoView({block:'center',behavior:'smooth'}); }
  }
}

/* Eventos del formulario */
$('items').addEventListener('input',function(e){
  var k=e.target.getAttribute('data-k'); if(!k) return;
  var i=+e.target.closest('.item').getAttribute('data-i');
  cur.items[i][k]= k==='desc'?e.target.value:e.target.value;
  if(k!=='desc'){ pintarGananciaItem(i); pintarTotales(); }
  marcarSucio();
});
$('items').addEventListener('change',function(e){
  var k=e.target.getAttribute('data-k'); if(!k||k==='desc') return;
  var i=+e.target.closest('.item').getAttribute('data-i');
  cur.items[i][k]=num(e.target.value); e.target.value=k==='qty'?dec(cur.items[i][k]):decP(cur.items[i][k]); persistirBorrador();
});
$('items').addEventListener('focusin',function(e){ if(e.target.matches('.mini input')) setTimeout(function(){ try{e.target.select();}catch(x){} },0); });
$('items').addEventListener('click',function(e){
  var b=e.target.closest('[data-del]'); if(!b) return;
  var i=+b.getAttribute('data-del'), quitado=cur.items.splice(i,1)[0];
  marcarSucio(); pintarItems();
  toast('Producto quitado','Deshacer',function(){ cur.items.splice(i,0,quitado); marcarSucio(); pintarItems(); });
});
$('fProv').addEventListener('change',function(){
  if(this.value==='__nuevo'){ this.value=provPorId(cur.provId)?cur.provId:''; abrirProvForm(null,true); return; }
  cur.provId=this.value; setCfg({ultimoProv:cur.provId}); marcarSucio(); pintarProvHint(); pintarViajes();
});
$('btnProvNuevo').onclick=function(){ abrirProvForm(null,true); };
['fFecha','fFechaCli'].forEach(function(id){ $(id).addEventListener('change',function(){ cur.fecha=this.value||hoyISO(); $('fFecha').value=$('fFechaCli').value=cur.fecha; marcarSucio(); }); });
$('fAbono').addEventListener('input',function(){ cur.abono=this.value===''?0:num(this.value); marcarSucio(); pintarTotales(); });
$('fAbono').addEventListener('change',function(){ this.value=num(cur.abono)>0?decP(cur.abono):''; });
$('fEstado').addEventListener('change',function(){ cur.estado=this.value; marcarSucio(); pintarCabecera(); if(cur.id) guardar(true); });
Object.keys(CLI_IDS).forEach(function(k){
  $(CLI_IDS[k]).addEventListener('input',function(){ cur.cli[k]=this.value; marcarSucio(); pintarCliResumen(); if(k==='dir'||k==='nombre'||k==='empresa') pintarViajes(); });
});
$('fIva').addEventListener('change',function(){ cur.iva=num(this.value); marcarSucio(); pintarTotales(); });
$('fNotas').addEventListener('input',function(){ cur.notas=this.value; marcarSucio(); });
$('btnAddManual').onclick=function(){ agregarItem({desc:'',qty:1},true); };
$('btnAddCat').onclick=function(){ abrirCatalogo('elegir'); };
$('btnVoz').onclick=function(){ abrirVoz(); };

/* ═════════ Imágenes de referencia (IndexedDB) ═════════ */
var IDBP=null, imgCache={};
function idb(){ if(IDBP) return IDBP; IDBP=new Promise(function(res,rej){ var r=indexedDB.open('flash-img',1);
  r.onupgradeneeded=function(){ r.result.createObjectStore('img',{keyPath:'id'}); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); return IDBP; }
function idbOp(modo,fn){ return idb().then(function(db){ return new Promise(function(res,rej){ var tx=db.transaction('img',modo), st=tx.objectStore('img'), rq=fn(st); var out;
  if(rq) rq.onsuccess=function(){ out=rq.result; }; tx.oncomplete=function(){ res(out); }; tx.onerror=function(){ rej(tx.error); }; }); }); }
function imgPut(id,data){ imgCache[id]=data; return idbOp('readwrite',function(st){ return st.put({id:id,data:data}); }); }
function imgGet(id){ if(imgCache[id]) return Promise.resolve(imgCache[id]); return idbOp('readonly',function(st){ return st.get(id); }).then(function(r){ if(r) imgCache[id]=r.data; return r?r.data:''; }).catch(function(){ return ''; }); }
function imgDel(id){ delete imgCache[id]; return idbOp('readwrite',function(st){ return st.delete(id); }).catch(function(){}); }
function imgTodas(){ return idbOp('readonly',function(st){ return st.getAll(); }).catch(function(){ return []; }); }
function imgsDe(ids){ return Promise.all((ids||[]).map(imgGet)).then(function(a){ return a.filter(Boolean); }); }
function dataUrlArchivo(d,nombre){ try{ var m=d.match(/^data:(image\/[a-z+]+);base64,(.*)$/); if(!m) return null; var bin=atob(m[2]), u=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new File([u],nombre+(m[1]==='image/png'?'.png':'.jpg'),{type:m[1]}); }catch(e){ return null; } }
function aJpg(src,max){ return new Promise(function(res){ var im=new Image(); im.onload=function(){ var k=Math.min(1,max/Math.max(im.width,im.height)), c=document.createElement('canvas');
  c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); var g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',0.82)); };
  im.onerror=function(){ res(''); }; im.src=src; }); }
function enUso(id){ return ventas().some(function(v){ return (v.imgs||[]).indexOf(id)>-1; }); }
function pintarImgs(){
  var box=$('imgs'), ids=cur.imgs||[];
  $('imgCount').textContent=ids.length?ids.length+' imagen'+(ids.length===1?'':'es'):'';
  box.innerHTML=ids.map(function(id,i){ return '<div class="thumb" data-img="'+esc(id)+'"><img alt="Referencia '+(i+1)+'"><button data-quitar="'+esc(id)+'" aria-label="Quitar imagen"><svg class="ic"><use href="#i-x"/></svg></button></div>'; }).join('');
  ids.forEach(function(id){ imgGet(id).then(function(d){ var el=box.querySelector('[data-img="'+id+'"] img'); if(el && d) el.src=d; }); });
}
$('btnImg').onclick=function(){ $('imgFile').click(); };
$('imgFile').onchange=function(ev){
  var fs=Array.prototype.slice.call(ev.target.files||[]); ev.target.value=''; if(!fs.length) return;
  if(!cur.imgs) cur.imgs=[];
  Promise.all(fs.map(function(f){ return new Promise(function(res){ var rd=new FileReader(); rd.onload=function(){ aJpg(rd.result,1200).then(res); }; rd.onerror=function(){ res(''); }; rd.readAsDataURL(f); }); }))
    .then(function(datos){ return Promise.all(datos.filter(Boolean).map(function(d){ var id='im_'+uid(); return imgPut(id,d).then(function(){ cur.imgs.push(id); }); })); })
    .then(function(){ marcarSucio(); pintarImgs(); toast('Imagen agregada'); })
    .catch(function(){ toast('No se pudo guardar la imagen'); });
};
$('imgs').addEventListener('click',function(e){
  var b=e.target.closest('[data-quitar]');
  if(b){ var id=b.getAttribute('data-quitar'); cur.imgs=(cur.imgs||[]).filter(function(x){ return x!==id; }); marcarSucio(); pintarImgs(); if(!enUso(id)) imgDel(id); return; }
  var t=e.target.closest('[data-img]'); if(t){ imgGet(t.getAttribute('data-img')).then(function(d){ verImagen(d); }); }
});

/* ═════════ Ubicación, cuenta y viajes ═════════ */
var pvCoords={lat:'',lng:''};
function coordsDe(t){
  t=String(t||'');
  var m=t.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)||t.match(/[?&](?:q|query|ll|destination|daddr)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i)||t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/)||t.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if(!m) return null; var la=parseFloat(m[1]), ln=parseFloat(m[2]); if(Math.abs(la)>90||Math.abs(ln)>180) return null;
  return {lat:String(la),lng:String(ln)};
}
function pintarUbicOk(id,c){ $(id).textContent=(c&&c.lat)?'Ubicación con coordenadas: Uber puede llevar el destino listo.':''; }
function pedirGps(fin){
  if(!navigator.geolocation){ toast('Este teléfono no permite leer la ubicación'); return; }
  toast('Buscando tu ubicación…');
  navigator.geolocation.getCurrentPosition(function(pos){
    var la=pos.coords.latitude.toFixed(6), ln=pos.coords.longitude.toFixed(6); fin({lat:la,lng:ln,link:'https://www.google.com/maps?q='+la+','+ln}); toast('Ubicación guardada');
  },function(err){ toast(err.code===1?'No diste permiso de ubicación':'No se pudo obtener la ubicación'); },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
$('cliGps').onclick=function(){ pedirGps(function(u){ cur.cli.mapa=u.link; cur.cli.lat=u.lat; cur.cli.lng=u.lng; $('fCliMapa').value=u.link; marcarSucio(); pintarUbicOk('cliUbicOk',cur.cli); pintarViajes(); }); };
$('fCliMapa').addEventListener('input',function(){ var c=coordsDe(this.value); cur.cli.lat=c?c.lat:''; cur.cli.lng=c?c.lng:''; pintarUbicOk('cliUbicOk',cur.cli); pintarViajes(); });
$('pvBuscarMaps').onclick=function(){
  var q=[$('pvNombre').value.trim(),'Quito'].filter(Boolean).join(' ');
  window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q),'_blank');
  var vuelta=function(){ if(document.visibilityState!=='visible') return; document.removeEventListener('visibilitychange',vuelta);
    if(!$('pvMapa').value.trim()){ $('pvMapa').focus(); toast('Pega aquí el enlace que copiaste de Maps'); } };
  setTimeout(function(){ document.addEventListener('visibilitychange',vuelta); },500);
};
$('pvGps').onclick=function(){ pedirGps(function(u){ pvCoords={lat:u.lat,lng:u.lng}; $('pvMapa').value=u.link; pintarUbicOk('pvUbicOk',pvCoords); }); };
$('pvMapa').addEventListener('input',function(){ var c=coordsDe(this.value); pvCoords=c||{lat:'',lng:''}; pintarUbicOk('pvUbicOk',pvCoords); });
function destino(tipo){
  if(tipo==='cli'){ var c=cur.cli||{}; return {nombre:c.empresa||c.nombre||'Cliente',dir:c.dir||'',link:c.mapa||'',lat:c.lat||'',lng:c.lng||''}; }
  var p=provPorId(cur.provId); if(!p) return null; var u=p.ubic||{};
  return {nombre:p.nombre,dir:p.nota||'',link:u.link||'',lat:u.lat||'',lng:u.lng||'',banco:p.banco};
}
function pintarViajes(){
  document.querySelectorAll('[data-viaje]').forEach(function(box){
    var d=destino(box.getAttribute('data-viaje')); if(!d){ box.innerHTML=''; return; }
    var hayLugar=d.link||d.lat||d.dir, b='';
    if(hayLugar){
      b+='<button class="btn btn-ghost" data-ir="maps"><svg class="ic"><use href="#i-pin"/></svg>Cómo llegar</button>';
      b+='<button class="btn btn-ghost" data-ir="uber"><svg class="ic"><use href="#i-car"/></svg>Uber</button>';
      b+='<button class="btn btn-ghost" data-ir="indrive"><svg class="ic"><use href="#i-car"/></svg>InDrive</button>';
    }
    if(d.banco && d.banco.numero) b+='<button class="btn btn-ghost" data-ir="cuenta" style="flex-basis:100%"><svg class="ic"><use href="#i-bank"/></svg>Copiar cuenta: '+esc(d.banco.banco||'Banco')+' '+esc(d.banco.numero)+'</button>';
    box.innerHTML=b;
  });
}
function copiar(txt,msg){ var ok=function(){ toast(msg||'Copiado'); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok,function(){ copiarViejo(txt); ok(); }); else { copiarViejo(txt); ok(); } }
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-ir]'); if(!b) return;
  var d=destino(b.closest('[data-viaje]').getAttribute('data-viaje')); if(!d) return;
  var tipo=b.getAttribute('data-ir'), texto=[d.nombre,d.dir].filter(Boolean).join(', ');
  if(tipo==='maps'){
    var u=d.lat?('https://www.google.com/maps/dir/?api=1&destination='+d.lat+','+d.lng):(d.link||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(texto)));
    window.open(u,'_blank');
  }else if(tipo==='uber'){
    if(!d.lat){ copiar(d.dir||texto,'Sin coordenadas: dirección copiada, pégala en Uber'); window.open('https://m.uber.com/ul/?action=setPickup&pickup=my_location','_blank'); return; }
    window.open('https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]='+d.lat+'&dropoff[longitude]='+d.lng+'&dropoff[nickname]='+encodeURIComponent(d.nombre)+(d.dir?'&dropoff[formatted_address]='+encodeURIComponent(d.dir):''),'_blank');
  }else if(tipo==='indrive'){
    copiar(d.dir||texto,'Dirección copiada: pégala como destino en InDrive');
    var pkg='sinet.startup.inDriver', fb=encodeURIComponent('https://play.google.com/store/apps/details?id='+pkg);
    setTimeout(function(){ location.href='intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package='+pkg+';S.browser_fallback_url='+fb+';end'; },350);
  }else if(tipo==='cuenta'){
    var k=d.banco; copiar([k.banco,k.tipo?('Cuenta de '+k.tipo.toLowerCase()):'','N° '+k.numero,k.titular,k.ced?('CI/RUC '+k.ced):''].filter(Boolean).join('\n'),'Datos de la cuenta copiados');
  }
});

/* ═════════ Guardar / nuevo ═════════ */
function validar(paraEnviar, sinProveedor){
  var exigeProv=!sinProveedor && (paraEnviar || esReal(cur.estado));
  if(exigeProv && !provPorId(cur.provId)){ toast('Elige el proveedor'); $('fProv').focus(); return false; }
  var validos=cur.items.filter(function(it){ return String(it.desc).trim() && num(it.qty)>0; });
  if(!validos.length){ toast('Agrega al menos un producto con descripción y cantidad'); return false; }
  if(paraEnviar){
    var sinFab=cur.items.some(function(it){ return String(it.desc).trim() && !(num(it.fab)>0); });
    if(sinFab){ toast(cur.modo==='compra'?'Falta el precio en algún producto':'Falta el precio de fábrica en algún producto'); return false; }
  }
  return true;
}
function limpiarItems(){
  cur.items=cur.items.filter(function(it){ return String(it.desc).trim() || num(it.qty)>0 || num(it.fab)>0 || num(it.pub)>0; })
    .map(function(it){ return {desc:String(it.desc).trim(),qty:num(it.qty),fab:num(it.fab)>0?num(it.fab):'',pub:num(it.pub),prodId:it.prodId||''}; });
}
function guardar(silencioso, sinProveedor){
  if(!validar(false, sinProveedor)) return false;
  limpiarItems();
  var p=provPorId(cur.provId)||{nombre:'',tel:''}, a=ventas(), ahora=new Date().toISOString();
  var reg={id:cur.id||uid(),num:cur.num,fecha:cur.fecha,provId:cur.provId,provNombre:p.nombre,provTel:p.tel||'',
    cli:cliDe(cur.cli),
    items:cur.items,imgs:(cur.imgs||[]).slice(),iva:num(cur.iva),abono:num(cur.abono),notas:cur.notas.trim(),estado:cur.estado,modo:cur.modo||'proveedor',actualizado:ahora};
  var i=-1; a.forEach(function(v,k){ if(v.id===reg.id) i=k; });
  if(i>-1){ reg.creado=a[i].creado; reg.enviadoAt=a[i].enviadoAt||''; reg.cobradoAt=a[i].cobradoAt||''; reg.cotizadoAt=a[i].cotizadoAt||''; if(a[i].pagoReportado && reg.estado!=='cobrada') reg.pagoReportado=a[i].pagoReportado; a[i]=reg; }
  else{
    if(a.some(function(v){ return esCompra(v)===esCompra(reg) && num(v.num)===num(reg.num); })) reg.num=cur.num=siguienteNum(reg.modo);
    reg.creado=ahora; a.push(reg);
  }
  if(reg.estado==='cobrada' && !reg.cobradoAt) reg.cobradoAt=ahora;
  if(reg.estado!=='cobrada') reg.cobradoAt='';
  if(esReal(reg.estado) && !reg.enviadoAt) reg.enviadoAt=ahora;
  if(!saveVentas(a)) return false;
  if(window.FlashNube && esReal(reg.estado)) FlashNube.publicar(reg);
  var kn=esCompra(reg)?'ultimoNumCompra':'ultimoNum', oc={}; oc[kn]=Math.max(num(cfg()[kn]),num(reg.num)); setCfg(oc); GastoRic.sync(reg); if(reg.provId) setCfg({ultimoProv:reg.provId}); pintarMeta();
  cur.id=reg.id; cur.sucio=false; persistirBorrador(); pintarCabecera(); pintarItems();
  if(!silencioso) toast(etqDe(reg)+' guardado');
  return reg;
}
function empezar(modo){
  if(cur.sucio && cur.items.length && !cur.id && !confirm(etqDe(cur)+' tiene productos sin guardar. ¿Descartarlo y empezar otro?')) return;
  if(cur.sucio && cur.items.length && cur.id && !confirm('Hay cambios sin guardar en '+etqDe(cur)+'. ¿Descartarlos?')) return;
  cur=pedidoVacio(modo); persistirBorrador(); ultimaGan=null; pintarForm(); mostrarForm(); window.scrollTo({top:0});
}
function mostrarForm(){ document.body.classList.remove('en-inicio'); }
function irInicio(){
  persistirBorrador(); pintarMeta();
  var g=cur.id?ventas().filter(function(v){ return v.id===cur.id; })[0]:null;
  if(cur.id && !g){ cur=pedidoVacio(cur.modo); persistirBorrador(); }
  else if(g && !cur.sucio && g.estado!==cur.estado){ cur.estado=g.estado; persistirBorrador(); }
  var s=$('goSeguir'), hay=cur.items.length>0, tipo=cur.modo==='cliente'?'cotización':cur.modo==='compra'?'compra':'pedido';
  s.hidden=!hay; s.classList.toggle('cont-ok',!!(g && !cur.sucio));
  if(hay) s.innerHTML='<span>'+(!cur.id?'Continuar '+tipo+' '+etqDe(cur)+' · '+cur.items.length+' producto'+(cur.items.length===1?'':'s')+' <small>· sin guardar</small>':
    cur.sucio?'Cambios sin guardar en '+etqDe(cur):'Ver '+etqDe(cur)+' <small>· '+estTxt(cur.estado,cur.modo)+' · ya guardado</small>')+'</span><svg class="ic"><use href="#i-down"/></svg>';
  document.body.classList.add('en-inicio'); window.scrollTo({top:0});
}
$('goProv').onclick=function(){ empezar('proveedor'); };
$('goCli').onclick=function(){ empezar('cliente'); };
$('goCom').onclick=function(){ empezar('compra'); };
$('goSeguir').onclick=function(){ mostrarForm(); };
$('btnHome').onclick=irInicio;
$('brandHome').onclick=irInicio;
$('homeHist').onclick=function(){ $('btnHist').click(); };
$('homeRep').onclick=function(){ $('btnRep').click(); };
$('btnAceptado').onclick=function(){
  cur.modo='proveedor'; marcarSucio(); pintarCabecera(); pintarItems(); window.scrollTo({top:0,behavior:'smooth'});
  toast(provPorId(cur.provId)?'Revisa el precio de fábrica y toca Enviar al proveedor':'Elige el proveedor y completa el precio de fábrica');
};
$('btnGuardar').onclick=function(){ guardar(false); };
$('btnNueva').onclick=irInicio;

/* ═════════ Enviar por WhatsApp ═════════ */
function q(n){ return NF.format(n).replace(/,00$/,''); }
function lineaApp(v){ return (window.FlashNube && FlashNube.conectado(v.provId))?'📲 También te llegó a tu app Flash: revísalo en *Pedidos recibidos* y marca ahí el avance.':''; }
function mensajeCompra(v){
  var r=calc(v.items), L=[], nombre=(cfg().nombre||'').trim(), app=lineaApp(v);
  L.push('*PEDIDO DE COMPRA '+etqDe(v)+'*  ·  '+fechaTxt(v.fecha));
  L.push('Proveedor: '+v.provNombre);
  L.push('');
  v.items.forEach(function(it){ var qty=num(it.qty), f=num(it.fab);
    L.push('• '+q(qty)+' × '+it.desc); L.push('   '+money(f)+' c/u · Total '+money(qty*f)); });
  L.push('');
  L.push('*Total a pagar:* '+money(r.fab));
  if(v.notas){ L.push(''); L.push('*Notas:* '+v.notas); }
  if(app){ L.push(''); L.push(app); }
  if(nombre){ L.push(''); L.push('— '+nombre); }
  return L.join('\n');
}
function mensaje(v, conGanancia){
  if(esCompra(v)) return mensajeCompra(v);
  var r=calc(v.items), L=[], nombre=(cfg().nombre||'').trim(), app=lineaApp(v);
  L.push('*PEDIDO '+etqDe(v)+'*  ·  '+fechaTxt(v.fecha));
  L.push('Proveedor: '+v.provNombre);
  L.push('');
  v.items.forEach(function(it){
    var qty=num(it.qty), f=num(it.fab), p=num(it.pub);
    L.push('• '+q(qty)+' × '+it.desc);
    if(conGanancia) L.push('   Fábrica '+money(f)+' · Venta '+money(p)+' · Ganancia '+money(qty*(p-f)));
    else L.push('   Fábrica '+money(f)+' c/u · Subtotal '+money(qty*f));
  });
  L.push('');
  L.push('*Total a precio de fábrica:* '+money(r.fab));
  if(conGanancia){
    L.push('*Total venta al cliente:* '+money(r.pub));
    L.push('*Mi comisión:* '+money(r.gan));
  }
  if(v.cli && (v.cli.nombre||v.cli.tel||v.cli.dir||v.cli.empresa)){
    L.push('');
    L.push('*Cliente / entrega*');
    if(v.cli.empresa) L.push(v.cli.empresa);
    if(v.cli.nombre) L.push(v.cli.nombre);
    if(v.cli.tel) L.push('Tel: '+v.cli.tel);
    if(v.cli.dir) L.push(v.cli.dir);
  }
  if(v.notas){ L.push(''); L.push('*Notas:* '+v.notas); }
  if(app){ L.push(''); L.push(app); }
  if(nombre){ L.push(''); L.push('— '+nombre); }
  return L.join('\n');
}
var envVenta=null;
function pintarEnvio(){
  var p=provPorId(envVenta.provId)||{nombre:envVenta.provNombre,tel:envVenta.provTel};
  var t=telWA(p.tel);
  $('envDestino').innerHTML=t?('Para <b>'+esc(p.nombre)+'</b> · +'+esc(t)):('<span class="hint warn">'+esc(p.nombre)+' no tiene WhatsApp registrado. Puedes copiar el texto o agregar su número en Ajustes.</span>');
  $('envGanLbl').hidden=esCompra(envVenta);
  $('envPrev').textContent=mensaje(envVenta,$('envGanancia').checked);
  $('envAbrir').disabled=!t;
  var con=window.FlashNube && FlashNube.conectado(envVenta.provId);
  $('envApp').hidden=!con; $('envAppNota').hidden=!con;
  if(con) $('envAppNota').textContent=p.nombre+' tiene Flash: el pedido le llega directo a su app. WhatsApp queda como opción.';
}
var envFiles=[];
function abrirEnvio(v){ envVenta=v; envFiles=[]; pintarEnvio(); $('envFotos').hidden=true; abrir('dlgEnviar');
  var ids=v.imgs||[]; if(!ids.length || !navigator.canShare) return;
  imgsDe(ids).then(function(datos){
    envFiles=datos.map(function(d,i){ return dataUrlArchivo(d,etqDe(v).replace(' ','_')+'_ref'+(i+1)); }).filter(Boolean);
    $('envFotos').hidden=!(envFiles.length && navigator.canShare({files:envFiles}));
    $('envFotos').innerHTML='<svg class="ic"><use href="#i-wa"/></svg>Compartir con '+envFiles.length+' imagen'+(envFiles.length===1?'':'es');
  });
}
$('envGanancia').onchange=pintarEnvio;
function marcarEnviada(){
  if(!envVenta || esReal(envVenta.estado)) return;
  var a=ventas(); a.forEach(function(v){ if(v.id===envVenta.id){ v.estado='enviada'; v.enviadoAt=new Date().toISOString(); } });
  saveVentas(a); envVenta.estado='enviada'; pintarMeta();
  var vv=ventas().filter(function(x){ return x.id===envVenta.id; })[0]; if(vv && window.FlashNube) FlashNube.publicar(vv);
  if(cur.id===envVenta.id){ cur.estado='enviada'; persistirBorrador(); pintarCabecera(); }
  if($('dlgHist').open) pintarHist();
}
$('envAbrir').onclick=function(){
  var p=provPorId(envVenta.provId)||{tel:envVenta.provTel};
  var url='https://wa.me/'+telWA(p.tel)+'?text='+encodeURIComponent(mensaje(envVenta,$('envGanancia').checked));
  window.open(url,'_blank');
  marcarEnviada(); cerrar('dlgEnviar'); toast(etqDe(envVenta)+' marcado como enviado');
};
$('envApp').onclick=function(){
  var v=envVenta; marcarEnviada();
  var reg=ventas().filter(function(x){ return x.id===v.id; })[0]||v;
  FlashNube.publicar(reg,true).then(function(ok){ toast(ok?etqDe(v)+' enviado por la app':'Sin conexión: se enviará al volver el internet'); });
  cerrar('dlgEnviar');
};
$('envFotos').onclick=function(){
  if(!envFiles.length) return;
  var txt=mensaje(envVenta,$('envGanancia').checked);
  try{ if(navigator.clipboard) navigator.clipboard.writeText(txt).catch(function(){}); }catch(e){}
  navigator.share({files:envFiles,text:txt}).then(function(){ marcarEnviada(); cerrar('dlgEnviar'); toast(etqDe(envVenta)+' marcado como enviado'); })
    .catch(function(err){ if(err && err.name!=='AbortError') toast('No se pudo compartir: '+err.message); });
};
$('envCopiar').onclick=function(){
  var txt=mensaje(envVenta,$('envGanancia').checked);
  var ok=function(){ toast('Texto copiado'); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok,function(){ copiarViejo(txt); ok(); });
  else{ copiarViejo(txt); ok(); }
};
function copiarViejo(t){ var x=document.createElement('textarea'); x.value=t; document.body.appendChild(x); x.select(); try{document.execCommand('copy');}catch(e){} x.remove(); }
$('btnEnviar').onclick=function(){
  if(cur.modo==='cliente'){ cotizarCliente(); return; }
  if(!validar(true)) return;
  var reg=guardar(true); if(!reg) return;
  abrirEnvio(reg);
};

/* ═════════ Datos de empresa ═════════ */
K.logo='flash_logo';
function emp(){ var c=cfg(); var e=c.emp||{}; return {nombre:e.nombre||'',rep:e.rep||c.nombre||'',tel:e.tel||'',web:e.web||'',color:e.color||'#0F8198',cond:e.cond||''}; }
function setEmp(o){ var e=cfg().emp||{}; for(var k in o) e[k]=o[k]; setCfg({emp:e}); }
function logo(){ try{ return localStorage.getItem(K.logo)||''; }catch(e){ return ''; } }
function setLogo(d){ try{ if(d) localStorage.setItem(K.logo,d); else localStorage.removeItem(K.logo); if(window.FlashNube) FlashNube.cambio(K.logo); return true; }catch(e){ toast('El logo es muy pesado para guardarlo'); return false; } }
function pintarEmp(){
  var e=emp(), l=logo();
  $('eIva').value=String(num(cfg().ivaDef)); $('eNombre').value=e.nombre; $('eRep').value=(cfg().emp||{}).rep||''; $('eTel').value=e.tel; $('eWeb').value=e.web; $('eColor').value=e.color; $('eCond').value=e.cond;
  var lp=$('eLogoPrev'); lp.textContent=''; if(imgSegura(l)){ var li=document.createElement('img'); li.alt='Logo'; li.src=l; lp.appendChild(li); } else lp.textContent='Sin logo';
  $('eLogoQuitar').hidden=!l;
}
[['eNombre','nombre'],['eRep','rep'],['eTel','tel'],['eWeb','web'],['eColor','color'],['eCond','cond']].forEach(function(x){
  $(x[0]).addEventListener('change',function(){ var o={}; o[x[1]]=this.value.trim(); setEmp(o); });
});
$('eIva').addEventListener('change',function(){ setCfg({ivaDef:num(this.value)}); toast('IVA por defecto: '+this.value+'%'); });
$('eLogoBtn').onclick=function(){ $('eLogoFile').click(); };
$('eLogoQuitar').onclick=function(){ setLogo(''); pintarEmp(); toast('Logo quitado'); };
$('eLogoFile').onchange=function(ev){
  var f=ev.target.files&&ev.target.files[0]; ev.target.value=''; if(!f) return;
  var rd=new FileReader(); rd.onload=function(){
    reducirImagen(rd.result,600).then(function(d){ if(setLogo(d)){ pintarEmp(); toast('Logo guardado'); } });
  }; rd.readAsDataURL(f);
};
function reducirImagen(src,max){
  return new Promise(function(res){
    var im=new Image(); im.onload=function(){
      var k=Math.min(1,max/Math.max(im.width,im.height)), c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.width*k)); c.height=Math.max(1,Math.round(im.height*k));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height); res(c.toDataURL('image/png'));
    }; im.onerror=function(){ res(''); }; im.src=src;
  });
}
$('eImportar').onclick=function(){
  var g=function(k){ try{ return (localStorage.getItem(k)||'').trim(); }catch(e){ return ''; } };
  var n=g('cfg_empresa'), r=g('cfg_representante'), l=g('cfg_logo'), w=g('cfg_link');
  if(!n && !r && !l && !w){ toast('No encontré datos de RICCHARY en este navegador'); return; }
  var o={}; if(n) o.nombre=n; if(r) o.rep=r; if(w) o.web=w; setEmp(o);
  var fin=function(){ pintarEmp(); toast('Datos de RICCHARY cargados'+(l?' con logo':'')); };
  if(l) reducirImagen(l,600).then(function(d){ if(d) setLogo(d); fin(); }); else fin();
};

/* ═════════ PDF de cotización ═════════ */
function cargarJsPDF(){
  if(window.jspdf) return Promise.resolve(window.jspdf);
  return new Promise(function(res,rej){ var s=document.createElement('script'); s.src='./jspdf.umd.min.js';
    s.onload=function(){ res(window.jspdf); }; s.onerror=function(){ rej(new Error('No se pudo cargar el generador de PDF')); }; document.head.appendChild(s); });
}
function imgInfo(src){ return new Promise(function(res){ if(!src) return res(null); var im=new Image(); im.onload=function(){ res({src:src,w:im.width,h:im.height}); }; im.onerror=function(){ res(null); }; im.src=src; }); }
function hexRgb(h){ h=String(h||'#0F8198').replace('#',''); if(h.length===3) h=h.split('').map(function(c){ return c+c; }).join(''); var n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function aclarar(c,k){ return c.map(function(v){ return Math.round(v+(255-v)*k); }); }
function nombreArchivo(v){ var cn=v.cli?(v.cli.empresa||v.cli.nombre):''; return 'Cotizacion_'+etqDe(v).replace(' ','_')+(cn?'_'+cn.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').slice(0,30):'')+'.pdf'; }
function generarPDF(v){
  var e=emp();
  return Promise.all([cargarJsPDF(),imgInfo(logo()),imgsDe(v.imgs).then(function(a){ return Promise.all(a.map(imgInfo)); })]).then(function(r){
    var refs=(r[2]||[]).filter(Boolean), jsPDF=r[0].jsPDF, li=r[1], doc=new jsPDF({unit:'mm',format:'a4'});
    var W=210, M=15, col=hexRgb(e.color), suave=aclarar(col,0.9), ink=[30,32,46], gris=[95,99,115];
    var y=14, x=M, tot=calc(v.items);
    doc.setFillColor.apply(doc,col); doc.rect(0,0,W,5,'F');
    if(li){ var h=24, w=Math.min(48,h*li.w/li.h); if(w===48) h=48*li.h/li.w; doc.addImage(li.src,'PNG',M,y,w,h); x=M+w+5; }
    doc.setTextColor.apply(doc,ink); doc.setFont('helvetica','bold'); doc.setFontSize(15);
    var nom=doc.splitTextToSize(e.nombre||'Mi empresa',95-(x-M)); doc.text(nom,x,y+6);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor.apply(doc,gris);
    var yy=y+6+nom.length*6; [e.rep,e.tel?'Tel: '+e.tel:'',e.web].filter(Boolean).forEach(function(t){ doc.text(String(t),x,yy); yy+=4.5; });
    doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor.apply(doc,col); doc.text('COTIZACIÓN',W-M,y+7,{align:'right'});
    doc.setFontSize(11); doc.setTextColor.apply(doc,ink); doc.text(etqDe(v),W-M,y+14,{align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor.apply(doc,gris); doc.text('Fecha: '+fechaTxt(v.fecha),W-M,y+19.5,{align:'right'});
    y=Math.max(y+(li?28:22),yy+2);
    // cliente
    var c=v.cli||{}, filas=[['Empresa',c.empresa],['Cliente',c.nombre],['Teléfono',c.tel],['CI / RUC',c.ruc],['Dirección',c.dir],['Email',c.mail],['Atendido por',c.atendido]].filter(function(f){ return f[1]; });
    if(filas.length){
      var nfil=Math.ceil(filas.length/2), hb=6+nfil*5.4, colW=(W-2*M)/2;
      doc.setFillColor.apply(doc,suave); doc.roundedRect(M,y,W-2*M,hb,2,2,'F');
      doc.setFontSize(9); 
      filas.forEach(function(f,i){ var cx0=M+4+(i%2)*colW, cy=y+6.3+Math.floor(i/2)*5.4;
        doc.setFont('helvetica','bold'); doc.setTextColor.apply(doc,col); doc.text(f[0]+':',cx0,cy);
        doc.setFont('helvetica','normal'); doc.setTextColor.apply(doc,ink);
        var val=doc.splitTextToSize(String(f[1]),colW-30)[0]; doc.text(val,cx0+24,cy); });
      y+=hb+6;
    }
    // tabla
    var cx={cant:M+3, desc:M+22, pu:W-M-34, tt:W-M-3}, anchoDesc=W-2*M-22-40;
    function cabecera(){ doc.setFillColor.apply(doc,col); doc.rect(M,y,W-2*M,8,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(255,255,255);
      doc.text('CANT.',cx.cant,y+5.4); doc.text('DESCRIPCIÓN',cx.desc,y+5.4); doc.text('P. UNIT.',cx.pu,y+5.4,{align:'right'}); doc.text('TOTAL',cx.tt,y+5.4,{align:'right'}); y+=8; }
    cabecera();
    doc.setFontSize(10);
    v.items.forEach(function(it,i){
      var qn=num(it.qty), pu=num(it.pub), ls=doc.splitTextToSize(String(it.desc),anchoDesc), rh=Math.max(1,ls.length)*4.6+3.4;
      if(y+rh>262){ doc.addPage(); doc.setFillColor.apply(doc,col); doc.rect(0,0,W,5,'F'); y=15; cabecera(); doc.setFontSize(10); }
      if(i%2){ doc.setFillColor(246,247,250); doc.rect(M,y,W-2*M,rh,'F'); }
      doc.setFont('helvetica','normal'); doc.setTextColor.apply(doc,ink);
      doc.text(q(qn),cx.cant,y+5); doc.text(ls,cx.desc,y+5); doc.text(money(pu),cx.pu,y+5,{align:'right'});
      doc.setFont('helvetica','bold'); doc.text(money(qn*pu),cx.tt,y+5,{align:'right'}); y+=rh;
    });
    doc.setDrawColor(220,222,230); doc.line(M,y,W-M,y); y+=5;
    // total
    if(y>255){ doc.addPage(); y=20; }
    var tv=totales(v);
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor.apply(doc,gris);
    doc.text('Subtotal',W-M-68,y+4); doc.setTextColor.apply(doc,ink); doc.text(money(tv.sub),W-M-4,y+4,{align:'right'});
    doc.setTextColor.apply(doc,gris); doc.text('IVA '+q(tv.tasa)+'%',W-M-68,y+10); doc.setTextColor.apply(doc,ink); doc.text(money(tv.iva),W-M-4,y+10,{align:'right'});
    y+=14;
    doc.setFillColor.apply(doc,col); doc.roundedRect(W-M-72,y,72,12,2,2,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('TOTAL',W-M-68,y+7.8);
    doc.setFontSize(14); doc.text(money(tv.total),W-M-4,y+8.2,{align:'right'}); y+=12;
    if(tv.abono>0){ y+=5; doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor.apply(doc,gris); doc.text('Abono',W-M-68,y);
      doc.setTextColor.apply(doc,ink); doc.text(money(tv.abono),W-M-4,y,{align:'right'}); y+=6;
      doc.setFont('helvetica','bold'); doc.setTextColor(198,40,40); doc.text('SALDO',W-M-68,y); doc.text(money(tv.saldo),W-M-4,y,{align:'right'}); }
    y+=10;
    // condiciones
    if(e.cond){ if(y>250){ doc.addPage(); y=20; }
      doc.setTextColor.apply(doc,col); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('Condiciones',M,y); y+=5;
      doc.setFont('helvetica','normal'); doc.setTextColor.apply(doc,gris); doc.setFontSize(9); var cl=doc.splitTextToSize(e.cond,W-2*M); doc.text(cl,M,y); y+=cl.length*4.4+6; }
    // imágenes de referencia
    if(refs.length){
      if(y>230){ doc.addPage(); y=20; }
      doc.setTextColor.apply(doc,col); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('Imágenes de referencia',M,y); y+=4;
      var cw=(W-2*M-6)/2, mh=70, fila=0;
      refs.forEach(function(im,i){
        var w=cw, h=cw*im.h/im.w; if(h>mh){ h=mh; w=mh*im.w/im.h; }
        if(i%2===0){ if(i>0){ y+=fila; fila=0; } if(y+mh>282){ doc.addPage(); y=20; } }
        var x0=M+(i%2)*(cw+6)+(cw-w)/2;
        doc.addImage(im.src,/^data:image\/png/.test(im.src)?'PNG':'JPEG',x0,y,w,h); fila=Math.max(fila,h+5);
      });
      y+=fila+4;
    }
    // firma
    if(y>255){ doc.addPage(); y=30; }
    y=Math.max(y+12,240); doc.setDrawColor.apply(doc,gris); doc.line(M,y,M+70,y);
    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor.apply(doc,ink); doc.text(e.rep||e.nombre||'',M,y+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc,gris); if(e.nombre && e.rep) doc.text(e.nombre,M,y+9.5);
    var np=doc.getNumberOfPages();
    for(var pg=1;pg<=np;pg++){ doc.setPage(pg); doc.setFillColor.apply(doc,col); doc.rect(0,292,W,5,'F');
      if(np>1){ doc.setFontSize(8); doc.setTextColor.apply(doc,gris); doc.text('Página '+pg+' de '+np,W-M,288,{align:'right'}); } }
    return doc.output('blob');
  });
}
window.FlashPDF=generarPDF;

/* ═════════ Cotización al cliente (solo tu precio) ═════════ */
function mensajeCliente(v){
  var r=calc(v.items), L=[], nombre=(cfg().nombre||'').trim();
  L.push('*COTIZACIÓN '+etqDe(v)+'*  ·  '+fechaTxt(v.fecha));
  if(v.cli && v.cli.nombre) L.push('Para: '+v.cli.nombre);
  L.push('');
  v.items.forEach(function(it){
    var qty=num(it.qty), p=num(it.pub);
    L.push('• '+q(qty)+' × '+it.desc);
    L.push('   '+money(p)+' c/u · '+money(qty*p));
  });
  L.push('');
  L.push('*TOTAL: '+money(r.pub)+'*');
  if(v.cli && v.cli.dir){ L.push(''); L.push('Entrega: '+v.cli.dir); }
  if(nombre){ L.push(''); L.push('— '+nombre); }
  return L.join('\n');
}
var EMPRESA_RX=/\b(unidad|colegio|escuela|empresa|cooperativa|coac|cia|ltda|comercial|distribuidora|fundaci[oó]n|asociaci[oó]n|club|liga|instituto|universidad|hospital|cl[ií]nica|gad|municipio)\b/i;
function mensajePDF(v){
  var e=emp(), L=[], c=v.cli||{};
  if(e.nombre) L.push('*'+e.nombre+'*');
  var pal=(c.nombre||'').trim().split(/\s+/).filter(Boolean);
  L.push('Hola'+(pal.length && pal.length<=3 && !EMPRESA_RX.test(c.nombre)?' '+pal[0]:'')+', te comparto la cotización '+etqDe(v)+'.');
  var tv=totales(v); L.push('*Total: '+money(tv.total)+'*'+(tv.tasa>0?' (incluye IVA '+q(tv.tasa)+'%)':''));
  if(tv.abono>0){ L.push('Abono: '+money(tv.abono)); L.push('*Saldo: '+money(tv.saldo)+'*'); }
  L.push('Quedo atento a tu confirmación.');
  var f=[e.rep,e.web].filter(Boolean); if(f.length){ L.push(''); f.forEach(function(x){ L.push(x); }); }
  return L.join('\n');
}
var cliVenta=null, cliPdf=null, cliUrl='';
function cotizarCliente(){
  var faltaPrecio=cur.items.some(function(it){ return String(it.desc).trim() && !(num(it.pub)>0); });
  if(faltaPrecio){ toast('Falta tu precio en algún producto'); return; }
  var reg=guardar(true,true); if(!reg) return;
  cliVenta=reg; cliPdf=null; if(cliUrl){ URL.revokeObjectURL(cliUrl); cliUrl=''; }
  var t=telWA(reg.cli.tel), e=emp();
  $('cliDestino').innerHTML=t?('Para <b>'+esc(reg.cli.nombre||reg.cli.empresa||'el cliente')+'</b> · +'+esc(t)):'Sin teléfono del cliente: al compartir eliges el chat.';
  $('cliEmpHint').innerHTML=(e.nombre||logo())?'':'<span class="hint warn">Aún no cargas los datos de tu empresa. Ve a Ajustes → Tu empresa, o usa «Usar mis datos de RICCHARY».</span>';
  $('cliPrev').textContent=mensajePDF(reg);
  $('cliVer').disabled=true; $('cliAbrir').disabled=true; $('cliPdfSt').querySelector('span').textContent='Preparando PDF…';
  abrir('dlgCli');
  generarPDF(reg).then(function(b){
    cliPdf=new File([b],nombreArchivo(reg),{type:'application/pdf'}); cliUrl=URL.createObjectURL(b);
    $('cliPdfSt').querySelector('span').textContent=cliPdf.name+' · '+Math.max(1,Math.round(b.size/1024))+' KB';
    $('cliVer').disabled=false; $('cliAbrir').disabled=false;
  }).catch(function(err){ $('cliPdfSt').querySelector('span').textContent='No se pudo crear el PDF: '+err.message; });
}
$('cliVer').onclick=function(){ if(!cliUrl) return; var w=window.open(cliUrl,'_blank'); if(!w) descargarArchivo(cliPdf); };
function descargarArchivo(f){ var a=document.createElement('a'); a.href=URL.createObjectURL(f); a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },800); }
$('cliCopiar').onclick=function(){
  var txt=mensajePDF(cliVenta), ok=function(){ toast('Texto copiado'); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok,function(){ copiarViejo(txt); ok(); });
  else{ copiarViejo(txt); ok(); }
};
$('cliAbrir').onclick=function(){
  if(!cliPdf) return;
  var txt=mensajePDF(cliVenta);
  if(navigator.canShare && navigator.canShare({files:[cliPdf]})){
    try{ if(navigator.clipboard) navigator.clipboard.writeText(txt).catch(function(){}); }catch(e){}
    navigator.share({files:[cliPdf],text:txt,title:etqDe(cliVenta)}).then(marcarCotizada).catch(function(err){ if(err && err.name!=='AbortError') toast('No se pudo compartir: '+err.message); });
    return;
  }
  // PC u otros navegadores: descarga el PDF y abre WhatsApp con el mensaje para adjuntarlo
  descargarArchivo(cliPdf);
  var t=telWA(cliVenta.cli.tel), m=encodeURIComponent(txt+'\n\n(Adjunto el PDF de la cotización)');
  window.open(t?('https://wa.me/'+t+'?text='+m):('https://wa.me/?text='+m),'_blank');
  marcarCotizada();
  toast('PDF descargado: adjúntalo en el chat');
};
function marcarCotizada(){
  if(cliVenta.estado==='borrador'){
    var a=ventas(); a.forEach(function(v){ if(v.id===cliVenta.id){ v.estado='cotizada'; v.cotizadoAt=new Date().toISOString(); } });
    saveVentas(a);
    if(cur.id===cliVenta.id){ cur.estado='cotizada'; persistirBorrador(); pintarCabecera(); }
  }
  cerrar('dlgCli'); toast('Cotización '+etqDe(cliVenta)+' compartida');
}

/* ═════════ Meta del mes ═════════ */
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function ganMes(){
  var d=new Date(), pre=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2), g=0;
  ventas().forEach(function(v){ if(!esCompra(v) && esReal(v.estado) && String(v.fecha).indexOf(pre)===0) g+=calc(v.items).gan; });
  return g;
}
function pintarMeta(){ pintarMetaEn($('metaHome')); }
function pintarMetaEn(box){
  var meta=num(cfg().meta), g=ganMes(), mes=MESES[new Date().getMonth()];
  if(!(meta>0)){
    box.className='meta';
    box.innerHTML='<span class="meta-vacia"><svg class="ic"><use href="#i-chart"/></svg>Ganancia de '+mes+': <b style="color:var(--gain-strong)">'+money(g)+'</b><span style="margin-left:auto;color:var(--ink-3);font-weight:650">Fijar meta</span></span>';
    return;
  }
  var pc=Math.max(0,Math.min(100,g/meta*100));
  box.className='meta'+(g>=meta?' ok':'');
  box.innerHTML='<div class="meta-top"><span>Meta de '+mes+'</span><span><b class="money">'+money(g)+'</b> de '+money(meta)+' · '+Math.floor(pc)+'%</span></div>'+
    '<div class="meta-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.floor(pc)+'"><i style="width:'+pc+'%"></i></div>'+
    (g>=meta?'<div class="meta-top" style="margin-top:6px;color:var(--gain-strong);font-weight:650">Meta cumplida</div>':'');
}
$('metaHome').onclick=function(){ pintarCfg(); abrir('dlgCfg'); setTimeout(function(){ $('cMeta').focus(); },50); };

/* ═════════ Diálogos ═════════ */
function abrir(id){ var d=$(id); if(!d.open){ if(d.showModal) d.showModal(); else d.setAttribute('open',''); } }
function cerrar(id){ var d=$(id); if(d.open){ if(d.close) d.close(); else d.removeAttribute('open'); } }
document.querySelectorAll('dialog').forEach(function(d){
  d.addEventListener('click',function(e){
    if(e.target===d) cerrar(d.id);
    if(e.target.closest('[data-close]')) cerrar(d.id);
  });
});

/* ═════════ Proveedores ═════════ */
var provEdit=null, provDesdeForm=false;
function abrirProvForm(id, desdeForm){
  provEdit=id; provDesdeForm=!!desdeForm;
  if(window.FlashNube) FlashNube.pintarConectar(id);
  var p=id?provPorId(id):null;
  $('dlgProvFormT').textContent=p?'Editar proveedor':'Nuevo proveedor';
  $('pvNombre').value=p?p.nombre:''; $('pvTel').value=p?p.tel:''; $('pvNota').value=p?(p.nota||''):'';
  var bk=(p&&p.banco)||{}, ub=(p&&p.ubic)||{};
  $('pvBanco').value=bk.banco||''; $('pvTipo').value=bk.tipo||''; $('pvCuenta').value=bk.numero||''; $('pvTitular').value=bk.titular||''; $('pvCed').value=bk.ced||'';
  $('pvMapa').value=ub.link||''; pvCoords={lat:ub.lat||'',lng:ub.lng||''}; pintarUbicOk('pvUbicOk',pvCoords);
  $('pvBorrar').hidden=!p;
  abrir('dlgProvForm'); $('pvNombre').focus();
}
$('pvGuardar').onclick=function(){
  var nombre=$('pvNombre').value.trim(), tel=$('pvTel').value.trim(), nota=$('pvNota').value.trim();
  if(!nombre){ toast('Escribe el nombre del proveedor'); $('pvNombre').focus(); return; }
  if(tel && telWA(tel).length<9){ toast('El número de WhatsApp parece incompleto'); $('pvTel').focus(); return; }
  var a=provs(), id=provEdit;
  var banco={banco:$('pvBanco').value.trim(),tipo:$('pvTipo').value,numero:$('pvCuenta').value.trim(),titular:$('pvTitular').value.trim(),ced:$('pvCed').value.trim()};
  var link=$('pvMapa').value.trim(), co=coordsDe(link)||pvCoords||{}, ubic={link:link,lat:co.lat||'',lng:co.lng||''};
  if(id){ a.forEach(function(p){ if(p.id===id){ p.nombre=nombre; p.tel=tel; p.nota=nota; p.banco=banco; p.ubic=ubic; p.act=Date.now(); } }); }
  else{ id=uid(); a.push({id:id,nombre:nombre,tel:tel,nota:nota,banco:banco,ubic:ubic,act:Date.now()}); }
  saveProvs(a); cerrar('dlgProvForm');
  if(provDesdeForm){ cur.provId=id; setCfg({ultimoProv:id}); marcarSucio(); }
  pintarProvSelect(); pintarCfgProvs(); pintarViajes();
  toast(provEdit?'Proveedor actualizado':'Proveedor agregado');
};
$('pvBorrar').onclick=function(){
  var p=provPorId(provEdit); if(!p) return;
  var usados=ventas().filter(function(v){ return v.provId===p.id; }).length;
  if(!confirm('¿Eliminar a '+p.nombre+'?'+(usados?'\nSus '+usados+' pedido(s) del historial se conservan con su nombre.':''))) return;
  saveProvs(provs().filter(function(x){ return x.id!==p.id; }));
  if(cur.provId===p.id){ cur.provId=''; persistirBorrador(); }
  cerrar('dlgProvForm'); pintarProvSelect(); pintarCfgProvs(); toast('Proveedor eliminado');
};

/* ═════════ Catálogo ═════════ */
var catModo='admin', catAgregados=0;
function margenTxt(f,p){ f=num(f); p=num(p); if(!(f>0)) return ''; return q((p-f)/f*100)+'%'; }
function abrirCatalogo(modo){
  catModo=modo; catAgregados=0; $('pBuscar').value='';
  $('dlgProdT').textContent=modo==='elegir'?'Agregar del catálogo':'Catálogo';
  $('pIntro').textContent=modo==='elegir'?'Toca un producto para sumarlo al pedido. Puedes agregar varios.':'Tus productos de referencia. Toca uno para cambiar precios o margen.';
  pintarCatalogo(); abrir('dlgProd');
}
function pintarCatalogo(){
  var t=$('pBuscar').value.trim().toLowerCase(), a=prods().slice().sort(function(x,y){ return (x.cat||'~').localeCompare(y.cat||'~','es') || x.nombre.localeCompare(y.nombre,'es'); });
  if(t) a=a.filter(function(p){ return (p.nombre+' '+(p.cat||'')).toLowerCase().indexOf(t)>-1; });
  var box=$('pLista');
  if(!prods().length){ box.innerHTML='<div class="empty"><b>Catálogo vacío</b>Es opcional: guarda aquí los productos que más vendes para cargarlos rápido y ajustar su margen.</div>'; return; }
  if(!a.length){ box.innerHTML='<p class="hint">Nada coincide con «'+esc(t)+'».</p>'; return; }
  var catPrev=null;
  box.innerHTML=a.map(function(p){
    var sinFab=!(num(p.fab)>0), g=num(p.pub)-num(p.fab), cab='';
    if(!t && (p.cat||'Otros')!==catPrev){ catPrev=p.cat||'Otros'; cab='<h3 class="cat-h">'+esc(catPrev)+'</h3>'; }
    return cab+'<div class="row tap" data-p="'+esc(p.id)+'" role="button" tabindex="0">'+
      '<div class="row-main"><b>'+esc(p.nombre)+'</b><small>Tu precio '+money(p.pub)+' · '+(sinFab?'<span style="color:var(--warn);font-weight:650">falta fábrica</span>':'fábrica '+money(p.fab))+'</small></div>'+
      (sinFab?'':'<div class="row-side"><b class="money">+'+money(g)+'</b><small>'+margenTxt(p.fab,p.pub)+'</small></div>')+
      (catModo==='elegir'?'<button class="icon-btn" data-edit="'+esc(p.id)+'" aria-label="Editar '+esc(p.nombre)+'" style="width:40px;height:40px"><svg class="ic"><use href="#i-edit"/></svg></button>':'')+
      '</div>';
  }).join('');
}
$('pBuscar').addEventListener('input',pintarCatalogo);
$('pLista').addEventListener('click',function(e){
  var ed=e.target.closest('[data-edit]'); if(ed){ e.stopPropagation(); abrirProdForm(ed.getAttribute('data-edit')); return; }
  var r=e.target.closest('[data-p]'); if(!r) return;
  var id=r.getAttribute('data-p');
  if(catModo==='elegir'){
    var p=prods().filter(function(x){ return x.id===id; })[0]; if(!p) return;
    agregarItem({desc:p.nombre,qty:1,fab:num(p.fab)>0?num(p.fab):'',pub:num(p.pub),prodId:p.id},false);
    catAgregados++; toast(p.nombre+' agregado'+(catAgregados>1?' ('+catAgregados+' en total)':''));
  }else abrirProdForm(id);
});
$('pLista').addEventListener('keydown',function(e){ if(e.key==='Enter'){ var r=e.target.closest('[data-p]'); if(r) r.click(); } });
$('pNuevo').onclick=function(){ abrirProdForm(null); };
$('btnProd').onclick=function(){ abrirCatalogo('admin'); };

var prodEdit=null;
function abrirProdForm(id){
  prodEdit=id; var p=id?prods().filter(function(x){ return x.id===id; })[0]:null;
  $('dlgProdFormT').textContent=p?'Editar producto':'Nuevo producto';
  $('pfNombre').value=p?p.nombre:''; $('pfFab').value=p&&num(p.fab)>0?decP(p.fab):''; $('pfPub').value=p?decP(p.pub):'';
  $('pfMargen').value=p&&num(p.fab)>0?dec(Math.round((num(p.pub)-num(p.fab))/num(p.fab)*1000)/10):'';
  $('pfBorrar').hidden=!p; pfUnidad();
  abrir('dlgProdForm'); $('pfNombre').focus();
}
function pfUnidad(){ var g=num($('pfPub').value)-num($('pfFab').value); var el=$('pfUnidad'); el.textContent=money(g); el.style.color=g<0?'var(--loss)':''; el.style.background=g<0?'var(--loss-soft)':''; }
function pfDesdeMargen(){ var f=num($('pfFab').value), m=$('pfMargen').value; if(f>0 && m!==''){ $('pfPub').value=decP(Math.round(f*(1+num(m)/100)*100)/100); } pfUnidad(); }
function pfDesdePrecio(){ var f=num($('pfFab').value), p=num($('pfPub').value); $('pfMargen').value=f>0&&$('pfPub').value!==''?dec(Math.round((p-f)/f*1000)/10):''; pfUnidad(); }
$('pfMargen').addEventListener('input',pfDesdeMargen);
$('pfPub').addEventListener('input',pfDesdePrecio);
$('pfFab').addEventListener('input',function(){ if($('pfMargen').value!=='' && $('pfPub').value==='') pfDesdeMargen(); else pfDesdePrecio(); });
$('pfGuardar').onclick=function(){
  var n=$('pfNombre').value.trim(), f=num($('pfFab').value), p=num($('pfPub').value);
  if(!n){ toast('Escribe el nombre del producto'); $('pfNombre').focus(); return; }
  var a=prods();
  if(a.some(function(x){ return x.id!==prodEdit && x.nombre.toLowerCase()===n.toLowerCase(); })){ toast('Ya existe un producto con ese nombre'); return; }
  if(prodEdit) a.forEach(function(x){ if(x.id===prodEdit){ x.nombre=n; x.fab=$('pfFab').value.trim()===''?'':f; x.pub=p; } });
  else a.push({id:uid(),nombre:n,fab:$('pfFab').value.trim()===''?'':f,pub:p});
  saveProds(a); cerrar('dlgProdForm'); pintarCatalogo(); toast(prodEdit?'Producto actualizado':'Producto guardado');
};
$('pfBorrar').onclick=function(){
  var p=prods().filter(function(x){ return x.id===prodEdit; })[0]; if(!p) return;
  if(!confirm('¿Eliminar '+p.nombre+' del catálogo? Los pedidos ya hechos no cambian.')) return;
  saveProds(prods().filter(function(x){ return x.id!==prodEdit; })); cerrar('dlgProdForm'); pintarCatalogo(); toast('Producto eliminado');
};

/* ═════════ Historial ═════════ */
var hFiltro='todos';
function pintarHistProv(){
  var s=$('hProv'), v=s.value, nombres={};
  ventas().forEach(function(x){ nombres[x.provId]=x.provNombre; });
  provs().forEach(function(p){ nombres[p.id]=p.nombre; });
  var h='<option value="">Todos los proveedores</option>';
  Object.keys(nombres).sort(function(a,b){ return String(nombres[a]).localeCompare(nombres[b],'es'); })
    .forEach(function(id){ h+='<option value="'+esc(id)+'">'+esc(nombres[id])+'</option>'; });
  s.innerHTML=h; s.value=v;
}
function pintarHist(){
  var t=$('hBuscar').value.trim().toLowerCase(), pv=$('hProv').value;
  var a=ventas().slice().sort(function(x,y){ return num(y.num)-num(x.num); });
  a=a.filter(function(v){
    if(hFiltro!=='todos' && v.estado!==hFiltro) return false;
    if(pv && v.provId!==pv) return false;
    if(!t) return true;
    var s=[etqDe(v),v.provNombre,v.cli&&v.cli.nombre,v.cli&&v.cli.empresa,v.notas].concat(v.items.map(function(i){ return i.desc; })).join(' ').toLowerCase();
    return s.indexOf(t)>-1;
  });
  var box=$('hLista');
  if(!ventas().length){ box.innerHTML='<div class="empty"><b>Todavía no guardas pedidos</b>Cuando guardes o envíes uno, aparecerá aquí.</div>'; return; }
  if(!a.length){ box.innerHTML='<p class="hint">No hay pedidos con ese filtro.</p>'; return; }
  box.innerHTML=a.map(function(v){
    var r=calc(v.items);
    var resumen=v.items.slice(0,3).map(function(i){ return q(num(i.qty))+' × '+esc(i.desc); }).join(' · ')+(v.items.length>3?' · +'+(v.items.length-3)+' más':'');
    var opts=estOpts(v.modo,v.estado), com=esCompra(v);
    return '<article class="vcard" data-v="'+esc(v.id)+'">'+
      '<div class="vcard-top"><div><b>'+etqDe(v)+' · '+esc(v.provNombre||'Sin proveedor')+'</b><small>'+fechaTxt(v.fecha)+(v.cli&&(v.cli.empresa||v.cli.nombre)?' · '+esc(v.cli.empresa||v.cli.nombre):'')+'</small></div>'+
      (com?'<div class="vcard-gain"><b class="money" style="color:var(--text)">'+money(r.fab)+'</b><small>'+(v.estado==='cobrada'?'pagado':'a pagar')+'</small></div></div>':'<div class="vcard-gain"><b class="money">'+money(r.gan)+'</b><small>de '+money(r.pub)+'</small></div></div>')+
      '<div class="vcard-items">'+resumen+'</div>'+
      (v.pagoReportado && v.estado!=='cobrada'?'<p class="hint warn">El proveedor reporta este pago. <button class="btn btn-ghost btn-sm" data-a="confpago">Confirmar pago</button></p>':'')+
      '<div class="vcard-act"><select class="inp" data-estado aria-label="Estado del pedido '+esc(v.num)+'">'+opts+'</select>'+
      '<button class="btn btn-ghost btn-sm" data-a="abrir">Abrir</button>'+
      '<button class="btn btn-ghost btn-sm" data-a="wa" aria-label="Reenviar por WhatsApp"><svg class="ic"><use href="#i-wa"/></svg></button>'+
      '<button class="btn btn-ghost btn-sm" data-a="rep" aria-label="Repetir pedido"><svg class="ic"><use href="#i-repeat"/></svg></button>'+
      '<button class="btn btn-ghost btn-sm" data-a="del" aria-label="Eliminar pedido"><svg class="ic"><use href="#i-trash"/></svg></button></div>'+
      '</article>';
  }).join('');
}
function cambiarEstado(id, estado){
  var a=ventas(), ahora=new Date().toISOString();
  a.forEach(function(v){ if(v.id===id){ v.estado=estado; v.actualizado=ahora;
    if(estado==='cobrada'){ v.cobradoAt=v.cobradoAt||ahora; delete v.pagoReportado; } else v.cobradoAt='';
    if(estado!=='borrador' && !v.enviadoAt) v.enviadoAt=ahora; } });
  saveVentas(a);
  if(cur.id===id){ cur.estado=estado; persistirBorrador(); pintarCabecera(); }
  pintarMeta();
  var v=ventas().filter(function(x){ return x.id===id; })[0]; if(v && window.FlashNube && esReal(v.estado)) FlashNube.publicar(v);
  if(v) GastoRic.sync(v);
}
function cargarVenta(v, repetir){
  if(cur.sucio && cur.items.length && cur.id!==v.id && !confirm('El pedido actual tiene cambios sin guardar. ¿Continuar?')) return false;
  cur={id:repetir?null:v.id,modo:v.modo||(v.estado==='cotizada'?'cliente':'proveedor'),num:repetir?siguienteNum(v.modo):v.num,fecha:repetir?hoyISO():v.fecha,provId:v.provId,
    cli:cliDe(v.cli),
    items:JSON.parse(JSON.stringify(v.items)),imgs:(v.imgs||[]).slice(),iva:num(v.iva),abono:repetir?0:num(v.abono),notas:v.notas||'',estado:repetir?'borrador':v.estado,sucio:!!repetir};
  if(!provPorId(cur.provId)) toast('El proveedor de este pedido ya no está registrado');
  persistirBorrador(); ultimaGan=null; pintarForm(); mostrarForm(); window.scrollTo({top:0});
  return true;
}
$('hLista').addEventListener('change',function(e){
  if(!e.target.matches('[data-estado]')) return;
  var id=e.target.closest('[data-v]').getAttribute('data-v');
  var hv=ventas().filter(function(x){ return x.id===id; })[0];
  cambiarEstado(id,e.target.value); toast('Estado: '+estTxt(e.target.value,hv&&hv.modo)); pintarHist();
});
$('hLista').addEventListener('click',function(e){
  var b=e.target.closest('[data-a]'); if(!b) return;
  var id=b.closest('[data-v]').getAttribute('data-v'), v=ventas().filter(function(x){ return x.id===id; })[0]; if(!v) return;
  var a=b.getAttribute('data-a');
  if(a==='abrir'){ if(cargarVenta(v,false)) cerrar('dlgHist'); }
  else if(a==='rep'){ if(cargarVenta(v,true)){ cerrar('dlgHist'); toast('Copia lista como '+etqDe(cur)+'. Revisa y guarda.'); } }
  else if(a==='wa'){ cerrar('dlgHist'); abrirEnvio(v); }
  else if(a==='confpago'){ cambiarEstado(id,'cobrada'); pintarHist(); toast('Pago confirmado'); }
  else if(a==='del'){
    if(!confirm('¿Eliminar '+etqDe(v)+(v.provNombre?' de '+v.provNombre:'')+'? No se puede deshacer.')) return;
    saveVentas(ventas().filter(function(x){ return x.id!==id; })); if(esCompra(v)) GastoRic.quitar(v.id); if(window.FlashNube) FlashNube.retirar(id);
    (v.imgs||[]).forEach(function(im){ if(!enUso(im) && (cur.imgs||[]).indexOf(im)<0) imgDel(im); });
    if(cur.id===id){ cur.id=null; cur.sucio=true; persistirBorrador(); pintarCabecera(); }
    pintarHist(); toast('Pedido eliminado');
  }
});
$('hBuscar').addEventListener('input',pintarHist);
$('hProv').addEventListener('change',pintarHist);
$('hFiltro').addEventListener('click',function(e){
  var b=e.target.closest('[data-f]'); if(!b) return; hFiltro=b.getAttribute('data-f');
  this.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed',String(x===b)); }); pintarHist();
});
$('btnHist').onclick=function(){ pintarHistProv(); pintarHist(); abrir('dlgHist'); };

/* ═════════ Reporte ═════════ */
function rango(tipo){
  var d=new Date(), y=d.getFullYear(), m=d.getMonth(), iso=function(x){ return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2); };
  if(tipo==='mes') return [iso(new Date(y,m,1)),iso(new Date(y,m+1,0))];
  if(tipo==='pasado') return [iso(new Date(y,m-1,1)),iso(new Date(y,m,0))];
  if(tipo==='anio') return [y+'-01-01',y+'-12-31'];
  return ['',''];
}
function enRango(){
  var de=$('rDesde').value, ha=$('rHasta').value;
  return ventas().filter(function(v){ return (!de||v.fecha>=de)&&(!ha||v.fecha<=ha); });
}
function datosCompras(){
  var cs=enRango().filter(function(v){ return esCompra(v) && esReal(v.estado); }), t={tot:0,pag:0,pen:0,n:cs.length}, pp={};
  cs.forEach(function(v){ var f=calc(v.items).fab, k=v.provId||v.provNombre;
    if(!pp[k]) pp[k]={nombre:(provPorId(v.provId)||{}).nombre||v.provNombre||'Sin proveedor',n:0,tot:0,pag:0,pen:0};
    var p=pp[k]; p.n++; p.tot+=f; t.tot+=f; if(v.estado==='cobrada'){ p.pag+=f; t.pag+=f; } else { p.pen+=f; t.pen+=f; } });
  return {t:t,prov:Object.keys(pp).map(function(k){ return pp[k]; }).sort(function(a,b){ return b.tot-a.tot; })};
}
function pintarCompras(){
  var d=datosCompras(), t=d.t, box=$('rCompras');
  box.hidden=!t.n; if(!t.n){ box.innerHTML=''; return; }
  box.innerHTML='<div class="sec-h"><h2>Compras del periodo</h2><span>'+t.n+' pedido'+(t.n===1?'':'s')+'</span></div>'+
    '<p class="hint">Lo que compras para ti. No entra en tus comisiones.</p>'+
    '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Proveedor</th><th class="r">Total</th><th class="r">Pagado</th><th class="r">Pendiente</th></tr></thead><tbody>'+
    d.prov.map(function(p){ return '<tr><td>'+esc(p.nombre)+' <small class="hint">('+p.n+')</small></td><td class="r money">'+money(p.tot)+'</td><td class="r money" style="color:var(--muted)">'+money(p.pag)+'</td><td class="r money" style="color:'+(p.pen>0?'var(--loss)':'var(--muted)')+'">'+money(p.pen)+'</td></tr>'; }).join('')+
    '</tbody><tfoot><tr><td>Total</td><td class="r money">'+money(t.tot)+'</td><td class="r money">'+money(t.pag)+'</td><td class="r money">'+money(t.pen)+'</td></tr></tfoot></table></div>';
}
function datosReporte(){
  var vs=enRango().filter(function(v){ return !esCompra(v); }), act=vs.filter(function(v){ return esReal(v.estado); });
  var cots=vs.filter(function(v){ return v.estado==='cotizada'; });
  var t={pub:0,fab:0,gan:0,cob:0,pen:0,n:act.length,borr:vs.filter(function(v){ return v.estado==='borrador'; }).length,cot:cots.length,cotGan:cots.reduce(function(s,v){ return s+calc(v.items).gan; },0)}, porProv={};
  act.forEach(function(v){
    var r=calc(v.items), k=v.provId||v.provNombre;
    t.pub+=r.pub; t.fab+=r.fab; t.gan+=r.gan;
    if(v.estado==='cobrada') t.cob+=r.gan; else t.pen+=r.gan;
    if(!porProv[k]) porProv[k]={nombre:(provPorId(v.provId)||{}).nombre||v.provNombre,n:0,pub:0,gan:0,cob:0,pen:0};
    var p=porProv[k]; p.n++; p.pub+=r.pub; p.gan+=r.gan; if(v.estado==='cobrada') p.cob+=r.gan; else p.pen+=r.gan;
  });
  var pend=act.filter(function(v){ return v.estado!=='cobrada'; }).sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
  return {t:t,prov:Object.keys(porProv).map(function(k){ return porProv[k]; }).sort(function(a,b){ return b.gan-a.gan; }),pend:pend};
}
function pintarRep(){
  var d=datosReporte(), t=d.t;
  $('rKpis').innerHTML=
    '<div class="kpi main"><span>Ganancia total</span><b class="money">'+money(t.gan)+'</b></div>'+
    '<div class="kpi"><span>Cobrada</span><b class="money" style="color:var(--gain-strong)">'+money(t.cob)+'</b></div>'+
    '<div class="kpi pend"><span>Por cobrar</span><b class="money">'+money(t.pen)+'</b></div>'+
    '<div class="kpi"><span>Vendido al público</span><b class="money">'+money(t.pub)+'</b></div>'+
    '<div class="kpi"><span>Pedidos</span><b class="num">'+t.n+'</b></div>';
  if(!d.prov.length){ $('rTabla').innerHTML='<tbody><tr><td class="hint">Sin pedidos enviados en este periodo.</td></tr></tbody>'; }
  else{
    $('rTabla').innerHTML='<thead><tr><th>Proveedor</th><th class="r">Ped.</th><th class="r">Ganancia</th><th class="r">Por cobrar</th></tr></thead><tbody>'+
      d.prov.map(function(p){ return '<tr><td>'+esc(p.nombre)+'</td><td class="r num">'+p.n+'</td><td class="r money">'+money(p.gan)+'</td><td class="r money" style="color:'+(p.pen>0?'var(--warn)':'var(--muted)')+'">'+money(p.pen)+'</td></tr>'; }).join('')+
      '</tbody><tfoot><tr><td>Total</td><td class="r num">'+t.n+'</td><td class="r money">'+money(t.gan)+'</td><td class="r money">'+money(t.pen)+'</td></tr></tfoot>';
  }
  $('rPendN').textContent=d.pend.length?d.pend.length+' pedido'+(d.pend.length===1?'':'s'):'';
  var lim=Math.max(1,num(cfg().diasCobro)||7), grupos={}, orden=[];
  d.pend.forEach(function(v){ var k=v.provId||v.provNombre; if(!grupos[k]){ grupos[k]={provId:v.provId,nombre:(provPorId(v.provId)||{}).nombre||v.provNombre||'Sin proveedor',tel:(provPorId(v.provId)||{}).tel||v.provTel||'',vs:[],tot:0,tarde:0}; orden.push(k); }
    var g=grupos[k], dias=diasDesde(v.enviadoAt||v.fecha); g.vs.push({v:v,dias:dias,gan:calc(v.items).gan}); g.tot+=calc(v.items).gan; if(dias>lim) g.tarde++; });
  orden.sort(function(a,b){ return grupos[b].tot-grupos[a].tot; });
  $('rPend').innerHTML=orden.length?orden.map(function(k){
    var g=grupos[k];
    return '<div class="pgrp"><div class="pgrp-h"><div class="row-main"><b>'+esc(g.nombre)+'</b><small>'+g.vs.length+' pedido'+(g.vs.length===1?'':'s')+(g.tarde?' · <span class="tarde">'+g.tarde+' atrasado'+(g.tarde===1?'':'s')+'</span>':'')+'</small></div>'+
      '<div class="row-side"><b class="money" style="color:var(--warn)">'+money(g.tot)+'</b></div>'+
      (telWA(g.tel)?'<button class="btn btn-volt btn-sm" data-recordar="'+esc(k)+'"><svg class="ic"><use href="#i-wa"/></svg>Recordar</button>':'')+'</div>'+
      g.vs.map(function(x){ return '<div class="row" style="min-height:48px;padding:6px 0"><div class="row-main"><small style="color:var(--text)">'+etqDe(x.v)+' · '+fechaTxt(x.v.fecha)+' · <span class="'+(x.dias>lim?'tarde':'')+'">hace '+x.dias+' día'+(x.dias===1?'':'s')+'</span></small></div>'+
        '<b class="money" style="font-size:14px">'+money(x.gan)+'</b><button class="btn btn-ghost btn-sm" data-cobrar="'+esc(x.v.id)+'">Cobrada</button></div>'; }).join('')+'</div>';
  }).join(''):'<p class="hint">Nada pendiente de cobro en este periodo.</p>';
  pintarRep.grupos=grupos;
  var notas=[];
  if(t.cot) notas.push(t.cot+' cotización'+(t.cot===1?'':'es')+' abierta'+(t.cot===1?'':'s')+' con el cliente: ganancia posible '+money(t.cotGan)+'.');
  if(t.borr) notas.push(t.borr+' pedido'+(t.borr===1?'':'s')+' sin enviar.');
  if(notas.length) notas.push('No se suman a la ganancia hasta que los envíes al proveedor.');
  $('rNota').textContent=notas.join(' ');
  pintarCompras();
}
function diasDesde(iso){ var d=new Date(String(iso).length===10?iso+'T12:00:00':iso); if(isNaN(d)) return 0; return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)); }
function mensajeRecordatorio(g){
  var nombre=(cfg().nombre||'').trim(), L=['Hola '+g.nombre+', te escribo por mi comisión pendiente:',''];
  g.vs.forEach(function(x){ L.push('• Pedido '+etqDe(x.v)+' ('+fechaTxt(x.v.fecha)+'): '+money(x.gan)); });
  L.push(''); L.push('*Total: '+money(g.tot)+'*'); L.push(''); L.push('¿Me confirmas cuándo me la puedes pasar? Gracias.');
  if(nombre){ L.push(''); L.push('— '+nombre); }
  return L.join('\n');
}
$('rPend').addEventListener('click',function(e){
  var rc=e.target.closest('[data-recordar]');
  if(rc){ var g=(pintarRep.grupos||{})[rc.getAttribute('data-recordar')]; if(!g) return;
    window.open('https://wa.me/'+telWA(g.tel)+'?text='+encodeURIComponent(mensajeRecordatorio(g)),'_blank'); return; }
  var b=e.target.closest('[data-cobrar]'); if(!b) return;
  cambiarEstado(b.getAttribute('data-cobrar'),'cobrada'); pintarRep(); toast('Comisión marcada como cobrada');
});
$('rRango').addEventListener('click',function(e){
  var b=e.target.closest('[data-r]'); if(!b) return;
  this.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed',String(x===b)); });
  var r=rango(b.getAttribute('data-r')); $('rDesde').value=r[0]; $('rHasta').value=r[1]; pintarRep();
});
['rDesde','rHasta'].forEach(function(id){ $(id).addEventListener('change',function(){
  $('rRango').querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed','false'); }); pintarRep(); }); });
$('btnRep').onclick=function(){
  if(!$('rDesde').value && !$('rHasta').value){ var r=rango('mes'); $('rDesde').value=r[0]; $('rHasta').value=r[1]; }
  pintarRep(); abrir('dlgRep');
};
$('rCsv').onclick=function(){
  var vs=enRango().filter(function(v){ return !esCompra(v) && esReal(v.estado); });
  if(!vs.length){ toast('No hay pedidos en este periodo'); return; }
  var f=[['orden','fecha','proveedor','cliente','producto','cantidad','fabrica_cu','venta_cu','ganancia','estado']];
  vs.sort(function(a,b){ return num(a.num)-num(b.num); }).forEach(function(v){
    v.items.forEach(function(i){ var qn=num(i.qty);
      f.push([etqDe(v),v.fecha,v.provNombre,v.cli?[v.cli.empresa,v.cli.nombre].filter(Boolean).join(' / '):'',i.desc,qn,num(i.fab).toFixed(2),num(i.pub).toFixed(2),(qn*(num(i.pub)-num(i.fab))).toFixed(2),ESTADOS[v.estado]]); });
  });
  var e=function(x){ x=x==null?'':String(x); return /[";\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x; };
  descargar('flash_comisiones_'+hoyISO()+'.csv','\uFEFF'+f.map(function(r){ return r.map(e).join(';'); }).join('\r\n'),'text/csv;charset=utf-8');
};
function descargar(nombre,contenido,tipo){
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([contenido],{type:tipo})); a.download=nombre;
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
}

/* ═════════ Ajustes ═════════ */
function pintarCfgProvs(){
  var a=provs(); $('cProvN').textContent=a.length?a.length+' registrado'+(a.length===1?'':'s'):'';
  $('cProvLista').innerHTML=a.length?a.map(function(p){
    return '<div class="row tap" data-pv="'+esc(p.id)+'" role="button" tabindex="0"><div class="row-main"><b>'+esc(p.nombre)+(provEnApp(p.id)?'<span class="tag-app">En la app</span>':'')+'</b><small>'+
      (telWA(p.tel)?'+'+esc(telWA(p.tel)):'Sin WhatsApp')+(p.nota?' · '+esc(p.nota):'')+'</small></div><svg class="ic" style="color:var(--muted)"><use href="#i-edit"/></svg></div>';
  }).join(''):'<p class="hint">Aún no tienes proveedores.</p>';
}
function pintarCfg(){
  if(window.FlashNube) FlashNube.pintarAjustes();
  pintarEmp();
  var c=cfg(); $('cGastoRic').checked=c.gastoRic!==false; GastoRic.pintarSt(); $('cNombre').value=c.nombre||''; $('cMeta').value=num(c.meta)>0?decP(c.meta):''; $('cDias').value=c.diasCobro||'';
  $('cUltimo').textContent=c.ultimoRespaldo?'Último respaldo: '+new Date(c.ultimoRespaldo).toLocaleString('es-EC'):'Todavía no has descargado un respaldo.';
  pintarCfgProvs();
}
$('cProvLista').addEventListener('click',function(e){ var r=e.target.closest('[data-pv]'); if(r) abrirProvForm(r.getAttribute('data-pv'),false); });
$('cProvLista').addEventListener('keydown',function(e){ if(e.key==='Enter'){ var r=e.target.closest('[data-pv]'); if(r) r.click(); } });
$('cProvNuevo').onclick=function(){ abrirProvForm(null,false); };
$('cNombre').addEventListener('change',function(){ setCfg({nombre:this.value.trim()}); toast('Firma guardada'); });
$('cGastoRic').addEventListener('change',function(){ setCfg({gastoRic:this.checked}); toast(this.checked?'Las compras pagadas irán a tus gastos':'Ya no se registran gastos'); if(this.checked) GastoRic.revisarTodo(); GastoRic.pintarSt(); });
$('cMeta').addEventListener('change',function(){ setCfg({meta:num(this.value)}); this.value=num(this.value)>0?decP(num(this.value)):''; pintarMeta(); toast('Meta guardada'); });
$('cDias').addEventListener('change',function(){ var d=Math.max(1,Math.round(num(this.value))||7); setCfg({diasCobro:d}); this.value=d; toast('Aviso de cobro: '+d+' días'); });
$('btnCfg').onclick=function(){ pintarCfg(); abrir('dlgCfg'); };
$('cExport').onclick=function(){
  imgTodas().then(function(todas){
    var usadas={}; ventas().concat([cur]).forEach(function(v){ (v.imgs||[]).forEach(function(id){ usadas[id]=1; }); });
    var imagenes={}; (todas||[]).forEach(function(r){ if(usadas[r.id]) imagenes[r.id]=r.data; });
    var data={app:'flash-gestion',version:2,exportado:new Date().toISOString(),ventas:ventas(),proveedores:provs(),productos:prods(),cfg:cfg(),logo:logo(),imagenes:imagenes};
    descargar('flash-respaldo-'+hoyISO()+'.json',JSON.stringify(data),'application/json');
    setCfg({ultimoRespaldo:new Date().toISOString()}); pintarCfg(); toast('Respaldo descargado');
  });
};
$('cImport').onclick=function(){ $('cImportFile').click(); };
$('cImportFile').onchange=function(ev){
  var f=ev.target.files&&ev.target.files[0]; ev.target.value=''; if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){
    var d; try{ d=JSON.parse(rd.result); }catch(e){ toast('El archivo no es un respaldo válido'); return; }
    if(!d||d.app!=='flash-gestion'||!Array.isArray(d.ventas)){ toast('Este archivo no es un respaldo de flash'); return; }
    if(!confirm('Restaurar reemplaza todo lo de este dispositivo por el respaldo:\n'+d.ventas.length+' pedidos, '+(d.proveedores||[]).length+' proveedores, '+(d.productos||[]).length+' productos.\n¿Continuar?')) return;
    saveVentas(d.ventas); saveProvs(d.proveedores||[]); saveProds(d.productos||[]);
    var c=d.cfg||{}; c.ultimoNum=Math.max(num(c.ultimoNum),0); save(K.cfg,c);
    if(d.logo) setLogo(d.logo);
    var im=d.imagenes||{}; Object.keys(im).forEach(function(id){ imgPut(id,im[id]); });
    cur=pedidoVacio(); persistirBorrador(); pintarForm(); pintarCfg(); pintarMeta(); toast('Respaldo restaurado');
  };
  rd.readAsText(f,'utf-8');
};
$('cBorrarTodo').onclick=function(){
  var t=prompt('Esto borra pedidos, proveedores y catálogo de este dispositivo. Escribe BORRAR para confirmar.');
  if(t===null) return;
  if(t.trim().toUpperCase()!=='BORRAR'){ toast('No se borró nada'); return; }
  borrarDatosLocales(); toast('Datos borrados');
};
function borrarDatosLocales(){
  [K.ventas,K.prov,K.prod,K.cfg,K.draft,K.logo].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
  imgTodas().then(function(t){ (t||[]).forEach(function(r){ imgDel(r.id); }); });
  cur=pedidoVacio(); persistirBorrador(); pintarForm(); pintarCfg(); pintarMeta();
}

/* ═════════ Dictado (intérprete heredado de RICCHARY V2) ═════════ */
var Voz=(function(){
  var NUM = {
    'un':1,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,'seis':6,'siete':7,
    'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,'trece':13,'catorce':14,'quince':15,
    'dieciseis':16,'dieciséis':16,'diecisiete':17,'dieciocho':18,'diecinueve':19,
    'veinte':20,'veintiuno':21,'veintidos':22,'veintidós':22,'veintitres':23,'veintitrés':23,
    'veinticuatro':24,'veinticinco':25,'veintiseis':26,'veintiséis':26,'veintisiete':27,
    'veintiocho':28,'veintinueve':29,'treinta':30,'cuarenta':40,'cincuenta':50,
    'sesenta':60,'setenta':70,'ochenta':80,'noventa':90,'cien':100,'ciento':100,
    'doscientos':200,'trescientos':300,'cuatrocientos':400,'quinientos':500,
    'mil':1000,'docena':12,'docenas':12
  };

  function limpiar(t){
    return String(t||'')
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g,'')          // por si viene descompuesto
      .replace(/\s+/g,' ')
      .trim();
  }

  /* "cincuenta y dos" → 52 · "media docena" → 6 · "tres docenas" → 36 */
  function palabrasANumero(txt){
    var p = limpiar(txt).split(/\s+/), tot=0, act=0, hubo=false;
    for(var i=0;i<p.length;i++){
      var w=p[i];
      if(w==='y') continue;
      if(w==='media'||w==='medio'){
        if(p[i+1] && /docena/.test(p[i+1])){ act+=6; hubo=true; i++; continue; }
        continue;
      }
      if(/^\d+$/.test(w)){ act+=parseInt(w,10); hubo=true; continue; }
      if(NUM[w]!==undefined){
        var v=NUM[w];
        if(/docena/.test(w)){ act = (act||1)*12; }
        else if(v===1000){ tot += (act||1)*1000; act=0; }
        else act += v;
        hubo=true; continue;
      }
      return null;
    }
    return hubo ? tot+act : null;
  }

  /* Precio escrito o dictado: "2.50" · "dos cincuenta" · "2 con 50" */
  function aPrecio(txt){
    var t=limpiar(txt).replace(/·/g,'.');
    var m=t.match(/^(\d+)[.,](\d{1,2})$/);
    if(m) return parseFloat(m[1]+'.'+m[2].padEnd(2,'0'));
    if(/^\d+$/.test(t)) return parseInt(t,10);
    m=t.match(/^(.+?)\s+(?:con|coma|punto)\s+(.+)$/);
    if(m){
      var e=palabrasANumero(m[1]), d=palabrasANumero(m[2]);
      if(e!==null && d!==null) return parseFloat(e+'.'+String(d).padStart(2,'0').slice(0,2));
    }
    // "dos cincuenta" = 2.50
    var p=t.split(/\s+/);
    if(p.length===2){
      var a=palabrasANumero(p[0]), b=palabrasANumero(p[1]);
      if(a!==null && b!==null && a<100 && b>=10 && b<100) return parseFloat(a+'.'+b);
    }
    var n=palabrasANumero(t);
    return n===null ? null : n;
  }

  var UNIDADES = '(?:unidades?|u|pzas?|piezas?|docenas?|docena|cajas?|pares?|juegos?|kilos?|kg|metros?|m|litros?|lt|horas?)';
  var MONEDA  = '(?:d[oó]lares?|dolar|usd|\\$|pesos?|soles?)';

  /* Verbos y muletillas con las que suele empezar un pedido dictado */
  var RELLENO = /^(?:por favor\s+|porfa\s+|me\s+|le\s+|te\s+)?(?:cotiza(?:me|r|ci[oó]n(?:\s+de)?)?|necesito|necesitamos|quiero|quisiera|queremos|deseo|hazme|hacer|haceme|dame|damelo|p[oó]nme|ponme|agrega(?:me)?|agregar|anota(?:me)?|apunta(?:me)?|manda(?:me)?|env[ií]a(?:me)?|ser[ií]a|son|es|ocupo|requiero|busco|vendeme|v[eé]ndeme)\s+/;

  /* Quita "cuesta/vale/precio/sale en ..." y devuelve el precio */
  function sacarPrecio(t){
    var pats = [
      // "cuesta 30", "vale 30 dolares", "sale en 30", "precio 30", "a 30 c/u"
      new RegExp('\\b(?:cuesta|vale|sale\\s+(?:en|a)|precio(?:\\s+de)?|valor(?:\\s+de)?)\\s*:?\\s*\\$?\\s*([\\d.,·]+)\\s*'+MONEDA+'?'),
      // "a 2.50", "por 30 dolares", "en 45" (al final o antes de "cada uno")
      new RegExp('\\s(?:a|por|en)\\s+\\$?\\s*([\\d.,·]+)\\s*'+MONEDA+'?(?:\\s*(?:c/u|cada\\s+uno|cada\\s+una))?\\s*$'),
      // "$80" o "80 dolares" en cualquier parte
      new RegExp('\\$\\s*([\\d.,·]+)'),
      new RegExp('\\b([\\d.,·]+)\\s*'+MONEDA+'\\b'),
      // precio dictado en palabras: "a dos cincuenta", "por veinticinco"
      new RegExp('\\s(?:a|por|en)\\s+([a-zñáéíóú]+(?:\\s+(?:y\\s+|con\\s+)?[a-zñáéíóú]+){0,2})\\s*$')
    ];
    for(var k=0;k<pats.length;k++){
      var m=t.match(pats[k]);
      if(!m) continue;
      var p=aPrecio(m[1]);
      if(p!==null && p>0) return {precio:p, resto:t.replace(m[0],' ')};
    }
    // último recurso: un número suelto al final ("reparación de laptop 45")
    var m2=t.match(/\s([\d.,·]+)\s*$/);
    if(m2){
      var p2=aPrecio(m2[1]);
      if(p2!==null && p2>0) return {precio:p2, resto:t.replace(m2[0],' ')};
    }
    return {precio:null, resto:t};
  }

  /* Devuelve {items:[{qty,desc,price}], abono, entrega} */

  function normal(t){ return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }
  var P='\\$?\\s*([\\d.,·]+)\\s*'+MONEDA+'?';
  var RX_FAB=new RegExp('\\b(?:a\\s+|en\\s+)?(?:precio\\s+(?:de\\s+)?)?(?:fabrica|costo|proveedor)\\s*(?:de|en|a|:)?\\s*'+P);
  var RX_PUB=new RegExp('\\b(?:a\\s+|en\\s+)?(?:precio\\s+(?:de\\s+)?)?(?:venta|vendo|mi\\s+precio|al\\s+publico|publico|precio\\s+final)\\s*(?:de|en|a|:)?\\s*'+P);
  var SOLO_FAB=new RegExp('^(?:a\\s+|en\\s+)?(?:precio\\s+(?:de\\s+)?)?(?:fabrica|costo|proveedor)\\s*(?:de|en|a|:)?\\s*'+P+'\\s*(?:c/u|cada\\s+una?)?$');
  var SOLO_PUB=new RegExp('^(?:a\\s+|en\\s+)?(?:precio\\s+(?:de\\s+)?)?(?:venta|vendo|mi\\s+precio|al\\s+publico|publico|precio\\s+final)\\s*(?:de|en|a|:)?\\s*'+P+'\\s*(?:c/u|cada\\s+una?)?$');
  function raiz(w){ return w.replace(/(es|s)$/,''); }
  function buscarCat(desc,cat){
    var pal2=desc.split(/\s+/).map(raiz).filter(function(x){ return x.length>3; }), enc=null, mejor=0;
    (cat||[]).forEach(function(p){
      if(!pal2.length) return;
      var palProd=normal(p.nombre).split(/\s+/).map(raiz).filter(function(x){ return x.length>3; });
      var nom=' '+palProd.join(' ')+' ';
      var ac=pal2.filter(function(x){ return nom.indexOf(x)>-1; }).length;
      if(ac<pal2.length) return;
      if(pal2.length<2 && palProd.length>1) return;
      var pts=ac*100-(palProd.length-ac);
      if(pts>mejor){ mejor=pts; enc=p; }
    });
    return mejor?enc:null;
  }
  // "a 1,25 ... venta 1,50": el primer precio suelto pasa a ser el de fábrica
  function ponPub(it,v){ if(it.pub!==null && it.fab===null && !it.prodId) it.fab=it.pub; it.pub=v; }
  function interpretarFlash(texto,cat){
    var t=normal(texto).replace(/[;\n]+/g,',').replace(/(\d),(\d{1,3})(?!\d)/g,'$1·$2');
    var out=[];
    t.split(/\s*,\s*|\s+\by\b\s+|\s+\bmas\b\s+|\s+\btambien\b\s+/).forEach(function(tramo){
      tramo=(tramo||'').replace(/\s+/g,' ').trim(); if(!tramo) return;
      var prev=out[out.length-1], m;
      if(prev && (m=tramo.match(SOLO_PUB))){ var a=aPrecio(m[1]); if(a!==null){ ponPub(prev,a); return; } }
      if(prev && (m=tramo.match(SOLO_FAB))){ var b=aPrecio(m[1]); if(b!==null){ prev.fab=b; return; } }
      // lo mismo con el precio dicho en palabras: "venta uno cincuenta"
      if(prev && (m=tramo.match(/^(?:a\s+|en\s+)?(?:precio\s+(?:de\s+)?)?(venta|vendo|mi\s+precio|al\s+publico|publico|precio\s+final|fabrica|costo|proveedor)\s*(?:de|en|a|:)?\s*(.+)$/))){
        var w=aPrecio(m[2].replace(/\s*(?:dolares?|usd)$/,''));
        if(w!==null){ if(/fabrica|costo|proveedor/.test(m[1])) prev.fab=w; else ponPub(prev,w); return; }
      }
      if(prev && (m=tramo.match(new RegExp('^(?:a\\s+|por\\s+)?'+P+'\\s*(?:c/u|cada\\s+una?)?$')))){
        var c=aPrecio(m[1]);
        if(c!==null){
          // "a 3,80 y 4,50": dos precios seguidos = fábrica y luego el tuyo
          if(prev.fab===null && prev.pub!==null && !prev.prodId){ prev.fab=prev.pub; prev.pub=c; }
          else if(prev.pub===null) prev.pub=c;
          else if(prev.fab===null) prev.fab=c;
          return;
        }
      }
      tramo=tramo.replace(RELLENO,'').trim(); if(!tramo) return;
      var fab=null,pub=null;
      if((m=tramo.match(RX_FAB))){ fab=aPrecio(m[1]); tramo=tramo.replace(m[0],' '); }
      if((m=tramo.match(RX_PUB))){ pub=aPrecio(m[1]); tramo=tramo.replace(m[0],' '); }
      tramo=tramo.replace(/\s+/g,' ').trim();
      var pr=sacarPrecio(tramo), resto=pr.resto;
      if(pr.precio!==null){
        if(fab===null && pub===null){
          var pr2=sacarPrecio(resto.replace(/\s+/g,' ').trim());
          var qtyLike=/^\s*\d+\s*$/.test(pr2.resto);
          if(pr2.precio!==null && !qtyLike){ fab=pr2.precio; pub=pr.precio; resto=pr2.resto; }
          else pub=pr.precio;
        }else if(fab===null) fab=pr.precio;
        else if(pub===null) pub=pr.precio;
      }
      resto=resto.replace(/\s+/g,' ').trim().replace(/\s*(?:c\/u|cada\s+una?)\s*$/,'').replace(/\s+(?:a|por|en)$/,'').trim();
      var qty=null, desc=resto;
      var m2=resto.match(new RegExp('^(\\d+)\\s*(?:x|'+UNIDADES+')?\\s*(?:de\\s+)?(.+)$'));
      if(m2 && m2[2].trim()){ qty=parseInt(m2[1],10); desc=m2[2]; }
      if(qty===null){
        var pal=resto.split(/\s+/);
        if(pal.length>1 && /^(?:un|una|uno)$/.test(pal[0])){ qty=1; desc=pal.slice(1).join(' '); }
        else for(var n=Math.min(4,pal.length-1);n>=1;n--){
          var qq=palabrasANumero(pal.slice(0,n).join(' '));
          if(qq!==null && qq>0){ var col=pal.slice(n);
            while(col.length && new RegExp('^'+UNIDADES+'$').test(col[0])) col.shift();
            if(col.length && col[0]==='de') col.shift();
            if(col.length){ qty=qq; desc=col.join(' '); } break; }
        }
      }
      desc=desc.replace(/^(?:del?\s+)/,'').replace(/·/g,',').replace(/\s+/g,' ').trim();
      if(!desc) return;
      if(qty===null) qty=1;
      var enc=buscarCat(desc,cat);
      out.push({qty:qty,desc:enc?enc.nombre:desc.charAt(0).toUpperCase()+desc.slice(1),
        fab:fab!==null?fab:(enc&&num(enc.fab)>0?num(enc.fab):null),pub:pub!==null?pub:(enc?num(enc.pub):null),prodId:enc?enc.id:''});
    });
    return out;
  }
  return {interpretar:interpretarFlash,palabrasANumero:palabrasANumero,aPrecio:aPrecio};
})();
window.FlashVoz=Voz;

var vLineas=[], recog=null, grabando=false, baseTexto='';
(function(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
  recog=new SR(); recog.lang='es-EC'; recog.continuous=true; recog.interimResults=true;
  recog.onstart=function(){ grabando=true; $('vMic').classList.add('rec'); $('vMicTxt').textContent='Detener'; $('vHint').textContent='Escuchando… habla ahora.'; baseTexto=$('vTxt').value?$('vTxt').value+' ':''; };
  recog.onerror=function(e){ $('vHint').textContent=e.error==='not-allowed'?'No diste permiso al micrófono. Actívalo en los ajustes del navegador.':'No se pudo escuchar ('+e.error+'). Puedes escribir o pegar el texto.'; };
  recog.onend=function(){ grabando=false; $('vMic').classList.remove('rec'); $('vMicTxt').textContent='Dictar'; if($('vHint').textContent.indexOf('Escuchando')===0) $('vHint').textContent=''; };
  recog.onresult=function(ev){
    var fin='',prov='';
    for(var i=0;i<ev.results.length;i++){ var r=ev.results[i]; if(r.isFinal) fin+=r[0].transcript+' '; else prov+=r[0].transcript; }
    $('vTxt').value=(baseTexto+fin+prov).replace(/\s+/g,' ').trim();
  };
})();
$('vMic').onclick=function(){
  if(!recog){ $('vHint').textContent='Este navegador no permite dictado. Escribe o pega el texto.'; return; }
  try{ grabando?recog.stop():recog.start(); }catch(e){ $('vHint').textContent='No se pudo iniciar el micrófono.'; }
};
function abrirVoz(){ $('vRes').innerHTML=''; $('vFoot').hidden=true; vLineas=[]; $('vHint').textContent=''; abrir('dlgVoz'); }
$('dlgVoz').addEventListener('close',function(){ if(grabando&&recog) try{recog.stop();}catch(e){} });
$('vInterpretar').onclick=function(){
  if(grabando&&recog) try{recog.stop();}catch(e){}
  var txt=$('vTxt').value.trim(); if(!txt){ toast('Dicta o pega el pedido primero'); return; }
  vLineas=Voz.interpretar(txt,prods()).map(function(x){ x.ok=true; return x; });
  pintarVoz();
};
function pintarVoz(){
  if(!vLineas.length){ $('vRes').innerHTML='<p class="note">No encontré productos en el texto. Revisa que diga cantidad y producto, por ejemplo «100 gorras malla fábrica 1,25 venta 1,50».</p>'; $('vFoot').hidden=true; return; }
  $('vRes').innerHTML='<p class="hint">Revisa antes de agregar. Puedes corregir cualquier valor.</p>'+vLineas.map(function(l,i){
    var falta=l.fab===null||l.pub===null;
    return '<div class="vrow" data-l="'+i+'"><div class="vrow-top"><input type="checkbox" data-vk="ok" '+(l.ok?'checked':'')+' aria-label="Incluir">'+
      '<input class="item-desc" data-vk="desc" value="'+esc(l.desc)+'" aria-label="Descripción"></div>'+
      '<div class="item-nums"><label class="mini"><span>Cantidad</span><input data-vk="qty" inputmode="numeric" value="'+esc(dec(l.qty))+'"></label>'+
      '<label class="mini"><span>Fábrica c/u</span><input data-vk="fab" inputmode="decimal" value="'+esc(l.fab===null?'':decP(l.fab))+'" placeholder="falta"></label>'+
      '<label class="mini pub"><span>Tu precio c/u</span><input data-vk="pub" inputmode="decimal" value="'+esc(l.pub===null?'':decP(l.pub))+'" placeholder="falta"></label></div>'+
      (l.prodId?'<span class="tag-cat">Tomado del catálogo</span>':(falta?'<span class="hint warn">Completa el precio que falta.</span>':''))+'</div>';
  }).join('');
  $('vFoot').hidden=false; vContar();
}
function vContar(){ var n=vLineas.filter(function(l){ return l.ok; }).length; $('vAgregar').textContent=n?'Agregar '+n+' producto'+(n===1?'':'s'):'Nada seleccionado'; $('vAgregar').disabled=!n; }
$('vRes').addEventListener('input',function(e){
  var k=e.target.getAttribute('data-vk'); if(!k) return;
  var l=vLineas[+e.target.closest('[data-l]').getAttribute('data-l')];
  if(k==='ok'){ l.ok=e.target.checked; vContar(); } else if(k==='desc') l.desc=e.target.value; else l[k]=e.target.value===''?null:num(e.target.value);
});
$('vAgregar').onclick=function(){
  var n=0;
  vLineas.forEach(function(l){ if(!l.ok||!String(l.desc).trim()) return;
    var fb=l.fab===null?'':l.fab, pb=l.pub===null?'':l.pub; if(cur.modo==='compra' && !(num(fb)>0) && num(pb)>0){ fb=pb; pb=''; }
    cur.items.push({desc:String(l.desc).trim(),qty:num(l.qty)||1,fab:fb,pub:pb,prodId:l.prodId||''}); n++; });
  marcarSucio(); pintarItems(); cerrar('dlgVoz'); $('vTxt').value=''; toast(n+' producto'+(n===1?'':'s')+' agregado'+(n===1?'':'s'));
};

/* ═════════ Contactos del teléfono (Contact Picker API · Chrome Android) ═════════ */
var hayContactos=('contacts' in navigator) && ('ContactsManager' in window);
document.querySelectorAll('[data-contactos]').forEach(function(b){ b.hidden=!hayContactos; });
$('cContactosHint').hidden=hayContactos;
function mejorTel(tels){
  tels=(tels||[]).map(function(t){ return String(t).trim(); }).filter(Boolean);
  // prefiere celular (09… o +593 9…), que es el que tiene WhatsApp
  var cel=tels.filter(function(t){ var d=telWA(t); return /^5939\d{8}$/.test(d); })[0];
  return cel||tels[0]||'';
}
function elegirContactos(multiple){
  return navigator.contacts.select(['name','tel'],{multiple:!!multiple}).then(function(lista){
    return (lista||[]).map(function(c){ return {nombre:((c.name||[])[0]||'').trim(), tel:mejorTel(c.tel)}; })
      .filter(function(c){ return c.nombre||c.tel; });
  }).catch(function(){ toast('No se pudo abrir tus contactos'); return []; });
}
$('pvContacto').onclick=function(){
  elegirContactos(false).then(function(l){ if(!l.length) return;
    if(l[0].nombre) $('pvNombre').value=l[0].nombre; if(l[0].tel) $('pvTel').value=l[0].tel;
    if(!l[0].tel) toast('Ese contacto no tiene número'); });
};
$('cProvContactos').onclick=function(){
  elegirContactos(true).then(function(l){ if(!l.length) return;
    var a=provs(), nuevos=0, repetidos=0;
    l.forEach(function(c){
      var d=telWA(c.tel);
      if(a.some(function(p){ return (d && telWA(p.tel)===d) || (!d && p.nombre.toLowerCase()===c.nombre.toLowerCase()); })){ repetidos++; return; }
      a.push({id:uid(),nombre:c.nombre||('+'+d),tel:c.tel,nota:''}); nuevos++;
    });
    saveProvs(a); pintarCfgProvs(); pintarProvSelect();
    toast(nuevos+' proveedor'+(nuevos===1?'':'es')+' agregado'+(nuevos===1?'':'s')+(repetidos?' · '+repetidos+' ya estaba'+(repetidos===1?'':'n'):''));
  });
};

/* ═════════ Catálogo precargado (semilla de RICCHARY V2) ═════════
   Precio de la V2 = tu precio. El precio de fábrica queda vacío para
   que lo completes. Se carga una sola vez y no duplica por nombre. */
var SEMILLA=[
  ['Gorra Trucker Malla Simple','Gorras',2.00],
  ['Gorra Malla Premium','Gorras',5.50],
  ['Gorra Gabardina Premium','Gorras',5.50],
  ['Gorra Gabardina / Algodón','Gorras',2.50],
  ['Camiseta Algodón Jersey','Polos & Camisetas',8.00],
  ['Polo Unicolor Corporativo','Polos & Camisetas',10.00],
  ['Polo Combinado','Polos & Camisetas',12.00],
  ['Chaqueta Promo Estándar','Chaquetas Universitarias',23.00],
  ['Chaqueta con Capucha','Chaquetas Universitarias',24.50],
  ['Chaqueta Diseño Especial','Chaquetas Universitarias',33.00],
  ['Chaqueta Forro Interno Personalizado','Chaquetas Universitarias',35.00],
  ['Chaqueta Completa + Capucha','Chaquetas Universitarias',38.00],
  ['Chaleco Liviano Económico','Chalecos & Chompas',8.50],
  ['Chaleco Labrado Clima Frío','Chalecos & Chompas',10.50],
  ['Chaleco Térmico Simple','Chalecos & Chompas',7.00],
  ['Chompa Labrada Clima Frío','Chalecos & Chompas',13.00]
];
(function sembrar(){
  if(cfg().semilla) return;
  var a=prods(), hay={}; a.forEach(function(p){ hay[p.nombre.toLowerCase()]=1; });
  SEMILLA.forEach(function(x){ if(!hay[x[0].toLowerCase()]) a.push({id:uid(),nombre:x[0],cat:x[1],fab:'',pub:x[2]}); });
  saveProds(a); setCfg({semilla:'v2-16'});
})();

/* ═════════ Control de gastos RICCHARY (misma app web: richardpeluche.github.io) ═════════
   Una compra marcada como Pagado se anota en `ricchary_gastos` de RICCHARY V2 y, si en este
   navegador hay sesión abierta de RICCHARY, también en su tabla `gastos` de Supabase.
   Nunca refresca la sesión de RICCHARY: si el token venció, queda en cola hasta que esa app lo renueve. */
var GastoRic=(function(){
  var KG='ricchary_gastos', KM='ricchary_gastos_nube_map', KP='flash_gasto_pend',
      SBU='https://outmfhjwwghqqqaziwzf.supabase.co', SBK='sb_publishable_4felda3eltMgSK8zuobiqQ_KvKxenJC',
      KS='sb-outmfhjwwghqqqaziwzf-auth-token';
  function lj(k,d){ try{ var x=JSON.parse(localStorage.getItem(k)); return x==null?d:x; }catch(e){ return d; } }
  function sj(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
  function activo(){ return cfg().gastoRic!==false; }
  function lid(id){ return 'flash-'+id; }
  function fechaDe(iso){ var d=new Date(iso||Date.now()); if(isNaN(d)) d=new Date();
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function datos(v){ return {fecha:fechaDe(v.cobradoAt),monto:Math.round(calc(v.items).fab*100)/100,
    concepto:etqDe(v)+' · '+((provPorId(v.provId)||{}).nombre||v.provNombre||'Proveedor')}; }
  function sesion(){
    var s=lj(KS,null); if(s && s.currentSession) s=s.currentSession;
    if(!s || !s.access_token || !s.user || !s.user.id) return null;
    if(s.expires_at && s.expires_at*1000 < Date.now()+60000) return null;
    return s;
  }
  function api(path,metodo,cuerpo){
    var s=sesion(); if(!s) return Promise.reject(new Error('sin sesión'));
    return fetch(SBU+'/rest/v1/'+path,{method:metodo||'GET',headers:{apikey:SBK,Authorization:'Bearer '+s.access_token,
      'Content-Type':'application/json',Prefer:'return=representation'},body:cuerpo?JSON.stringify(cuerpo):undefined})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text().then(function(t){ return t?JSON.parse(t):null; }); });
  }
  function encolar(vid,op,g){ var p=lj(KP,{}), s=sesion(); p[vid]={op:op,g:g,uid:s?s.user.id:null}; sj(KP,p); }
  function quitarLocalesDe(nid,menos){
    if(nid==null) return;
    var a=lj(KG,[]), m=lj(KM,{}), b=a.filter(function(x){ return x.id===menos || String(m[x.id])!==String(nid); });
    if(b.length!==a.length){ a.forEach(function(x){ if(b.indexOf(x)<0) delete m[x.id]; }); sj(KG,b); sj(KM,m); }
  }

  function poner(v){
    var g=datos(v), k=lid(v.id), a=lj(KG,[]), m=lj(KM,{}), reg={id:k,fecha:g.fecha,monto:g.monto,concepto:g.concepto}, i=-1;
    a.forEach(function(x,n){ if(x.id===k) i=n; });
    if(i>-1){ var o=a[i]; if(o.fecha===reg.fecha && num(o.monto)===reg.monto && o.concepto===reg.concepto && !lj(KP,{})[v.id]) return; a[i]=reg; }
    else a.push(reg);
    sj(KG,a); quitarLocalesDe(m[k],k);
    encolar(v.id,'put',g); vaciar();
  }
  function quitar(vid){
    var k=lid(vid), a=lj(KG,[]), m=lj(KM,{}), nid=m[k], viejo=a.filter(function(x){ return x.id===k; })[0];
    var p=lj(KP,{}), g=viejo?{concepto:viejo.concepto}:(p[vid]&&p[vid].g)||null;
    if(viejo){ sj(KG,a.filter(function(x){ return x.id!==k; })); }
    quitarLocalesDe(nid,null);
    if(nid!=null || g){ encolar(vid,'del',g); vaciar(); }
  }
  function sync(v){
    if(!v || !esCompra(v)) return;
    if(v.estado==='cobrada' && activo()) poner(v);
    else if(lj(KM,{})[lid(v.id)]!=null || lj(KG,[]).some(function(x){ return x.id===lid(v.id); }) || lj(KP,{})[v.id]) quitar(v.id);
  }

  /* cola hacia Supabase de RICCHARY */
  var corriendo=false, otraVez=false;
  function uno(vid,t){
    var s=sesion(), k=lid(vid), m=lj(KM,{}), nid=m[k], g=t.g||{};
    if(t.uid && t.uid!==s.user.id) return Promise.reject(new Error('otra cuenta de RICCHARY'));
    if(t.op==='del'){
      var porId=nid!=null?api('gastos?id=eq.'+encodeURIComponent(nid)+'&user_id=eq.'+s.user.id,'DELETE'):Promise.resolve();
      return porId.then(function(){ var mm=lj(KM,{}); delete mm[k]; sj(KM,mm); });
    }
    var cuerpo={fecha:g.fecha,concepto:g.concepto,monto:g.monto};
    var paso=nid!=null
      ? api('gastos?id=eq.'+encodeURIComponent(nid)+'&user_id=eq.'+s.user.id,'PATCH',cuerpo).then(function(r){ return r&&r.length?r[0].id:null; })
      : api('gastos?select=id&user_id=eq.'+s.user.id+'&concepto=eq.'+encodeURIComponent(g.concepto)).then(function(r){ return r&&r.length?r[0].id:null; });
    return paso.then(function(id){
      if(id!=null){ if(nid==null) return api('gastos?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+s.user.id,'PATCH',cuerpo).then(function(){ return id; }); return id; }
      return api('gastos','POST',{user_id:s.user.id,fecha:g.fecha,concepto:g.concepto,monto:g.monto}).then(function(r){ return r&&r[0]?r[0].id:null; });
    }).then(function(id){ if(id==null) throw new Error('sin id'); var mm=lj(KM,{}); mm[k]=id; sj(KM,mm); quitarLocalesDe(id,k); });
  }
  function vaciar(){
    if(corriendo){ otraVez=true; return Promise.resolve(); }
    var p=lj(KP,{}), ids=Object.keys(p);
    if(!ids.length || !sesion() || !navigator.onLine) return Promise.resolve();
    corriendo=true;
    return ids.reduce(function(pr,vid){ return pr.then(function(){
      var t=lj(KP,{})[vid]; if(!t) return;
      return uno(vid,t).then(function(){ var q=lj(KP,{}); if(q[vid] && q[vid].op===t.op && JSON.stringify(q[vid].g)===JSON.stringify(t.g)){ delete q[vid]; sj(KP,q); } }).catch(function(){});
    }); },Promise.resolve()).then(function(){ corriendo=false; if(otraVez){ otraVez=false; return vaciar(); } });
  }
  function revisarTodo(){ ventas().forEach(function(v){ if(esCompra(v) && v.estado==='cobrada') sync(v); }); }
  function pintarSt(){
    var el=$('cGastoSt'); if(!el) return;
    var n=Object.keys(lj(KP,{})).length, s=lj(KS,null);
    el.textContent=!activo()?'':sesion()?('Conectado con tu nube de RICCHARY'+(n?' · '+n+' por subir':'')+'.'):
      (s?'La sesión de RICCHARY venció: abre esa app un momento para que se suban'+(n?' las '+n+' pendientes':'')+'.':'Se anotan en RICCHARY de este navegador. Para subirlas a tu nube, inicia sesión en RICCHARY aquí.');
  }
  return {sync:sync,quitar:quitar,vaciar:vaciar,revisarTodo:revisarTodo,pintarSt:pintarSt};
})();
window.GastoRic=GastoRic;


/* ═════════ Nube: sincronización y pedidos compartidos ═════════ */
var FlashNube=(function(){
  var APK_URL='https://github.com/richardpeluche/flash-gestion/releases/latest/download/Flash.apk'; // enlace de descarga de la APK (GitHub Release); vacío = invitación por Chrome
  var URL_='https://shcbozuzwzkzphkmjfwo.supabase.co', KEY='sb_publishable_6SPPZniYeZXK3CxV81Y92g_A9tn3y7b';
  var KN='flash_nube', KH='flash_nube_hash';
  function st(){ return load(KN,null); }
  function setSt(o){ var c=st()||{}; for(var k in o) c[k]=o[k]; try{ localStorage.setItem(KN,JSON.stringify(c)); }catch(e){} return c; }
  function rpc(fn,args){
    return fetch(URL_+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})})
      .then(function(r){ return r.text().then(function(t){ var j=null; try{ j=t?JSON.parse(t):null; }catch(e){}
        if(!r.ok) throw new Error((j&&(j.message||j.hint))||('HTTP '+r.status)); return j; }); });
  }
  function hash(x){ var s=JSON.stringify(x), h=5381; for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return String(h); }
  var CFG_SYNC=['emp','meta','diasCobro','ivaDef','nombre','ultimoNum','ultimoNumCompra','semilla'];
  function cfgSub(){ var c=cfg(), o={}; CFG_SYNC.forEach(function(k){ if(c[k]!==undefined) o[k]=c[k]; }); return o; }
  function locales(){
    var m={};
    ventas().forEach(function(v){ m['venta:'+v.id]={tipo:'venta',id:v.id,data:v}; });
    provs().forEach(function(v){ m['prov:'+v.id]={tipo:'prov',id:v.id,data:v}; });
    prods().forEach(function(v){ m['prod:'+v.id]={tipo:'prod',id:v.id,data:v}; });
    m['cfg:cfg']={tipo:'cfg',id:'cfg',data:cfgSub()};
    var l=logo(); if(l) m['cfg:logo']={tipo:'cfg',id:'logo',data:l};
    return m;
  }
  var aplicando=false, enCurso=null, timer=null, enlaces={};
  function cambio(k){ if(aplicando || !st() || !st().clave) return; if([K.ventas,K.prov,K.prod,K.cfg,K.logo].indexOf(k)<0) return; clearTimeout(timer); timer=setTimeout(sync,2500); }
  function aplicarRemoto(items){
    if(!items || !items.length) return 0;
    var hs=load(KH,{}), vs=ventas(), ps=provs(), pr=prods(), n=0, faltan=[];
    function upsert(arr,it){ var i=-1; arr.forEach(function(x,k){ if(x.id===it.id) i=k; }); if(it.borrado){ if(i>-1){ arr.splice(i,1); n++; } } else { if(i>-1) arr[i]=it.data; else arr.push(it.data); n++; } }
    items.forEach(function(it){
      var key=it.tipo+':'+it.id;
      if(it.tipo==='venta'){ upsert(vs,it); if(!it.borrado) (it.data.imgs||[]).forEach(function(id){ faltan.push(id); }); }
      else if(it.tipo==='prov') upsert(ps,it);
      else if(it.tipo==='prod') upsert(pr,it);
      else if(it.tipo==='cfg' && it.id==='cfg' && it.data){ var c=cfg(); CFG_SYNC.forEach(function(k){ if(it.data[k]!==undefined) c[k]=it.data[k]; }); c.ultimoNum=Math.max(num(c.ultimoNum),num(it.data.ultimoNum)); c.ultimoNumCompra=Math.max(num(c.ultimoNumCompra),num(it.data.ultimoNumCompra)); try{ localStorage.setItem(K.cfg,JSON.stringify(c)); }catch(e){} }
      else if(it.tipo==='cfg' && it.id==='logo' && it.data){ try{ localStorage.setItem(K.logo,it.data); }catch(e){} }
      hs[key]=it.borrado?'x':hash(it.data);
    });
    // evita catálogos duplicados cuando dos dispositivos cargaron la misma semilla: queda el de la nube
    var rem={}; items.forEach(function(it){ if(it.tipo==='prod' && !it.borrado) rem[it.id]=1; });
    pr.sort(function(x,y){ return (rem[y.id]?1:0)-(rem[x.id]?1:0); });
    var vistos={}; pr=pr.filter(function(x){ var k=String(x.nombre||'').toLowerCase().trim(); if(vistos[k]) return false; vistos[k]=1; return true; });
    aplicando=true; saveVentas(vs); saveProvs(ps); saveProds(pr); aplicando=false;
    try{ localStorage.setItem(KH,JSON.stringify(hs)); }catch(e){}
    faltan.forEach(function(id){ imgGet(id).then(function(d){ if(d) return; rpc('flash_img',{p_clave:st().clave,p_vendedor:null,p_id:id}).then(function(dd){ if(dd) imgPut(id,dd); }).catch(function(){}); }); });
    return n;
  }
  function aplicarEstados(es){
    if(!es || !es.length) return;
    var a=ventas(), cambios=[], reportes=[], tocado=false;
    es.forEach(function(e){ a.forEach(function(v){ if(v.id!==e.id || !esReal(e.estado) || v.estado==='cobrada') return;
      if(e.estado==='cobrada'){ if(!v.pagoReportado){ v.pagoReportado=new Date().toISOString(); reportes.push(v); tocado=true; } return; }
      if(v.pagoReportado){ delete v.pagoReportado; tocado=true; }
      if(v.estado!==e.estado){ v.estado=e.estado; v.actualizado=new Date().toISOString(); cambios.push(v); } }); });
    if(!cambios.length && !tocado) return;
    saveVentas(a);
    if(reportes.length) toast((reportes[0].provNombre||'Tu proveedor')+' reporta el pago de '+etqDe(reportes[0])+': confírmalo en tus pedidos');
    if(!cambios.length){ if($('dlgHist').open) pintarHist(); return; }
    cambios.forEach(function(v){ if(cur.id===v.id){ cur.estado=v.estado; persistirBorrador(); pintarCabecera(); } GastoRic.sync(v); });
    var v=cambios[0]; toast((v.provNombre||'Tu proveedor')+' marcó '+etqDe(v)+': '+estTxt(v.estado,v.modo)+(cambios.length>1?' (y '+(cambios.length-1)+' más)':''));
    pintarMeta(); if($('dlgHist').open) pintarHist();
  }
  function subirImgsDe(lista){
    var s=st(), hechas=s.imgsSubidas||{}, ids=[];
    lista.forEach(function(v){ (v.imgs||[]).forEach(function(id){ if(!hechas[id]) ids.push(id); }); });
    return ids.reduce(function(pr,id){ return pr.then(function(){ return imgGet(id).then(function(d){ if(!d) return;
      return rpc('flash_subir_img',{p_clave:s.clave,p_id:id,p_data:d}).then(function(){ hechas[id]=1; setSt({imgsSubidas:hechas}); }); }); }); }, Promise.resolve()).catch(function(){});
  }
  function sync(){
    var s=st(); if(!s || !s.clave) return Promise.resolve(false);
    if(enCurso) return enCurso;
    if(!navigator.onLine){ pintarEstadoNube('Sin internet: se sincroniza al volver'); return Promise.resolve(false); }
    var desde=s.desde?new Date(new Date(s.desde).getTime()-3000).toISOString():'1970-01-01T00:00:00Z';
    enCurso=rpc('flash_bajar',{p_clave:s.clave,p_desde:desde}).then(function(r){
      var n=aplicarRemoto(r.items||[]); aplicarEstados(r.estados||[]);
      setSt({desde:r.ahora});
      if(n){ pintarProvSelect(); if(!cur.sucio || !cur.items.length){ /* el borrador queda igual */ } }
      var hs=load(KH,{}), loc=locales(), sub=[], ahora=Date.now();
      Object.keys(loc).forEach(function(k){ var h=hash(loc[k].data); if(hs[k]!==h){ sub.push({tipo:loc[k].tipo,id:loc[k].id,data:loc[k].data,act:ahora}); hs[k]=h; } });
      Object.keys(hs).forEach(function(k){ if(!loc[k] && hs[k]!=='x'){ var p=k.split(':'); sub.push({tipo:p[0],id:p.slice(1).join(':'),data:null,act:ahora,borrado:true}); hs[k]='x'; } });
      var lotes=[]; for(var i=0;i<sub.length;i+=100) lotes.push(sub.slice(i,i+100));
      return lotes.reduce(function(pr,l){ return pr.then(function(){ return rpc('flash_subir',{p_clave:s.clave,p_items:l}); }); },Promise.resolve())
        .then(function(){ try{ localStorage.setItem(KH,JSON.stringify(hs)); }catch(e){} setSt({ultSync:new Date().toISOString()});
          return subirImgsDe(ventas()); })
        .then(function(){ return refrescarEnlaces(); });
    }).then(function(){ pintarEstadoNube(); return true; })
      .catch(function(e){ pintarEstadoNube('No se pudo sincronizar: '+e.message); return false; })
      .then(function(r){ enCurso=null; return r; });
    return enCurso;
  }
  function refrescarEnlaces(){
    var s=st(); if(!s||!s.clave) return Promise.resolve();
    return rpc('flash_enlaces_mios',{p_clave:s.clave}).then(function(l){ enlaces={}; (l||[]).forEach(function(e){ enlaces[e.prov_id]=e; }); setSt({enlaces:enlaces}); try{ pintarProvSelect(); pintarCfgProvs(); }catch(e){} })
      .then(function(){ return rpc('flash_yo',{p_clave:s.clave}); }).then(function(y){ setSt({esProveedor:y.proveedorDe>0,nombre:y.nombre}); pintarHomeRec(); }).catch(function(){});
  }
  function conectado(provId){ var s=st(); var e=(s&&s.enlaces||enlaces)[provId]; return !!(s && s.clave && e && e.conectado); }
  function datosPublicos(v){
    return {num:v.num,modo:v.modo==='compra'?'compra':'proveedor',fecha:v.fecha,items:(v.items||[]).map(function(i){ return {desc:i.desc,qty:num(i.qty),fab:num(i.fab),pub:num(i.pub)}; }),
      notas:v.notas||'',imgs:v.imgs||[],vendedor:(emp().nombre||cfg().nombre||''),provNombre:v.provNombre||''};
  }
  function publicar(v,forzar){
    var s=st(); if(!s || !s.clave || !v || !v.provId) return Promise.resolve(false);
    if(!forzar && !conectado(v.provId)) return Promise.resolve(false);
    return subirImgsDe([v]).then(function(){ return rpc('flash_publicar',{p_clave:s.clave,p_id:v.id,p_prov_id:v.provId,p_data:datosPublicos(v),p_estado:v.estado}); })
      .then(function(){ return true; }).catch(function(){ var pend=st().pendPub||{}; pend[v.id]=1; setSt({pendPub:pend}); return false; });
  }
  function reintentarPub(){ var s=st(); if(!s||!s.pendPub) return; var ids=Object.keys(s.pendPub); if(!ids.length) return; setSt({pendPub:{}});
    ventas().filter(function(v){ return ids.indexOf(v.id)>-1; }).forEach(function(v){ publicar(v,true); }); }

  function retirar(id){
    var s=st(); if(!s||!s.clave) return;
    rpc('flash_retirar_pedido',{p_clave:s.clave,p_id:id}).catch(function(){ var p=st().pendRet||{}; p[id]=1; setSt({pendRet:p}); });
  }
  function reintentarRet(){ var s=st(); if(!s||!s.pendRet) return; var ids=Object.keys(s.pendRet); if(!ids.length) return; setSt({pendRet:{}}); ids.forEach(retirar); }

  /* ── cuenta ── */
  function activar(nombre){
    return rpc('flash_crear_cuenta',{p_nombre:nombre,p_tel:emp().tel||''}).then(function(r){
      try{ localStorage.removeItem(KH); }catch(e){}
      setSt({clave:r.clave,id:r.id,nombre:nombre,desde:null,imgsSubidas:{}}); return sync();
    });
  }
  function entrar(clave){
    return rpc('flash_yo',{p_clave:clave}).then(function(y){
      try{ localStorage.removeItem(KH); }catch(e){}
      setSt({clave:clave,id:y.id,nombre:y.nombre,desde:null,imgsSubidas:{},esProveedor:y.proveedorDe>0}); return sync();
    });
  }
  function salir(){ desactivarPush(); try{ localStorage.removeItem(KN); localStorage.removeItem(KH); }catch(e){} enlaces={}; pintarAjustes(); pintarHomeRec(); }

  /* ── notificaciones push ── */
  function pushSoportado(){ return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function b64u(t){ var p='='.repeat((4-t.length%4)%4), r=atob((t+p).replace(/-/g,'+').replace(/_/g,'/')), a=new Uint8Array(r.length); for(var i=0;i<r.length;i++) a[i]=r.charCodeAt(i); return a; }
  function regSW(){ return navigator.serviceWorker.ready; }
  function guardarSub(sub){ var j=sub.toJSON(), s=st(); if(!s||!s.clave) return Promise.resolve(false);
    return rpc('flash_push_guardar',{p_clave:s.clave,p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth}).then(function(){ setSt({push:true,pushAt:Date.now()}); return true; }); }
  function activarPush(manual){
    var s=st(); if(!s||!s.clave){ if(manual) toast('Primero activa tu cuenta en la nube'); return Promise.resolve(false); }
    if(!pushSoportado()){ if(manual) toast('Este navegador no permite notificaciones'); return Promise.resolve(false); }
    return Promise.resolve(Notification.permission==='granted'?'granted':Notification.requestPermission()).then(function(perm){
      if(perm!=='granted'){ if(manual) toast(perm==='denied'?'Las notificaciones están bloqueadas: actívalas en los permisos de la app':'No se activaron las notificaciones'); pintarPush(); return false; }
      return Promise.all([regSW(),rpc('flash_push_vapid',{})]).then(function(r){ var reg=r[0], pub=r[1]; if(!pub) throw new Error('servidor sin llave');
        return reg.pushManager.getSubscription().then(function(sub){ return sub||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(pub)}); }); })
        .then(guardarSub).then(function(ok){ if(manual && ok) toast('Notificaciones activadas'); pintarPush(); return ok; });
    }).catch(function(e){ if(manual) toast('No se pudieron activar: '+e.message); pintarPush(); return false; });
  }
  function desactivarPush(){
    if(!pushSoportado()) return Promise.resolve();
    var s=st(); setSt({push:false});
    return regSW().then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){ if(!sub) return;
      var ep=sub.endpoint; return sub.unsubscribe().then(function(){ if(s&&s.clave) return rpc('flash_push_quitar',{p_clave:s.clave,p_endpoint:ep}); }); })
      .catch(function(){}).then(function(){ pintarPush(); });
  }
  function revisarPush(){
    var s=st(); if(!s||!s.clave||!pushSoportado()||Notification.permission!=='granted'||s.push===false) return;
    regSW().then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
      if(!sub) return activarPush(false);
      if(!s.pushAt || Date.now()-s.pushAt>86400000*3) return guardarSub(sub);
    }).catch(function(){});
  }
  function pintarPush(){
    var s=st(), con=!!(s&&s.clave), sop=pushSoportado(), perm=sop?Notification.permission:'denied', on=con&&sop&&perm==='granted'&&s.push;
    var falta=con&&sop&&!on&&perm!=='denied';
    ['homePush','recPush'].forEach(function(id){ var b=$(id); if(b) b.hidden=!falta; });
    var st_=$('nPushSt'), acc=$('nPushAcc'); if(!st_) return;
    if(!sop){ st_.textContent='Este navegador no permite notificaciones.'; acc.innerHTML=''; return; }
    if(perm==='denied'){ st_.textContent='Están bloqueadas. Actívalas en Ajustes del teléfono → Apps → Flash (o Chrome) → Notificaciones.'; acc.innerHTML=''; return; }
    st_.textContent=on?'Activadas en este teléfono: te avisamos de pedidos nuevos y cambios de estado.':'Desactivadas en este teléfono.';
    acc.innerHTML=on?'<button class="btn btn-ghost btn-sm" id="nPushOff">Desactivar</button>':'<button class="btn btn-ink btn-sm" id="nPush"><svg class="ic"><use href="#i-bell"/></svg>Activar notificaciones</button>';
  }
  function abrirDesdeAviso(ver){
    if(ver==='recibidos') abrirRecibidos();
    else if(ver==='historial'){ sync().then(function(){ $('btnHist').click(); }); }
  }
  if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',function(e){
    var d=e.data||{}; if(d.type==='push'){ alVolver(); } else if(d.type==='abrir'){ abrirDesdeAviso(d.ver); }
  });

  /* ── UI ajustes ── */
  function pintarEstadoNube(msg){
    var el=$('nubeEstado'); if(!el) return; var s=st();
    el.className='nube-st'+(msg?' off':''); el.innerHTML='<i></i><span>'+esc(msg||('Sincronizado'+(s&&s.ultSync?' · '+new Date(s.ultSync).toLocaleString('es-EC',{dateStyle:'short',timeStyle:'short'}):'')))+'</span>';
  }
  function pintarAjustes(){
    var box=$('nubeBox'), s=st();
    if(!s || !s.clave){
      box.innerHTML='<p class="hint">Guarda tus pedidos, proveedores y catálogo en la nube para usarlos en otro teléfono o en la PC, y para que tus proveedores reciban los pedidos en su app.</p>'+
        '<div class="field"><label for="nNombre">Tu nombre o el de tu negocio</label><input id="nNombre" class="inp" value="'+esc(emp().nombre||cfg().nombre||'')+'"></div>'+
        '<button class="btn btn-ink" id="nActivar"><svg class="ic"><use href="#i-ul"/></svg>Activar cuenta en la nube</button>'+
        '<details class="more"><summary>Ya tengo cuenta: entrar con mi clave<svg class="ic"><use href="#i-down"/></svg></summary><div class="more-body">'+
        '<div class="field"><label for="nClave">Clave de acceso</label><input id="nClave" class="inp" placeholder="FL-…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>'+
        '<button class="btn btn-ghost" id="nEntrar">Entrar</button></div></details>';
      return;
    }
    box.innerHTML='<div class="nube-st" id="nubeEstado"></div>'+
      '<p class="hint">Cuenta: <b>'+esc(s.nombre||'')+'</b></p>'+
      '<span class="lbl">Tu clave de acceso (para entrar desde otro teléfono o PC)</span>'+
      '<div class="clave" id="nClaveVer">••••••••••••••••</div>'+
      '<div class="foot-actions"><button class="btn btn-ghost btn-sm" id="nMostrar">Mostrar</button><button class="btn btn-ghost btn-sm" id="nCopiar"><svg class="ic"><use href="#i-copy"/></svg>Copiar clave</button></div>'+
      '<p class="hint warn">Guárdala en un lugar seguro. Quien la tenga puede ver tus datos, y sin ella no puedes recuperar la cuenta.</p>'+
      '<div class="foot-actions"><button class="btn btn-ink" id="nSync"><svg class="ic"><use href="#i-repeat"/></svg>Sincronizar</button><button class="btn btn-ghost" id="nSalir">Cerrar sesión aquí</button><button class="btn btn-ghost" id="nRotar">Cambiar clave</button></div>'+
      '<span class="lbl" style="margin-top:6px">Notificaciones</span><p class="hint" id="nPushSt"></p><div class="foot-actions" id="nPushAcc"></div>';
    pintarEstadoNube(); pintarPush();
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest('button'); if(!t) return;
    if(t.id==='nActivar'){ var n=$('nNombre').value.trim(); if(!n){ toast('Escribe tu nombre'); return; } t.disabled=true; t.textContent='Activando…';
      activar(n).then(function(){ toast('Cuenta activada. Guarda tu clave de acceso'); pintarAjustes(); }).catch(function(err){ t.disabled=false; toast('No se pudo activar: '+err.message); pintarAjustes(); }); }
    else if(t.id==='nEntrar'){ var c=$('nClave').value.trim(); if(!c){ toast('Pega tu clave'); return; }
      if((ventas().length||provs().length) && !confirm('Este dispositivo tiene pedidos o proveedores guardados y se subirán a la cuenta en la que entras. ¿Continuar?')) return;
      t.disabled=true;
      entrar(c).then(function(){ toast('Listo: datos sincronizados'); pintarAjustes(); pintarForm(); pintarMeta(); }).catch(function(err){ t.disabled=false; toast(/clave_invalida/.test(err.message)?'Esa clave no existe':'No se pudo entrar: '+err.message); }); }
    else if(t.id==='nMostrar'){ var v=$('nClaveVer'); if(v.textContent.indexOf('FL-')===0){ v.textContent='••••••••••••••••'; t.textContent='Mostrar'; } else { v.textContent=st().clave; t.textContent='Ocultar'; } }
    else if(t.id==='nCopiar'){ copiar(st().clave,'Clave copiada'); }
    else if(t.id==='nSync'){ pintarEstadoNube('Sincronizando…'); sync().then(function(ok){ if(ok){ toast('Sincronizado'); pintarForm(); } }); }
    else if(t.id==='nPush' || t.id==='homePush' || t.id==='recPush'){ activarPush(true); }
    else if(t.id==='nPushOff'){ desactivarPush().then(function(){ toast('Notificaciones desactivadas en este teléfono'); }); }
    else if(t.id==='nSalir'){ if(!confirm('¿Cerrar la sesión en este dispositivo? Para volver a entrar necesitas tu clave.')) return;
      if(!confirm('¿Borrar también tus pedidos y clientes de este dispositivo? Siguen guardados en la nube.\n\nAceptar: borrarlos (recomendado en equipos compartidos).\nCancelar: dejarlos aquí.')){ salir(); return; }
      sync().then(function(ok){ if(!ok && !confirm('No se pudo sincronizar: podrías perder los cambios recientes. ¿Borrar igual?')){ salir(); return; } salir(); borrarDatosLocales(); toast('Sesión cerrada y datos borrados'); }); }
    else if(t.id==='pvInvitar'){ invitar(t.getAttribute('data-prov')); }
    else if(t.id==='pvDesconectar'){ desconectar(t.getAttribute('data-prov')); }
    else if(t.id==='nRotar'){ rotarClave(t); }
  });

  /* ── invitar proveedor ── */
  function pintarConectar(provId){
    var box=$('pvConectar'), s=st();
    if(!provId){ box.innerHTML='<p class="hint">Guarda el proveedor y luego vuelve aquí para invitarlo.</p>'; return; }
    if(!s || !s.clave){ box.innerHTML='<p class="hint">Activa tu cuenta en la nube (Ajustes) para invitar a tu proveedor a recibir los pedidos en su app.</p>'; return; }
    var e=(s.enlaces||{})[provId];
    if(e && e.conectado){ box.innerHTML='<p class="prov-con">Conectado'+(e.nombreCuenta?' como '+esc(e.nombreCuenta):'')+': los pedidos le llegan a su app.</p>'+
      '<button class="btn btn-ghost btn-sm" id="pvDesconectar" data-prov="'+esc(provId)+'">Desconectar proveedor</button>'; return; }
    box.innerHTML='<p class="hint">'+(e?'Invitación enviada, todavía no la acepta. Puedes reenviarla.':'Le llega un enlace por WhatsApp; al abrirlo queda conectado.')+'</p>'+
      '<button class="btn btn-ghost" id="pvInvitar" data-prov="'+esc(provId)+'" style="width:100%"><svg class="ic"><use href="#i-wa"/></svg>'+(e?'Reenviar invitación':'Invitar por WhatsApp')+'</button>'+
      (e?'<button class="btn btn-ghost btn-sm" id="pvDesconectar" data-prov="'+esc(provId)+'" style="margin-top:8px">Anular invitación</button>':'');
  }
  function desconectar(provId){
    var s=st(), e=(s&&s.enlaces||{})[provId]; if(!s||!s.clave) return;
    if(!confirm(e&&e.conectado?'¿Desconectar a este proveedor? Dejará de ver todos sus pedidos y el enlace anterior ya no servirá.':'¿Anular esta invitación? El enlace enviado ya no servirá.')) return;
    rpc('flash_desconectar',{p_clave:s.clave,p_prov_id:provId}).then(function(){ var c=st(), en=c.enlaces||{}; delete en[provId]; setSt({enlaces:en}); delete enlaces[provId];
      return refrescarEnlaces(); }).then(function(){ pintarConectar(provId); toast('Listo: el acceso quedó anulado'); })
      .catch(function(err){ toast('No se pudo: '+err.message); });
  }
  function rotarClave(b){
    var s=st(); if(!s||!s.clave) return;
    if(!confirm('¿Cambiar tu clave de acceso? La actual dejará de servir de inmediato. En tus otros teléfonos o PC tendrás que entrar con la nueva.')) return;
    b.disabled=true;
    rpc('flash_rotar_clave',{p_clave:s.clave}).then(function(r){ setSt({clave:r.clave}); pintarAjustes(); toast('Clave cambiada. Guarda la nueva en un lugar seguro'); })
      .catch(function(err){ b.disabled=false; toast('No se pudo cambiar: '+err.message); });
  }
  function esAndroid(){ return /Android/i.test(navigator.userAgent); }
  function enApp(){ try{ return matchMedia('(display-mode: standalone)').matches || String(document.referrer).indexOf('android-app://')===0; }catch(e){ return false; } }
  function pasosApk(){
    if(!APK_URL || !esAndroid() || enApp()) return false;
    $('apkDescargar').href=APK_URL; abrir('dlgApk'); return true;
  }
  $('apkDescargar').onclick=function(){ setTimeout(function(){ toast('Cuando termine la descarga, ábrela y toca Instalar'); },400); };
  $('apkLuego').onclick=function(){ cerrar('dlgApk'); abrirRecibidos(); };
  function invitar(provId){
    var p=provPorId(provId), s=st(); if(!p||!s) return;
    rpc('flash_invitar',{p_clave:s.clave,p_prov_id:provId,p_nombre:p.nombre}).then(function(r){
      var en=s.enlaces||{}; en[provId]={prov_id:provId,codigo:r.codigo,conectado:r.conectado}; setSt({enlaces:en});
      var link=location.origin+location.pathname.replace(/index\.html$/,'')+'?invita='+r.codigo;
      var msg=APK_URL?('Hola '+p.nombre+', te invito a Flash para recibir mis pedidos directo en tu teléfono, con cantidades, precios e imágenes.\n\n'+
        '*Cómo conectarte (2 minutos):*\n'+
        '1. Abre este enlace en *Chrome*:\n'+link+'\n'+
        '2. Escribe tu nombre y tu WhatsApp, y toca *Aceptar invitación*.\n'+
        '3. Toca *Descargar Flash* y abre el archivo descargado.\n'+
        '4. *Importante:* la primera vez Android dice que no puede instalar apps desconocidas. Toca *Configuración*, activa *Permitir de esta fuente* y vuelve atrás.\n'+
        '5. Toca *Instalar*. Si sale Play Protect: *Más detalles → Instalar de todas formas*.\n'+
        '6. Abre Flash: ya entras conectado.\n\n'+
        'Mis pedidos te aparecen en *Pedidos recibidos*. Ahí marcas cuando está en producción, entregado y cuando pagas.\n\n— '+(emp().rep||s.nombre||'')):
        ('Hola '+p.nombre+', te invito a Flash para recibir mis pedidos directo en tu teléfono, con cantidades, precios e imágenes.\n\n'+
        '*Cómo conectarte:*\n'+
        '1. Abre este enlace en *Chrome* (si se abre en otro navegador, toca los 3 puntos → Abrir en Chrome):\n'+link+'\n'+
        '2. Escribe tu nombre y tu WhatsApp, y toca *Aceptar invitación*.\n'+
        '3. Para tenerla como app: en Chrome toca ⋮ → *Instalar app*. Si no te deja, usa *Crear acceso directo*; funciona igual.\n\n'+
        'Mis pedidos te aparecen en *Pedidos recibidos*. Ahí marcas cuando está en producción, entregado y cuando pagas la comisión.\n\n— '+(emp().rep||s.nombre||''));
      var t=telWA(p.tel); window.open(t?('https://wa.me/'+t+'?text='+encodeURIComponent(msg)):('https://wa.me/?text='+encodeURIComponent(msg)),'_blank');
      pintarConectar(provId);
    }).catch(function(e){ toast('No se pudo crear la invitación: '+e.message); });
  }

  /* ── aceptar invitación ── */
  var codigoInv='';
  function revisarInvitacion(){
    var m=location.search.match(/[?&]invita=([A-Za-z0-9]{6,12})/), guardado=''; try{ guardado=sessionStorage.getItem('flash_invita')||''; }catch(e){}
    if(!m && !guardado) return;
    codigoInv=m?m[1].toUpperCase():guardado; try{ sessionStorage.setItem('flash_invita',codigoInv); history.replaceState(null,'',location.pathname); }catch(e){}
    var s=st(); $('invCampos').hidden=!!(s&&s.clave); $('invSt').textContent='';
    if(!(s&&s.clave)){ $('invNombre').value=emp().nombre||cfg().nombre||''; $('invTel').value=emp().tel||''; }
    abrir('dlgInv');
  }
  $('invAceptar').onclick=function(){
    var b=this, s=st(), paso;
    if(s && s.clave) paso=Promise.resolve(s.clave);
    else{ var n=$('invNombre').value.trim(); if(!n){ toast('Escribe tu nombre'); return; }
      paso=rpc('flash_crear_cuenta',{p_nombre:n,p_tel:$('invTel').value.trim()}).then(function(r){ try{ localStorage.removeItem(KH); }catch(e){} setSt({clave:r.clave,id:r.id,nombre:n,desde:null,imgsSubidas:{}}); return r.clave; }); }
    b.disabled=true; $('invSt').textContent='Conectando…';
    paso.then(function(clave){ return rpc('flash_aceptar',{p_clave:clave,p_codigo:codigoInv}); }).then(function(r){
      if(r && r.error) throw new Error(r.error);
      setSt({esProveedor:true}); if(!cfg().uso) ponerUso('prov'); try{ sessionStorage.removeItem('flash_invita'); }catch(e){} cerrar('dlgInv'); b.disabled=false; pintarHomeRec();
      toast('Listo: ya recibes los pedidos de '+(r.vendedor||'tu vendedor')); if(!pasosApk()) abrirRecibidos(); sync(); activarPush(false);
    }).catch(function(e){ b.disabled=false;
      $('invSt').textContent=/demasiados_intentos/.test(e.message)?'Demasiados intentos. Espera una hora y vuelve a probar.':/codigo_vencido/.test(e.message)?'Esa invitación venció. Pide una nueva.':/codigo_invalido/.test(e.message)?'Esa invitación no existe o ya no es válida.':/codigo_usado/.test(e.message)?'Esa invitación ya la usó otra persona. Pide una nueva.':/mismo_usuario/.test(e.message)?'Esta invitación es tuya: ábrela en el teléfono de tu proveedor.':'No se pudo conectar: '+e.message; });
  };

  /* ── vista del proveedor ── */
  var rec=[], recFiltro='activos';
  function pintarHomeProv(){ var s=st(), sc=$('provSinCon'); if(sc) sc.hidden=!!(s && s.clave && s.esProveedor); }
  function abrirInvitacion(c){ try{ sessionStorage.setItem('flash_invita',String(c).toUpperCase()); }catch(e){} revisarInvitacion(); }
  function pintarHomeRec(){
    pintarHomeProv();
    var s=st(), b=$('goRec'); b.hidden=!(s && s.clave && s.esProveedor);
    var n=rec.filter(function(r){ return r.estado!=='cobrada'; }).length; $('recN').textContent=n?'('+n+')':'';
  }
  function cargarRecibidos(){
    var s=st(); if(!s||!s.clave) return Promise.resolve();
    $('recSt').textContent='Actualizando…';
    return rpc('flash_recibidos',{p_clave:s.clave}).then(function(l){ rec=l||[]; $('recSt').textContent=''; pintarRec(); pintarHomeRec(); })
      .catch(function(e){ $('recSt').textContent='Sin conexión: '+e.message; });
  }
  function abrirRecibidos(){ pintarRec(); abrir('dlgRec'); cargarRecibidos(); }
  var EST_P=[['enviada','Recibido'],['produccion','En producción'],['entregada','Entregado'],['cobrada','Comisión pagada']];
  var EST_PC=[['enviada','Recibido'],['produccion','En preparación'],['entregada','Entregado'],['cobrada','Pagado']];
  function estP(d){ return d && d.modo==='compra'?EST_PC:EST_P; }
  function pintarRec(){
    var box=$('recLista'), l=rec.filter(function(r){ return recFiltro==='todos' || r.estado!=='cobrada'; });
    if(!rec.length){ box.innerHTML='<div class="empty"><b>Aún no te llegan pedidos</b>Cuando tu vendedor te envíe uno, aparece aquí.</div>'; return; }
    if(!l.length){ box.innerHTML='<p class="hint">No tienes pedidos pendientes.</p>'; return; }
    box.innerHTML=l.map(function(r,i){
      var d=r.data||{}, com=d.modo==='compra', EP=estP(d), f=0,pv=0, imgs=Array.isArray(d.imgs)?d.imgs:[], its=(Array.isArray(d.items)?d.items:[]).map(function(it){ it=it||{}; var q=num(it.qty), a=num(it.fab), b=num(it.pub); f+=q*a; pv+=q*b;
        return '<div><span>'+q.toLocaleString('es-EC')+' × '+esc(it.desc)+'</span><small>'+(com?money(a)+' c/u · Total '+money(q*a):'Fábrica '+money(a)+' · Venta '+money(b)+' · Comisión '+money(q*(b-a)))+'</small></div>'; }).join('');
      var k=r.vendedor+'|'+r.id;
      return '<article class="vcard"><div class="vcard-top"><div><b>'+etqDe(d)+' · de '+esc(r.vendedorNombre||d.vendedor||'')+'</b><small>'+fechaTxt(d.fecha)+' · '+(EP.filter(function(x){ return x[0]===r.estado; })[0]||['',''])[1]+'</small></div>'+
        '<div class="vcard-gain"><b class="money" style="color:var(--text)">'+money(f)+'</b><small>tu cobro</small></div></div>'+
        '<div class="rec-items">'+its+'</div>'+
        (com?'<div class="rec-tot"><div class="com">Total a cobrar<b>'+money(f)+'</b></div></div>':'<div class="rec-tot"><div>Total fábrica<b>'+money(f)+'</b></div><div>Venta al cliente<b>'+money(pv)+'</b></div><div class="com">Comisión vendedor<b>'+money(pv-f)+'</b></div></div>')+
        (d.notas?'<p class="hint">Notas: '+esc(d.notas)+'</p>':'')+
        (imgs.length?'<div class="imgs" data-rimgs="'+esc(k)+'">'+imgs.map(function(id){ return '<div class="thumb" data-rimg="'+esc(id)+'"><img alt="Referencia"></div>'; }).join('')+'</div>':'')+
        '<div class="est-seg" data-k="'+esc(k)+'">'+EP.map(function(x){ return '<button data-est="'+x[0]+'" aria-pressed="'+(r.estado===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div>'+
        (r.vendedorTel?'<button class="btn btn-ghost btn-sm" data-wav="'+esc(r.vendedorTel)+'" data-num="'+esc(etqDe(d))+'"><svg class="ic"><use href="#i-wa"/></svg>Escribir al vendedor</button>':'')+
        '</article>';
    }).join('');
    box.querySelectorAll('[data-rimgs]').forEach(function(g){ var vend=g.getAttribute('data-rimgs').split('|')[0];
      g.querySelectorAll('[data-rimg]').forEach(function(t){ var id=t.getAttribute('data-rimg');
        imgGet('r_'+id).then(function(d){ if(d) return d; return rpc('flash_img',{p_clave:st().clave,p_vendedor:vend,p_id:id}).then(function(dd){ if(!imgSegura(dd)) return ''; imgPut('r_'+id,dd); return dd; }); })
          .then(function(d){ var im=t.querySelector('img'); if(imgSegura(d) && im) im.src=d; }).catch(function(){}); }); });
  }
  $('recLista').addEventListener('click',function(e){
    var b=e.target.closest('[data-est]');
    if(b){ var k=b.closest('[data-k]').getAttribute('data-k').split('|'), est=b.getAttribute('data-est');
      var rd=null; rec.forEach(function(r){ if(r.vendedor===k[0] && r.id===k[1]){ r.estado=est; rd=r.data; } }); pintarRec(); pintarHomeRec();
      rpc('flash_estado',{p_clave:st().clave,p_vendedor:k[0],p_id:k[1],p_estado:est}).then(function(){ toast('Estado: '+(estP(rd).filter(function(x){ return x[0]===est; })[0][1])); })
        .catch(function(err){ toast('No se guardó: '+err.message); cargarRecibidos(); }); return; }
    var w=e.target.closest('[data-wav]');
    if(w){ window.open('https://wa.me/'+telWA(w.getAttribute('data-wav'))+'?text='+encodeURIComponent('Hola, sobre el pedido '+w.getAttribute('data-num')+': '),'_blank'); return; }
    var t=e.target.closest('[data-rimg]'); if(t){ var im=t.querySelector('img'); if(im && im.src) verImagen(im.src); }
  });
  $('recFiltro').addEventListener('click',function(e){ var b=e.target.closest('[data-rf]'); if(!b) return; recFiltro=b.getAttribute('data-rf');
    this.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed',String(x===b)); }); pintarRec(); });
  $('goRec').onclick=abrirRecibidos;

  /* ── ciclo ── */
  function alVolver(){ if(document.visibilityState!=='visible') return; reintentarPub(); reintentarRet(); GastoRic.vaciar(); sync(); if($('dlgRec').open) cargarRecibidos(); else if(st()&&st().esProveedor) cargarRecibidos(); }
  document.addEventListener('visibilitychange',alVolver);
  window.addEventListener('online',alVolver);
  setInterval(function(){ if(document.visibilityState==='visible' && st() && st().clave) alVolver(); },60000);
  function iniciar(){ var s=st(); if(s && s.enlaces) enlaces=s.enlaces; pintarHomeRec(); revisarInvitacion(); pintarPush(); if(s && s.clave){ sync(); if(s.esProveedor) cargarRecibidos(); revisarPush(); }
    var m=location.search.match(/[?&]ver=(recibidos|historial)/); if(m){ try{ history.replaceState(null,'',location.pathname); }catch(e){} if(s&&s.clave) setTimeout(function(){ abrirDesdeAviso(m[1]); },300); } }
  return {retirar:retirar,pintarHomeProv:pintarHomeProv,abrirInvitacion:abrirInvitacion,cambio:cambio,sync:sync,publicar:publicar,conectado:conectado,pintarAjustes:pintarAjustes,pintarConectar:pintarConectar,iniciar:iniciar,rpc:rpc,_st:st};
})();
window.FlashNube=FlashNube;

/* ═════════ Arranque ═════════ */
cur=load(K.draft,null);
if(!cur||!Array.isArray(cur.items)) cur=pedidoVacio();
if(!cur.cli) cur.cli={nombre:'',tel:'',dir:''};
if(!cur.modo) cur.modo=cur.estado==='cotizada'?'cliente':'proveedor';
/* ═════════ Modo de uso: proveedor o vendedor ═════════ */
function usoActual(){ return cfg().uso||''; }
function aplicarUso(){ document.body.classList.toggle('uso-prov',usoActual()==='prov'); var c=$('cUsoVend'); if(c) c.checked=usoActual()!=='prov'; if(window.FlashNube) FlashNube.pintarHomeProv(); }
function ponerUso(u){ setCfg({uso:u}); aplicarUso(); }
function decidirUso(){
  if(usoActual()) return;
  var ns=window.FlashNube?FlashNube._st():null, inv=/[?&]invita=/.test(location.search); try{ inv=inv||!!sessionStorage.getItem('flash_invita'); }catch(e){}
  if(ventas().length || provs().length){ ponerUso('vend'); return; }
  if(ns && ns.esProveedor){ ponerUso('prov'); return; }
  if(inv){ ponerUso('prov'); return; }
  var d=$('dlgUso'); d.addEventListener('cancel',function(e){ e.preventDefault(); }); abrir('dlgUso');
}
$('usoProv').onclick=function(){ ponerUso('prov'); cerrar('dlgUso'); toast('Listo. Cuando tu vendedor te invite, sus pedidos llegarán aquí'); };
$('usoVend').onclick=function(){ ponerUso('vend'); cerrar('dlgUso'); };
$('cUsoVend').addEventListener('change',function(){ ponerUso(this.checked?'vend':'prov'); toast(this.checked?'Modo vendedor activado':'Modo solo proveedor'); });
$('provConectar').onclick=function(){
  var t=$('provCodigo').value.trim(), m=t.match(/invita=([A-Za-z0-9]{6,12})/)||t.match(/^([A-Za-z0-9]{6,12})$/);
  if(!m){ toast('Pega el enlace completo que te llegó por WhatsApp'); return; }
  FlashNube.abrirInvitacion(m[1]); $('provCodigo').value='';
};
pintarForm(); pintarMeta(); irInicio(); FlashNube.iniciar(); GastoRic.vaciar(); aplicarUso(); decidirUso();
if(!provs().length) setTimeout(function(){ toast('Empieza agregando a tus proveedores','Agregar',function(){ abrirProvForm(null,true); }); },600);

/* Service worker con aviso de actualización */
if('serviceWorker' in navigator && location.protocol.indexOf('http')===0){
  navigator.serviceWorker.register('./sw.js').then(function(reg){
    function avisar(w){ toast('Hay una versión nueva','Actualizar',function(){ w.postMessage({type:'SKIP_WAITING'}); }); }
    if(reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound',function(){ var w=reg.installing; if(!w) return;
      w.addEventListener('statechange',function(){ if(w.state==='installed' && navigator.serviceWorker.controller) avisar(w); }); });
  }).catch(function(){});
  var recargado=false, habia=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',function(){ if(recargado || !habia) return; recargado=true; location.reload(); });
}
})();
