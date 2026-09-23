const COMBO_LABELS={voltage:'炼金共振',snare:'淬毒弩箭',compost:'灵魂回收',watering:'火力超载',pollen:'战术空投',friendship:'协同协议'};
const CHAPTER_LABELS={ruins:'遗迹工坊',furnace:'熔炉要塞'};
const REPORT_STORAGE_KEY='void-runner.balance-report-dataset.v1';
const DATASET_KIND='void-runner-balance-dataset';
const MIN_BALANCE_SAMPLES=3;
const asNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const average=(values)=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
const pct=(value)=>`${(value*100).toFixed(1)}%`;

export function normalizeReports(input){
  const source=Array.isArray(input)?input:[input];
  return source.filter(report=>report&&typeof report==='object'&&Number(report.version)===1).map(report=>({
    ...report,hero:report.hero||{},weapons:Array.isArray(report.weapons)?report.weapons:[],devices:Array.isArray(report.devices)?report.devices:[],damageTaken:report.damageTaken||{},upgrades:Array.isArray(report.upgrades)?report.upgrades:[],combos:report.combos||{},boss:report.boss||{}
  }));
}

function stableValue(value){
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,stableValue(value[key])]));
  return value;
}
function hashString(value,seed){let hash=seed>>>0;for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36).padStart(7,'0')}

export function reportFingerprint(input){
  const report=normalizeReports(input)[0];if(!report)return '';
  if(report.reportId||report.runId)return `id-${String(report.reportId||report.runId)}`;
  const fields=['version','chapter','hero','win','duration','wave','kills','level','totalDamage','totalDamageTaken','weapons','devices','damageTaken','upgrades','combos','boss','deployments','deviceKills','companions'];
  const signature=JSON.stringify(stableValue(Object.fromEntries(fields.map(key=>[key,report[key]]))));
  return `run-${hashString(signature,2166136261)}${hashString(signature,3335557771)}`;
}

function datasetItems(input){
  if(Array.isArray(input))return input.flatMap(datasetItems);
  if(input&&typeof input==='object'&&input.kind===DATASET_KIND&&Array.isArray(input.reports))return input.reports.flatMap(datasetItems);
  return input?[input]:[];
}
function toDatasetEntry(item,now=Date.now()){
  const report=normalizeReports(item?.report||item)[0];if(!report)return null;
  const parsedTime=Date.parse(item?.importedAt);
  return {id:reportFingerprint(report),importedAt:Number.isFinite(parsedTime)?new Date(parsedTime).toISOString():new Date(now).toISOString(),note:typeof item?.note==='string'?item.note.slice(0,240):'',report};
}

export function mergeReports(existing=[],incoming=[],{now=Date.now()}={}){
  const merged=new Map();
  for(const item of [...datasetItems(existing),...datasetItems(incoming)]){
    const entry=toDatasetEntry(item,now);if(!entry)continue;
    const current=merged.get(entry.id);
    if(current){merged.set(entry.id,{...current,note:current.note||entry.note,importedAt:current.importedAt||entry.importedAt});continue}
    merged.set(entry.id,entry);
  }
  return [...merged.values()];
}
export function loadStoredReports(storage=globalThis.localStorage){try{return mergeReports([],JSON.parse(storage?.getItem(REPORT_STORAGE_KEY)||'[]'))}catch{return []}}
export function saveStoredReports(entries,storage=globalThis.localStorage){try{storage?.setItem(REPORT_STORAGE_KEY,JSON.stringify({kind:DATASET_KIND,version:1,reports:mergeReports([],entries)}));return true}catch{return false}}
export function getReportMeta(entry){
  const report=entry?.report||entry||{},date=new Date(entry?.importedAt||0);
  return {id:entry?.id||reportFingerprint(report),hero:report.hero?.label||report.hero?.id||'未知角色',chapter:CHAPTER_LABELS[report.chapter]||report.chapter||'未知关卡',result:report.win?'胜利':'中止',duration:asNumber(report.duration),totalDamage:asNumber(report.totalDamage),importedAt:Number.isFinite(date.getTime())?date.toLocaleString('zh-CN',{hour12:false}):'未知时间',note:entry?.note||''};
}

