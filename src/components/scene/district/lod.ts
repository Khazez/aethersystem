import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {DistrictBuilding} from './model';
import {pitchedRoofGeometry,roofEquipment} from './model';
import {acquireFacadeAtlas} from './facadeAtlas';

/** The distant silhouette has the exact same footprints and storey heights. */
export function createDistantDistrict(buildings:DistrictBuilding[]){
  const group=new T.Group(),atlases:ReturnType<typeof acquireFacadeAtlas>[]=[],materials:T.Material[]=[],geometries:T.BufferGeometry[]=[];
  const buckets=new Map<string,T.BufferGeometry[]>(),palette=new Map<string,T.MeshStandardMaterial>();
  for(const b of buildings){
    const key=`${b.finish}:${!!b.glass}:${!!b.balcony}`;
    if(!palette.has(key)){
      const atlas=acquireFacadeAtlas(b.finish==='brick'?'brick':b.finish==='metal'?'metal':'stone',b.glass,b.balcony);atlases.push(atlas);
      const m=new T.MeshStandardMaterial({map:atlas.color,roughnessMap:atlas.surface,metalnessMap:atlas.surface,aoMap:atlas.surface,aoMapIntensity:.65,roughness:1,metalness:1,envMapIntensity:.85});palette.set(key,m);materials.push(m);buckets.set(key,[]);
    }
    const y0=b.base??0,y1=y0+b.floors*4,positions:number[]=[],uv:number[]=[];
    for(let i=0;i<b.plan.length;i++){
      const [ax,az]=b.plan[i],[bx,bz]=b.plan[(i+1)%b.plan.length],cells=Math.round(Math.hypot(bx-ax,bz-az)/3.6);
      const a=[ax+b.x,y0,az+b.z],d=[bx+b.x,y0,bz+b.z],c=[bx+b.x,y1,bz+b.z],e=[ax+b.x,y1,az+b.z];
      positions.push(...a,...d,...c,...a,...c,...e);uv.push(0,0,cells/6,0,cells/6,b.floors/4,0,0,cells/6,b.floors/4,0,b.floors/4);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();buckets.get(key)!.push(g);
    const shape=new T.Shape(b.plan.map(([x,z])=>new T.Vector2(x+b.x,-z-b.z))),roof=new T.ShapeGeometry(shape);roof.rotateX(-Math.PI/2);roof.translate(0,y1+.35,0);
    const roofMat=new T.MeshStandardMaterial({color:0x666d6b,roughness:.97});materials.push(roofMat);geometries.push(roof);const roofMesh=new T.Mesh(roof,roofMat);roofMesh.receiveShadow=true;group.add(roofMesh);
    if(b.pitched){const g=pitchedRoofGeometry(b);geometries.push(g);const mesh=new T.Mesh(g,roofMat);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
    // Low-cost physical ledges keep grazing light and roof silhouettes alive
    // after detailed openings unload. One merged mesh per district, not one
    // draw call per balcony. The facade underneath retains the same footprint.
    const ledges:T.BufferGeometry[]=[];
    for(const p of roofEquipment(b,buildings))ledges.push(new T.BoxGeometry(p.w,p.h,p.d).translate(p.x,y1+.35+p.h/2,p.z));
    for(let edge=0;edge<b.plan.length;edge++){
      const [ax,az]=b.plan[edge],[bx,bz]=b.plan[(edge+1)%b.plan.length];
      const length=Math.hypot(bx-ax,bz-az),angle=Math.atan2(-(bz-az),bx-ax),cells=Math.round(length/3.6),width=length/cells;
      const strip=(x:number,y:number,z:number,w:number,h:number,d:number)=>{
        const g=new T.BoxGeometry(w,h,d).rotateY(angle).translate(x,y,z);ledges.push(g);
      };
      strip((ax+bx)/2+b.x,y1+.28,(az+bz)/2+b.z,length,.56,.45);
      if(b.glass)for(let floor=1;floor<b.floors;floor++)strip((ax+bx)/2+b.x,y0+floor*4,(az+bz)/2+b.z,length,.32,.65);
      if(b.balcony)for(let cell=1;cell<cells;cell+=3)for(let floor=1;floor<b.floors;floor++){
        const t=(cell+.5)/cells;
        strip(ax+(bx-ax)*t+b.x+Math.sin(angle)*.45,y0+floor*4+.12,az+(bz-az)*t+b.z+Math.cos(angle)*.45,width*.96,.18,1.45);
      }
    }
    const ledgeKey='physical-ledge';
    if(!buckets.has(ledgeKey)){buckets.set(ledgeKey,[]);const m=new T.MeshStandardMaterial({color:0x9ea8a4,roughness:.78});palette.set(ledgeKey,m);materials.push(m);}
    buckets.get(ledgeKey)!.push(...ledges);
  }
  for(const [key,parts] of buckets){const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());geometries.push(g);const mesh=new T.Mesh(g,palette.get(key));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  let disposed=false;
  return {group,dispose(){if(disposed)return;disposed=true;atlases.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}

export function fadeMaterials(group:T.Group,amount:{value:number},inverse=false){
  const cloned=new Map<T.Material,T.Material>();
  group.traverse(o=>{if(!(o instanceof T.Mesh))return;
    const material=(source:T.Material)=>{
      if(cloned.has(source))return cloned.get(source)!;
      const m=source.clone(),original=source.onBeforeCompile.bind(source),cache=source.customProgramCacheKey();
      m.onBeforeCompile=(shader,renderer)=>{
        original(shader,renderer);shader.uniforms.uDistrictDetail=amount;
        shader.fragmentShader='uniform float uDistrictDetail;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
          float detailNoise=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
          if(${inverse?'detailNoise < uDistrictDetail':'detailNoise >= uDistrictDetail'})discard;`);
      };
      m.customProgramCacheKey=()=>cache+`:district-lod-${inverse}`;cloned.set(source,m);return m;
    };
    o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);
  });
  return ()=>cloned.forEach(m=>m.dispose());
}
