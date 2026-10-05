import * as T from 'three';
import {CityBatch} from './batch';
import type {MaterialKey} from './materials';

/** Photo-led House of Ministries frontage, not a measured architectural survey.
 * 2GIS identifies the supplied office as Mangilik El 8, in a 13-storey building.
 * Existing gold towers terminate the two wings; do not create another pair.
 */
export const GOVERNMENT_FRONTAGE={inner:112,outer:505,portal:345,portalRadius:21,depth:22};
export function governmentFrontZ(x:number,akorda:number){return akorda+430-.001*(Math.abs(x)-112)**2;}
export function governmentOpening(x:number){
  const d=Math.abs(x)-GOVERNMENT_FRONTAGE.portal;
  return Math.abs(d)<21?12+Math.sqrt(21*21-d*d):0;
}
export function governmentHeight(x:number){return Math.abs(x)>235&&Math.abs(x)<440?46.6:43.2;}
export function governmentContains(x:number,z:number,akorda:number,pad=0){return Math.abs(x)>112-pad&&Math.abs(x)<505+pad&&Math.abs(z-governmentFrontZ(x,akorda))<11+pad;}

export function buildGovernmentQuarter(shell:CityBatch,detail:CityBatch,akorda:number){
  for(const sign of [-1,1]){
    // Subdivide the long walls before bending; an unsplit extruded cap would
    // triangulate straight through the curved plan. Build closed short slices.
    const section=(x:number,front:boolean,h:number)=>new T.Vector3(sign*x,h,governmentFrontZ(x,akorda)+(front?11:-11));
    const face=(key:MaterialKey,points:T.Vector3[])=>{
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));
      geo.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(p=>[p.x/8,p.y/8]),2));
      const indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
      if(sign<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
      geo.setIndex(indices);geo.computeVertexNormals();shell.geometry(key,geo);
    };
    const cuts=[112,235,324,366,440,505];
    for(let x=114;x<505;x+=2)cuts.push(x);
    cuts.sort((a,b)=>a-b);
    const opening=(x:number)=>Math.abs(x-345)<=21?12+Math.sqrt(Math.max(0,441-(x-345)**2)):0;
    for(let i=1;i<cuts.length;i++){
      const a=cuts[i-1],b=cuts[i];if(b-a<.001)continue;
      const mid=(a+b)/2,h=governmentHeight(mid),inside=mid>324&&mid<366;
      const loA=inside?opening(a):0,loB=inside?opening(b):0;
      face('marble',[section(a,true,loA),section(b,true,loB),section(b,true,h),section(a,true,h)]);
      face('marble',[section(b,false,loB),section(a,false,loA),section(a,false,h),section(b,false,h)]);
      face('roof',[section(a,true,h),section(b,true,h),section(b,false,h),section(a,false,h)]);
      if(inside)face('stone',[section(a,false,loA),section(b,false,loB),section(b,true,loB),section(a,true,loA)]);
      if(i===1||a===366||a===235||a===440)face('marble',[section(a,false,loA),section(a,true,loA),section(a,true,h),section(a,false,h)]);
      if(b===505||b===324||b===366||b===235||b===440)face('marble',[section(b,true,loB),section(b,false,loB),section(b,false,h),section(b,true,h)]);
      for(const front of [-1,1]){
        const dz=front*11.03;
        if(!inside)shell.geometry('door',new T.BoxGeometry(b-a+.02,4.1,.22).rotateY(sign*Math.atan(.002*(mid-112))).translate(sign*mid,2.05,governmentFrontZ(mid,akorda)+dz));
      }
    }
    for(let x=115;x<504;x+=3.9){
      const h=governmentHeight(x),angle=sign*Math.atan(.002*(x-112));
      for(const side of [-1,1]){
        const z=governmentFrontZ(x,akorda)+side*11.08;
        for(let f=0;f<13;f++){
          const y=6+f*3.1;if(y+1.1>h-1.2||y-1.1<governmentOpening(x)+.8)continue;
          const key:MaterialKey=(Math.floor(x/3.9)+f*3)%9===0?'goldenFrame':'pane';
          shell.geometry(key,new T.BoxGeometry(1.6,2.05,.09).rotateY(angle).translate(sign*x,y,z));
          detail.geometry('stone',new T.BoxGeometry(1.9,.10,.23).rotateY(angle).translate(sign*x,y-1.06,z));
          detail.geometry('trim',new T.BoxGeometry(.06,2.05,.12).rotateY(angle).translate(sign*x,y,z+side*.05));
        }
        detail.geometry('stone',new T.BoxGeometry(.06,h,.10).rotateY(angle).translate(sign*x,h/2,z));
      }
    }
    // Narrow sidewalks stop at each real passage, instead of sealing its floor.
    for(let x=114;x<505;x+=4){
      const z=governmentFrontZ(x,akorda),angle=sign*Math.atan(.002*(x-112));
      if(Math.abs(x-345)>15)for(const side of [-1,1])shell.geometry('paving',new T.BoxGeometry(4.08,.24,3.2).rotateY(angle).translate(sign*x,.12,z+side*13));
    }
    // Reconnect the existing outer street through the actual open portal.
    const street=governmentFrontZ(345,akorda);
    shell.box('asphalt',sign*345,-.035,street,26,.14,90);
    for(const side of [-1,1])shell.box('paving',sign*345+side*15,.12,street,3.5,.24,90);
    for(let dz=-42;dz<=42;dz+=12)shell.box('marking',sign*345,.045,street+dz,.13,.02,5);
  }
}
