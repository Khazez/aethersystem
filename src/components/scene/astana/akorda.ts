import * as T from 'three';
import {CityBatch} from './batch';
import type {MaterialKey} from './materials';

/** Exterior study only. Five levels, white facade, blue dome and golden spire.
 * Dimensions / fenestration are approximations, not survey drawings. */
export function buildAkorda(shell:CityBatch,detail:CityBatch,z:number){
  buildAkordaBuilding(shell,detail,z);
  buildAkordaForecourt(shell,detail,z);
}

export function buildAkordaBuilding(shell:CityBatch,detail:CityBatch,z:number){
  const v=(x:number,y:number,d:number)=>new T.Vector3(x,y,z+d);
  const cylinder=(key:MaterialKey,r:number,h:number,y:number,d:number,half=false)=>
    shell.geometry(key,new T.CylinderGeometry(r,r,h,64,1,false,half?-Math.PI/2:0,half?Math.PI:Math.PI*2).translate(0,y,z+d));
  const arc=(r:number,y:number,d:number,thickness:number)=>{
    const pts=Array.from({length:49},(_,i)=>{const a=-Math.PI/2+i/48*Math.PI;return v(Math.sin(a)*r,y,d+Math.cos(a)*r);});
    detail.geometry('marble',new T.TubeGeometry(new T.CatmullRomCurve3(pts),48,thickness,6,false));
  };
  shell.box('marble',0,1.4,z,125,2.2,82);
  shell.box('roof',0,36,z,124,1,81);
  // The photos show slender, recessed vertical bays, not solid corner towers.
  for(const s of [-1,1]){
    shell.box('pane',s*43.5,18.5,z,38,33,80);
    for(const face of [-1,1]){
      const dz=face*40.5;
      for(let bay=0;bay<10;bay++){
        const x=s*(24+bay*4.25);
        shell.box('marble',x,15.7,z+dz,1.2,28.5,1.8);
        shell.box('marble',x,32.1,z+dz,.95,4.7,1.8);
        if(bay<9){
          // Opaque stone aprons between floors keep the facade masonry-led.
          for(const y of [6.4,12.5,18.6,24.7])shell.box('marble',x+s*2.125,y,z+dz,3.05,1.65,.95);
          detail.box('trim',x+s*2.125,16,z+face*40.13,.07,26,.1);
        }
      }
      for(const y of [2.4,28.7,35.6,37.5])shell.box('marble',s*43.5,y,z+dz,40,.75,2.5);
      for(let x=25;x<=63;x+=1.2)detail.box('marble',s*x,36.65,z+dz,.3,1.3,.4);
    }
    for(let dz=-40;dz<=40;dz+=5){
      shell.box('marble',s*63,19,z+dz,1.8,35,1.3);
      detail.box('trim',s*62.62,16,z+dz+2.5,.1,26,.07);
    }
    for(const y of [2.4,6.4,12.5,18.6,24.7,28.7,35.6,37.5])shell.box('marble',s*63,y,z,2.2,.75,83);
    for(let dz=-40;dz<=40;dz+=1.2)detail.box('marble',s*63,36.65,z+dz,.4,1.3,.3);
  }
  shell.box('pane',0,18.5,z-10,48,33,60);
  // Projecting half-rotunda and open colonnade establish the palace silhouette.
  cylinder('pane',22.8,26,15,31,true);
  cylinder('marble',24.5,1.2,2.4,31,true);
  cylinder('marble',25.1,1,28.9,31,true);
  cylinder('pane',24.1,5.6,32.1,31,true);
  cylinder('marble',25.2,1,35.45,31,true);
  for(let i=0;i<11;i++){
    const a=(-72+i*14.4)*Math.PI/180,x=Math.sin(a)*25,d=31+Math.cos(a)*25;
    shell.geometry('marble',new T.CylinderGeometry(.61,.79,25.1,20).translate(x,15.6,z+d));
    for(const y of [3,28.2])shell.box('marble',x,y,z+d,1.8,.8,1.8);
  }
  for(let i=0;i<=28;i++){
    const a=-Math.PI/2+i/28*Math.PI;
    shell.geometry('marble',new T.BoxGeometry(.46,5.6,.7).rotateY(a).translate(Math.sin(a)*24.35,32.1,z+31+Math.cos(a)*24.35));
  }
  for(const y of [29.7,34.8,36,37.5])arc(25.25,y,31,.21);
  for(let i=0;i<=58;i++){
    const a=-Math.PI/2+i/58*Math.PI;
    detail.box('marble',Math.sin(a)*25.25,36.7,z+31+Math.cos(a)*25.25,.27,1.35,.27);
  }
  for(let step=0;step<8;step++)shell.box('marble',0,.25+step*.23,z+66-step*.85,57,.46,15-step*1.2);
  shell.box('door',0,8.8,z+54,6.6,12.4,.35);
  for(const s of [-1,1])shell.box('marble',s*3.8,8.8,z+54,1,13.2,.75);
  shell.box('marble',0,15.2,z+54,8.6,1,.75);
  detail.box('goldenFrame',0,8.8,z+54.22,.12,12.4,.1);
  // Low windowed drum, blue dome and a slender spire; no invented emblems.
  cylinder('marble',20.1,2.1,38.3,17);
  cylinder('pane',19.6,2.8,40.5,17);
  cylinder('marble',20.3,.9,42.2,17);
  for(let i=0;i<48;i++){
    const a=i/48*Math.PI*2;
    shell.geometry('marble',new T.BoxGeometry(.42,2.8,.65).rotateY(a).translate(Math.sin(a)*19.75,40.5,z+17+Math.cos(a)*19.75));
  }
  shell.geometry('dome',new T.SphereGeometry(20.1,64,40,0,Math.PI*2,0,Math.PI/2).scale(1,21.6/20.1,1).translate(0,42.6,z+17));
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2,pts=[];
    for(let k=0;k<=28;k++){const p=k/28*Math.PI/2;pts.push(v(Math.sin(p)*20.17*Math.sin(a),42.6+Math.cos(p)*21.67,17+Math.sin(p)*20.17*Math.cos(a)));}
    detail.geometry('gold',new T.TubeGeometry(new T.CatmullRomCurve3(pts),28,.11,5,false));
  }
  cylinder('marble',1.25,2.4,64.9,17);
  shell.geometry('gold',new T.CylinderGeometry(.045,.72,17.5,16).translate(0,74.85,z+17));
  shell.geometry('gold',new T.SphereGeometry(.78,16,12).translate(0,84.25,z+17));
}

