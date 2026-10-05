import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {CityBatch} from './batch';
import {cityMaterials} from './materials';
import {landmarks} from './landmarks';
import {nurzholReferencePlan} from './nurzholReferences';
import {createLandmarkAsset,ownedResources} from './landmarkAssets';
import {acquireFacadeAtlas} from '../district/facadeAtlas';
import {createReferenceDistrict} from '../district/model';
import {createGreenCorridors} from '../district/greenCorridors';
import type {CityQuality} from './architecturalCity';

export type MappedPath={id:number;points:[number,number][];length:number};
export type MappedLayout={version:number;sourceSha256:string;scale:number;khan:number;baiterek:number;arch:number[];
  buildings:{id:number;min:number[];max:number[]}[];paths:MappedPath[];landmarks:Record<'watergreen'|'ktz'|'emerald',number[]>};
type Options={zFrom:number;zTo:number;roofLevel:number;quality?:CityQuality};
type City={group:T.Group;center:number;stats:{buildings:number;outerBuildings:number;chunks:number;seed:number};setNight:(v:number)=>void;setQuality:(v:CityQuality)=>void;update:(time:number,camera?:T.Camera)=>void;dispose:()=>void};

/** Source has no highway tags. Only identified road corridors receive asphalt;
 * the thousands of remaining traces are walking paths, not invented traffic. */
export function mappedRoad(path:MappedPath){
  if(path.id===534||path.id===532||path.id===533)return true;
  if(path.id>=442&&path.id<=491)return true;
  if(path.id>=500&&path.id<=524&&path.id!==523)return true;
  if(path.length<35)return false;
  return path.points.every(([x,z])=>
    Math.abs(Math.abs(x)-275)<12||Math.abs(Math.abs(x)-615)<19||
    [-275,-1915,-2188,-2645].some(row=>Math.abs(z-row)<10));
}

export function validateMappedLayout(data:MappedLayout){
  if(data.version!==1||data.buildings.length!==442||data.paths.length!==3192||!Number.isFinite(data.scale)||data.scale<1||data.scale>4)throw new Error('Unexpected mapped-quarter schema');
  if(!data.paths.every(p=>p.points.length>1&&p.points.every(v=>v.length===2&&v.every(Number.isFinite))))throw new Error('Invalid mapped-quarter paths');
}

