import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {ownedResources} from './astana/landmarkAssets';

export const TAXI_ASSET='/models/review/taxi-user-20260923.glb';

/** Preserve the supplied aircraft; adapt only its axes, landing origin and propeller animation. */
export function prepareTaxi(root:THREE.Group,touchdownY=-.735){
  const releaseSource=ownedResources(root),created:THREE.BufferGeometry[]=[];
  let released=false;
  const dispose=()=>{if(released)return;released=true;created.forEach(g=>g.dispose());releaseSource();};
  try{
    const remove:THREE.Object3D[]=[];
    root.traverse(o=>{
      const name=o.name.replaceAll('_',' ');
      if((o as THREE.Camera).isCamera||(o as THREE.Light).isLight||name.startsWith('Review ground')||name==='Ground')remove.push(o);
    });
    remove.forEach(o=>o.removeFromParent());root.updateMatrixWorld(true);
    const supplied=!!root.getObjectByName('Drone_Root');
    if(supplied){
      // The supplied craft faces +X; the flight controller expects -Z.
      root.rotation.y+=Math.PI/2;root.updateMatrixWorld(true);
    }
    const originalBounds=new THREE.Box3().setFromObject(root);
    if(originalBounds.isEmpty()||!Number.isFinite(originalBounds.min.y))throw new Error('Taxi asset has no finite geometry');
    root.position.y+=touchdownY-originalBounds.min.y;root.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
    if(bounds.isEmpty()||![...bounds.min,...bounds.max].every(Number.isFinite)||size.x<2||size.x>15||size.y<1||size.y>6||size.z<2||size.z>15||Math.abs(bounds.min.y-touchdownY)>.025)throw new Error('Taxi asset has incompatible scale or landing height');
    const rotorSources:THREE.Object3D[]=[];
    root.traverse(o=>{if(/^TaxiRotor_\d+_(cw|ccw)$/.test(o.name)||/^Rotor_\d+_(upper|lower)$/.test(o.name))rotorSources.push(o);});
    if(rotorSources.length!==(supplied?8:16))throw new Error('Unexpected propeller layout');
    const rotorSet=new Set(rotorSources),staticMeshes:THREE.Mesh[]=[];
    root.traverse(o=>{
      if(!(o as THREE.Mesh).isMesh)return;
      let parent:THREE.Object3D|null=o;
      while(parent){if(rotorSet.has(parent))return;parent=parent.parent;}
      staticMeshes.push(o as THREE.Mesh);
    });
    const model=new THREE.Group();model.name=supplied?'User supplied passenger taxi':'Blender reference passenger taxi';
    const finalGeometries=new Set<THREE.BufferGeometry>();
    const batch=(target:THREE.Group,meshes:THREE.Mesh[],origin:THREE.Vector3)=>{
      const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
      for(const mesh of meshes){
        if(Array.isArray(mesh.material))throw new Error('Expected glTF primitives with individual materials');
        const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();created.push(geo);
        geo.applyMatrix4(mesh.matrixWorld);geo.translate(-origin.x,-origin.y,-origin.z);
        for(const key of Object.keys(geo.attributes))if(key!=='position'&&key!=='normal')geo.deleteAttribute(key);
        if(!geo.getAttribute('normal'))geo.computeVertexNormals();
        const list=batches.get(mesh.material)??[];list.push(geo);batches.set(mesh.material,list);
      }
      for(const [material,geometries] of batches){
        const merged=mergeGeometries(geometries,false);if(!merged)throw new Error('Taxi geometry merge failed');
        created.push(merged);finalGeometries.add(merged);const mesh=new THREE.Mesh(merged,material);mesh.name=material.name;mesh.castShadow=true;mesh.receiveShadow=true;target.add(mesh);
      }
    };
    batch(model,staticMeshes,new THREE.Vector3());
    const rotors=rotorSources.map(source=>{
      const rotor=new THREE.Group();rotor.name=source.name;source.getWorldPosition(rotor.position);
      rotor.userData.spin=source.name.endsWith('_ccw')||source.name.endsWith('_lower')?-1:1;
      const meshes:THREE.Mesh[]=[];source.traverse(o=>{if((o as THREE.Mesh).isMesh)meshes.push(o as THREE.Mesh);});
      batch(rotor,meshes,rotor.position);model.add(rotor);return rotor;
    });
    // Temporary merge inputs are no longer needed; only final geometries remain owned.
    for(let i=created.length-1;i>=0;i--)if(!finalGeometries.has(created[i])){created[i].dispose();created.splice(i,1);}
    return {model,rotors,dispose};
  }catch(error){dispose();throw error;}
}

async function loadTaxi(url:string){
  const decoder=new DRACOLoader().setDecoderPath('/draco/gltf/').setWorkerLimit(1);
  try{return (await new GLTFLoader().setDRACOLoader(decoder).loadAsync(url)).scene;}
  finally{decoder.dispose();}
}

/** Additive swap: retain the old static body until download and validation both succeed. */
export function attachTaxiAsset(group:THREE.Group,load:(url:string)=>Promise<THREE.Group>=loadTaxi){
  const fallback=group.children.map(o=>({o,visible:o.visible}));
  // FlightBackdrop fits the fallback to its carrier before this async swap.
  // Recover its LOCAL bottom, independent of parent position or presentation scale.
  group.updateWorldMatrix(true,true);
  const inverse=new THREE.Matrix4().copy(group.matrixWorld).invert(),matrix=new THREE.Matrix4(),partBounds=new THREE.Box3(),fallbackBounds=new THREE.Box3();
  group.traverse(object=>{
    const mesh=object as THREE.Mesh;if(!mesh.isMesh)return;
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    matrix.multiplyMatrices(inverse,mesh.matrixWorld);
    fallbackBounds.union(partBounds.copy(mesh.geometry.boundingBox!).applyMatrix4(matrix));
  });
  const touchdownY=fallbackBounds.isEmpty()?-.735:fallbackBounds.min.y;
  let disposed=false,ready=false,error:string|null=null,asset:ReturnType<typeof prepareTaxi>|null=null;
  let lastTime:number|undefined;
  void Promise.resolve().then(()=>load(TAXI_ASSET)).then(root=>{
    if(disposed){ownedResources(root)();return;}
    asset=prepareTaxi(root,touchdownY);group.add(asset.model);fallback.forEach(({o})=>{o.visible=false;});ready=true;
  }).catch(reason=>{if(!disposed)error=reason instanceof Error?reason.message:String(reason);});
  return {
    get ready(){return ready;},get error(){return error;},
    update(time:number,rotorSpeed:number){
      if(disposed)return;
      const delta=lastTime===undefined?0:Math.min(.05,Math.max(0,time-lastTime));lastTime=time;
      const speed=Number.isFinite(rotorSpeed)?THREE.MathUtils.clamp(rotorSpeed,0,1):0;
      if(asset)for(const rotor of asset.rotors)rotor.rotation.y+=delta*34*speed*rotor.userData.spin;
    },
    dispose(){if(disposed)return;disposed=true;asset?.model.removeFromParent();asset?.dispose();asset=null;fallback.forEach(({o,visible})=>{o.visible=visible;});},
  };
}
