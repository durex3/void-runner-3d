const BLOCKED_CODES=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);

export class InputController{
  constructor({root=document,onDash,onPause,onWeapon}){
    this.root=root;
    this.keys=new Set();
    this.onDash=onDash;
    this.onPause=onPause;
    this.onWeapon=onWeapon;
    this.touchMove={x:0,y:0};
    this.joystickPointerId=null;
    this.joystickBase=null;
    this.joystickKnob=null;
    this.bind();
  }

  bind(){
    this.joystickBase=this.root.querySelector('#touch-stick-base');
    this.joystickKnob=this.root.querySelector('#touch-stick-knob');
    if(this.joystickBase){
      this.joystickBase.onpointerdown=event=>{
        if(this.joystickPointerId!==null)return;
        this.joystickPointerId=event.pointerId;
        this.joystickBase.setPointerCapture(event.pointerId);
        this.updateJoystick(event);
      };
      this.joystickBase.onpointermove=event=>{
        if(event.pointerId===this.joystickPointerId)this.updateJoystick(event);
      };
      this.joystickBase.onpointerup=event=>{
        if(event.pointerId===this.joystickPointerId)this.clearTouchMove();
      };
      this.joystickBase.onpointercancel=event=>{
        if(event.pointerId===this.joystickPointerId)this.clearTouchMove();
      };
      this.joystickBase.onlostpointercapture=()=>this.clearTouchMove();
    }
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
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)this.clear();
    });
  }

  isDown(...keys){return keys.some(key=>this.keys.has(key))}
  getMoveVector(){
    let x=Number(this.isDown('d','arrowright'))-Number(this.isDown('a','arrowleft'))+this.touchMove.x;
    let y=Number(this.isDown('s','arrowdown'))-Number(this.isDown('w','arrowup'))+this.touchMove.y;
    const magnitude=Math.hypot(x,y);
    if(magnitude>1){x/=magnitude;y/=magnitude}
    return {x,y};
  }

  updateJoystick(event){
    if(!this.joystickBase)return;
    const rect=this.joystickBase.getBoundingClientRect();
    const knobRadius=this.joystickKnob?.getBoundingClientRect().width/2||0;
    const radius=Math.max(1,Math.min(rect.width,rect.height)/2-knobRadius-4);
    let dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2);
    const distance=Math.hypot(dx,dy);
    if(distance>radius){dx=dx/distance*radius;dy=dy/distance*radius}
    const rawX=dx/radius,rawY=dy/radius,rawMagnitude=Math.hypot(rawX,rawY);
    const deadzone=.12;
    const strength=rawMagnitude<=deadzone?0:Math.min(1,(rawMagnitude-deadzone)/(1-deadzone));
    this.touchMove=strength?{x:rawX/rawMagnitude*strength,y:rawY/rawMagnitude*strength}:{x:0,y:0};
    if(this.joystickKnob)this.joystickKnob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  }

  clearTouchMove(){
    this.touchMove={x:0,y:0};
    this.joystickPointerId=null;
    if(this.joystickKnob)this.joystickKnob.style.transform='translate(-50%,-50%)';
  }

  clear(){this.keys.clear();this.clearTouchMove()}
}
