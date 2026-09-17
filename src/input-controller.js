const BLOCKED_CODES=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);

export class InputController{
  constructor({root=document,onDash,onPause,onWeapon}){
    this.root=root;
    this.keys=new Set();
    this.onDash=onDash;
    this.onPause=onPause;
    this.onWeapon=onWeapon;
    this.bind();
  }

  bind(){
    this.root.querySelectorAll('[data-key]').forEach(button=>{
      button.onpointerdown=event=>{
        button.setPointerCapture(event.pointerId);
        this.keys.add(button.dataset.key);
      };
      button.onpointerup=button.onpointercancel=()=>this.keys.delete(button.dataset.key);
    });
    addEventListener('keydown',event=>{
      if(BLOCKED_CODES.has(event.code))event.preventDefault();
      this.keys.add(event.key.toLowerCase());
      if(event.code==='Space')this.onDash();
      if(event.key==='Escape'&&!event.repeat)this.onPause();
      if(['1','2','3'].includes(event.key))this.onWeapon(Number(event.key)-1);
    });
    addEventListener('keyup',event=>this.keys.delete(event.key.toLowerCase()));
    addEventListener('blur',()=>{
      this.clear();
      this.onPause(true);
    });
  }

  isDown(...keys){return keys.some(key=>this.keys.has(key))}
  clear(){this.keys.clear()}
}
