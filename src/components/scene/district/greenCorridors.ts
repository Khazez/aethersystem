import * as T from 'three';
import {parkPathX,parkWaterX,kokTobeHeight} from '../astana/almatyTerrain';
import {dostykLayout,nurzholLayout} from '../astana/routeLayout';

/** Reuse the district's leaf-card geometry; no new texture downloads. */
export function createGreenCorridors(source:T.InstancedMesh,bark:T.Material,start:number,end:number,almaty:boolean,shade?:T.Material,route=false,exclude?:(x:number,z:number)=>boolean,authoredPoints:{x:number;z:number;y?:number}[]=[]){
  const group=new T.Group(),points:{x:number;z:number;y?:number}[]=[],center=(start+end)/2;
  const astana=nurzholLayout(start,end),dostyk=dostykLayout(center);
  for(let z=end;z<start;z+=18)for(const lane of almaty?(route?[-474,-42,-18,18,42,474]:[-474,-116,116,474]):[-440,-66,-23,23,66,440]){
    const x=almaty&&Math.abs(lane)<80?lane+Math.sin(z*.031+lane)*5:lane;
    if(route&&!almaty&&Math.abs(x)<110&&(Math.abs(z-astana.akorda)<180||Math.abs(z-astana.khan)<120||Math.abs(z-astana.baiterek)<35))continue;
    if(route&&almaty&&Math.abs(z-dostyk.abay)<57&&Math.abs(x)<300)continue;
    if(route&&almaty&&x>30&&Math.abs(z-dostyk.hotel.z)<38)continue;
    if(route&&almaty&&Math.abs(x)<85&&z<end+70)continue;
    if(almaty&&(Math.abs(x-parkPathX(z))<7||Math.abs(x-parkWaterX(z))<6))continue;
    if(Math.abs(x)<30&&(!almaty&&(Math.abs(z-(center+150))<35||Math.abs(z-(end+150))<100)))continue;
    if(almaty&&x===-474&&Math.abs(z-(center-1130))<150)continue;
    if(almaty&&x>400&&Math.abs(z-(center-900))<530)continue;
    points.push({x,z});
  }
  if(route&&!almaty){
    for(const side of [-1,1]){
      for(const dz of [-80,-30,20,70])points.push({x:side*125,z:astana.khan+dz,y:.62});
      for(let dz=-110;dz<=110;dz+=22)points.push({x:side*157,z:astana.khan+dz});
    }
    // Formal palace gardens share the same instanced trees as the districts.
    for(const s of [-1,1])for(let dz=-55;dz<=205;dz+=18)points.push({x:s*226,z:astana.akorda+dz});
    for(let x=-210;x<=210;x+=18)points.push({x,z:astana.akorda-66});
    for(const s of [-1,1])for(let dz=230;dz<=645;dz+=22){
      if(Math.abs(dz-465)<27)continue;
      points.push({x:s*222,z:astana.akorda+dz});
    }
  }
  if(almaty){
    if(!route)for(let z=end;z<start;z+=15)for(let x=-72;x<=72;x+=18){
      const px=x+Math.sin(z*.57+x*1.39)*6,pz=z+Math.sin(x*1.17-z*.39)*6;
      // The southern end belongs to the terminal forecourt and access loop.
      if(pz<end+75)continue;
      if(Math.abs(px-parkPathX(pz))<9||Math.abs(px-parkWaterX(pz))<7)continue;
      const crossing=((pz-(end+120))%180+180)%180;if(crossing<6||crossing>174)continue;
      points.push({x:px,z:pz});
    }
    for(let z=-490;z<490;z+=29)for(let x=-450;x<450;x+=29){
      const px=x+Math.sin(z*.21+x)*8,pz=z+Math.cos(x*.17-z)*8,y=kokTobeHeight(px,pz);
      if(y<6||Math.hypot(px,pz)<28)continue;
      points.push({x:px+650,z:pz+center-900,y});
    }
  }
  if(exclude)for(let i=points.length-1;i>=0;i--)if(exclude(points[i].x,points[i].z))points.splice(i,1);
  points.push(...authoredPoints);
  group.userData.authoredTrees=authoredPoints.length;
  const trunkGeo=new T.CylinderGeometry(.18,.29,5.5,6),trunks=new T.InstancedMesh(trunkGeo,bark,points.length*3);
  const leaves=new T.InstancedMesh(source.geometry,source.material,points.length*12),dummy=new T.Object3D();
  const flat=points.filter(p=>!p.y),shadeGeo=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const shadows=shade?new T.InstancedMesh(shadeGeo,shade,flat.length):null;
  if(shadows){flat.forEach((p,i)=>{dummy.position.set(p.x,.24,p.z);dummy.scale.set(19,1,19);dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);});shadows.computeBoundingSphere();group.add(shadows);}
  const up=new T.Vector3(0,1,0),branch=new T.Vector3();
  points.forEach((p,i)=>{
    const poplar=almaty&&i%4===0,height=poplar?1.6:1.1+(i%5)*.1,spread=poplar?.75:1.05+(i%3)*.1;
    dummy.position.set(p.x,2.75*height+(p.y??0),p.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,height,1);dummy.updateMatrix();trunks.setMatrixAt(i*3,dummy.matrix);
    for(let side=0;side<2;side++){
      const a=i*1.71+side*Math.PI,dx=Math.cos(a)*2.3*spread,dz=Math.sin(a)*2.3*spread;
      branch.set(dx,3*height,dz);dummy.quaternion.setFromUnitVectors(up,branch.clone().normalize());
      dummy.position.set(p.x+dx/2,(p.y??0)+4.5*height,p.z+dz/2);dummy.scale.set(.6,branch.length()/5.5,.6);dummy.updateMatrix();trunks.setMatrixAt(i*3+side+1,dummy.matrix);
    }
    for(let j=0;j<12;j++){
      const a=j*2.39996+i,r=1.8+Math.sin(j*2.1)*1.2;
      dummy.position.set(p.x+Math.cos(a)*r*spread,6.5*height+(p.y??0)+Math.sin(j*1.6)*1.4*height,p.z+Math.sin(a)*r*spread);dummy.rotation.set(j*.47,a,j*.27);dummy.scale.set(2.5*spread,1.9*height,2.5*spread);dummy.updateMatrix();leaves.setMatrixAt(i*12+j,dummy.matrix);
      leaves.setColorAt(i*12+j,new T.Color().setHSL(.24+(i%5)*.012,.22,.76));
    }
  });
  for(const mesh of [trunks,leaves]){mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  // Authored planters can load after the general city. Keep their trees hidden
  // until the supporting geometry exists instead of floating above a lawn.
  const authoredInstances=[{mesh:trunks,perTree:3},{mesh:leaves,perTree:12}].map(({mesh,perTree})=>({
    mesh,first:(points.length-authoredPoints.length)*perTree,
    matrices:Array.from({length:authoredPoints.length*perTree},(_,i)=>{
      const matrix=new T.Matrix4();mesh.getMatrixAt((points.length-authoredPoints.length)*perTree+i,matrix);return matrix;
    }),
  }));
  let authoredVisible=true;
  const hidden=new T.Matrix4().makeScale(0,0,0);
  const setAuthoredVisible=(visible:boolean)=>{
    if(authoredVisible===visible||!authoredPoints.length)return;
    authoredVisible=visible;
    for(const {mesh,first,matrices} of authoredInstances){
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(first+i,visible?matrix:hidden));mesh.instanceMatrix.needsUpdate=true;
    }
    group.userData.authoredTreesVisible=visible;
  };
  setAuthoredVisible(false);
  return {group,setAuthoredVisible,dispose(){trunks.dispose();leaves.dispose();shadows?.dispose();shadeGeo.dispose();trunkGeo.dispose();group.clear();}};
}
