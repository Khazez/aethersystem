import * as T from 'three';
import {CityBatch} from './batch';
import type {MaterialKey} from './materials';

/** River bend traced compositionally from the supplied 2GIS screenshot.
 * Shared with zoning: the channel cannot run through generated houses/streets.
 * Heights and widths are visual approximations, not hydrographic survey data.
 */
export const ISHIM={halfWidth:54,bank:12,extent:6500,step:20};
export function ishimCenter(x:number,akorda:number){return akorda-260+200*(1-Math.exp(-((x/370)**2)))+.10*x;}
export function ishimReservations(akorda:number){
  const out=[];
  for(let x=-ISHIM.extent;x<ISHIM.extent;x+=ISHIM.step){
    const a=ishimCenter(x,akorda),b=ishimCenter(x+ISHIM.step,akorda),pad=ISHIM.halfWidth+ISHIM.bank+8;
    out.push({left:x,right:x+ISHIM.step,front:Math.min(a,b)-pad,back:Math.max(a,b)+pad});
  }
  return out;
}
export function buildIshimRiver(shell:CityBatch,detail:CityBatch,akorda:number){
  const ribbon=(key:MaterialKey,lo:number,hi:number,y:number)=>{
    if(lo>hi)[lo,hi]=[hi,lo];
    const positions:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let x=-ISHIM.extent,i=0;x<=ISHIM.extent;x+=ISHIM.step,i++){
      const z=ishimCenter(x,akorda);positions.push(x,y,z+lo,x,y,z+hi);uv.push(x/16,lo/16,x/16,hi/16);
      if(i){const j=i*2;indices.push(j-2,j-1,j,j-1,j+1,j);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();shell.geometry(key,g);
  };
  ribbon('water',-54,54,.08);
  for(const side of [-1,1]){
    ribbon('stone',side*54,side*55,.48);ribbon('paving',side*55,side*64,.38);ribbon('grass',side*64,side*72,.27);
    // Low embankment coping, with joints, lamps and benches near the palace.
    for(let x=-720;x<=720;x+=24){
      const z=ishimCenter(x,akorda)+side*55;
      detail.box('trim',x,.9,z,.09,1.2,.09);
      if(x%48===0){detail.box('trim',x,2.2,z+side*6,.16,4,.16);detail.box('white',x,4.25,z+side*6,.45,.18,.45);}
      detail.box('stone',x,.65,z+side*5,3,.5,.7);
    }
  }
  // A formal semicircular rear garden remains on land between palace and river.
  const path=new T.CatmullRomCurve3(Array.from({length:65},(_,i)=>{
    const a=i*Math.PI/64;return new T.Vector3(157*Math.cos(a),.4,akorda-48-115*Math.sin(a));
  }));
  shell.geometry('paving',new T.TubeGeometry(path,64,1.2,6,false));
  for(const x of [-90,0,90])shell.box('paving',x,.28,akorda-98,3,.2,91);
}
