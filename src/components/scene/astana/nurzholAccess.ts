import * as T from 'three';
import {CityBatch} from './batch';
import type {MaterialKey} from './materials';
import {buildKhanCrossing,KHAN_CROSSING} from './khanCrossing';

type Point=[number,number];
export type AccessPath={name:string;points:Point[];width:number};
export const BAITEREK_LOOP={x:117,z:151,width:7} as const;
/** Reference-led local access, not a surveyed traffic plan. The park axis is dry. */
export function nurzholAccessPlan(baiterek:number,arch:number,khan:number){
  const paths:AccessPath[]=[],parking:{x:number;z:number;yaw:number}[]=[];
  const frontageParking:{x:number;z:number;yaw:number}[]=[],frontageAprons:Point[][]=[];
  const loop:Point[]=Array.from({length:97},(_,i)=>[117*Math.sin(i*Math.PI/48),baiterek+151*Math.cos(i*Math.PI/48)]);
  paths.push({name:'Baiterek perimeter loop',width:7,points:loop});
  const join=Math.sqrt(1-(74/117)**2)*151;
  for(let i=0;i<64;i++){
    const a=i*Math.PI/32,x=117*Math.sin(a),dz=151*Math.cos(a);
    if(Math.abs(x)<27||Math.abs(dz)<15)continue;
    const normal=new T.Vector2(Math.sin(a)/117,Math.cos(a)/151).normalize();
    parking.push({x:x+normal.x*6.5,z:baiterek+dz+normal.y*6.5,yaw:Math.atan2(normal.x,normal.y)});
  }
  for(const side of [-1,1]){
    paths.push({name:'Nurzhol edge access',width:6.4,points:[
      [side*345,-345-Math.ceil((-345-(baiterek-170))/300)*300],[side*74,-345-Math.ceil((-345-(baiterek-170))/300)*300],[side*74,baiterek-join],
    ]});
    paths.push({name:'Nurzhol edge access',width:6.4,points:[
      [side*74,baiterek+join],[side*74,arch-235],
      [side*116,arch-200],[side*169,arch-118],[side*185,arch-72],[side*282,arch-72],[side*288,arch-20],[side*345,arch-20],
    ]});
    paths.push({name:'Arch outer frontage',width:6.4,points:[
      [side*345,arch-20],[side*288,arch-20],[side*282,arch+42],[side*188,arch+42],[side*171,arch+87],
      [side*127,arch+146],[side*74,arch+199],[side*74,khan-190],[side*140,khan-190],[side*140,khan-145],
    ]});
    // Separate low-speed access behind and beside the shopping-centre forecourt.
    paths.push({name:'Khan Shatyr side access',width:7,points:[[side*345,khan-145],[side*140,khan-145],[side*140,khan+145],[0,khan+145]]});
  }
  paths.push({name:'Khan Shatyr forecourt street',width:KHAN_CROSSING.width,points:[[-355,khan-145],[355,khan-145]]});
  // Parking belongs to the outside frontage shown in the photo, not to the
  // fountain court. Follow the existing access street; do not move that road.
  for(const side of [-1,1]){
    const dx=-44*side,dz=59,length=Math.hypot(dx,dz),nx=59/length*side,nz=44/length;
    const point=(t:number,offset:number):Point=>[171*side+dx*t+nx*offset,arch+87+dz*t+nz*offset];
    frontageAprons.push([point(.06,6.25),point(.91,6.25)]);
    for(let i=0;i<10;i++){
      const [x,z]=point(.12+i*.078,6.25);
      frontageParking.push({x,z,yaw:Math.atan2(nx,nz)});
    }
  }
  const clearances:T.Box3[]=[];
  for(const p of paths)for(let i=1;i<p.points.length;i++){
    const [ax,az]=p.points[i-1],[bx,bz]=p.points[i],n=Math.ceil(Math.hypot(bx-ax,bz-az)/6);
    for(let j=0;j<n;j++){
      const t=(j+.5)/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      clearances.push(new T.Box3(new T.Vector3(x-p.width/2-3,-1,z-p.width/2-3),new T.Vector3(x+p.width/2+3,30,z+p.width/2+3)));
    }
  }
  for(const [slots,pad] of [[parking,4],[frontageParking,5]] as const)for(const p of slots)clearances.push(new T.Box3(new T.Vector3(p.x-pad,-1,p.z-pad),new T.Vector3(p.x+pad,30,p.z+pad)));
  const plaza:T.Box3[]=[];
  const underpassCourt=new T.Box3(new T.Vector3(-61,-1,khan-202),new T.Vector3(61,30,khan-88));
  clearances.push(underpassCourt);
  for(let dz=-144;dz<=144;dz+=6){
    const half=111*Math.sqrt(Math.max(0,1-(dz/148)**2));
    plaza.push(new T.Box3(new T.Vector3(-half,-1,baiterek+dz-3),new T.Vector3(half,30,baiterek+dz+3)));
  }
  // Trees need crown clearance too, not merely a trunk outside the curb.
  return {paths,parking,frontageParking,frontageAprons,clearances,plaza,baiterek,contains:(x:number,z:number)=>clearances.some(b=>x>b.min.x-4&&x<b.max.x+4&&z>b.min.z-4&&z<b.max.z+4)};
}

