import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {CityBatch} from '../astana/batch';
import type {CityMaterials} from '../astana/materials';
import {archCrossingCarPose} from '../astana/archCrossing';
import {khanCrossingCarPose,KHAN_CROSSING} from '../astana/khanCrossing';

const LANES=[-54,-42,42,54],PER_LANE=18;
/** Illustrative, separated traffic streams, not a real traffic simulation.
 * Loop joins sit beyond the composed avenue, away from the landing approach. */
export function boulevardCarPose(index:number,time:number,start:number,end:number){
  const lane=Math.floor(index/PER_LANE),direction=lane<2?1:-1;
  const from=end+330,to=start+250,length=to-from;
  const fraction=((index%PER_LANE)/PER_LANE+time*(lane%2?10:12)/length)%1;
  return {x:LANES[lane],z:direction>0?from+fraction*length:to-fraction*length,yaw:direction>0?0:Math.PI};
}

/** Traffic stays on the continuous outer district streets, never inside Nurzhol. */
export function nurzholStreetCarPose(index:number,time:number,start:number,end:number){
  const p=boulevardCarPose(index,time,start-300,end),lane=Math.floor(index/PER_LANE);
  return {...p,x:[-350.6,-339.4,339.4,350.6][lane],z:lane===1||lane===2?end+start+280-p.z:p.z,yaw:lane%2===0?0:Math.PI};
}

export function createBoulevard(start:number,end:number,materials:CityMaterials,almaty=false,route=false,excludeFixture?:(x:number,z:number)=>boolean,crossingZ?:number,khanZ?:number){
  const group=new T.Group();group.name='Planted avenue and traffic';
  const fixtures=new CityBatch(),center=(start+end)/2;
  for(let z=end+330;z<start;z+=30){
    // Keep the broad pedestrian crossings free of street furniture.
    const crossing=((start-125-z)%300+300)%300;
    if(crossing<24||crossing>276)continue;
    for(const side of [-1,1]){
      if(route&&!almaty){
        if(excludeFixture?.(side*42,z))continue;
        fixtures.box('trim',side*42,2.5,z,.13,5,.13);
        const shade=new T.CylinderGeometry(.62,.76,.13,12);shade.translate(side*42,5,z);fixtures.geometry('trim',shade);
        fixtures.box('white',side*42,4.9,z,.85,.06,.85);
        fixtures.box('trim',side*54,.29,z+5,2.4,.55,.12);
        fixtures.box('stone',side*54,.61,z+5,2.8,.16,.65);
        continue;
      }
      const offset=almaty?(route?-14:52):0;
      fixtures.box('trim',side*(32+offset),4.5,z,.13,9,.13);
      fixtures.box('trim',side*(35+offset),8.95,z,6,.14,.25);
      fixtures.box('white',side*(37+offset),8.83,z,1.5,.08,.5);
      if(almaty)continue;
      fixtures.box('stone',side*12,.4,z,2.6,.8,5.2);
      fixtures.box('grass',side*12,.94,z,2.3,.45,4.9);
      fixtures.box('stone',side*8,.5,z+7,.6,1,2.6);
      fixtures.box('trim',side*8,1.05,z+7,.8,.12,2.9);
    }
  }
  // Narrow surface seams supply scale without drawing a technical grid.
  if(!almaty)for(let z=end+330;z<start;z+=10)fixtures.box('stone',0,.19,z,10,.025,.035);
  const staticGroup=fixtures.finish(materials);group.add(staticGroup);
  if(route&&!almaty)group.name='Nurzhol garden and outer street traffic';
  const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>new T.BoxGeometry(w,h,d).translate(x,y,z);
  const merge=(parts:T.BufferGeometry[])=>{const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return g;};
  const bodyGeo=merge([box(0,.65,0,1.85,.6,4.45),box(0,1.52,-.15,1.53,.1,1.95)]);
  const windowGeo=box(0,1.15,-.15,1.55,.64,2.16);
  const wheelGeo=merge([-1,1].flatMap(x=>[-1,1].map(z=>box(x*.9,.39,z*1.35,.18,.59,.65))));
  const bodyMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:.36,metalness:.38});
  const wheelMaterial=new T.MeshStandardMaterial({color:0x202526,roughness:.92});
  const streetCount=LANES.length*PER_LANE,archCount=crossingZ===undefined?0:32,khanStart=streetCount+archCount;
  const count=khanStart+(khanZ===undefined?0:KHAN_CROSSING.cars);
  const bodies=new T.InstancedMesh(bodyGeo,bodyMaterial,count),windows=new T.InstancedMesh(windowGeo,materials.pane,count),wheels=new T.InstancedMesh(wheelGeo,wheelMaterial,count);
  const meshes=[bodies,windows,wheels],dummy=new T.Object3D();
  meshes.forEach((mesh,index)=>{mesh.name=`Moving traffic ${['body','windows','wheels'][index]}`;});
  const colors=[0xdce1de,0x35444b,0xa5afb0,0xf0eeea,0x75818a,0x415564];
  for(let i=0;i<count;i++)bodies.setColorAt(i,new T.Color(colors[i%colors.length]));
  // A fixed bound is cheaper and safer than stale bounds after matrix changes.
  const bounds=new T.Sphere(new T.Vector3(0,1,center+290),Math.hypot((start-end)/2+330,360));
  for(const mesh of meshes){mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.boundingSphere=bounds.clone();mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  let disposed=false;
  const update=(time:number,crossingVisible=true)=>{
    if(disposed)return;
    for(let i=0;i<count;i++){
      if(i>=khanStart&&khanZ!==undefined){
        const p=khanCrossingCarPose(i-khanStart,time,khanZ);
        dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.rotateX(p.pitch);
        dummy.scale.setScalar(1);dummy.updateMatrix();
        for(const mesh of meshes)mesh.setMatrixAt(i,dummy.matrix);
        continue;
      }
      if(i>=streetCount&&crossingZ!==undefined){
        const p=archCrossingCarPose(i-streetCount,time,crossingZ);
        dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.rotateX(p.pitch);
        dummy.scale.setScalar(crossingVisible?1:0);dummy.updateMatrix();
        for(const mesh of meshes)mesh.setMatrixAt(i,dummy.matrix);
        continue;
      }
      dummy.scale.setScalar(1);
      const p=route&&!almaty?nurzholStreetCarPose(i,time,start,end):boulevardCarPose(i,time,start,end);
      const x=almaty&&route?Math.sign(p.x)*(Math.abs(p.x)>48?10.6:6.3):p.x+(almaty?Math.sign(p.x)*52:0);
      dummy.position.set(x,0,p.z);dummy.rotation.set(0,p.yaw,0);dummy.updateMatrix();
      for(const mesh of meshes)mesh.setMatrixAt(i,dummy.matrix);
    }
    for(const mesh of meshes)mesh.instanceMatrix.needsUpdate=true;
  };
  update(0,false);
  return {group,update,dispose(){
    if(disposed)return;disposed=true;
    staticGroup.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
    for(const mesh of meshes)mesh.dispose();
    for(const g of [bodyGeo,windowGeo,wheelGeo])g.dispose();bodyMaterial.dispose();wheelMaterial.dispose();group.clear();
  }};
}
