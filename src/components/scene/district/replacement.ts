import * as T from 'three';
import type {DistrictBuilding} from './model';
import {retainScenerySurface} from './surfaceRetention';

/** Bounds are in city-local coordinates, not the camera's world coordinates. */
export function replacedBuildings(buildings:DistrictBuilding[],transform:T.Matrix4,footprints:T.Box3[]){
  const removed=new Set<number>(),point=new T.Vector3();
  buildings.forEach((b,index)=>{
    const bounds=new T.Box3();
    for(const [x,z] of b.plan)bounds.expandByPoint(point.set(x+b.x,0,z+b.z).applyMatrix4(transform));
    if(footprints.some(f=>overlap(bounds,f,2)))removed.add(index);
  });
  // A terrace cannot survive without the volume supporting it.
  buildings.forEach((b,index)=>{
    if(!b.base)return;
    if(buildings.some((support,i)=>removed.has(i)&&!support.base&&
      Math.abs(b.x-support.x)<20&&Math.abs(b.z-support.z)<20))removed.add(index);
  });
  return removed;
}

function overlap(a:T.Box3,b:T.Box3,padding=0){
  return a.max.x+padding>b.min.x&&a.min.x-padding<b.max.x&&a.max.z+padding>b.min.z&&a.min.z-padding<b.max.z;
}

/** Compact cloned instance buffers; never mutate shared prototype geometry/materials. */
export function cloneDistrictSubset(source:T.Group,removed:Set<number>,transform?:T.Matrix4,footprints:T.Box3[]=[],pedestrianZone?:T.Box3,streetClearance?:T.Box3|T.Box3[]){
  if(!removed.size&&(!transform||(!footprints.length&&!pedestrianZone&&!streetClearance)))return source.clone(true);
  const root=source.clone(true),matrix=new T.Matrix4(),world=new T.Matrix4(),color=new T.Color(),bounds=new T.Box3();
  const discard:T.Object3D[]=[];
  const additions:{parent:T.Object3D;mesh:T.InstancedMesh}[]=[];
  root.traverse(object=>{
    const mesh=object as T.InstancedMesh;
    if(mesh.isInstancedMesh){
      const owners=mesh.userData.buildingOwners as number[]|undefined;
      if(!owners&&transform){
        const road=['asphalt','marking'].includes(mesh.name);
        const cuts=[...footprints,...(road?(pedestrianZone?[pedestrianZone]:[]):(streetClearance?(Array.isArray(streetClearance)?streetClearance:[streetClearance]):[]))];
        const retained=retainScenerySurface(mesh,transform,cuts);
        if(retained!==undefined){
          if(retained)additions.push({parent:mesh.parent!,mesh:retained});
          mesh.dispose();discard.push(mesh);return;
        }
      }
      const keptOwners:number[]=[];
      let count=0;
      if(transform&&!owners&&!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);
        if(owners&&removed.has(owners[i]))continue;
        if(!owners&&transform){
          world.multiplyMatrices(transform,matrix);
          bounds.copy(mesh.geometry.boundingBox!).applyMatrix4(world);
          if(footprints.some(f=>overlap(bounds,f)))continue;
          if(pedestrianZone&&['asphalt','marking'].includes(mesh.name)&&overlap(bounds,pedestrianZone))continue;
          if(streetClearance&&!['asphalt','marking'].includes(mesh.name)&&(Array.isArray(streetClearance)?streetClearance:[streetClearance]).some(b=>overlap(bounds,b)))continue;
        }
        mesh.setMatrixAt(count,matrix);
        if(mesh.instanceColor){mesh.getColorAt(i,color);mesh.setColorAt(count,color);}
        if(owners)keptOwners.push(owners[i]);
        count++;
      }
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      if(owners)mesh.userData.buildingOwners=keptOwners;
      mesh.computeBoundingBox();mesh.computeBoundingSphere();
      if(!count){mesh.dispose();discard.push(mesh);}
    }else if(typeof object.userData.buildingIndex==='number'&&removed.has(object.userData.buildingIndex))discard.push(object);
  });
  discard.forEach(object=>object.removeFromParent());
  additions.forEach(({parent,mesh})=>parent.add(mesh));
  return root;
}

export function disposeDistrictInstances(root:T.Group){
  root.traverse(object=>{if((object as T.InstancedMesh).isInstancedMesh){
    const mesh=object as T.InstancedMesh;mesh.dispose();
    if(mesh.userData.ownedSubsetGeometry){mesh.geometry.dispose();delete mesh.userData.ownedSubsetGeometry;}
  }});
}

/** Scenery only: don't overlay parked kit cars on the animated traffic lanes. */
export function removeStaticStreetCars(scenery:T.Group){
  const removed:T.InstancedMesh[]=[];
  scenery.traverse(object=>{
    if((object as T.InstancedMesh).isInstancedMesh&&['car','glass','rubber'].includes(object.name))removed.push(object as T.InstancedMesh);
  });
  removed.forEach(mesh=>{mesh.removeFromParent();mesh.dispose();});
}