function ribbon(points:[number,number][],width:number,y:number){
  const position:number[]=[],uv:number[]=[];
  for(let i=1;i<points.length;i++){
    const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az);if(length<.001)continue;
    const nx=-(bz-az)/length*width/2,nz=(bx-ax)/length*width/2;
    const corners=[[ax+nx,y,az+nz],[bx+nx,y,bz+nz],[bx-nx,y,bz-nz],[ax-nx,y,az-nz]];
    for(const index of [0,1,2,0,2,3]){position.push(...corners[index]);uv.push(index<2?0:1,index===0||index===3?0:length/width);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(position,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(Array.from({length:position.length/3},(_,i)=>i));geo.computeVertexNormals();return geo;
}

/** Atomic local-preview upgrade. The old city remains intact until both assets
 * load and geometry preparation succeeds; a failed request never leaves a void. */
export function createMappedQuarter(opts:Options,fallback:City):City{
  const group=new T.Group();group.name='Astana — supplied mapped quarter';group.add(fallback.group);
  const world=new T.Vector3(),local=new T.Vector3();
  let quality=opts.quality??'high',disposed=false,ready=false,release:(()=>void)|undefined,active:T.Group|null=null;
  let assets:ReturnType<typeof createLandmarkAsset>[]=[],greenery:ReturnType<typeof createGreenCorridors>|null=null;
  let tick:((time:number)=>void)|null=null;
  let night=0,setMappedNight:((value:number)=>void)|null=null;
  group.userData.mappedQuarterState='loading';
  const controller=new AbortController();
  // GLTFLoader cannot use the fetch signal. Late completion is explicitly released.
  const loadRoot=new GLTFLoader().loadAsync('/models/review/mapped-quarter.glb').then(gltf=>gltf.scene);
  const loadData=fetch('/models/review/mapped-quarter.json',{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error(`Quarter layout HTTP ${response.status}`);return await response.json() as MappedLayout;});
  void Promise.allSettled([loadRoot,loadData]).then(results=>{
    const model=results[0].status==='fulfilled'?results[0].value:null;
    const cleanup=model?ownedResources(model):undefined;
    if(disposed){cleanup?.();return;}
    if(results[0].status==='rejected'||results[1].status==='rejected'){
      cleanup?.();group.userData.mappedQuarterState='failed';group.userData.mappedQuarterError='Quarter assets could not be loaded';return;
    }
    const root=results[0].value,data=results[1].value;
    const releases:(()=>void)[]=[cleanup!];
    try{
      validateMappedLayout(data);
      const city=new T.Group();city.name='Registered map geometry';city.position.y=opts.roofLevel-190;
      const palette=cityMaterials();releases.push(()=>palette.dispose());
      setMappedNight=value=>{palette.materials.lit.emissiveIntensity=value*2;};setMappedNight(night);
      palette.materials.grass.color.set(0x69745a);
      const surface=new CityBatch(),shell=new CityBatch(),detail=new CityBatch();
      surface.box('grass',0,-.45,-1600,60000,.6,60000);
      const floors=data.buildings.map(b=>new T.Box3(new T.Vector3(...b.min as [number,number,number]),new T.Vector3(...b.max as [number,number,number])));
      const inCourt=(x:number,z:number)=>Math.hypot(x-data.arch[0],z-data.arch[2])<176;
      const inMonument=(x:number,z:number)=>Math.hypot(x,z-data.baiterek)<25||Math.hypot(x,z-data.khan)<106;
      const blocked=(x:number,z:number,pad=0)=>floors.some(b=>x>b.min.x-pad&&x<b.max.x+pad&&z>b.min.z-pad&&z<b.max.z+pad)||inCourt(x,z)||inMonument(x,z);
      const drawnRoads:MappedPath[]=[];
      for(const path of data.paths){
        const road=mappedRoad(path),width=road?((path.id<=491||path.id===534)?9:6):(path.points.every(([x])=>Math.abs(x)<210)?3.8:2.5);
        // The authored arch supplies its elevated bridge and lower water court.
        // Trim by segment, not by whole way: external connections stay intact.
        let run:[number,number][]=[];
        const flush=()=>{if(run.length>1){surface.geometry(road?'asphalt':'paving',ribbon(run,width,road?.08:.12));if(road)drawnRoads.push({...path,points:run,length:path.length});}run=[];};
        for(let i=1;i<path.points.length;i++){
          const a=path.points[i-1],b=path.points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5));
          for(let k=0;k<=n;k++){
            const t=k/n,p:[number,number]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
            if(inCourt(...p)||inMonument(...p)||Math.abs(p[0])>1350||p[1]<-3650||p[1]>450){flush();continue;}
            // Carriageways must not cover source buildings, including default-height masses.
            if(road&&blocked(...p,width*.35)){flush();continue;}
            if(!run.length||Math.hypot(p[0]-run.at(-1)![0],p[1]-run.at(-1)![1])>.01)run.push(p);
          }
        }flush();
      }
      const plaza=new T.CylinderGeometry(45,45,.2,64);plaza.translate(0,.05,data.baiterek);surface.geometry('paving',plaza);
      const khanPlaza=new T.CylinderGeometry(112,112,.2,64);khanPlaza.translate(0,.05,data.khan);surface.geometry('paving',khanPlaza);
      // Grade-separated connections to the retained detailed bridge. Its deck
      // is 6.68 m above the courtyard; source traces themselves are all flat.
      for(const sign of [-1,1]){
        const ax=data.arch[0]+sign*164,az=data.arch[2]-20;
        const bx=sign*275,bz=sign<0?-785:-866;
        const positions:number[]=[];
        for(let i=0;i<20;i++){
          const t=i/20,u=(i+1)/20,dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),nx=-dz/len*12,nz=dx/len*12;
          const a=[ax+dx*t,6.68*(1-t)+.08*t,az+dz*t],b=[ax+dx*u,6.68*(1-u)+.08*u,az+dz*u];
          const corners=[[a[0]+nx,a[1],a[2]+nz],[b[0]+nx,b[1],b[2]+nz],[b[0]-nx,b[1],b[2]-nz],[a[0]-nx,a[1],a[2]-nz]];
          for(const k of [0,1,2,0,2,3])positions.push(...corners[k]);
        }
        const ramp=new T.BufferGeometry();ramp.setAttribute('position',new T.Float32BufferAttribute(positions,3));ramp.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));ramp.setIndex(Array.from({length:positions.length/3},(_,i)=>i));ramp.computeVertexNormals();surface.geometry('asphalt',ramp);
      }
      const ground=surface.finish(palette.materials);ground.name='Mapped streets and footpaths';city.add(ground);releases.push(()=>ground.traverse(o=>{if((o as T.Mesh).isMesh)(o as T.Mesh).geometry.dispose();}));
      landmarks(shell,detail,(opts.zFrom+opts.zTo)/2,opts.zTo,true,true,true);
      const landmarkShell=shell.finish(palette.materials),landmarkDetail=detail.finish(palette.materials,true);city.add(landmarkShell,landmarkDetail);
      // These meshes share palette materials; geometry lifetime is still owned once.
      releases.push(()=>{for(const g of [landmarkShell,landmarkDetail])g.traverse(o=>{if((o as T.Mesh).isMesh)(o as T.Mesh).geometry.dispose();});});
      const atlas=[acquireFacadeAtlas('stone'),acquireFacadeAtlas('metal',true),acquireFacadeAtlas('brick')];
      const facade=atlas.map(a=>new T.MeshStandardMaterial({map:a.color,roughnessMap:a.surface,roughness:1,metalness:.15,envMapIntensity:.75}));
      releases.push(()=>{facade.forEach(m=>m.dispose());atlas.forEach(a=>a.dispose());});
      // The GLB has no names: do not silently identify arbitrary masses as
      // KTZ / Emerald. Retain the user's existing map-pin positions in this
      // registered coordinate frame; detailed facade assets remain approximate.
      const reference=nurzholReferencePlan(opts.zFrom,opts.zTo);
      const pinIds={watergreen:'water-green',ktz:'ktz',emerald:'emerald-b'} as const;
      const mounts:[Parameters<typeof createLandmarkAsset>[0]['kind'],number,number,number][]=[
        ['arch',data.arch[0],data.arch[2],0],
        ...(['watergreen','ktz','emerald'] as const).map(kind=>{const pin=reference.find(p=>p.id===pinIds[kind])!;return [kind,pin.x,pin.z,Math.PI/2] as [typeof kind,number,number,number];}),
        ['akorda',0,opts.zTo-160,0],['gateway',0,opts.zTo+270,0],
      ];
      const sourceMeshes:T.Mesh[]=[];root.traverse(o=>{if((o as T.Mesh).isMesh){const mesh=o as T.Mesh;mesh.castShadow=true;mesh.receiveShadow=true;
        const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];mesh.material=materials.map(m=>m.name.startsWith('Mapped facade')?facade[Number(m.name.at(-1))]:m);
        sourceMeshes.push(mesh);
      }});
      root.updateMatrixWorld(true);
      const sourceBounds=new Map(sourceMeshes.map(m=>[m,new T.Box3().setFromObject(m)]));
      for(const mesh of sourceMeshes){const b=sourceBounds.get(mesh)!,c=b.getCenter(new T.Vector3());if(mesh.name==='Mapped_building_187'||mesh.name==='Mapped_building_30'||inMonument(c.x,c.z))mesh.visible=false;}
      city.add(root);
      for(const [kind,x,z,rotation] of mounts){
        const placeholder=new T.Group();city.add(placeholder);
        assets.push(createLandmarkAsset({parent:city,fallback:placeholder,kind,x,z,rotation}));
      }
      const kit=createReferenceDistrict({city:'astana',ground:false,buildings:[]});releases.push(()=>kit.dispose());
      const planted:{x:number;z:number}[]=[];
      const roadDistance=(x:number,z:number)=>drawnRoads.some(p=>p.points.some(q=>Math.hypot(q[0]-x,q[1]-z)<9));
      for(let z=-3200;z<200;z+=23)for(const x of [-720,-520,-355,-205,-115,-82,82,115,205,355,520,720]){
        if(!blocked(x,z,7)&&!roadDistance(x,z)&&Math.hypot(x,z-data.baiterek)>135)planted.push({x,z});
      }
      greenery=createGreenCorridors(kit.scenery.getObjectByName('leaf') as T.InstancedMesh,kit.materials.bark,opts.zFrom,opts.zTo,false,kit.materials.canopyShade,true,()=>true,planted);greenery.setAuthoredVisible(true);city.add(greenery.group);releases.push(()=>greenery?.dispose());
      // Small batched traffic follows confirmed source polylines, never the garden rings.
      const trafficPaths=drawnRoads.filter(p=>p.points.length>12&&p.points.every(([x])=>Math.abs(x)>240));
      const carGeo=new T.BoxGeometry(1.8,1.2,4.3),carMat=new T.MeshStandardMaterial({color:0xb9bebc,roughness:.45,metalness:.22});
      const cars=new T.InstancedMesh(carGeo,carMat,Math.min(64,trafficPaths.length));cars.name='Mapped street traffic';cars.castShadow=true;city.add(cars);
      const glassGeo=new T.BoxGeometry(1.5,.6,2.2),glassMat=new T.MeshStandardMaterial({color:0x34434b,roughness:.25,metalness:.35}),windows=new T.InstancedMesh(glassGeo,glassMat,cars.count);city.add(windows);
      const dummy=new T.Object3D();
      tick=time=>{for(let i=0;i<cars.count;i++){const path=trafficPaths[i].points,t=(time*.9+i*7.7)%(path.length-1),index=Math.floor(t),a=path[index],b=path[index+1];dummy.position.set(T.MathUtils.lerp(a[0],b[0],t-index),.72,T.MathUtils.lerp(a[1],b[1],t-index));dummy.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);dummy.updateMatrix();cars.setMatrixAt(i,dummy.matrix);dummy.position.y+=.7;dummy.updateMatrix();windows.setMatrixAt(i,dummy.matrix);}cars.instanceMatrix.needsUpdate=true;windows.instanceMatrix.needsUpdate=true;cars.computeBoundingSphere();windows.computeBoundingSphere();};
      releases.push(()=>{cars.dispose();windows.dispose();glassGeo.dispose();glassMat.dispose();carGeo.dispose();carMat.dispose();});
      let signature='',merged:T.Group|null=null;
      const releaseMerged=()=>{if(!merged)return;merged.traverse(o=>{if((o as T.Mesh).isMesh)(o as T.Mesh).geometry.dispose();});merged.removeFromParent();merged=null;};
      releases.push(releaseMerged);
      const updateGeometry=()=>{
        const next=assets.map(a=>a.state).join();if(next===signature)return;signature=next;
        for(const m of sourceMeshes){const b=sourceBounds.get(m)!,c=b.getCenter(new T.Vector3());m.visible=!inMonument(c.x,c.z)&&!assets.some(a=>a.state==='ready'&&a.footprints.some(f=>f.intersectsBox(b)));}
        // Batch by material and 400 m tile after replacements, preserving
        // frustum culling without hundreds of building-level draw calls.
        releaseMerged();merged=new T.Group();merged.name='Batched mapped buildings';
        const buckets=new Map<string,{material:T.Material;parts:T.BufferGeometry[]}>();
        root.updateWorldMatrix(true,true);const toCity=city.matrixWorld.clone().invert();
        for(const m of sourceMeshes){
          if(!m.visible)continue;
          const c=sourceBounds.get(m)!.getCenter(new T.Vector3()),materials=Array.isArray(m.material)?m.material:[m.material];
          const plain=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();plain.applyMatrix4(new T.Matrix4().multiplyMatrices(toCity,m.matrixWorld));
          for(const draw of m.geometry.groups.length?m.geometry.groups:[{start:0,count:plain.getAttribute('position').count,materialIndex:0}]){
            const material=materials[draw.materialIndex??0],key=`${Math.floor(c.x/400)}:${Math.floor(c.z/400)}:${material.uuid}`;
            const part=new T.BufferGeometry();
            for(const name of ['position','normal','uv']){const a=plain.getAttribute(name);if(a)part.setAttribute(name,new T.Float32BufferAttribute(Array.from(a.array).slice(draw.start*a.itemSize,(draw.start+draw.count)*a.itemSize),a.itemSize));}
            const bucket=buckets.get(key)??{material,parts:[]};bucket.parts.push(part);buckets.set(key,bucket);
          }plain.dispose();
        }
        for(const {material,parts} of buckets.values()){
          const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(!g)continue;
          const mesh=new T.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;merged.add(mesh);
        }
        city.add(merged);root.visible=false;city.userData.mappedDrawCalls=merged.children.length;
      };
      city.userData.updateGeometry=updateGeometry;
      city.userData.sourceMeshes=sourceMeshes;
      city.userData.roadPaths=drawnRoads;
      city.userData.sourceBuildings=data.buildings;
      // Retain the outer skyline from the fallback, clipping its instances to
      // the source extent before moving it out of the fallback's disposal tree.
      const skyline=fallback.group.getObjectByName('Continuous outer city');
      if(skyline){
        const zero=new T.Matrix4().makeScale(0,0,0),m=new T.Matrix4();
        skyline.updateWorldMatrix(true,true);
        skyline.traverse(o=>{if(o instanceof T.InstancedMesh){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);const worldMatrix=new T.Matrix4().multiplyMatrices(o.matrixWorld,m),b=o.geometry.boundingBox!.clone().applyMatrix4(worldMatrix);if(b.max.x>-1250&&b.min.x<1250&&b.max.z>-3650&&b.min.z<450)o.setMatrixAt(i,zero);}o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}});
        city.add(skyline);
      }
      active=city;group.add(city);fallback.group.visible=false;ready=true;
      group.userData.mappedQuarterState='ready';group.userData.sourceSha256=data.sourceSha256;
      group.userData.mapBuildingCount=data.buildings.length;group.userData.mapPathCount=data.paths.length;
      release=()=>{assets.forEach(a=>a.dispose());releases.reverse().forEach(fn=>fn());city.removeFromParent();};
    }catch(error){assets.forEach(a=>a.dispose());assets=[];releases.reverse().forEach(fn=>fn());group.userData.mappedQuarterState='failed';group.userData.mappedQuarterError=String(error);}
  });
  return {group,center:fallback.center,stats:fallback.stats,
    setNight(value){night=value;setMappedNight?.(value);fallback.setNight(value);},setQuality(value){quality=value;fallback.setQuality(value);},
    update(time,camera){
      if(disposed||!camera)return;
      if(!ready){fallback.update(time,camera);return;}
      camera.getWorldPosition(world);active!.updateWorldMatrix(true,false);local.copy(world);active!.worldToLocal(local);
      assets.forEach(a=>a.update(local,quality));active!.userData.updateGeometry();tick?.(time);
      // The fallback owns the skyline's shared GPU resources until final disposal.
    },
    dispose(){if(disposed)return;disposed=true;controller.abort();release?.();fallback.dispose();group.clear();},
  };
}