function aggregateEntries(reports,key){
  const entries=new Map();
  for(const report of reports)for(const item of report[key]){
    const current=entries.get(item.id)||{id:item.id,label:item.label||item.id,runs:0,equippedTime:0,attacks:0,projectiles:0,hits:0,damage:0,bossDamage:0,kills:0};current.runs++;
    for(const field of ['equippedTime','attacks','projectiles','hits','damage','bossDamage','kills'])current[field]+=asNumber(item[field]);entries.set(item.id,current);
  }
  const totalDuration=reports.reduce((sum,report)=>sum+asNumber(report.duration),0)||1;
  return [...entries.values()].map(item=>({...item,hitsPerAttack:item.attacks?item.hits/item.attacks:0,dps:item.damage/(key==='weapons'?(item.equippedTime||1):totalDuration),damageShare:0}));
}
export function analyzeReports(input,{hero='all',chapter='all'}={}){
  const all=normalizeReports(input),reports=all.filter(report=>(hero==='all'||report.hero?.id===hero)&&(chapter==='all'||report.chapter===chapter));
  const totalDamage=reports.reduce((sum,report)=>sum+asNumber(report.totalDamage),0),weapons=aggregateEntries(reports,'weapons'),devices=aggregateEntries(reports,'devices');
  for(const item of [...weapons,...devices])item.damageShare=totalDamage?item.damage/totalDamage:0;
  const comboIds=[...new Set(reports.flatMap(report=>Object.keys(report.combos||{}).concat(report.upgrades.map(item=>item.id).filter(Boolean))))];
  const combos=comboIds.map(id=>({id,label:COMBO_LABELS[id]||id,runs:reports.filter(report=>report.upgrades.some(item=>item.id===id)).length,triggeredRuns:reports.filter(report=>asNumber(report.combos?.[id])>0).length,triggers:reports.reduce((sum,report)=>sum+asNumber(report.combos?.[id]),0)}));
  const damageSources={};for(const report of reports)for(const [source,value] of Object.entries(report.damageTaken||{}))damageSources[source]=(damageSources[source]||0)+asNumber(value);
  const heroBreakdown=[...new Set(reports.map(report=>report.hero?.id||'unknown'))].map(id=>{const rows=reports.filter(report=>(report.hero?.id||'unknown')===id);return {id,label:rows[0]?.hero?.label||id,runs:rows.length,winRate:rows.filter(report=>report.win).length/rows.length,averageDamage:average(rows.map(report=>asNumber(report.totalDamage))),averageBossTime:average(rows.map(report=>asNumber(report.boss?.duration))),averageDuration:average(rows.map(report=>asNumber(report.duration)))} });
  const dominant=weapons.filter(item=>item.damageShare>=.6).map(item=>`${item.label} 输出占比 ${pct(item.damageShare)}`),underused=weapons.filter(item=>item.damageShare<.05&&item.equippedTime>reports.reduce((sum,report)=>sum+asNumber(report.duration),0)*.1).map(item=>`${item.label} 输出占比仅 ${pct(item.damageShare)}`),comboWarnings=combos.filter(item=>item.runs>=2&&item.triggeredRuns===0).map(item=>`${item.label} 已选择但从未触发`),sampleReady=reports.length>=MIN_BALANCE_SAMPLES;
  return {version:1,filters:{hero,chapter},runs:reports.length,totalRuns:all.length,totalDamage,totalDamageTaken:reports.reduce((sum,report)=>sum+asNumber(report.totalDamageTaken),0),averageDuration:average(reports.map(report=>asNumber(report.duration))),averageBossTime:average(reports.map(report=>asNumber(report.boss?.duration))),winRate:reports.length?reports.filter(report=>report.win).length/reports.length:0,weapons:weapons.sort((a,b)=>b.damage-a.damage),devices:devices.sort((a,b)=>b.damage-a.damage),combos,damageSources,heroes:heroBreakdown,sampleReady,minimumSamples:MIN_BALANCE_SAMPLES,warnings:sampleReady?[...dominant,...underused,...comboWarnings]:[]};
}

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const bar=(value,max)=>`<span class="metric-bar"><i style="width:${max?Math.max(2,Math.min(100,value/max*100)):0}%"></i></span>`;
const downloadJson=(value,filename)=>{const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

export function mountBalanceReport(root=document,{storage=globalThis.localStorage}={}){
  const app=root.querySelector('#balance-app')||root.body;let entries=loadStoredReports(storage),reports=entries.map(entry=>entry.report),current=null;
  app.innerHTML=`<main class="balance-shell"><header class="balance-header"><div><span class="balance-kicker">RELIC WORKSHOP / BALANCE LAB</span><h1>构筑平衡分析</h1><p>导入结算页 JSON，比较真实战斗数据后再调整数值。</p></div><div class="balance-actions"><label class="import-button">导入报告<input id="report-files" type="file" accept="application/json,.json" multiple></label><button id="export-dataset" class="ghost-button" disabled>导出数据集</button><button id="clear-reports" class="danger-button" disabled>清空数据集</button><button id="export-summary" class="gold-button" disabled>导出当前汇总</button></div></header><section id="drop-zone" class="drop-zone"><strong>拖入多份结算 JSON</strong><span>支持单局、数组或已导出的完整数据集；报告只保存在当前浏览器。</span><textarea id="report-paste" placeholder="也可以粘贴一个或多个 JSON 对象（数组亦可）"></textarea><button id="load-paste" class="ghost-button">读取粘贴内容</button><output id="import-status" class="import-status" aria-live="polite"></output></section><section class="balance-toolbar"><label>角色<select id="hero-filter"><option value="all">全部角色</option></select></label><label>关卡<select id="chapter-filter"><option value="all">全部关卡</option></select></label><span id="run-count" class="run-count">尚未导入报告</span></section><details id="dataset-panel" class="dataset-panel" open><summary><span><b id="dataset-title">报告库 · 0 局</b><small id="dataset-subtitle">导入后会自动保存和去重</small></span><i>管理单局报告</i></summary><div id="dataset-list" class="dataset-list"><p class="no-data">暂无已保存报告</p></div></details><section id="balance-content" class="balance-empty"><div class="empty-mark">✦</div><h2>等待第一批实战报告</h2><p>建议每个职业至少导入 3 局，再根据稳定趋势调整武器、装置和联动。</p></section><footer class="balance-footer"><a href="/">返回正式游戏</a><span>版本化报告 v1 · 本地持久化 · 只读分析，不修改战斗规则</span></footer></main>`;
  const files=app.querySelector('#report-files'),paste=app.querySelector('#report-paste'),drop=app.querySelector('#drop-zone'),heroSelect=app.querySelector('#hero-filter'),chapterSelect=app.querySelector('#chapter-filter'),content=app.querySelector('#balance-content'),count=app.querySelector('#run-count'),exportButton=app.querySelector('#export-summary'),exportDatasetButton=app.querySelector('#export-dataset'),clearButton=app.querySelector('#clear-reports'),datasetTitle=app.querySelector('#dataset-title'),datasetSubtitle=app.querySelector('#dataset-subtitle'),datasetList=app.querySelector('#dataset-list'),importStatus=app.querySelector('#import-status');
  const persist=()=>saveStoredReports(entries,storage),syncReports=()=>{reports=entries.map(entry=>entry.report)};
  function setStatus(message,tone=''){importStatus.textContent=message;importStatus.dataset.tone=tone}
  function importValues(values){const incoming=mergeReports([],values),before=entries.length;entries=mergeReports(entries,incoming);syncReports();persist();refreshFilters();render();const added=entries.length-before,skipped=Math.max(0,incoming.length-added);setStatus(incoming.length?`已新增 ${added} 局${skipped?`，忽略 ${skipped} 份重复报告`:''}`:'没有找到有效的 v1 单局报告',incoming.length?'success':'error')}
  const readFiles=async(list)=>{const parsed=[];for(const file of list){try{parsed.push(JSON.parse(await file.text()))}catch{}}importValues(parsed);files.value=''};
  function refreshFilters(){const selectedHero=heroSelect.value,selectedChapter=chapterSelect.value,heroes=[...new Map(reports.map(report=>[report.hero?.id,report.hero?.label||report.hero?.id])).entries()].filter(([id])=>id),chapters=[...new Set(reports.map(report=>report.chapter).filter(Boolean))];heroSelect.innerHTML='<option value="all">全部角色</option>'+heroes.map(([id,label])=>`<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join('');chapterSelect.innerHTML='<option value="all">全部关卡</option>'+chapters.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(CHAPTER_LABELS[id]||id)}</option>`).join('');heroSelect.value=heroes.some(([id])=>id===selectedHero)?selectedHero:'all';chapterSelect.value=chapters.includes(selectedChapter)?selectedChapter:'all'}
  function renderDataset(){datasetTitle.textContent=`报告库 · ${entries.length} 局`;datasetSubtitle.textContent=current?.runs===entries.length?`当前分析全部 ${entries.length} 局`:`当前筛选 ${current?.runs||0} / ${entries.length} 局`;exportDatasetButton.disabled=!entries.length;clearButton.disabled=!entries.length;if(!entries.length){datasetList.innerHTML='<p class="no-data">暂无已保存报告；导入后刷新页面仍会保留。</p>';return}datasetList.innerHTML=entries.slice().reverse().map(entry=>{const meta=getReportMeta(entry);return `<article class="dataset-row" data-report-id="${escapeHtml(entry.id)}"><div class="dataset-result ${entry.report.win?'win':'loss'}">${meta.result}</div><div class="dataset-meta"><strong>${escapeHtml(meta.hero)} · ${escapeHtml(meta.chapter)}</strong><span>${meta.duration.toFixed(1)}s · 输出 ${meta.totalDamage.toFixed(0)} · 导入 ${escapeHtml(meta.importedAt)}</span></div><label class="note-field"><span>备注</span><input data-report-note="${escapeHtml(entry.id)}" maxlength="240" value="${escapeHtml(meta.note)}" placeholder="记录流派、操作或异常"></label><button class="delete-report" data-delete-report="${escapeHtml(entry.id)}" aria-label="删除 ${escapeHtml(meta.hero)} 的报告">删除</button></article>`}).join('')}
  function render(){current=analyzeReports(reports,{hero:heroSelect.value,chapter:chapterSelect.value});renderDataset();count.textContent=current.totalRuns?`${current.runs} 局有效报告 · 总输出 ${current.totalDamage.toFixed(0)} · 胜率 ${pct(current.winRate)}`:'尚未导入报告';exportButton.disabled=!current.runs;if(!current.runs){content.className='balance-empty';content.innerHTML=reports.length?'<div class="empty-mark">✦</div><h2>当前筛选没有报告</h2><p>切换角色或关卡筛选，或者导入更多结算 JSON。</p>':'<div class="empty-mark">✦</div><h2>等待第一批实战报告</h2><p>建议每个职业至少导入 3 局，再根据稳定趋势调整武器、装置和联动。</p>';return}content.className='balance-content';const weaponMax=Math.max(1,...current.weapons.map(item=>item.damage)),deviceMax=Math.max(1,...current.devices.map(item=>item.damage));const warningContent=!current.sampleReady?`<p class="sample-warning">当前筛选只有 ${current.runs} 局；至少 ${current.minimumSamples} 局后才显示异常平衡结论。</p>`:current.warnings.length?`<ul>${current.warnings.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:'<p class="healthy">当前没有明显异常；继续积累不同构筑样本。</p>';content.innerHTML=`<section class="summary-strip"><div><small>有效局数</small><b>${current.runs}</b></div><div><small>平均存活</small><b>${current.averageDuration.toFixed(1)}s</b></div><div><small>平均 Boss 战</small><b>${current.averageBossTime.toFixed(1)}s</b></div><div><small>承受伤害</small><b>${current.totalDamageTaken.toFixed(0)}</b></div></section><section class="report-grid"><article class="report-panel wide"><div class="panel-heading"><div><span>WEAPON OUTPUT</span><h2>武器输出</h2></div><small>按实际伤害排序</small></div><div class="data-table"><div class="table-row table-head"><span>武器</span><span>伤害占比</span><span>DPS</span><span>命中/攻击</span><span>击杀</span></div>${current.weapons.map(item=>`<div class="table-row"><strong>${escapeHtml(item.label)}</strong><span>${bar(item.damage,weaponMax)} ${pct(item.damageShare)}</span><span>${item.dps.toFixed(1)}</span><span>${item.hitsPerAttack.toFixed(2)}×</span><span>${item.kills}</span></div>`).join('')||'<p class="no-data">暂无武器数据</p>'}</div></article><article class="report-panel"><div class="panel-heading"><div><span>DEVICES</span><h2>装置贡献</h2></div></div>${current.devices.map(item=>`<div class="rank-row"><strong>${escapeHtml(item.label)}</strong><span>${item.damage.toFixed(0)} 伤害 · ${item.kills} 击杀</span>${bar(item.damage,deviceMax)}</div>`).join('')||'<p class="no-data">暂无装置数据</p>'}</article><article class="report-panel"><div class="panel-heading"><div><span>HERO COMPARISON</span><h2>角色对比</h2></div></div>${current.heroes.map(item=>`<div class="hero-row"><strong>${escapeHtml(item.label)}</strong><span>${item.runs} 局 · 胜率 ${pct(item.winRate)}</span><small>平均输出 ${item.averageDamage.toFixed(0)} · Boss ${item.averageBossTime.toFixed(1)}s</small></div>`).join('')||'<p class="no-data">暂无角色数据</p>'}</article><article class="report-panel"><div class="panel-heading"><div><span>COMBO SIGNAL</span><h2>联动触发</h2></div></div>${current.combos.map(item=>`<div class="combo-row"><strong>${escapeHtml(item.label)}</strong><span>${item.triggers} 次触发</span><small>${item.runs?`${item.triggeredRuns}/${item.runs} 局触发`:'仅记录为触发'}</small></div>`).join('')||'<p class="no-data">暂无联动记录</p>'}</article><article class="report-panel"><div class="panel-heading"><div><span>DAMAGE TAKEN</span><h2>掉血来源</h2></div></div>${Object.entries(current.damageSources).sort((a,b)=>b[1]-a[1]).map(([source,value])=>`<div class="source-row"><strong>${escapeHtml(source)}</strong><b>${value.toFixed(0)}</b></div>`).join('')||'<p class="no-data">暂无掉血数据</p>'}</article><article class="report-panel warning-panel"><div class="panel-heading"><div><span>BALANCE FLAGS</span><h2>待复核信号</h2></div></div>${warningContent}</article></section>`}
  files.onchange=()=>readFiles([...files.files]);app.querySelector('#load-paste').onclick=()=>{try{const value=JSON.parse(paste.value);importValues(value);paste.value='';paste.setCustomValidity('')}catch{paste.setCustomValidity('JSON 格式无效');paste.reportValidity();setStatus('JSON 格式无效，请检查括号和逗号。','error');setTimeout(()=>paste.setCustomValidity(''),1500)}};
  clearButton.onclick=()=>{if(!globalThis.confirm?.('确定清空当前浏览器保存的全部平衡报告吗？'))return;entries=[];syncReports();persist();refreshFilters();setStatus('数据集已清空。','success');render()};heroSelect.onchange=render;chapterSelect.onchange=render;drop.ondragover=event=>{event.preventDefault();drop.classList.add('dragging')};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=event=>{event.preventDefault();drop.classList.remove('dragging');readFiles([...event.dataTransfer.files])};
  datasetList.oninput=event=>{const id=event.target?.dataset?.reportNote;if(!id)return;const entry=entries.find(item=>item.id===id);if(entry){entry.note=event.target.value.slice(0,240);persist()}};datasetList.onclick=event=>{const button=event.target.closest?.('[data-delete-report]');if(!button)return;entries=entries.filter(entry=>entry.id!==button.dataset.deleteReport);syncReports();persist();refreshFilters();setStatus('已删除 1 局报告。','success');render()};
  exportDatasetButton.onclick=()=>downloadJson({kind:DATASET_KIND,version:1,exportedAt:new Date().toISOString(),reports:entries},`balance-dataset-${Date.now()}.json`);exportButton.onclick=()=>downloadJson(current,`balance-summary-${Date.now()}.json`);refreshFilters();render();return {get reports(){return reports},get dataset(){return entries},analyze:()=>current,load:items=>{entries=mergeReports([],items);syncReports();persist();refreshFilters();render()}};
}
if(typeof document!=='undefined')mountBalanceReport(document);
export {COMBO_LABELS,CHAPTER_LABELS,REPORT_STORAGE_KEY,DATASET_KIND,MIN_BALANCE_SAMPLES};
