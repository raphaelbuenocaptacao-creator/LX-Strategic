(()=>{
'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const colors={central:'#9b8dff',room:'#48c0e6',person:'#59dbad',plan:'#ffbf69',idea:'#b192ff',action:'#73b5ff',risk:'#f187a5',hire:'#f6cf70'};
const names={central:'Central',room:'Sala',person:'Profissional',plan:'Meta',idea:'Ideia',action:'Ação',risk:'Risco',hire:'Contratação'};
const gen=()=> 'm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
const el=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);Object.keys(attrs).forEach(k=>n.setAttribute(k,attrs[k]));parent.appendChild(n);return n};
const short=(s,n=21)=>String(s||'').slice(0,n);
let api,selected='',connecting='',drag=null,view={x:0,y:0,z:1},undoStack=[],redoStack=[];
const d=()=>api.get(),nodes=()=>d().mapNodes,edges=()=>d().mapEdges;
const snap=()=>{undoStack.push(JSON.stringify({nodes:nodes(),edges:edges()}));if(undoStack.length>40)undoStack.shift();redoStack=[]};
const save=()=>{api.save();$('mapSaveState').textContent='Salvo no navegador'};
function initData(){
 if(!Array.isArray(d().mapNodes))d().mapNodes=[];if(!Array.isArray(d().mapEdges))d().mapEdges=[];
 const n=nodes(),e=edges(),live=new Set(['lx-root']);
 const add=(id,label,type,x,y,ref)=>{live.add(id);if(!n.some(a=>a.id===id))n.push({id,label,type,x,y,ref:ref||'',color:colors[type],description:'',status:'Planejado'})};
 add('lx-root','LX STRATEGIC','central',500,310,'');
 const rooms=d().rooms||[],plans=d().plans||[],people=d().people||[],hires=d().hires||[];
 rooms.forEach((a,i)=>{const rad=(i*2*Math.PI/Math.max(2,rooms.length))-Math.PI/2;add('room:'+a.id,a.name,'room',500+260*Math.cos(rad),310+190*Math.sin(rad),a.id)});
 plans.forEach((a,i)=>{const rad=(i*2*Math.PI/Math.max(3,plans.length))+Math.PI/3;add('plan:'+a.id,a.name,'plan',500+360*Math.cos(rad),310+240*Math.sin(rad),a.id)});
 people.forEach((a,i)=>{const par=n.find(v=>v.id==='room:'+a.roomId)||n[0];const rad=i*2.39996;add('person:'+a.id,a.name,'person',par.x+150*Math.cos(rad),par.y+125*Math.sin(rad),a.id)});
 hires.forEach((a,i)=>{const par=n.find(v=>v.id==='room:'+a.roomId)||n[0];const rad=i*2.39996+.8;add('hire:'+a.id,a.name,'hire',par.x+220*Math.cos(rad),par.y+190*Math.sin(rad),a.id)});
 const collections={room:rooms,plan:plans,person:people,hire:hires};
 for(let i=n.length-1;i>=0;i--){const x=n[i];if(x.ref&&!live.has(x.id)){n.splice(i,1);continue}if(x.ref){const r=collections[x.type]?.find(a=>a.id===x.ref);if(r)x.label=r.name}}
 const keys=new Set(e.map(x=>x.from+'>'+x.to));
 const link=(from,to)=>{if(!n.some(x=>x.id===from)||!n.some(x=>x.id===to))return;const key=from+'>'+to;if(!keys.has(key)){e.push({id:gen(),from,to});keys.add(key)}};
 rooms.forEach(x=>link('lx-root','room:'+x.id));
 plans.forEach(x=>link(x.roomId?'room:'+x.roomId:'lx-root','plan:'+x.id));
 people.forEach(x=>link(x.roomId?'room:'+x.roomId:'lx-root','person:'+x.id));
 hires.forEach(x=>link(x.roomId?'room:'+x.roomId:'lx-root','hire:'+x.id));
 const valid=new Set(n.map(x=>x.id));d().mapEdges=e.filter(x=>valid.has(x.from)&&valid.has(x.to)&&x.from!==x.to);
}
function pt(evt){const r=$('strategySvg').getBoundingClientRect();return{x:(evt.clientX-r.left)/r.width*1000,y:(evt.clientY-r.top)/r.height*650}}
function toWorld(evt){const p=pt(evt);return{x:(p.x-view.x)/view.z,y:(p.y-view.y)/view.z}}
function transform(){$('mapWorld').setAttribute('transform','translate('+view.x+' '+view.y+') scale('+view.z+')');$('mapZoomLabel').textContent=Math.round(view.z*100)+'%'}
function zoom(z){z=Math.max(.28,Math.min(2.5,z));view.x=500-(500-view.x)*z/view.z;view.y=325-(325-view.y)*z/view.z;view.z=z;transform()}
function fit(){const n=nodes();if(!n.length)return;const minX=Math.min(...n.map(x=>x.x)),maxX=Math.max(...n.map(x=>x.x)),minY=Math.min(...n.map(x=>x.y)),maxY=Math.max(...n.map(x=>x.y));const z=Math.max(.25,Math.min(1.4,820/Math.max(260,maxX-minX+160),500/Math.max(200,maxY-minY+100)));view={x:500-(minX+maxX)/2*z,y:320-(minY+maxY)/2*z,z};transform()}
function current(){return nodes().find(x=>x.id===selected)}
function inspector(){
 const n=current();$('mapInspector').hidden=!n;$('mapEmptyInspector').hidden=!!n;if(!n)return;
 const vals={mapNodeName:n.label,mapNodeType:n.type,mapNodeDesc:n.description||'',mapNodeStatus:n.status||'Planejado',mapNodeColor:n.color||colors[n.type]};
 Object.keys(vals).forEach(id=>$(id).value=vals[id]);
 $('mapNodeName').disabled=!!n.ref;$('mapNodeType').disabled=!!n.ref||n.type==='central';
 $('mapDelete').disabled=!!n.ref||n.type==='central';$('mapSource').hidden=!n.ref;
 $('mapSourceInfo').textContent=n.ref?'Vinculado a cadastro existente':'Nó personalizado';
 const box=$('mapLinks');box.replaceChildren();
 edges().filter(x=>x.from===n.id||x.to===n.id).forEach(link=>{
 const other=nodes().find(x=>x.id===(link.from===n.id?link.to:link.from));if(!other)return;
 const row=document.createElement('div');row.className='map-link-row';
 const text=document.createElement('span');text.textContent=short(other.label,25);row.appendChild(text);
 const btn=document.createElement('button');btn.className='smallbtn';btn.textContent='Desconectar';btn.onclick=()=>{snap();d().mapEdges=edges().filter(x=>x.id!==link.id);save();render()};row.appendChild(btn);box.appendChild(row)
 });
}
function select(id){if(connecting){if(connecting!==id&&!edges().some(x=>x.from===connecting&&x.to===id)){snap();edges().push({id:gen(),from:connecting,to:id});save()}connecting='';$('mapConnect').classList.remove('primary')}selected=id;render()}
function draw(){
 const root=$('mapWorld');root.replaceChildren();const all=nodes(),indexed=new Map(all.map(n=>[n.id,n]));
 edges().forEach(e=>{const a=indexed.get(e.from),b=indexed.get(e.to);if(!a||!b)return;const dx=b.x-a.x;el('path',{d:'M'+a.x+' '+a.y+' C'+(a.x+dx*.5)+' '+a.y+' '+(b.x-dx*.5)+' '+b.y+' '+b.x+' '+b.y,stroke:'#756cc7','stroke-width':2,fill:'none',opacity:'.72','pointer-events':'none'},root)});
 const q=$('mapSearch').value.toLocaleLowerCase('pt-BR');
 all.forEach(n=>{
 const g=el('g',{transform:'translate('+n.x+','+n.y+')',class:'strategy-node',tabindex:'0',role:'button','aria-label':n.label},root);
 if(q&&!String(n.label+' '+n.description).toLocaleLowerCase('pt-BR').includes(q))g.setAttribute('opacity','.17');
 el('rect',{x:-91,y:-26,width:182,height:56,rx:13,fill:selected===n.id?'#37304f':'#252039',stroke:selected===n.id?'#f3e6ff':(n.color||colors.idea),'stroke-width':selected===n.id?3:1.5},g);
 el('circle',{cx:-74,cy:0,r:6,fill:n.color||colors.idea},g);
 const title=el('text',{x:7,y:-3,'text-anchor':'middle',fill:'#faf7ff','font-size':12,'font-weight':700,'pointer-events':'none'},g);title.textContent=short(n.label);
 const subtitle=el('text',{x:7,y:14,'text-anchor':'middle',fill:'#bcb4cf','font-size':10,'pointer-events':'none'},g);subtitle.textContent=names[n.type]||n.type;
 g.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();e.preventDefault();const w=toWorld(e);drag={kind:'node',id:n.id,ox:n.x-w.x,oy:n.y-w.y,cx:e.clientX,cy:e.clientY,moved:false};$('strategySvg').setPointerCapture(e.pointerId)});
 g.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();select(n.id)}});
 g.addEventListener('dblclick',()=>{selected=n.id;render();$('mapNodeName').focus()});
 });
 $('mapNodeCount').textContent=all.length;$('mapEdgeCount').textContent=edges().length;transform();inspector();
}
function render(){if(!api)return;initData();draw()}
function make(type){snap();const n={id:gen(),type,label:type==='idea'?'Nova ideia':type==='risk'?'Novo risco':'Nova ação',x:(500-view.x)/view.z,y:(315-view.y)/view.z,color:colors[type],status:'Planejado',description:'',ref:''};nodes().push(n);if(selected)edges().push({id:gen(),from:selected,to:n.id});selected=n.id;save();render();$('mapNodeName').focus();$('mapNodeName').select()}
function update(k,v){const n=current();if(!n||((k==='label'||k==='type')&&n.ref))return;v=String(v).trim();if(k==='label'&&!v)return;snap();n[k]=v;if(k==='type'&&!n.ref)n.color=colors[v]||n.color;save();draw()}
function deleteSelected(){const n=current();if(!n||n.ref||n.type==='central')return;if(!confirm('Excluir este nó e suas conexões?'))return;snap();d().mapNodes=nodes().filter(x=>x.id!==n.id);d().mapEdges=edges().filter(x=>x.from!==n.id&&x.to!==n.id);selected='';save();render()}
function duplicate(){const n=current();if(!n)return;snap();const copy={...n,id:gen(),label:n.label+' (cópia)',type:n.ref?'idea':n.type,ref:'',x:n.x+60,y:n.y+75};nodes().push(copy);selected=copy.id;save();render()}
function restore(raw){try{const val=JSON.parse(raw);d().mapNodes=val.nodes;d().mapEdges=val.edges;selected='';save();render()}catch(e){console.error(e)}}
function undo(){if(!undoStack.length)return;redoStack.push(JSON.stringify({nodes:nodes(),edges:edges()}));restore(undoStack.pop())}
function redo(){if(!redoStack.length)return;undoStack.push(JSON.stringify({nodes:nodes(),edges:edges()}));restore(redoStack.pop())}
function rearrange(){if(!confirm('Reorganizar os nós? Suas anotações e conexões serão preservadas.'))return;snap();let i=0;nodes().forEach(n=>{if(n.type==='central'){n.x=500;n.y=310}else{const a=i++*2.4;n.x=500+(260+Math.floor(i/12)*140)*Math.cos(a);n.y=310+(210+Math.floor(i/12)*110)*Math.sin(a)}});save();render();fit()}
function exportSVG(){const svg=$('strategySvg').cloneNode(true);svg.setAttribute('xmlns',NS);svg.setAttribute('viewBox','-600 -500 2200 1700');svg.setAttribute('width','1650');svg.setAttribute('height','1275');svg.querySelector('#mapWorld').setAttribute('transform','');const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='LX-Strategic-mapa.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function init(config){if(api)return;api=config;initData();save();const surface=$('strategySvg');
 surface.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.strategy-node'))return;const p=pt(e);drag={kind:'pan',ox:p.x-view.x,oy:p.y-view.y};surface.setPointerCapture(e.pointerId)});
 surface.addEventListener('pointermove',e=>{if(!drag)return;if(drag.kind==='pan'){const p=pt(e);view.x=p.x-drag.ox;view.y=p.y-drag.oy;transform();return}const n=nodes().find(x=>x.id===drag.id);if(!n)return;const w=toWorld(e);if(Math.hypot(e.clientX-drag.cx,e.clientY-drag.cy)>4){if(!drag.moved){snap();drag.moved=true}n.x=Math.round(w.x+drag.ox);n.y=Math.round(w.y+drag.oy);draw()}});
 surface.addEventListener('pointerup',e=>{if(!drag)return;const prev=drag;drag=null;if(prev.kind==='node'){if(prev.moved){save();draw()}else select(prev.id)}try{surface.releasePointerCapture(e.pointerId)}catch(x){}});
 surface.addEventListener('pointercancel',()=>{if(drag?.moved)save();drag=null});
 surface.addEventListener('wheel',e=>{e.preventDefault();zoom(view.z*(e.deltaY<0?1.08:.92))},{passive:false});
 $('mapAddIdea').onclick=()=>make('idea');$('mapAddAction').onclick=()=>make('action');$('mapAddRisk').onclick=()=>make('risk');$('mapAddHire').onclick=()=>api.openNew('hire');
 $('mapConnect').onclick=()=>{if(!current()){alert('Selecione o primeiro nó.');return}connecting=selected;$('mapConnect').classList.add('primary');$('mapSaveState').textContent='Selecione outro nó para conectar'};
 $('mapZoomIn').onclick=()=>zoom(view.z*1.2);$('mapZoomOut').onclick=()=>zoom(view.z/1.2);$('mapFit').onclick=fit;
 $('mapUndo').onclick=undo;$('mapRedo').onclick=redo;$('mapRearrange').onclick=rearrange;$('mapExport').onclick=exportSVG;
 $('mapDelete').onclick=deleteSelected;$('mapDuplicate').onclick=duplicate;
 $('mapSource').onclick=()=>{const n=current();if(n?.ref)api.openRecord(n.type,n.ref)};
 $('mapSearch').addEventListener('input',draw);
 [['mapNodeName','label'],['mapNodeType','type'],['mapNodeDesc','description'],['mapNodeStatus','status'],['mapNodeColor','color']].forEach(([id,k])=>$(id).addEventListener('change',e=>update(k,e.target.value)));
 document.addEventListener('keydown',e=>{if(!document.getElementById('mapa').classList.contains('active')||e.target.closest('input,textarea,select'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}if(e.key==='Escape'&&connecting){connecting='';$('mapConnect').classList.remove('primary')}});
 render();fit();
}
window.LXStrategicMap={init,render};
})();