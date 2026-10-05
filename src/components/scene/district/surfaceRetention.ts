import * as T from 'three';
import {subtractCityRect,type CityRect} from '../astana/cityEdges';

export type ApronPart={first:number;count:number;min:number[];max:number[]};
const rect=(b:T.Box3):CityRect=>({left:b.min.x,right:b.max.x,front:b.min.z,back:b.max.z});
const overlaps=(a:T.Box3,b:T.Box3)=>a.max.x>b.min.x&&a.min.x<b.max.x&&a.max.z>b.min.z&&a.min.z<b.max.z;

/** Retain surviving flat surfaces, rather than deleting an entire sidewalk
 * or all merged house aprons because one corner touches a replacement. */
export function retainScenerySurface(source:T.InstancedMesh,transform:T.Matrix4,cuts:T.Box3[]):T.InstancedMesh|null|undefined{
  if(!['paving','turf','sill','asphalt','marking'].includes(source.name)||!cuts.length)return undefined;
  const parts=source.geometry.userData.apronParts as ApronPart[]|undefined;
  if(parts&&source.count===1){
    const matrix=new T.Matrix4();source.getMatrixAt(0,matrix);
    const world=transform.clone().multiply(matrix),index=source.geometry.index!;
    const kept=parts.filter(p=>{
      const b=new T.Box3(new T.Vector3().fromArray(p.min),new T.Vector3().fromArray(p.max)).applyMatrix4(world);
      return !cuts.some(c=>overlaps(b,c));
    });
    if(kept.length===parts.length)return undefined;
    if(!kept.length)return null;
    const indices:number[]=[];
    for(const part of kept)for(let j=part.first;j<part.first+part.count;j++)indices.push(index.getX(j));
    const geometry=source.geometry.clone();geometry.userData={...source.geometry.userData};geometry.setIndex(indices);
    // Bounds must describe kept polygons; the cloned vertex buffer can still
    // contain unused vertices from discarded aprons.
    const active=new T.Box3(),point=new T.Vector3(),position=geometry.getAttribute('position');
    for(const i of indices)active.expandByPoint(point.fromBufferAttribute(position,i));
    geometry.boundingBox=active;geometry.boundingSphere=active.getBoundingSphere(new T.Sphere());
    delete geometry.userData.apronParts;
    const result=source.clone();result.geometry=geometry;result.userData.ownedSubsetGeometry=true;
    result.userData.retainedAprons=kept.length;result.computeBoundingBox();result.computeBoundingSphere();
    return result;
  }
  if(source.geometry.type!=='BoxGeometry')return undefined;
  if(!source.geometry.boundingBox)source.geometry.computeBoundingBox();
  const localBounds=source.geometry.boundingBox!;
  // All district boxes use the shared unit cube. Other geometry is not
  // approximated by a rectangle and retains the conservative fallback.
  if(localBounds.getSize(new T.Vector3()).distanceTo(new T.Vector3(1,1,1))>.00001)return undefined;
  const inverse=transform.clone().invert(),matrix=new T.Matrix4(),world=new T.Matrix4(),bounds=new T.Box3();
  const kept:{matrix:T.Matrix4;index:number}[]=[];let changed=false;
  for(let i=0;i<source.count;i++){
    source.getMatrixAt(i,matrix);world.multiplyMatrices(transform,matrix);
    bounds.copy(localBounds).applyMatrix4(world);
    const relevant=cuts.filter(c=>overlaps(bounds,c));
    if(!relevant.length){kept.push({matrix:matrix.clone(),index:i});continue;}
    // Only axis-aligned, low paving/planting/curb boxes. Never flatten or
    // axis-align slanted ramps or arbitrary rotated objects.
    const e=world.elements,axisAligned=Math.abs(e[1])+Math.abs(e[2])+Math.abs(e[4])+Math.abs(e[6])+Math.abs(e[8])+Math.abs(e[9])<.0001;
    if(!axisAligned||bounds.max.y-bounds.min.y>1)return undefined;
    changed=true;let pieces=[rect(bounds)];
    for(const cut of relevant)pieces=pieces.flatMap(p=>subtractCityRect(p,rect(cut)));
    for(const p of pieces){
      const w=p.right-p.left,d=p.back-p.front;
      if(w<.02||d<.02)continue;
      const m=new T.Matrix4().makeScale(w,bounds.max.y-bounds.min.y,d);
      m.setPosition((p.left+p.right)/2,(bounds.min.y+bounds.max.y)/2,(p.front+p.back)/2);
      kept.push({matrix:inverse.clone().multiply(m),index:i});
    }
  }
  if(!changed)return undefined;
  if(!kept.length)return null;
  const result=new T.InstancedMesh(source.geometry,source.material,kept.length),color=new T.Color();
  result.name=source.name;result.userData={...source.userData,retainedSurfacePieces:kept.length};
  result.position.copy(source.position);result.quaternion.copy(source.quaternion);result.scale.copy(source.scale);
  result.castShadow=source.castShadow;result.receiveShadow=source.receiveShadow;result.visible=source.visible;
  kept.forEach((p,i)=>{result.setMatrixAt(i,p.matrix);if(source.instanceColor){source.getColorAt(p.index,color);result.setColorAt(i,color);}});
  result.computeBoundingBox();result.computeBoundingSphere();return result;
}
