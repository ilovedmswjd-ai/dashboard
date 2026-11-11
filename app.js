/* Standalone dashboard. No network dependencies. Amounts: KRW 100 million. */
(() => {
'use strict';
const data=window.BUDGET_DATA;
const colors=['#526cfa','#9562ed','#19b7aa','#f2aa4a','#ed6b9e','#5cb7ef','#af80d8','#83c77b'];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Math.round(n).toLocaleString('ko-KR');
const pct=n=>n===null?'—':(n*100).toFixed(1)+'%';
const short=n=>Math.abs(n)>=10000?(n/10000).toFixed(1)+'만':num(n);
const sum=(rows,key)=>rows.reduce((a,r)=>a+r[key],0);
const group=(rows,key)=>Object.entries(rows.reduce((a,r)=>{a[r[key]]??={y2026:0,y2027:0};a[r[key]].y2026+=r.y2026;a[r[key]].y2027+=r.y2027;return a;},{})).map(([name,v])=>({name,...v}));
const svg=(w,h,content)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="대화형 필터에 따른 재원 차트">${content}</svg>`;
const text=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(t)}</text>`;
const tip=(s)=>`<title>${esc(s)}</title>`;
const line=(x,y,x2,y2)=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#edf0f7"/>`;
const empty=(id,message='선택한 조건에 해당하는 데이터가 없습니다.')=>$(id).innerHTML=`<div class="empty">${esc(message)}</div>`;
let filtered=data.slice(),sortKey='y2027',sortDir=-1;
function options(el,values,all){const current=el.value;el.innerHTML=`<option value="">${all}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');el.value=values.includes(current)?current:'';}
options($('sector'),[...new Set(data.map(r=>r.sector))],'전체 부문');
function accounts(){options($('account'),[...new Set(data.filter(r=>!$('sector').value||r.sector===$('sector').value).map(r=>r.account))],'전체 회계구분');}
accounts();
function render(){
 filtered=data.filter(r=>(!$('sector').value||r.sector===$('sector').value)&&(!$('account').value||r.account===$('account').value));
 const a=sum(filtered,'y2026'),b=sum(filtered,'y2027'),d=b-a;
 $('filter-caption').textContent=[$('sector').value,$('account').value].filter(Boolean).join(' / ')||'전체 재원 보기';
 $('record-count').textContent=`${filtered.length}개 항목`;
 const kpis=[['2026년 재원',num(a),'억 원','비교 기준 연도',colors[0],'26'],['2027년 정부안',num(b),'억 원','선택 항목의 재원 합계',colors[1],'27'],['전년 대비 증감',(d>0?'+':'')+num(d),'억 원','2027년 − 2026년',colors[2],'↗'],['전년 대비 증감률',pct(a?d/a:null),'','증감 ÷ 2026년 재원',colors[4],'%'],['선택된 프로그램',String(filtered.length),'개','차감 항목 포함',colors[3],'#']];
 $('kpis').innerHTML=kpis.map(([label,v,u,n,c,s])=>`<article class="kpi" style="--accent:${c}"><div class="kpi-label">${label}<span class="kpi-symbol">${s}</span></div><div class="kpi-value">${v}<small>${u}</small></div><div class="kpi-note">${n}</div></article>`).join('');
 sectorChart();accountChart();ranking();diverging('change-chart','change');diverging('rate-chart','rate');scatter();groups();negative();table();
}
function sectorChart(){
 const rows=group(filtered,'sector');if(!rows.length)return empty('sector-chart');
 const w=540,h=265,left=64,top=30,bottom=218,cw=430/rows.length;
 const min=Math.min(0,...rows.flatMap(r=>[r.y2026,r.y2027])),max=Math.max(0,...rows.flatMap(r=>[r.y2026,r.y2027]));
 const span=max-min||1,scale=(bottom-top)/span,y=v=>bottom-(v-min)*(bottom-top)/span;
 let s='';for(let i=0;i<=4;i++){const v=min+span*i/4;s+=line(left,y(v),520,y(v))+text(left-9,y(v)+4,short(v),'','end');}
 s+=line(left,y(0),520,y(0));rows.forEach((r,i)=>{const center=left+cw*i+cw/2;[r.y2026,r.y2027].forEach((v,j)=>{const x=center+(j?5:-31);s+=`<rect class="mark" x="${x}" y="${Math.min(y(v),y(0))}" width="26" height="${Math.max(1,Math.abs(v)*scale)}" rx="4" fill="${j?colors[0]:'#bcc9ff'}">${tip(`${r.name} ${2026+j}년: ${num(v)}억 원`)}</rect>`;});s+=text(center,239,r.name,'label','middle');});
 s+=`<circle cx="359" cy="12" r="4" fill="#bcc9ff"/>`+text(369,16,'2026년')+`<circle cx="439" cy="12" r="4" fill="${colors[0]}"/>`+text(449,16,'2027년');
 $('sector-chart').innerHTML=svg(w,h,s);
}
function accountChart(){
 const rows=group(filtered.filter(r=>r.y2027>0),'account'),total=sum(rows,'y2027');if(!total)return empty('account-chart','선택한 재원은 차감 항목입니다. 아래 차감 재원 차트를 확인하세요.');
 const cx=130,cy=130,r=84,per=2*Math.PI*r;let offset=0;
 let s=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f2f4fa" stroke-width="34"/>`;
 rows.forEach((v,i)=>{const len=v.y2027/total*per;s+=`<circle class="mark" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="34" stroke-dasharray="${len} ${per-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})">${tip(`${v.name}: ${num(v.y2027)}억 원 (${pct(v.y2027/total)})`)}</circle>`;offset+=len;});
 s+=text(cx,125,'양수 재원','','middle')+text(cx,150,num(total),'value','middle');
 rows.forEach((v,i)=>{const y=64+i*47;s+=`<rect x="260" y="${y}" width="8" height="8" rx="2" fill="${colors[i]}"/>`+text(278,y+8,v.name,'label')+text(278,y+25,`${num(v.y2027)}억 원`)+text(515,y+8,pct(v.y2027/total),'value','end');});
 $('account-chart').innerHTML=svg(540,265,s);
}
function ranking(){
 const rows=filtered.filter(r=>r.y2027>0).sort((a,b)=>b.y2027-a.y2027).slice(0,10);if(!rows.length)return empty('ranking-chart','비교할 양수 재원 항목이 없습니다.');
 const max=Math.max(...rows.map(r=>r.y2027)),w=1140,h=rows.length*34+35,left=210,width=810;let s='';
 rows.forEach((r,i)=>{const y=i*34+13,c=colors[i%colors.length];s+=text(5,y+14,String(i+1).padStart(2,'0'))+text(31,y+14,r.program,'label');s+=`<rect x="${left}" y="${y}" width="${width}" height="21" rx="5" fill="#f3f5fb"/><rect class="mark" x="${left}" y="${y}" width="${Math.max(2,r.y2027/max*width)}" height="21" rx="5" fill="${c}">${tip(`${r.sector} / ${r.program}: ${num(r.y2027)}억 원`)}</rect>`+text(1125,y+15,num(r.y2027),'value','end');});
 $('ranking-chart').innerHTML=svg(w,h,s);
}
function diverging(id,key){
 const rows=filtered.filter(r=>r[key]!==null).sort((a,b)=>Math.abs(b[key])-Math.abs(a[key])).slice(0,8);if(!rows.length)return empty(id);
 const max=Math.max(...rows.map(r=>Math.abs(r[key])),.0001),zero=345,span=125;let s=line(zero,14,zero,rows.length*34+13);
 rows.forEach((r,i)=>{const v=r[key],y=17+i*34,len=Math.abs(v)/max*span,x=v<0?zero-len:zero;s+=text(0,y+14,r.program,'label');s+=`<rect class="mark" x="${x}" y="${y}" width="${Math.max(1,len)}" height="20" rx="4" fill="${v<0?colors[4]:(key==='rate'?colors[2]:colors[1])}">${tip(`${r.program}: ${key==='rate'?pct(v):num(v)+'억 원'}`)}</rect>`+text(540,y+14,key==='rate'?pct(v):num(v),'value','end');});
 s+=text(zero,rows.length*34+29,'0','','middle');$(id).innerHTML=svg(550,rows.length*34+42,s);
}
function scatter(){
 const rows=filtered.filter(r=>r.y2027>0&&r.rate!==null);if(!rows.length)return empty('scatter-chart','표시할 양수 재원 항목이 없습니다.');
 const left=58,right=511,top=22,bottom=252,maxX=Math.max(...rows.map(r=>r.y2027))*1.12,minY=Math.min(0,...rows.map(r=>r.rate))-.08,maxY=Math.max(.05,...rows.map(r=>r.rate))+.10;
 const x=v=>left+v/maxX*(right-left),y=v=>bottom-(v-minY)/(maxY-minY)*(bottom-top);let s='';
 for(let i=0;i<=4;i++){let v=minY+(maxY-minY)*i/4;s+=line(left,y(v),right,y(v))+text(left-10,y(v)+4,pct(v),'','end');let vx=maxX*i/4;s+=text(x(vx),275,short(vx),'','middle');}
 s+=`<line x1="${left}" y1="${y(0)}" x2="${right}" y2="${y(0)}" stroke="#bac5dd" stroke-dasharray="5 5"/>`;
 const sectors=[...new Set(data.map(r=>r.sector))];rows.forEach(r=>{const c=colors[sectors.indexOf(r.sector)],rad=5+Math.sqrt(r.y2027/maxX)*13;s+=`<circle class="mark" cx="${x(r.y2027)}" cy="${y(r.rate)}" r="${rad}" fill="${c}" fill-opacity=".66" stroke="white" stroke-width="1.5">${tip(`${r.program} / ${r.sector}\n2027년 ${num(r.y2027)}억 원 / 증감률 ${pct(r.rate)}`)}</circle>`;});
 sectors.forEach((v,i)=>{s+=`<circle cx="${65+i*150}" cy="301" r="4" fill="${colors[i]}"/>`+text(75+i*150,305,v);});$('scatter-chart').innerHTML=svg(550,320,s);
}
function groups(){
 let rows=group(filtered.filter(r=>r.y2027>0),'group').sort((a,b)=>b.y2027-a.y2027);if(!rows.length)return empty('group-chart','구성을 표시할 양수 재원이 없습니다.');
 if(rows.length>6)rows=[...rows.slice(0,6),{name:'기타',y2027:sum(rows.slice(6),'y2027')}];const total=sum(rows,'y2027');let x=8,s='';
 rows.forEach((r,i)=>{const width=r.y2027/total*520;s+=`<rect class="mark" x="${x}" y="17" width="${width}" height="34" fill="${colors[i]}">${tip(`${r.name}: ${num(r.y2027)}억 원 / ${pct(r.y2027/total)}`)}</rect>`;x+=width;});
 rows.forEach((r,i)=>{const y=86+i*30;s+=`<rect x="9" y="${y-8}" width="8" height="8" rx="2" fill="${colors[i]}"/>`+text(26,y,r.name,'label')+text(421,y,num(r.y2027),'value','end')+text(529,y,pct(r.y2027/total),'','end');});$('group-chart').innerHTML=svg(550,Math.max(300,rows.length*30+99),s);
}
function negative(){
 const rows=filtered.filter(r=>r.y2026<0||r.y2027<0);if(!rows.length)return empty('negative-chart','현재 필터에 포함된 내부거래·보전지출 차감 항목이 없습니다.');
 const max=Math.max(...rows.flatMap(r=>[Math.abs(r.y2026),Math.abs(r.y2027)])),left=230,width=740;let s='';
 rows.forEach((r,i)=>{const top=18+i*73;s+=text(0,top+18,r.sector,'label')+text(0,top+37,r.program);[r.y2026,r.y2027].forEach((v,j)=>{const y=top+j*26;s+=text(left-10,y+14,String(2026+j),'','end')+`<rect class="mark" x="${left}" y="${y}" width="${Math.max(2,Math.abs(v)/max*width)}" height="19" rx="4" fill="${j?colors[4]:'#f6bfce'}">${tip(`${r.sector} ${2026+j}년: ${num(v)}억 원`)}</rect>`+text(1090,y+14,num(v),'value','end');});});$('negative-chart').innerHTML=svg(1140,rows.length*73+20,s);
}
function table(){
 const q=$('search').value.trim().toLowerCase();const rows=filtered.filter(r=>!q||r.program.toLowerCase().includes(q));
 rows.sort((a,b)=>{const v=a[sortKey],w=b[sortKey];return sortDir*(typeof v==='number'?v-w:String(v).localeCompare(String(w),'ko'));});
 $('table-body').innerHTML=rows.map(r=>`<tr><td>${esc(r.sector)}</td><td><span class="pill">${esc(r.account)}</span></td><td>${esc(r.group)}</td><td>${esc(r.program)}</td><td class="num">${num(r.y2026)}</td><td class="num">${num(r.y2027)}</td><td class="num ${r.change<0?'down':'up'}">${r.change>0?'+':''}${num(r.change)}</td><td class="num ${r.rate<0?'down':'up'}">${pct(r.rate)}</td></tr>`).join('')||'<tr><td colspan="8" style="text-align:center;padding:35px">검색 결과가 없습니다.</td></tr>';
 $('table-caption').textContent=`필터 ${filtered.length}개 중 ${rows.length}개 표시 · 상세표 검색은 차트에 영향을 주지 않습니다.`;
 document.querySelectorAll('[data-sort]').forEach(el=>el.setAttribute('aria-label',`${el.textContent.replace(' ↕','')} 정렬`));
 return rows;
}
$('sector').addEventListener('change',()=>{accounts();render();});$('account').addEventListener('change',render);
$('reset').addEventListener('click',()=>{$('sector').value='';accounts();$('account').value='';$('search').value='';render();});
$('search').addEventListener('input',table);
document.querySelectorAll('[data-sort]').forEach(el=>el.addEventListener('click',()=>{sortDir=sortKey===el.dataset.sort?-sortDir:-1;sortKey=el.dataset.sort;table();}));
$('download').addEventListener('click',()=>{const rows=table();const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';const lines=[['부문','회계구분','구분','프로그램명','2026년(억 원)','2027년(억 원)','증감(억 원)','증감률(%)'],...rows.map(r=>[r.sector,r.account,r.group,r.program,r.y2026,r.y2027,r.change,r.rate===null?'':(r.rate*100).toFixed(1)])];const blob=new Blob(['\ufeff'+lines.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='국방예산_필터결과.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
render();
})();
