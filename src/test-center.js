import './test-center.css';

const MODULES=[
  {id:'outpost-test.html',name:'第三关 · 风蚀哨站',tag:'Boss / 风道 / 小怪',desc:'验证四种风场技能、二阶段和收招反击。',tone:'cyan'},
  {id:'boss-test.html',name:'第二关 · 熔炉 Boss',tag:'Boss / 地火 / 连斩',desc:'验证黑骑士技能、双炉阶段和近战反击窗口。',tone:'orange'},
  {id:'wave-test.html',name:'波次实验室',tag:'关卡 / 波次 / 难度',desc:'快速检查三关波次、敌人组合和节奏曲线。',tone:'green'},
  {id:'performance-test.html',name:'性能实验室',tag:'性能 / 压力 / WebGL',desc:'检查敌人数量、特效、帧率和渲染预算。',tone:'purple'},
  {id:'knight-preview.html',name:'骑士预览',tag:'角色 / 动画 / 武器',desc:'检查骑士动作、武器姿态和近战手感。',tone:'gold'},
  {id:'balance-report.html',name:'平衡报告',tag:'数据 / 伤害 / 构筑',desc:'查看武器、装置、掉血来源和 Boss 战统计。',tone:'blue'},
];

const center=document.querySelector('#test-center');
center.innerHTML=`<section class="test-shell">
  <header class="test-header">
    <div><p class="eyebrow">RELIC WORKSHOP · QA HUB</p><h1>测试中心</h1><p class="subhead">选择一个实验模块，所有测试都在这个页面的工作区内运行。</p></div>
    <div class="header-actions"><a class="back-link" href="/">返回正式游戏</a><button id="open-new" type="button">新窗口打开</button></div>
  </header>
  <nav class="test-nav" aria-label="测试模块选择">${MODULES.map((m,i)=>`<button class="module-tab ${i===0?'active':''}" data-module="${m.id}" type="button"><span>${String(i+1).padStart(2,'0')}</span>${m.name}</button>`).join('')}</nav>
  <section class="module-grid" aria-label="测试模块卡片">${MODULES.map((m,i)=>`<button class="module-card tone-${m.tone} ${i===0?'selected':''}" data-module="${m.id}" type="button"><span class="module-index">${String(i+1).padStart(2,'0')}</span><strong>${m.name}</strong><small>${m.tag}</small><p>${m.desc}</p><em>进入测试 →</em></button>`).join('')}</section>
  <section class="workspace-wrap"><div class="workspace-bar"><span id="workspace-title">${MODULES[0].name}</span><span id="workspace-status">正在加载测试模块</span></div><iframe id="test-workspace" title="测试模块工作区" src="/${MODULES[0].id}?test=1"></iframe></section>
</section>`;

const tabs=[...document.querySelectorAll('.module-tab')],cards=[...document.querySelectorAll('.module-card')],frame=document.querySelector('#test-workspace'),title=document.querySelector('#workspace-title'),status=document.querySelector('#workspace-status'),openNew=document.querySelector('#open-new');
let current=MODULES[0];
function select(id){
  current=MODULES.find(m=>m.id===id)||MODULES[0];
  tabs.forEach(button=>button.classList.toggle('active',button.dataset.module===current.id));
  cards.forEach(button=>button.classList.toggle('selected',button.dataset.module===current.id));
  title.textContent=current.name;status.textContent='正在加载测试模块';frame.src=`/${current.id}?test=1`;history.replaceState(null,'',`#${current.id.replace('.html','')}`);
}
tabs.forEach(button=>button.addEventListener('click',()=>select(button.dataset.module)));
cards.forEach(button=>button.addEventListener('click',()=>{select(button.dataset.module);document.querySelector('.workspace-wrap').scrollIntoView({behavior:'smooth',block:'start'})}));
frame.addEventListener('load',()=>{status.textContent='模块已就绪 · 可开始测试'});
openNew.addEventListener('click',()=>window.open(`/${current.id}?test=1`,'_blank','noopener'));
const hash=location.hash.slice(1);if(hash){const found=MODULES.find(m=>m.id.replace('.html','')===hash);if(found)select(found.id)}
