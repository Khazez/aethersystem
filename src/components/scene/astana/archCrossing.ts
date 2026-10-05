import * as THREE from 'three';
import {CityBatch} from './batch';

/** Photo-led cross street: longitudinal Nurzhol remains a pedestrian park. */
export const ARCH_CROSSING={offset:-20,deck:6.68,halfWidth:10,deckEnd:164,rampEnd:270,streetEnd:355} as const;

export function archRoadHeight(x:number){
  return .04+(ARCH_CROSSING.deck-.04)*Math.max(0,Math.min(1,(270-Math.abs(x))/106));
}

export function buildArchApproaches(batch:CityBatch,archZ:number){
  const z=archZ+ARCH_CROSSING.offset;
  for(const side of [-1,1]){
    // Contiguous thin ramp deck; no tall solid wall blocking the lower court.
    const x=side*217,slope=Math.atan2(ARCH_CROSSING.deck-.04,106);
    const ramp=new THREE.BoxGeometry(Math.hypot(106,ARCH_CROSSING.deck-.04),.4,20);
    ramp.rotateZ(-side*slope);ramp.translate(x,(ARCH_CROSSING.deck+.04)/2-.20,z);batch.geometry('asphalt',ramp);
    // Retaining embankment supports the approach: it must not float as a thin
    // asphalt sheet outside the elevated plaza crossing.
    const support=new THREE.BoxGeometry(106,1,23.5),positions=support.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const px=positions.getX(i)+x;
      positions.setXYZ(i,px,positions.getY(i)>0?Math.max(.01,archRoadHeight(px)-.3):-.12,positions.getZ(i)+z);
    }
    support.computeVertexNormals();batch.geometry('stone',support);
    batch.box('asphalt',side*312.5,-.035,z,85,.15,20);
    for(const dz of [-11,11]){
      const curb=new THREE.BoxGeometry(Math.hypot(106,6.64),.38,1.5);
      curb.rotateZ(-side*slope);curb.translate(x,3.56,z+dz);batch.geometry('stone',curb);
      batch.box('paving',side*312.5,.19,z+dz,85,.3,1.5);
      for(let a=168;a<268;a+=8)batch.box('trim',side*a,archRoadHeight(a)+.6,z+dz,.07,1.2,.07);
      batch.rod('trim',new THREE.Vector3(side*164,archRoadHeight(164)+1.2,z+dz),new THREE.Vector3(side*270,archRoadHeight(270)+1.2,z+dz),.04,6);
    }
    for(let a=169;a<353;a+=10){
      for(const dz of [-5,0,5]){
        const paint=new THREE.BoxGeometry(4,.012,.13);
        paint.rotateZ(a<270?-side*slope:0);paint.translate(side*a,archRoadHeight(a)+.035,z+dz);batch.geometry('marking',paint);
      }
    }
  }
}

export function archCrossingCarPose(index:number,time:number,archZ:number){
  const lane=Math.floor(index/8),direction=lane<2?1:-1;
  const t=((index%8)/8+time*(9+lane%2)/710)%1;
  const x=direction*(t*710-355),y=archRoadHeight(x);
  const slope=Math.abs(x)>164&&Math.abs(x)<270?-Math.sign(x)*6.64/106:0;
  return {x,y,z:archZ-20+[-7.5,-2.5,2.5,7.5][lane],yaw:direction*Math.PI/2,pitch:-Math.atan(slope*direction)};
}
