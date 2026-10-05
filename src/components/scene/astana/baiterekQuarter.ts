import * as T from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {CityBatch} from './batch';
import type {MaterialKey} from './materials';

/** The two connected cream/green-roof complexes in the supplied aerial photo.
 * Photo-compositional dimensions, not a cadastral or measured reconstruction.
 * Keep the park, edge access lanes and both bounding cross streets untouched.
 */
export function baiterekQuarterPlots(baiterek:number,akorda:number){
  return [-1,1].map(sign=>new T.Box3(
    new T.Vector3(sign<0?-324:90,-1,akorda+516),
    new T.Vector3(sign<0?-90:324,90,baiterek-204),
  ));
}
export function quarterContains(plots:T.Box3[],x:number,z:number,pad=0){
  return plots.some(b=>x>b.min.x-pad&&x<b.max.x+pad&&z>b.min.z-pad&&z<b.max.z+pad);
}

export function buildBaiterekQuarter(shell:CityBatch,fine:CityBatch,baiterek:number,akorda:number,site:CityBatch=shell){
  const front=baiterek-222,back=akorda+536;
  const rounded=(x:number,z:number,w:number,d:number,r:number)=>{
    const points:T.Vector2[]=[];
    for(const [cx,cz,start] of [[x+w/2-r,z+d/2-r,0],[x-w/2+r,z+d/2-r,90],[x-w/2+r,z-d/2+r,180],[x+w/2-r,z-d/2+r,270]]){
      for(let j=0;j<=4;j++){const a=(start+j*22.5)*Math.PI/180;points.push(new T.Vector2(cx+Math.cos(a)*r,cz+Math.sin(a)*r));}
    }
    return points;
  };
  const solid=(key:MaterialKey,points:T.Vector2[],base:number,height:number)=>{
    const shape=new T.Shape(points.map(p=>new T.Vector2(p.x,-p.y)));
    const raw=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1,curveSegments:1});
    raw.rotateX(-Math.PI/2);raw.translate(0,base,0);
    const geo=mergeVertices(raw);raw.dispose();shell.geometry(key,geo);
  };
  const section=(x:number,z:number,w:number,d:number,floors:number,r=1.2)=>{
    const points=rounded(x,z,w,d,r),height=5.6+floors*3.05;
    solid('quarterBase',points,.24,5.36);
    solid('marble',points,5.6,height-5.6);
    solid('quarterRoof',rounded(x,z,w+.7,d+.7,r),height,.65);
    solid('stone',rounded(x,z,w+1,d+1,r),height-.65,.45);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz);
      const angle=-Math.atan2(dz,dx),nx=dz/len,nz=-dx/len;
      const face=(batch:CityBatch,key:MaterialKey,t:number,y:number,width:number,h:number,depth:number,offset:number)=>{
        batch.geometry(key,new T.BoxGeometry(width,h,depth).rotateY(angle).translate(a.x+dx*t+nx*offset,y,a.y+dz*t+nz*offset));
      };
      const bays=Math.max(1,Math.floor(len/3.35));
      for(let j=0;j<bays;j++){
        const t=(j+.5)/bays,bayWidth=Math.min(1.6,len/bays*.56);
        face(shell,'pane',t,2.9,Math.min(2.5,len/bays*.76),3.3,.10,.08);
        const darkBay=len>25&&j%7===3;
        if(darkBay)face(shell,'quarterBase',t,(height+5.6)/2,2.5,height-5.6,.14,.10);
        for(let f=0;f<floors;f++){
          const y=7.15+f*3.05;
          face(shell,'pane',t,y,bayWidth,1.72,.12,darkBay?.2:.07);
          face(fine,'stone',t,y-1,Math.min(2.25,len/bays*.78),.12,.34,.13);
          face(fine,'white',t,y,.07,1.72,.12,.16);
          if(darkBay){
            face(fine,'stone',t,y-1.03,2.55,.17,.72,.37);
            face(fine,'trim',t,y-.55,2.35,.05,.07,.70);
          }
        }
      }
      for(const y of [5.6,8.65,height-3.2])face(shell,'stone',.5,y,len+.03,.2,.28,.12);
    }
    // Low green roof upstands and dormer-like roof lights, not a flat grey slab.
    for(let dx=-w/2+7;dx<w/2-4;dx+=14){
      fine.box('quarterRoof',x+dx,height+1.0,z,4.4,1.0,3.8);
      fine.box('pane',x+dx,height+1.0,z+d/2-1,2.8,.7,.12);
    }
  };
  for(const sign of [-1,1]){
    const mid=(front+back)/2;
    site.box('paving',sign*207,.10,mid,234,.20,front-back+36);
    // Connected street wings and taller, softened park corners.
    section(sign*216,front,196,27,10);
    section(sign*111,mid,34,front-back,11,3.2);
    section(sign*116,front-2,44,34,14,7);
    section(sign*210,back,184,26,9);
    section(sign*114,back+3,40,33,12,5);
    // Short outside returns frame a real courtyard rather than a solid block.
    section(sign*303,front-23,24,44,9,2);
    section(sign*291,back+15,24,30,8,2);
    site.box('grass',sign*219,.25,mid,111,.22,Math.max(8,front-back-54));
    for(const dx of [-52,52])site.box('paving',sign*219+dx,.27,mid,3,.12,Math.max(8,front-back-46));
    for(const dz of [-12,12]){
      site.box('stone',sign*178,.62,mid+dz,3.5,.8,1);
      site.box('quarterBase',sign*178,1.05,mid+dz,3.5,.12,1);
    }
    for(const x of [156,226,278]){
      fine.box('trim',sign*x,4.6,front+15,5,.18,2.4);
      shell.box('pane',sign*x,2.4,front+13.6,3.2,4.2,.16);
    }
  }
}
