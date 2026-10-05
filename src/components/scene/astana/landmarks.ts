import * as THREE from 'three';
import { CityBatch } from './batch';
import { buildBuilding } from './buildings';
import {nurzholLayout} from './routeLayout';
import {buildAkorda,buildAkordaForecourt,buildGoldenGateway} from './akorda';
import {buildKhanShatyr} from './khanShatyr';

/** Recognizable architectural studies, not surveyed / certified building models. */
export function landmarks(shell: CityBatch, detail: CityBatch, center: number, end: number,route=false,separatePalaces=false,mapped=false) {
  const anchors=nurzholLayout(center*2-end,end);
  const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  const ring=(key:'white'|'trim'|'gold',x:number,y:number,z:number,r:number,t:number)=>{
    const g=new THREE.TorusGeometry(r,t,6,48); g.rotateX(Math.PI/2);g.translate(x,y,z); detail.geometry(key,g);
  };
  // Reference-led Baiterek: open flaring tree, not a closed cage over the globe.
  const bz=route?anchors.baiterek:center+150;
  const base=new THREE.CylinderGeometry(20,23,2.2,48);base.translate(0,1.1,bz);shell.geometry('paving',base);
  const shaft=new THREE.CylinderGeometry(2.35,2.8,78,24);shaft.translate(0,40,bz);shell.geometry('pane',shaft);
  const globe=new THREE.SphereGeometry(11,64,40);globe.translate(0,93,bz);shell.geometry('goldenGlass',globe);
  const levels=[[2,6.5],[16,5.6],[30,5.4],[44,6.2],[58,8.2],[72,12.6],[85,18.2],[99,23.5]];
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,next=(i+1)/24*Math.PI*2;
    const points=levels.map(([y,r])=>v(Math.cos(a)*r,y,bz+Math.sin(a)*r));
    shell.geometry('white',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),35,.18,6,false));
    for(let j=0;j<levels.length-1;j++){
      const [y0,r0]=levels[j],[y1,r1]=levels[j+1];
      detail.rod('white',v(Math.cos(a)*r0,y0,bz+Math.sin(a)*r0),v(Math.cos(next)*r1,y1,bz+Math.sin(next)*r1),.085,5);
      detail.rod('white',v(Math.cos(next)*r0,y0,bz+Math.sin(next)*r0),v(Math.cos(a)*r1,y1,bz+Math.sin(a)*r1),.085,5);
    }
    // Separate light inner cradle supports the underside of the sphere.
    shell.rod('white',v(Math.cos(a)*4.1,57,bz+Math.sin(a)*4.1),v(Math.cos(a)*9.4,87,bz+Math.sin(a)*9.4),.105,5);
    shell.rod('white',v(Math.cos(a)*3,2,bz+Math.sin(a)*3),v(Math.cos(a)*3,66,bz+Math.sin(a)*3),.11,5);
  }
  for(const [y,r] of levels.slice(0,-1))ring('white',0,y,bz,r,.12);
  // Mullions follow the spherical surface; no opaque vertical cage around it.
  for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2,pts=[];
    for(let j=0;j<=28;j++){const p=j/28*Math.PI;pts.push(v(Math.cos(a)*11.045*Math.sin(p),93+11.045*Math.cos(p),bz+Math.sin(a)*11.045*Math.sin(p)));}
    detail.geometry('goldenFrame',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),28,.04,4,false));
  }
  for(let i=1;i<12;i++){
    const p=i/12*Math.PI,g=new THREE.TorusGeometry(11.045*Math.sin(p),.045,4,64);g.rotateX(Math.PI/2);g.translate(0,93+11.045*Math.cos(p),bz);detail.geometry('goldenFrame',g);
  }
  const band=new THREE.SphereGeometry(11.06,64,3,0,Math.PI*2,Math.acos(1.7/11),Math.acos(-.1/11)-Math.acos(1.7/11));band.translate(0,93,bz);shell.geometry('goldenFrame',band);
  shell.rod('white',v(0,103,bz),v(0,111,bz),.075,6);
  // Khan Shatyr: asymmetric tensile canopy, elliptical base and leaning mast.
  if(route)buildKhanShatyr(shell,detail,anchors.khan);
  else {
    const kz=end+150,radius=84,height=117,ellipse=.82;
    const points:THREE.Vector2[]=[];
    for(let i=0;i<=20;i++) {const t=i/20;points.push(new THREE.Vector2(radius*(1-t)**1.7,4+t*height));}
    const tent=new THREE.LatheGeometry(points,64);
    const positions=tent.getAttribute('position');
    for(let i=0;i<positions.count;i++) {const y=positions.getY(i);positions.setX(i,positions.getX(i)+y*.17);positions.setZ(i,positions.getZ(i)*ellipse+kz);}
    tent.computeVertexNormals();shell.geometry('tent',tent);
    const plinth=new THREE.CylinderGeometry(radius+2,radius+5,5,64);plinth.scale(1,1,ellipse);plinth.translate(0,2.5,kz);shell.geometry('pane',plinth);
    for(let i=0;i<40;i++) {
      const a=i/40*Math.PI*2; const curve:THREE.Vector3[]=[];
      for(let j=0;j<=16;j++) {const t=j/16,y=4+t*height,r=radius*(1-t)**1.7;curve.push(v(Math.cos(a)*r+y*.17,y+.12,kz+Math.sin(a)*r*ellipse));}
      detail.geometry('white',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve),24,.13,4,false));
    }
    shell.rod('trim',v(7,3,kz),v(26,145,kz),.65,8);
  }
  if(route){
    if(separatePalaces&&!mapped)buildAkordaForecourt(shell,detail,anchors.akorda);
    else if(!separatePalaces){
      buildAkorda(shell,detail,anchors.akorda);
      buildGoldenGateway(shell,detail,anchors.akorda+430);
    }
  }
  // Abu Dhabi Plaza inspired stepped cluster, kept beside the flight corridor.
  if(mapped)return; // The supplied geometry already contains this cluster in its actual lot.
  const towerX=route?-230:230,towerZ=route?anchors.baiterek-110:center-60;
  shell.box('stone',towerX,5,towerZ,114,10,100);
  buildBuilding({x:towerX,z:towerZ,width:36,depth:39,floors:61,style:'stepped',seed:801},shell,detail);
  buildBuilding({x:towerX-50,z:towerZ+32,width:30,depth:33,floors:29,style:'office',seed:802},shell,detail);
  buildBuilding({x:towerX+8,z:towerZ+64,width:26,depth:29,floors:20,style:'office',seed:803},shell,detail);
  // Nur Alem sphere as a separate skyline landmark in this composed district.
  if(route)return; // EXPO is not on Nurzhol. Retain only in the legacy study.
  const nx=-280,nz=end+320;
  shell.box('white',nx,5,nz,83,10,83);
  const sphere=new THREE.SphereGeometry(36,48,32);sphere.translate(nx,43,nz);shell.geometry('pane',sphere);
  for(let i=1;i<12;i++) {
    const phi=i/12*Math.PI,y=43+Math.cos(phi)*36;
    ring('white',nx,y,nz,Math.sin(phi)*36,.12);
  }
  for(let i=0;i<16;i++) {
    const a=i/16*Math.PI*2;
    const pts=[];for(let j=0;j<=32;j++){const p=j/32*Math.PI;pts.push(v(nx+Math.sin(p)*36.15*Math.cos(a),43+Math.cos(p)*36.15,nz+Math.sin(p)*36.15*Math.sin(a)));}
    detail.geometry('trim',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),32,.12,4,false));
  }
}
