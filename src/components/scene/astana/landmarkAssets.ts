import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';

export type LandmarkKind='akorda'|'gateway'|'watergreen'|'ktz'|'emerald'|'arch'|'transport'|'quarter';
export const LANDMARK_FILES={akorda:'/models/review/akorda-r5-draco.glb',gateway:'/models/review/gateway-r1-draco.glb',watergreen:'/models/review/watergreen-r1-draco.glb',ktz:'/models/review/ktz-r4-draco.glb',emerald:'/models/review/emerald-r2-draco.glb',arch:'/models/review/arch-r7-draco.glb',transport:'/models/review/transport-r2-draco.glb',quarter:'/models/review/baiterek-quarter-r1-draco.glb'} as const;

/** Conservative six-metre plan coverage, not one empty rectangle around a
 * complex. Triangle/cell SAT also handles vertical walls and narrow railings.
 * Courtyards with authored paving remain reserved; empty outside corners do not. */
export function landmarkCoverage(root:THREE.Object3D,cell=6){
  const rows=new Map<number,Set<number>>(),points=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  root.updateMatrixWorld(true);
  root.traverse(object=>{
    const mesh=object as THREE.Mesh;if(!mesh.isMesh)return;
    const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;
    for(let i=0;i<(index?.count??p.count);i+=3){
      for(let j=0;j<3;j++)points[j].fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);
      const xs=points.map(v=>v.x),zs=points.map(v=>v.z);
      const x0=Math.floor(Math.min(...xs)/cell),x1=Math.floor(Math.max(...xs)/cell),z0=Math.floor(Math.min(...zs)/cell),z1=Math.floor(Math.max(...zs)/cell);
      const axes=points.map((v,j)=>{const w=points[(j+1)%3];return {x:-(w.z-v.z),z:w.x-v.x};});
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
        if(rows.get(z)?.has(x))continue;
        const cx=(x+.5)*cell,cz=(z+.5)*cell;
        const separated=axes.some(a=>{
          const projections=points.map(v=>a.x*v.x+a.z*v.z),center=a.x*cx+a.z*cz,radius=(Math.abs(a.x)+Math.abs(a.z))*cell/2;
          return Math.max(...projections)<center-radius-1e-5||Math.min(...projections)>center+radius+1e-5;
        });
        if(!separated){const row=rows.get(z)??new Set<number>();row.add(x);rows.set(z,row);}
      }
    }
  });
  const result:THREE.Box3[]=[],active=new Map<string,THREE.Box3>();
  for(const z of [...rows.keys()].sort((a,b)=>a-b)){
    const xs=[...rows.get(z)!].sort((a,b)=>a-b);
    for(let i=0;i<xs.length;){
      const first=xs[i];let last=first;while(i+1<xs.length&&xs[i+1]===last+1)last=xs[++i];i++;
      const key=`${first}:${last}`,previous=active.get(key);
      if(previous&&Math.abs(previous.max.z-z*cell)<1e-5)previous.max.z=(z+1)*cell;
      else{const box=new THREE.Box3(new THREE.Vector3(first*cell,-1,z*cell),new THREE.Vector3((last+1)*cell,300,(z+1)*cell));result.push(box);active.set(key,box);}
    }
  }
  return result;
}

/** Each import owns its GPU resources; shared tower meshes are released exactly once. */
export function ownedResources(root:THREE.Object3D){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  root.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.isMesh){
    geometries.add(mesh.geometry);
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
      materials.add(material);
      for(const value of Object.values(material))if(value&&typeof value==='object'&&(value as THREE.Texture).isTexture)textures.add(value as THREE.Texture);
    }
  }});
  let released=false;
  return ()=>{if(released)return;released=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
}

