import * as T from 'three';
import {acquireFacadeAtlas} from './facadeAtlas';
import {cityReservations,overlapsCityRect,subtractCityRect} from '../astana/cityEdges';

type Mass = {x:number;z:number;w:number;d:number;h:number;style:number;setback:boolean;lotW:number;lotD:number;transition?:boolean};
// Unequal blocks share chunk boundaries, but local streets can terminate at
// a collector. This is a planning kit, not a jittered grid of detached boxes.
function blockCuts(index:number,almaty:boolean){
  const widths=almaty?[112,168,126,182,108,144]:[126,182,112,154,108,158];
  const shift=((index%6)+6)%6,cuts=[-420];
  for(let i=0;i<6;i++)cuts.push(cuts[i]+widths[(i+shift)%6]);
  return cuts;
}
/** Stable planning data, separate from rendering so a future map adapter can supply it. */
export function outerDistrictPlan(city:'astana'|'almaty',start:number,end:number,seed:number,route=false){
  const chunks:{x:number;z:number;buildings:Mass[];xCuts:number[];zCuts:number[]}[]=[];
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const center=(start+end)/2;
  const reservations=cityReservations(city,start,end,route);
  for(let iz=-8;iz<8;iz++)for(let ix=-8;ix<8;ix++){
    const x=(ix+.5)*840,z=center+(iz+.5)*840,buildings:Mass[]=[];
    const xCuts=blockCuts(ix,city==='almaty'),zCuts=blockCuts(iz+2,city==='almaty');
    const business=random()>.67,park=random()<.09;
    for(let rz=0;rz<6;rz++)for(let rx=0;rx<6;rx++){
      const lotW=xCuts[rx+1]-xCuts[rx],lotD=zCuts[rz+1]-zCuts[rz];
      const px=x+(xCuts[rx+1]+xCuts[rx])/2,pz=z+(zCuts[rz+1]+zCuts[rz])/2;
      // Keep the authored districts and the terminal approach completely clear.
      const inset=route?8:0;
      const parcel={left:px-lotW/2+inset,right:px+lotW/2-inset,front:pz-lotD/2+inset,back:pz+lotD/2-inset};
      if(reservations.some(r=>overlapsCityRect(r,parcel))){
        // A small overlap used to discard the entire outer-city parcel,
        // leaving a vacant belt next to the detailed quarters. Fit low-rise
        // transition blocks into the remaining land, never into the core.
        // No PRNG calls here: unrelated districts keep their existing layout.
        if(route&&city==='astana'){
          let pieces=[parcel];
          for(const reserved of reservations)pieces=pieces.flatMap(p=>subtractCityRect(p,reserved));
          for(const p of pieces){
            const width=p.right-p.left,depth=p.back-p.front;
            if(width<64||depth<64)continue;
            buildings.push({x:(p.left+p.right)/2,z:(p.front+p.back)/2,w:width-34,d:depth-34,
              h:(4+((rx+rz+ix+iz+32)%4))*3.6,style:2,setback:true,lotW:width,lotD:depth,transition:true});
          }
        }
        continue;
      }
      // Almaty is a basin: southern development tapers into the foothills.
      if(city==='almaty'&&pz<end-1800-random()*900)continue;
      if(city==='almaty'&&Math.abs(px-650)<520&&Math.abs(pz-(center-900))<560)continue;
      if(park&&random()<.65)continue;
      // Residential parcels use a street perimeter around an open court;
      // business parcels stay narrower with a stepped tower over a podium.
      const office=business&&(rx===2||rx===3||rz===2);
      const w=office?Math.min(lotW-46,38+random()*30):lotW-42-random()*8,d=office?Math.min(lotD-46,34+random()*28):lotD-42-random()*8;
      const floors=city==='almaty'?3+Math.floor(random()*(office?16:8)):6+Math.floor(random()*(office?29:16));
      buildings.push({x:px,z:pz,w,d,h:floors*3.6,style:office?1:random()>.55?0:2,setback:office||random()>.78,lotW,lotD});
    }
    if(buildings.length)chunks.push({x,z,buildings,xCuts,zCuts});
  }
  return chunks;
}

/** Outer districts: batched massing, medium roof detail, distant silhouettes.
 * No panorama billboards and no runtime geometry churn. Bounds remain per chunk.
 */
