import './style.css';
import './apocalypse.css';
import {RelicWorkshopGame} from './game.js';

const app=document.querySelector('#app');
const game=new RelicWorkshopGame(app);

game.initialize().catch(error=>{
  console.error(error);
  const button=document.querySelector('#start');
  button.disabled=false;
  button.textContent='启动失败 · 点击重新加载';
  button.onclick=()=>location.reload();
});