/** Keep the city's ground and light rig; never import a studio slab or camera. */
export function prepareLandmark(root:THREE.Group,kind:LandmarkKind){
  const remove:THREE.Object3D[]=[];
  root.traverse(o=>{
    const name=o.name.replaceAll('_',' ');
    if((o as THREE.Camera).isCamera||(o as THREE.Light).isLight||name==='Plaza stone'||name.startsWith('Review ground'))remove.push(o);
    if(kind==='gateway'&&name==='Golden gateway east')o.position.x=91;
    if(kind==='gateway'&&name==='Golden gateway west')o.position.x=-91;
    if((o as THREE.Mesh).isMesh){
      o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
      o.userData.landmarkDetail=kind==='akorda'&&(name.startsWith('Akorda detailed')||name==='Bronze window frames');
    }
  });
  remove.forEach(o=>o.removeFromParent());root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  if(bounds.isEmpty()||![...bounds.min,...bounds.max].every(Number.isFinite))throw new Error('Invalid landmark bounds');
  const size=bounds.getSize(new THREE.Vector3());
  if(size.y<(kind==='quarter'?40:50)||size.y>(kind==='quarter'?60:kind==='ktz'||kind==='emerald'||kind==='transport'?170:120)||size.x>(kind==='quarter'?650:kind==='transport'?520:kind==='arch'?330:230))throw new Error('Unexpected landmark scale');
  root.name=`Imported ${kind}`;
  return root;
}

async function loadLandmark(url:string){
  const decoder=new DRACOLoader().setDecoderPath('/draco/gltf/').setWorkerLimit(1);
  try{return (await new GLTFLoader().setDRACOLoader(decoder).loadAsync(url)).scene;}
  finally{decoder.dispose();}
}

/** Preload nearby; failures retain the fallback. Once loaded, never swap back to a different silhouette. */
export function createLandmarkAsset(options:{parent:THREE.Group;fallback:THREE.Group;kind:LandmarkKind;z:number;x?:number;rotation?:number;load?:(url:string)=>Promise<THREE.Group>}){
  const {parent,fallback,kind,z,x=0,rotation=0}=options;
  let disposed=false,state:'idle'|'loading'|'ready'|'failed'='idle',model:THREE.Group|null=null,release:(()=>void)|null=null,near=false;
  let appliedNear:boolean|null=null;
  let failure:string|null=null;
  let footprint:THREE.Box3|null=null;
  let footprints:THREE.Box3[]=[];
  const load=options.load??loadLandmark;
  const trigger=()=>{
    if(state!=='idle'||disposed)return;
    state='loading';
    void Promise.resolve().then(()=>load(LANDMARK_FILES[kind])).then(root=>{
      const cleanup=ownedResources(root);
      if(disposed){cleanup();return;}
      try{model=prepareLandmark(root,kind);}catch(error){cleanup();throw error;}
      release=cleanup;model.position.set(x,0,z);model.rotation.y=rotation;
      model.updateMatrixWorld(true);footprint=new THREE.Box3().setFromObject(model);
      // Quarter reservations already belong to the authored site, not a large
      // bounding rectangle that would also erase the pedestrian axis.
      footprints=kind==='quarter'?[]:kind==='akorda'||kind==='gateway'?[footprint]:landmarkCoverage(model);
      model.visible=false;parent.add(model);state='ready';
    }).catch(error=>{if(!disposed){state='failed';failure=error instanceof Error?error.message:String(error);}});
  };
  return {
    get state(){return state;},
    get error(){return failure;},
    get footprint(){return footprint;},
    get footprints(){return footprints;},
    update(localCamera:THREE.Vector3,quality:'ultra'|'high'|'medium'|'low'){
      if(disposed)return;
      const d=Math.hypot(localCamera.x-x,localCamera.z-z),allowed=quality!=='low';
      // Quality controls fine detail and shadows, never the presence of a
      // landmark. Some fallback groups are deliberately empty loading anchors.
      // Keep distance preloading on low, and preload the portal immediately.
      if(kind==='arch'||d<1350)trigger();
      const threshold=quality==='medium'?500:800;
      near=allowed&&(near?d<threshold+100:d<threshold);
      const show=state==='ready';
      fallback.visible=!show;
      if(model){
        model.visible=show;
        if(appliedNear!==near){
          model.traverse(o=>{if((o as THREE.Mesh).isMesh){o.visible=!o.userData.landmarkDetail||near;o.castShadow=near;}});
          appliedNear=near;
        }
      }
    },
    dispose(){if(disposed)return;disposed=true;model?.removeFromParent();release?.();model=null;fallback.visible=true;},
  };
}