export function createCityHorizon(city:'astana'|'almaty',start:number,end:number,seed:number,foliage?:T.InstancedMesh,route=false){
  const group=new T.Group();group.name='Continuous outer city';
  const plan=outerDistrictPlan(city,start,end,seed,route),geometry=new T.BoxGeometry();
  const reservations=cityReservations(city,start,end,route);
  const atlases=[acquireFacadeAtlas('stone',false,true),acquireFacadeAtlas('metal',true),acquireFacadeAtlas('brick')];
  const materials=atlases.map((atlas,i)=>{
    const m=new T.MeshStandardMaterial({map:atlas.color,roughnessMap:atlas.surface,metalnessMap:atlas.surface,aoMap:atlas.surface,aoMapIntensity:.65,roughness:1,metalness:1,envMapIntensity:.85});
    m.onBeforeCompile=shader=>{
      shader.vertexShader='varying float cityRoof;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
        cityRoof=abs(normal.y);
        #ifdef USE_INSTANCING
          vec3 dimensions=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
          float width=abs(normal.x)>.5?dimensions.z:dimensions.x;
          vMapUv=uv*vec2(width/21.6,dimensions.y/14.4);
          vRoughnessMapUv=vMapUv;
          vMetalnessMapUv=vMapUv;
          vAoMapUv=vMapUv;
        #endif`);
      shader.fragmentShader='varying float cityRoof;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.215,.215),step(.5,cityRoof));`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.94,step(.5,cityRoof));');
      shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor*=1.-step(.5,cityRoof);');
    };
    m.customProgramCacheKey=()=>`outer-city-surface-atlas-${i}`;return m;
  });
  const silhouettes=materials.map((_,i)=>new T.MeshStandardMaterial({color:[0x777d7b,0x637278,0x807a73][i],roughness:.9}));
  const roofMaterial=new T.MeshStandardMaterial({color:0x626c6b,roughness:.94});
  const roadMaterial=new T.MeshStandardMaterial({color:0x525b5d,roughness:.98});
  const pavingMaterial=new T.MeshStandardMaterial({color:0x8d918a,roughness:.96});
  const gardenMaterial=new T.MeshStandardMaterial({color:city==='almaty'?0x507b49:0x63824d,roughness:1});
  const dummy=new T.Object3D();
  const rendered=plan.map(chunk=>{
    const root=new T.Group();root.position.set(chunk.x,0,chunk.z);group.add(root);
    const parts:T.InstancedMesh[]=[];
    for(let style=0;style<3;style++){
      const masses=chunk.buildings.filter(b=>b.style===style);
      if(!masses.length)continue;
      const transforms:T.Matrix4[]=[];
      for(const b of masses){
        if(style!==1&&!b.setback){
          // Three related wings, not added random cubes: a U-shaped court for
          // stone housing, an L-shaped street wall for brick neighborhoods.
          const depth=18,wing=(b.d-depth),lower=Math.max(10,b.h-7.2);
          dummy.position.set(b.x-chunk.x,b.h/2,b.z-chunk.z-(b.d-depth)/2);dummy.scale.set(b.w,b.h,depth);dummy.updateMatrix();transforms.push(dummy.matrix.clone());
          dummy.position.set(b.x-chunk.x-(b.w-depth)/2,lower/2,b.z-chunk.z+depth/2);dummy.scale.set(depth,lower,wing);dummy.updateMatrix();transforms.push(dummy.matrix.clone());
          if(style===0){dummy.position.set(b.x-chunk.x+(b.w-depth)/2,lower/2,b.z-chunk.z+depth/2);dummy.scale.set(depth,lower,wing);dummy.updateMatrix();transforms.push(dummy.matrix.clone());}
          continue;
        }
        const base=b.setback?Math.min(14,b.h*.22):0;
        if(base){dummy.position.set(b.x-chunk.x,base/2,b.z-chunk.z);dummy.scale.set(b.w+9,base,b.d+9);dummy.updateMatrix();transforms.push(dummy.matrix.clone());}
        const crown=style===1&&b.h>54?14.4:0;
        dummy.position.set(b.x-chunk.x,base+(b.h-base-crown)/2,b.z-chunk.z);dummy.scale.set(b.w,b.h-base-crown,b.d);dummy.updateMatrix();transforms.push(dummy.matrix.clone());
        if(crown){dummy.position.set(b.x-chunk.x,b.h-crown/2,b.z-chunk.z);dummy.scale.set(b.w*.73,crown,b.d*.78);dummy.updateMatrix();transforms.push(dummy.matrix.clone());}
      }
      const mesh=new T.InstancedMesh(geometry,materials[style],transforms.length);mesh.userData.style=style;
      transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);parts.push(mesh);
    }
    const roofs=new T.InstancedMesh(geometry,roofMaterial,chunk.buildings.length);
    chunk.buildings.forEach((b,i)=>{dummy.position.set(b.x-chunk.x,b.h+1.5,b.z-chunk.z-(b.style!==1&&!b.setback?(b.d-18)/2:0));dummy.scale.set(b.w*.27,3,Math.min(12,b.d*.2));dummy.updateMatrix();roofs.setMatrixAt(i,dummy.matrix);});
    roofs.computeBoundingSphere();root.add(roofs);
    const paving=new T.InstancedMesh(geometry,pavingMaterial,chunk.buildings.length);
    chunk.buildings.forEach((b,i)=>{dummy.position.set(b.x-chunk.x,.02,b.z-chunk.z);dummy.scale.set(b.w+18,.12,b.d+18);dummy.updateMatrix();paving.setMatrixAt(i,dummy.matrix);});
    paving.computeBoundingSphere();paving.receiveShadow=true;root.add(paving);
    // Planted verges occupy the spare part of each parcel, rather than a
    // continuous concrete square. Canopies reuse the close-up foliage atlas.
    const gardens=new T.InstancedMesh(geometry,gardenMaterial,chunk.buildings.length*3);
    const trees=foliage?new T.InstancedMesh(foliage.geometry,foliage.material,chunk.buildings.length*12):null;
    chunk.buildings.forEach((b,i)=>{
      const court=b.style!==1&&!b.setback;
      for(let j=0;j<3;j++){
        const interior=j===2&&court;
        const vergeX=b.lotW/2-16,vergeZ=b.lotD/2-16;
        dummy.position.set(b.x-chunk.x+(j===0?vergeX:j===1?-vergeX:0),.2,b.z-chunk.z+(j===2?(interior?9:vergeZ):0));
        dummy.scale.set(interior?b.w-40:j===2?b.lotW-38:7,.14,interior?b.d-27:j===2?7:b.lotD-30);dummy.updateMatrix();gardens.setMatrixAt(i*3+j,dummy.matrix);
      }
      if(trees)for(let j=0;j<12;j++){
        const inCourt=court&&j>7;
        const tx=inCourt?(j%2===0?-1:1)*(b.w-48)*.5:(j<4?1:-1)*(b.lotW/2-16);
        const tz=inCourt?6+Math.floor((j-8)/2)*(b.d-38)*.6:(j%4-1.5)*(b.lotD-40)/3;
        dummy.position.set(b.x-chunk.x+tx,6+(j%3)*.6,b.z-chunk.z+tz);
        dummy.rotation.set(.25,j*1.7,.1);dummy.scale.set(3.3,3.5,3.3);dummy.updateMatrix();trees.setMatrixAt(i*12+j,dummy.matrix);
      }
      dummy.rotation.set(0,0,0);
    });
    gardens.computeBoundingSphere();gardens.receiveShadow=true;root.add(gardens);
    if(trees){trees.computeBoundingSphere();trees.receiveShadow=true;root.add(trees);}
    const roadTransforms:T.Matrix4[]=[];
    const addRoad=(x0:number,z0:number,x1:number,z1:number)=>{
      // Subtract the authored core instead of running the far street grid
      // through its park, boulevard and reserved terminal approach.
      let pieces=[{left:x0,right:x1,front:z0,back:z1}];
      for(const reserved of reservations)pieces=pieces.flatMap(p=>subtractCityRect(p,reserved));
      for(const {left:ax,front:az,right:bx,back:bz} of pieces){dummy.position.set((ax+bx)/2-chunk.x,-.12,(az+bz)/2-chunk.z);dummy.scale.set(bx-ax,.05,bz-az);dummy.updateMatrix();roadTransforms.push(dummy.matrix.clone());}
    };
    for(let i=0;i<7;i++){
      addRoad(chunk.x+chunk.xCuts[i]-8,chunk.z-420,chunk.x+chunk.xCuts[i]+8,chunk.z+420);
      addRoad(chunk.x-420,chunk.z+chunk.zCuts[i]-8,chunk.x+420,chunk.z+chunk.zCuts[i]+8);
    }
    const roads=new T.InstancedMesh(geometry,roadMaterial,roadTransforms.length);
    roadTransforms.forEach((matrix,i)=>roads.setMatrixAt(i,matrix));
    roads.computeBoundingSphere();root.add(roads);
    return {root,parts,roofs,paving,roads,gardens,trees,x:chunk.x,z:chunk.z};
  });
  let disposed=false;
  const position=new T.Vector3();
  return {group,buildingCount:plan.reduce((n,c)=>n+c.buildings.length,0),
    streetConnections(z:number,halfLength:number){
      return [...new Set(plan.filter(c=>Math.abs(c.z-z)<420).flatMap(c=>c.xCuts.map(x=>x+c.x)).filter(x=>Math.abs(x)>455&&Math.abs(x)<halfLength-20))].sort((a,b)=>a-b);
    },
    update(camera:T.Camera){
      camera.getWorldPosition(position);
      for(const c of rendered){
        const distance=Math.hypot(position.x-c.x,position.z-c.z);
        c.roofs.visible=distance<2000;
        c.paving.visible=distance<3800;c.roads.visible=distance<4800;
        c.gardens.visible=distance<3800;if(c.trees)c.trees.visible=distance<2600;
        for(const mesh of c.parts){mesh.material=distance>4800?silhouettes[mesh.userData.style]:materials[mesh.userData.style];mesh.castShadow=distance<1800;}
      }
    },
    dispose(){if(disposed)return;disposed=true;group.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});geometry.dispose();atlases.forEach(a=>a.dispose());[...materials,...silhouettes,roofMaterial,roadMaterial,pavingMaterial,gardenMaterial].forEach(m=>m.dispose());group.clear();},
  };
}
