import * as T from 'three';
import {CityBatch} from './batch';

/** Three parallel cross streets visible in the user's 2GIS screenshot.
 * Relative placement/widths are adapted to the existing presentation scale,
 * not a surveyed lane plan. Longitudinal Nurzhol stays pedestrian.
 */
export function nurzholCrossStreets(baiterek:number,akorda:number){
  return [
    {name:'Достық',z:baiterek+180,width:18},
    {name:'Туркестан',z:baiterek-180,width:18},
    {name:'Мәңгілік Ел',z:akorda+490,width:26},
  ].map(s=>({...s,halfLength:3200,clearance:s.width/2+5}));
}
export type CrossStreet=ReturnType<typeof nurzholCrossStreets>[number];
export function crossingContains(streets:CrossStreet[],x:number,z:number,pad=0){return streets.some(s=>Math.abs(x)<s.halfLength+pad&&Math.abs(z-s.z)<s.clearance+pad);}
export function crossStreetBounds(streets:CrossStreet[]){return streets.map(s=>new T.Box3(new T.Vector3(-s.halfLength,-1,s.z-s.clearance),new T.Vector3(s.halfLength,300,s.z+s.clearance)));}

export function buildNurzholCrossStreets(batch:CityBatch,streets:CrossStreet[],connections:(z:number,halfLength:number)=>number[]=()=>[]){
  const gaps=(centers:number[],extent:number,extra=0)=>{
    let pieces:[number,number][]=[[-extent,extent]];
    for(const x of centers){const half=(Math.abs(x)>300?13:Math.abs(x)===74?3.2:6)+extra;
      pieces=pieces.flatMap(([a,b])=>b<=x-half||a>=x+half?[[a,b] as [number,number]]:[[a,Math.max(a,x-half)],[Math.min(b,x+half),b]].filter(([l,r])=>r>l) as [number,number][]);
    }return pieces;
  };
  for(const s of streets){
    const junctions=[-345,-74,74,345,...connections(s.z,s.halfLength)];
    // Same low grade as outer streets; no asphalt floated over garden beds.
    batch.box('asphalt',0,-.035,s.z,s.halfLength*2,.14,s.width);
    for(const side of [-1,1]){
      for(const [a,b] of gaps(junctions,s.halfLength,.1))batch.box('paving',(a+b)/2,.10,s.z+side*(s.width/2+2.4),b-a,.2,4.8);
      // Outside the detailed core, open verge lets existing grid streets join.
      for(const [a,b] of gaps([-345,-74,-48,0,48,74,345],455,.3))batch.box('stone',(a+b)/2,.15,s.z+side*(s.width/2+.18),b-a,.3,.36);
    }
    // Marked continuations of the central walk and the two edge promenades.
    for(const center of [-48,0,48])for(let x=center-4.8;x<=center+4.8;x+=1.6)batch.box('marking',x,.045,s.z,.78,.02,s.width-1);
    for(let x=-s.halfLength+8;x<s.halfLength;x+=12){
      if([...junctions,-48,0,48].some(p=>Math.abs(x-p)<14))continue;
      batch.box('marking',x,.045,s.z,5,.02,.14);
      if(s.width>20)for(const side of [-1,1])batch.box('marking',x,.045,s.z+side*6.2,5,.02,.12);
    }
    // Curbs and crosswalks stop at the existing north/south access streets.
    for(const x of junctions){
      const width=Math.abs(x)>455?16:Math.abs(x)>300?26:6.4;
      for(const side of [-1,1]){
        const z0=s.z+side*s.width/2,z1=s.z+side*(s.width/2+(Math.abs(x)>455?17:6)),y1=Math.abs(x)>455?-.095:Math.abs(x)>300?.035:.30;
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-width/2,.035,z0,x+width/2,.035,z0,x-width/2,y1,z1,x+width/2,y1,z1],3));
        g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));g.setIndex(side>0?[0,2,1,1,2,3]:[0,1,2,1,3,2]);g.computeVertexNormals();batch.geometry('asphalt',g);
      }
    }
    // At the boulevard this is a signal-controlled crossing, not a path stripe.
    // Fixed pedestrian phase is intentional: no uncoordinated blinking lights.
    for(const side of [-1,1]){
      const poleX=side*62,poleZ=s.z+side*(s.width/2+1.2);
      batch.rod('trim',new T.Vector3(poleX,.2,poleZ),new T.Vector3(poleX,5.6,poleZ),.095,10);
      const lampZ=s.z+side*s.width/4;
      batch.rod('trim',new T.Vector3(poleX,5.5,poleZ),new T.Vector3(poleX,5.5,lampZ),.075,8);
      batch.box('signalOff',poleX,5,lampZ,.25,1.45,.58);
      for(let light=0;light<3;light++){
        const lens=new T.CircleGeometry(.16,16);lens.rotateY(side*Math.PI/2);lens.translate(poleX+side*.14,5.45-light*.44,lampZ);
        batch.geometry(light===0?'signalRed':'signalOff',lens);
      }
      batch.box('marking',side*58,.046,s.z+side*s.width/4,.32,.02,s.width/2-.8);
      for(const x of [-48,0,48]){
        const z=s.z+side*(s.width/2+1.1),px=x+6.2;
        batch.rod('trim',new T.Vector3(px,.2,z),new T.Vector3(px,3.4,z),.065,8);
        batch.box('signalOff',px,3.05,z,.46,.85,.21);
        const head=new T.CircleGeometry(.068,12);if(side<0)head.rotateY(Math.PI);head.translate(px,3.16,z+side*.115);batch.geometry('signalGreen',head);
        batch.box('signalGreen',px,2.99,z+side*.12,.065,.20,.02);
        for(const sign of [-1,1]){
          batch.rod('signalGreen',new T.Vector3(px,2.94,z+side*.13),new T.Vector3(px+sign*.10,2.82,z+side*.13),.022,5);
          batch.rod('signalGreen',new T.Vector3(px,3.05,z+side*.13),new T.Vector3(px+sign*.10,2.98,z+side*.13),.02,5);
        }
      }
    }
  }
}

