import './style.css';
import './apocalypse.css';
import {RelicWorkshopGame} from './game.js';

const app=document.querySelector('#app');
const game=new RelicWorkshopGame(app);

game.initialize().then(async()=>{
  if(location.pathname.endsWith('/boss-test.html')){
    const {installBossTest}=await import('./boss-test.js');
    installBossTest(game);
  }
}).catch(error=>{
  console.error(error);
  const button=document.querySelector('#start');
  button.disabled=false;
  button.textContent='启动失败 · 点击重新加载';
  button.onclick=()=>location.reload();
});
