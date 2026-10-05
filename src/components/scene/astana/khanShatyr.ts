import * as T from 'three';
import {CityBatch} from './batch';
import type {MaterialKey} from './materials';

/** Reference-photo study, with the existing district footprint and mast height. */
export const KHAN_SHATYR={radius:92,bermRadius:108,ellipse:.975,base:8.5,height:90,mast:145,entryHalfAngle:.19} as const;

export function khanCanopyPoint(t:number,angle:number,z:number){
  const k=KHAN_SHATYR,y=k.base+t*k.height,r=2.6+(k.radius-2.6)*(1-t)**1.55;
  return new T.Vector3(Math.cos(angle)*r+t*16,y,z+Math.sin(angle)*r*k.ellipse);
}

export function buildKhanShatyr(shell:CityBatch,detail:CityBatch,z:number){
  const k=KHAN_SHATYR,point=(r:number,a:number,y:number)=>new T.Vector3(Math.cos(a)*r,y,z+Math.sin(a)*r*k.ellipse);
  // Separate named material batches remain owned/disposed by the host city.
  const surface=(key:MaterialKey,rows:T.Vector3[][],target=shell)=>{
    const positions:number[]=[],uv:number[]=[],indices:number[]=[],cols=rows[0].length;
    for(let j=0;j<rows.length;j++)for(let i=0;i<cols;i++){
      positions.push(...rows[j][i].toArray());uv.push(i/(cols-1),j/(rows.length-1));
      if(j&&i){const q=j*cols+i;indices.push(q-cols-1,q-1,q-cols,q-cols,q-1,q);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();target.geometry(key,g);
  };
  const sectors=96,angles=Array.from({length:sectors+1},(_,i)=>i/sectors*Math.PI*2);
  // Increasing height / counterclockwise angles gives outward shell normals.
  surface('tent',Array.from({length:37},(_,j)=>angles.map(a=>khanCanopyPoint(j/36,a,z))));
  // Subtle structural seams are actual geometry. Main seams survive low LOD.
  for(let i=0;i<64;i++){
    const a=i*Math.PI/32,pts=Array.from({length:25},(_,j)=>khanCanopyPoint(j/24*.97,a,z).add(new T.Vector3(Math.cos(a)*.035,.025,Math.sin(a)*.035)));
    (i%4===0?shell:detail).geometry('white',new T.TubeGeometry(new T.CatmullRomCurve3(pts),32,i%4===0?.065:.03,4,false));
  }
  for(let j=1;j<24;j++){
    const t=j/26,pts=Array.from({length:97},(_,i)=>khanCanopyPoint(t,i/sectors*Math.PI*2,z).add(new T.Vector3(0,.035,0)));
    detail.geometry('white',new T.TubeGeometry(new T.CatmullRomCurve3(pts),96,.022,4,false));
  }
  // The exposed mast is one slender tapered member. The old three oversized
  // poles ending far above the membrane are not retained outside the roof.
  const apex=new T.Vector3(16,k.base+k.height,z);
  const cap=new T.CylinderGeometry(1.25,2.6,4.5,32);cap.scale(1,1,k.ellipse);cap.translate(apex.x,apex.y+2.25,z);shell.geometry('trim',cap);
  for(const y of [apex.y+.8,apex.y+2,apex.y+3.2]){
    const r=2.6-(y-apex.y)/4.5*1.35,g=new T.TorusGeometry(r,.06,4,32);g.rotateX(Math.PI/2);g.scale(1,1,k.ellipse);g.translate(apex.x,y,z);detail.geometry('white',g);
  }
  const mastBottom=new T.Vector3(apex.x,apex.y+4.45,z),mastTop=new T.Vector3(21,k.mast,z);
  const mast=new T.CylinderGeometry(.07,.22,mastBottom.distanceTo(mastTop),10);
  mast.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),mastTop.clone().sub(mastBottom).normalize()));
  mast.translate((mastTop.x+mastBottom.x)/2,(mastTop.y+mastBottom.y)/2,z);shell.geometry('white',mast);
  // Grassed embankment wraps the base, except for the broad central entrance
  // facing the pedestrian underpass. Do not cover the entrance with a cylinder.
  const start=-Math.PI/2+k.entryHalfAngle,end=3*Math.PI/2-k.entryHalfAngle;
  const baseAngles=Array.from({length:97},(_,i)=>start+(end-start)*i/96);
  surface('grass',Array.from({length:9},(_,j)=>{
    const t=j/8,r=k.bermRadius-(k.bermRadius-k.radius)*t,y=.4+(k.base-.4)*Math.sin(t*Math.PI/2);
    return baseAngles.map(a=>point(r,a,y));
  }));
  // A narrow stone edge and membrane sill provide material separation.
  for(const [r,y,key] of [[k.bermRadius,.43,'stone'],[k.radius,k.base+.07,'white']] as const){
    const pts=baseAngles.map(a=>point(r,a,y));
    detail.geometry(key,new T.TubeGeometry(new T.CatmullRomCurve3(pts),128,.13,5,false));
  }
  const face=(key:MaterialKey,vertices:T.Vector3[],indices:number[])=>{
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices.flatMap(v=>v.toArray()),3));g.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap((_,i)=>[i%2,Math.floor(i/2)]),2));g.setIndex(indices);g.computeVertexNormals();shell.geometry(key,g);
  };
  for(const a of [start,end]){
    const inside=point(k.radius,a,k.base),outside=point(k.bermRadius,a,.4);
    let previous=outside;
    for(let j=1;j<=8;j++){
      const t=j/8,next=point(k.bermRadius-(k.bermRadius-k.radius)*t,a,.4+(k.base-.4)*Math.sin(t*Math.PI/2));
      face('stone',[previous,next,new T.Vector3(previous.x,.4,previous.z),new T.Vector3(next.x,.4,next.z)],[0,1,2,1,3,2,2,1,0,2,3,1]);
      detail.rod('white',previous.clone().add(new T.Vector3(0,.18,0)),next.clone().add(new T.Vector3(0,.18,0)),.12,6);
      previous=next;
    }
    // No cap across the opening: the retaining walls end at the door jambs.
    detail.rod('white',inside,inside.clone().setY(.4),.08,6);
  }
  // Recessed glazed doors: the paved approach reaches the threshold directly.
  const entryZ=z-k.radius*k.ellipse*Math.cos(k.entryHalfAngle)-.08,half=17.4;
  shell.box('paving',0,.30,z-98,40,.2,28);
  face('pane',[new T.Vector3(-half,.4,entryZ),new T.Vector3(half,.4,entryZ),new T.Vector3(-half,k.base,entryZ),new T.Vector3(half,k.base,entryZ)],[0,2,1,1,2,3]);
  for(let x=-15;x<=15;x+=3){
    detail.box('white',x,4.45,entryZ-.06,.10,8.1,.13);
    if(Math.abs(x)<=9)detail.box('trim',x+.18,1.8,entryZ-.15,.07,.8,.07);
  }
  for(const y of [.48,3.35,6.2,8.5])shell.box('white',0,y,entryZ-.05,34.8,.12,.17);
  for(const side of [-1,1]){
    // Low stone benches sit to the sides, never across the pedestrian axis.
    shell.box('stone',side*33,.68,z-114,8,.56,1.2);
    for(const dz of [-121,-110]){
      shell.box('trim',side*25,2.55,z+dz,.10,4.3,.10);
      shell.box('white',side*25,4.7,z+dz,.6,.09,.9);
    }
  }
}