/** Continuous ribbon avoids gaps at bends. Curbs and apron use the same plan. */
function ribbon(batch:CityBatch,key:MaterialKey,points:Point[],width:number,y:number){
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  // Sample long straights before grading: endpoint-only interpolation could
  // bury an entire cross street at the height of its two outside junctions.
  const samples:Point[]=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/6));
    for(let j=0;j<n;j++)samples.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);
  }
  samples.push(points.at(-1)!);points=samples;
  const closed=Math.hypot(points[0][0]-points.at(-1)![0],points[0][1]-points.at(-1)![1])<.001;
  for(let i=0;i<points.length;i++){
    const a=points[i===0&&closed?points.length-2:Math.max(0,i-1)],b=points[i===points.length-1&&closed?1:Math.min(points.length-1,i+1)];
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
    const height=y-.22*Math.max(0,Math.min(1,(Math.abs(points[i][0])-240)/25));
    for(const side of [-1,1]){positions.push(points[i][0]+side*dz/length*width/2,height,points[i][1]-side*dx/length*width/2);uv.push(side===1?1:0,i);}
    if(i){const j=i*2;indices.push(j-2,j,j-1,j-1,j,j+1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();batch.geometry(key,geometry);
}

export function buildNurzholAccess(batch:CityBatch,plan:ReturnType<typeof nurzholAccessPlan>,khan:number){
  for(const p of plan.paths){
    if(p.name==='Khan Shatyr forecourt street')continue;
    ribbon(batch,'stone',p.points,p.width+1.6,.28);ribbon(batch,'asphalt',p.points,p.width,.30);
  }
  buildKhanCrossing(batch,khan);
  for(const apron of plan.frontageAprons){
    ribbon(batch,'paving',apron,8.6,.26);
    ribbon(batch,'asphalt',apron,6.2,.30);
  }
  const plaza=new T.CircleGeometry(1,96);plaza.rotateX(-Math.PI/2);plaza.scale(83,1,105);plaza.translate(0,.33,plan.baiterek);batch.geometry('paving',plaza);
  batch.box('paving',0,.28,plan.baiterek,12,.10,291);
  batch.box('paving',0,.28,plan.baiterek,227,.10,12);
  for(let sector=0;sector<8;sector++){
    const a=sector*Math.PI/4+.11,b=(sector+1)*Math.PI/4-.11;
    const bed:Point[]=Array.from({length:13},(_,i)=>{const t=a+(b-a)*i/12;return [96*Math.sin(t),plan.baiterek+125*Math.cos(t)];});
    ribbon(batch,'stone',bed,12,.37);ribbon(batch,'grass',bed,11.4,.40);ribbon(batch,'flowers',bed,1.6,.43);
    const t=(a+b)/2,x=78*Math.sin(t),z=plan.baiterek+100*Math.cos(t);
    batch.box('stone',x,.60,z,2.7,.55,.65);
    batch.rod('trim',new T.Vector3(x+2,.33,z),new T.Vector3(x+2,5.2,z),.07,8);
    const light=new T.CylinderGeometry(.55,.55,.10,16);light.translate(x+2,5.2,z);batch.geometry('white',light);
  }
  // Marked pedestrian entries cross the perimeter road, not the central square.
  for(const side of [-1,1])for(let j=-4;j<=4;j++){
    batch.box('marking',j*1.6,.325,plan.baiterek+side*151,.8,.015,6.6);
    batch.box('marking',side*117,.325,plan.baiterek+j*1.6,6.6,.015,.8);
  }
  const rotatedBox=(key:MaterialKey,x:number,y:number,z:number,w:number,h:number,d:number,yaw:number)=>{
    const g=new T.BoxGeometry(w,h,d);g.rotateY(yaw);g.translate(x,y,z);batch.geometry(key,g);
  };
  for(const [i,p] of [...plan.parking,...plan.frontageParking].entries()){
    rotatedBox('asphalt',p.x,.23,p.z,3,.14,6,p.yaw);
    for(const side of [-1,1])rotatedBox('marking',p.x+side*1.45*Math.cos(p.yaw),.32,p.z-side*1.45*Math.sin(p.yaw),.10,.02,5.7,p.yaw);
    if(i%4===0)continue; // Some spaces remain available; no cars on the footpath.
    rotatedBox(i%3===0?'trim':'white',p.x,.97,p.z,1.8,.66,4.4,p.yaw);
    rotatedBox('pane',p.x,1.54,p.z,1.48,.55,2.1,p.yaw);
    rotatedBox('roof',p.x,1.84,p.z,1.49,.08,1.95,p.yaw);
    for(const dx of [-.85,.85])for(const dz of [-1.35,1.35])rotatedBox('trim',p.x+dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw),.59,p.z-dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw),.18,.54,.62,p.yaw);
  }
  // A connected forecourt with planting islands, rather than a bare green void.
  batch.box('paving',0,.24,khan-118,245,.16,34);
  for(const side of [-1,1]){
    batch.box('paving',side*119,.23,khan,19,.14,216);
    for(const dz of [-80,-30,20,70]){
      batch.box('stone',side*125,.40,khan+dz,9,.28,26);
      batch.box('grass',side*125,.57,khan+dz,8.4,.10,25.4);
      batch.box('stone',side*114,.66,khan+dz,2.5,.7,.65);
    }
    for(const dz of [-126,126]){
      batch.box('paving',side*222,.21,khan+dz,210,.14,8);
      for(let j=-2;j<=2;j++)batch.box('marking',side*140,.325,khan+dz+j*1.4,6.6,.015,.65);
    }
  }
}