export function buildAkordaForecourt(shell:CityBatch,detail:CityBatch,z:number){
  shell.box('paving',0,.24,z+14,178,.48,146);
  // Formal forecourt and terraced basin, composed from the supplied aerial view.
  shell.box('paving',0,.25,z+135,194,.5,180);
  for(const s of [-1,1]){
    shell.box('grass',s*68,.53,z+122,53,.12,87);
    for(const dz of [90,124,158]){
      detail.box('paving',s*68,.63,z+dz,53,.08,2.2);
      detail.box('flowers',s*68,.65,z+dz+7,34,.1,3.5);
    }
    for(let step=0;step<4;step++)shell.box('marble',s*(32+step*2),.6+step*.3,z+127,3,.6,26+step*4);
  }
  shell.geometry('stone',new T.CylinderGeometry(20,20,.6,64).translate(0,.67,z+127));
  shell.geometry('water',new T.CylinderGeometry(18.8,18.8,.045,64).translate(0,1,z+127));
  detail.box('paving',0,.55,z+205,22,.12,105);
  for(const s of [-1,1]){
    shell.box('paving',s*155,.35,z+75,118,.32,246);
    for(const x of [127,183])for(const dz of [0,75,150]){
      shell.box('grass',s*x,.58,z+dz,48,.14,66);
      for(const edge of [-1,1]){
        shell.box('leaf',s*x+edge*23,.95,z+dz,1.3,1,64);
        shell.box('leaf',s*x,.95,z+dz+edge*32,47,1,1.3);
      }
      detail.geometry('leaf',new T.TorusGeometry(12,.6,5,48).rotateX(Math.PI/2).translate(s*x,1,z+dz));
      detail.geometry('flowers',new T.CylinderGeometry(8,8,.15,40).translate(s*x,.72,z+dz));
      for(const edge of [-1,1])detail.box('paving',s*x,.7,z+dz+edge*24,2,.1,13);
    }
    // Continue formal gardens towards the towers; keep the cross-street open.
    for(const [dz,length] of [[310,168],[570,148]]){
      shell.box('paving',s*155,.35,z+dz,122,.32,length);
      for(const x of [126,184]){
        shell.box('grass',s*x,.6,z+dz,45,.18,length-14);
        for(const edge of [-1,1])shell.box('leaf',s*x+edge*21,.98,z+dz,1.25,.8,length-16);
        for(let row=-1;row<=1;row++){
          const d=dz+row*(length-30)/3;
          detail.box('paving',s*x,.76,z+d,43,.12,3);
          detail.box('flowers',s*x,.82,z+d+8,30,.2,4);
          detail.box('flowers',s*x,.82,z+d-8,23,.2,3);
        }
      }
      for(const d of [dz-length/3,dz,dz+length/3]){
        detail.box('stone',s*155,.7,z+d,5.4,.9,1.4);
        detail.box('trim',s*155,1.2,z+d,5.6,.14,1.5);
      }
    }
  }
}

/** Paired tapered golden towers framing the Akorda approach; reference study. */
export function buildGoldenGateway(shell:CityBatch,detail:CityBatch,z:number){
  for(const s of [-1,1]){
    const x=s*91;
    shell.box('marble',x,2,z,43,4,43);
    shell.geometry('goldenGlass',new T.CylinderGeometry(12.4,18,70,64).translate(x,39,z));
    for(let j=1;j<=22;j++){
      const y=4+j*3,r=18-(y-4)/70*5.6+.14;
      detail.geometry('goldenFrame',new T.TorusGeometry(r,.055,4,64).rotateX(Math.PI/2).translate(x,y,z));
    }
    for(let i=0;i<40;i++){
      const a=i/40*Math.PI*2;
      detail.rod('goldenFrame',new T.Vector3(x+Math.sin(a)*18.14,4,z+Math.cos(a)*18.14),new T.Vector3(x+Math.sin(a)*12.54,74,z+Math.cos(a)*12.54),.055,4);
    }
    // Narrow dark service strip follows the taper, rather than floating in front.
    shell.geometry('pane',new T.BoxGeometry(2.3,48,.16).rotateX(-Math.atan(5.6/70)).translate(x,43,z+18-(43-4)/70*5.6+.08));
    shell.geometry('gold',new T.CylinderGeometry(.08,.4,9,12).translate(x,78.5,z));
  }
}