type Vertex={p:T.Vector3;n:T.Vector3;uv:T.Vector2};
/** Split existing low surfaces at the new road corridors, preserving outside
 * polygons and UVs. Avoid merely painting asphalt on top of fountains/grass.
 * Only owned, non-instanced city batches are passed here before first render.
 */
export function cutCrossStreetSurfaces(root:T.Group,streets:CrossStreet[]){
  cutLowCitySurfaces(root,crossStreetBounds(streets));
}
export function cutLowCitySurfaces(root:T.Group,cuts:T.Box3[]){
  if(!cuts.length)return;
  const split=(polygon:Vertex[],axis:'x'|'z',edge:number,less:boolean)=>{
    const inside=(v:Vertex)=>less?v.p[axis]<=edge:v.p[axis]>=edge;
    const out:Vertex[]=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],ia=inside(a),ib=inside(b);
      if(ia)out.push(a);
      if(ia!==ib){const t=(edge-a.p[axis])/(b.p[axis]-a.p[axis]);out.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t),uv:a.uv.clone().lerp(b.uv,t)});}
    }
    return out;
  };
  root.traverse(o=>{
    const mesh=o as T.Mesh;if(!mesh.isMesh||(mesh as T.InstancedMesh).isInstancedMesh||mesh.userData.surface==='ground')return;
    const source=mesh.geometry,p=source.getAttribute('position'),normal=source.getAttribute('normal'),uv=source.getAttribute('uv'),index=source.index;
    source.computeBoundingBox();if(source.boundingBox!.min.y>8)return;
    const nearby=cuts.filter(b=>source.boundingBox!.intersectsBox(b));
    if(!nearby.length)return;
    const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
    for(let i=0;i<(index?.count??p.count);i+=3){
      const triangle=Array.from({length:3},(_,j)=>{const k=index?index.getX(i+j):i+j;return {p:new T.Vector3().fromBufferAttribute(p,k),n:new T.Vector3().fromBufferAttribute(normal,k),uv:new T.Vector2(uv.getX(k),uv.getY(k))};});
      let polygons=[triangle];
      if(triangle.every(v=>v.p.y<8))for(const s of nearby){
        polygons=polygons.flatMap(poly=>{
          const result:Vertex[][]=[];let rest=poly;
          for(const [axis,edge,less] of [['x',s.min.x,true],['x',s.max.x,false],['z',s.min.z,true],['z',s.max.z,false]] as const){
            if(rest.length<3)break;
            const outside=split(rest,axis,edge,less);if(outside.length>=3)result.push(outside);
            rest=split(rest,axis,edge,!less);
          }
          return result;
        });
      }
      for(const poly of polygons)for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){positions.push(...v.p);normals.push(...v.n);uvs.push(...v.uv);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingSphere();mesh.geometry=g;source.dispose();
  });
}
