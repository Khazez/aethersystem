import * as THREE from 'three';
import { CityBatch } from './batch';
import { buildBuilding, type Building } from './buildings';
import { landmarks } from './landmarks';
import { cityMaterials } from './materials';
import { seededRandom } from './random';
import {almatyLandmarks} from './almaty';

export type CityQuality = 'ultra' | 'high' | 'medium' | 'low';
export type AstanaCity = ReturnType<typeof createAstanaCity>;

export function createAstanaCity(opts: {zFrom:number; zTo:number; roofLevel:number; seed?:number; quality?:CityQuality; city?:'astana'|'almaty'}) {
  const isAlmaty=opts.city==='almaty';
  const group = new THREE.Group();
  group.name = isAlmaty?'Almaty district':'Astana district';
  group.position.y = opts.roofLevel-190;
  const palette = cityMaterials();
  const quality = opts.quality ?? 'high';
  const seed = opts.seed ?? 20260907;
  const start = Math.max(opts.zFrom,opts.zTo), end = Math.min(opts.zFrom,opts.zTo);
  const depth=start-end, center=(start+end)/2;
  const blocks = Math.max(4,Math.ceil(depth/220));
  const stride=depth/blocks;
  const chunks: {z:number; shell:THREE.Group; detail:THREE.Group|null; buildings:Building[]; makeDetail:()=>THREE.Group; near:boolean}[]=[];
  const staticShell=new CityBatch(), staticDetail=new CityBatch();
  const terrain = new CityBatch();
  terrain.box('ground',0,-1,center,9000,2,11000);
  terrain.box('paving',0,.03,center,880,.08,depth+240);
  // Formal pedestrian axis, with parallel carriageways and green medians.
  terrain.box('paving',0,.15,center,65,.2,depth+80);
  for(const s of [-1,1]) {
    terrain.box('asphalt',s*58,.2,center,29,.1,depth+240);
    terrain.box('grass',s*29,.3,center,10,.3,depth+80);
    terrain.box('asphalt',s*205,.2,center,22,.1,depth+240);
    terrain.box('asphalt',s*347,.2,center,22,.1,depth+240);
  }
  // District transverse streets stay outside the landmark plazas.
  for(let k=0;k<=blocks;k++) {
    const z=start-k*stride;
    terrain.box('asphalt',0,.21,z,880,.12,21);
    for(const x of [-347,-205,-58,58,205,347]) {
      for(let j=-3;j<=3;j++) terrain.box('marking',x+j*2.3,.29,z+15,1.2,.03,5.5);
    }
  }
  for(let z=end;z<start;z+=18) for(const x of [-350,-344,-208,-202,-62,-54,54,62,202,208,344,350]) {
    terrain.box('marking',x,.29,z,.16,.02,5);
  }
  // Reflecting pools and planted strips establish a plausible urban scale.
  for(let k=0;k<blocks;k++) {
    const z=start-(k+.5)*stride;
    if(!isAlmaty&&Math.abs(z-(center+150))>65 && Math.abs(z-(end+150))>110) {
      terrain.box('white',0,.5,z,18,1,stride*.52);
      terrain.box('water',0,1.02,z,16,.08,stride*.52-2);
    }
  }
  group.add(terrain.finish(palette.materials));
  const trees:THREE.Matrix4[]=[];
  const treeColors:THREE.Color[]=[];
  const cars:THREE.Matrix4[]=[];
  const carColors:THREE.Color[]=[];
  const dummy=new THREE.Object3D();
  const random=seededRandom(seed);
  for(let k=0;k<blocks;k++) {
    const z=start-(k+.5)*stride;
    const shell=new CityBatch();
    const buildings:Building[]=[];
    for(const x of [-405,-276,-130,130,276,405]) {
      for(const offset of [-stride*.25,stride*.25]) {
        const pz=z+offset;
        // Reserve full footprints around Abu Dhabi cluster and Nur Alem.
        if(x>70 && x<320 && Math.abs(pz-(center-40))<105) continue;
        if(x===-276 && Math.abs(pz-(end+320))<85) continue;
        const id=k*100+Math.round(x)+Math.round(offset);
        const rnd=seededRandom(seed+id);
        const style:Building['style']=isAlmaty?(rnd()>.75?'office':'residential'):Math.abs(x)>300?'residential':rnd()>.88?'stepped':rnd()>.28?'office':'commercial';
        const floors=isAlmaty?4+Math.floor(rnd()*10):style==='residential'?6+Math.floor(rnd()*8):style==='commercial'?5+Math.floor(rnd()*4):13+Math.floor(rnd()*20);
        const b:Building={x:x+(rnd()-.5)*8,z:pz,width:style==='residential'?52:28+rnd()*21,depth:32+rnd()*20,floors,style,seed:seed+id};
        buildings.push(b);
        const discarded=new CityBatch(false);
        buildBuilding(b,shell,discarded);
        // Only shell survives initial build; details are streamed when near.
        const temp=discarded.finish(palette.materials,true);
        temp.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
      }
    }
    for(const x of [-28,28,-87,87,-184,184,-324,324]) {
      for(let p=-stride*.4;p<stride*.4;p+=16) {
        const pz=z+p;
        if(Math.abs(x)<35 && (Math.abs(pz-(center+150))<27 || Math.abs(pz-(end+150))<90)) continue;
        shell.box('trim',x,2.1,pz,.5,4.2,.5);
        for(let j=0;j<3;j++) {
          dummy.position.set(x+(random()-.5)*3,5+j*1.35,pz+(random()-.5)*2.5);
          dummy.scale.set(2.5+random(),2.8+random(),2.5+random());dummy.rotation.set(0,random()*6,0);dummy.updateMatrix();
          trees.push(dummy.matrix.clone());treeColors.push(new THREE.Color().setHSL(.23+random()*.035,.22,.24+random()*.1));
        }
      }
    }
    for(const x of [-77,77]) for(let p=-stride*.38;p<stride*.4;p+=31) {
      shell.box('trim',x,5,z+p,.25,10,.25);
      shell.box('trim',x+Math.sign(x)*-1.5,10,z+p,3,.18,.25);
      shell.box('lit',x+Math.sign(x)*-2.8,9.8,z+p,1.3,.15,.55);
    }
    const shellGroup=shell.finish(palette.materials);group.add(shellGroup);
    const makeDetail=()=>{
      const s=new CityBatch(false),d=new CityBatch();
      buildings.forEach(b=>buildBuilding(b,s,d));
      const temp=s.finish(palette.materials);
      temp.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
      return d.finish(palette.materials,true);
    };
    chunks.push({z,shell:shellGroup,detail:null,buildings,makeDetail,near:false});
    for(let i=0;i<22;i++) {
      const x=[-62,-54,54,62,-205,205][i%6];
      dummy.position.set(x,1,z+(random()-.5)*stride*.8);dummy.scale.set(1.9,1.25,4.5);dummy.rotation.set(0,0,0);dummy.updateMatrix();
      cars.push(dummy.matrix.clone());carColors.push(new THREE.Color([0xd9d9d2,0x293236,0x788691,0xa3a098,0x6c4640][i%5]));
    }
  }
  if(isAlmaty)almatyLandmarks(staticShell,staticDetail,center);else landmarks(staticShell,staticDetail,center,end);
  group.add(staticShell.finish(palette.materials));
  const landmarkDetails=staticDetail.finish(palette.materials,true);group.add(landmarkDetails);
  const instance=(geometry:THREE.BufferGeometry,material:THREE.Material,matrices:THREE.Matrix4[],colors:THREE.Color[])=>{
    const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);
    matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colors[i]);});
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  };
  const foliage=instance(new THREE.IcosahedronGeometry(1,1),palette.materials.leaf,trees,treeColors);
  const traffic=instance(new THREE.BoxGeometry(1,1,1),palette.materials.white,cars,carColors);
  // Dark inset cabin reused across every car.
  const cabins=cars.map(m=>{const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(p,q,s);p.y+=.8;s.set(1.55,.65,2.2);return new THREE.Matrix4().compose(p,q,s);});
  instance(new THREE.BoxGeometry(1,1,1),palette.materials.pane,cabins,carColors.map(()=>new THREE.Color(0x8b9b9d)));
  let mode:CityQuality=quality;
  let last= -100;
  let disposed=false;
  const clearDetail=(chunk:typeof chunks[number])=>{
    if(!chunk.detail)return;
    chunk.detail.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    group.remove(chunk.detail);chunk.detail=null;
  };
  return {
    group,
    center,
    stats:{buildings:chunks.reduce((sum,c)=>sum+c.buildings.length,0)+3,seed,chunks:chunks.length},
    setNight(night:number) {palette.materials.lit.emissiveIntensity=night*3;palette.materials.gold.emissive.setHex(0xb28524);palette.materials.gold.emissiveIntensity=night*.13;},
    setQuality(q:CityQuality) {mode=q;foliage.count=q==='low'?Math.floor(trees.length/2):trees.length;last=-100;},
    update(time:number,camera?:THREE.Camera) {
      if(disposed || !camera || time-last<.12)return;last=time;
      const limit=mode==='ultra'?950:mode==='high'?680:mode==='medium'?480:300;
      // One chunk built per update to bound CPU work during a fly-through.
      let built=false;
      const ordered=[...chunks].sort((a,b)=>Math.abs(camera.position.z-a.z)-Math.abs(camera.position.z-b.z));
      for(const chunk of ordered) {
        const distance=Math.hypot(camera.position.x, camera.position.z-chunk.z);
        chunk.shell.visible=distance<2600;
        if(distance<limit && !chunk.detail && !built) {chunk.detail=chunk.makeDetail();group.add(chunk.detail);built=true;}
        // Keep built details through the pass instead of blinking at a distance threshold.
        if(distance>2300)clearDetail(chunk);
      }
      landmarkDetails.visible=mode!=='low';traffic.visible=mode!=='low';
    },
    dispose() {disposed=true;group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});palette.dispose();group.clear();},
  };
}
