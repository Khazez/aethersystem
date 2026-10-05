import * as THREE from 'three';
import {CityBatch} from './batch';
import {landmarks} from './landmarks';
import {cityMaterials} from './materials';
import {almatyLandmarks} from './almaty';
import {createReferenceDistrict} from '../district/model';
import {createDistantDistrict} from '../district/lod';
import {createCityHorizon} from '../district/horizon';
import {createGreenCorridors} from '../district/greenCorridors';
import {createBoulevard} from '../district/boulevard';
import {almatyPark} from './almatyTerrain';
import {buildDostyk} from './dostyk';
import {nurzholLayout,dostykLayout} from './routeLayout';
import {arrivalDistricts,khanDistricts,subtractCityRect} from './cityEdges';
import {buildAkordaBuilding,buildGoldenGateway} from './akorda';
import {createLandmarkAsset,landmarkCoverage} from './landmarkAssets';
import {nurzholReferencePlan} from './nurzholReferences';
import {replacedBuildings,cloneDistrictSubset,disposeDistrictInstances,removeStaticStreetCars} from '../district/replacement';
import {nurzholPathSegments,archGardenClearance,buildNurzholGarden} from './nurzholPark';
import {buildArchApproaches} from './archCrossing';
import {archPlanting} from './archLandscape';
import {nurzholAccessPlan,buildNurzholAccess} from './nurzholAccess';
import {createMappedQuarter} from './mappedQuarter';
import {transportQuarterPlan} from './transportQuarter';
import {buildGovernmentQuarter,governmentContains} from './governmentQuarter';
import {buildIshimRiver,ishimReservations} from './ishimRiver';
import {nurzholCrossStreets,crossingContains,crossStreetBounds,buildNurzholCrossStreets,cutCrossStreetSurfaces,cutLowCitySurfaces} from './nurzholCrossStreets';
import {baiterekQuarterPlots,quarterContains,buildBaiterekQuarter} from './baiterekQuarter';

export type CityQuality='ultra'|'high'|'medium'|'low';
export type AstanaCity=ReturnType<typeof createAstanaCity>;
type Chunk={x:number;z:number;rotation:number;variant:number;near:THREE.Group|null;far:THREE.Group;scenery:THREE.Group;detailed:boolean};

/** Authored architectural modules shared by both cities, with stable opaque LODs. */
export function createAstanaCity(opts:{zFrom:number;zTo:number;roofLevel:number;seed?:number;quality?:CityQuality;city?:'astana'|'almaty';layout?:'legacy'|'landmark-route';landmarkAssets?:boolean;mappedQuarter?:boolean}):{
  group:THREE.Group;center:number;stats:{buildings:number;outerBuildings:number;chunks:number;seed:number};setNight:(v:number)=>void;setQuality:(v:CityQuality)=>void;update:(time:number,camera?:THREE.Camera)=>void;dispose:()=>void;
}{
  if(opts.mappedQuarter&&opts.city!=='almaty'&&opts.layout==='landmark-route')return createMappedQuarter(opts,createAstanaCity({...opts,mappedQuarter:false}));
  const almaty=opts.city==='almaty',seed=opts.seed??20260907,route=opts.layout==='landmark-route';
  const group=new THREE.Group();group.name=almaty?'Almaty architectural districts':'Astana architectural districts';group.position.y=opts.roofLevel-190;
  const start=Math.max(opts.zFrom,opts.zTo),end=Math.min(opts.zFrom,opts.zTo),center=(start+end)/2;
  const anchors=nurzholLayout(start,end),dostyk=dostykLayout(center);
  const importedLandmarks=route&&!almaty&&opts.landmarkAssets===true;
  const watergreenPin=nurzholReferencePlan(start,end)[0];
  // The old oversized podium crossed Dostyq. Keep its full authored geometry
  // north of the newly restored street, rather than driving through the GLB.
  const watergreen={...watergreenPin,z:watergreenPin.z+(route&&!almaty?90:0)};
  const ktz=nurzholReferencePlan(start,end)[2];
  const emerald=nurzholReferencePlan(start,end)[1];
  // Card refers to a block, not the courtyard centre. Keep the portal on the boulevard axis.
  const arch={x:0,z:nurzholReferencePlan(start,end)[3].z-115};
  const access=route&&!almaty?nurzholAccessPlan(anchors.baiterek,arch.z,anchors.khan):null;
  const riverReservations=route&&!almaty?ishimReservations(anchors.akorda):[];
  const crossStreets=route&&!almaty?nurzholCrossStreets(anchors.baiterek,anchors.akorda):[];
  const crossBounds=crossStreetBounds(crossStreets);
  const quarterPlots=route&&!almaty?baiterekQuarterPlots(anchors.baiterek,anchors.akorda):[];
  group.userData.baiterekQuarterPlots=quarterPlots;
  group.userData.crossStreets=crossStreets;
  group.userData.accessParking=access?.parking??[];
  group.userData.layout=route?'landmark-route':'legacy';
  const palette=cityMaterials(),prototypes=[0,1,2].map(variant=>createReferenceDistrict({city:almaty?'almaty':'astana',ground:false,variant,infill:route&&!almaty})),prototype=prototypes[0],distant=prototypes.map(p=>createDistantDistrict(p.buildings));
  const horizon=createCityHorizon(almaty?'almaty':'astana',start,end,seed,prototype.scenery.getObjectByName('leaf') as THREE.InstancedMesh,route);group.add(horizon.group);
  palette.materials.grass.color.set(almaty?0x3c5936:0x435e35);
  {
    // Broad tonal patches break the uniform green surface, including the hill.
    palette.materials.grass.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 gardenPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngardenPosition=position;');
      shader.fragmentShader='varying vec3 gardenPosition;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float patches=sin(gardenPosition.x*.043+sin(gardenPosition.z*.025)*2.)*sin(gardenPosition.z*.061);
        diffuseColor.rgb*=.91+.09*patches;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.21,.13),smoothstep(70.,165.,gardenPosition.y)*.45);`);
    };
    palette.materials.grass.customProgramCacheKey=()=> 'city-garden-surface-v2';
  }
  const excludeTrees=access?(x:number,z:number)=>quarterContains(quarterPlots,x,z,7)||crossingContains(crossStreets,x,z,10)||access.contains(x,z)||governmentContains(x,z,anchors.akorda,10)||Math.hypot(x/87,(z-anchors.baiterek)/109)<1||(importedLandmarks&&archGardenClearance(x,z,arch.z)):undefined;
  const greenery=createGreenCorridors(prototype.scenery.getObjectByName('leaf') as THREE.InstancedMesh,prototype.materials.bark,start,end,almaty,prototype.materials.canopyShade,route,excludeTrees,importedLandmarks?archPlanting(arch.z):[]);group.add(greenery.group);
  const boulevard=createBoulevard(start,end,palette.materials,almaty,route,excludeTrees,importedLandmarks?arch.z:undefined,access?anchors.khan:undefined);group.add(boulevard.group);
  const terrain=new CityBatch(),shell=new CityBatch(),detail=new CityBatch();
  terrain.box('ground',0,-.5,center,60000,.6,60000);
  if(almaty){if(route)buildDostyk(terrain,start,end);else almatyPark(terrain,start,end);}
  else{
    terrain.box('paving',0,.08,center,46,.18,start-end+320);
    for(const sign of [-1,1])for(const [from,to] of nurzholPathSegments(end-160,start+160,importedLandmarks?arch.z:undefined))terrain.box('grass',sign*16,.2,(from+to)/2,11,.12,to-from);
  }
  const avenue=almaty?100:48;
  const pedestrian=route&&!almaty;
  const roadStart=route&&!almaty?anchors.khan-130:start+160,roadEnd=route&&!almaty?anchors.akorda+190:end-160,roadLength=roadStart-roadEnd;
  if(!route)for(const sign of [-1,1]){
    terrain.box('asphalt',sign*avenue,-.06,(roadStart+roadEnd)/2,almaty?22:27,.15,roadLength);
    if(!almaty)terrain.box('grass',sign*21,.19,center,4,.2,start-end+320);
    terrain.box('white',sign*(avenue-14),.08,(roadStart+roadEnd)/2,.25,.3,roadLength);
  }
  if(!route)for(let z=roadEnd;z<roadStart;z+=12)for(const x of [-avenue,avenue])terrain.box('marking',x,.025,z,.14,.022,4.5);
  if(pedestrian)for(const sign of [-1,1]){
    // Nurzhol is a linear pedestrian garden, not a divided motor avenue.
    terrain.box('grass',sign*48,.08,(roadStart+roadEnd)/2,44,.16,roadLength);
    const segments=nurzholPathSegments(roadEnd,roadStart,importedLandmarks?arch.z:undefined);
    for(const [from,to] of segments)if(to>from)terrain.box('paving',sign*48,.19,(from+to)/2,7,.12,to-from);
  }
  if(pedestrian)buildNurzholGarden(terrain,start,roadEnd,roadStart,anchors.baiterek,importedLandmarks?arch.z:undefined);
  const chunks:Chunk[]=[],count=Math.ceil((start-end)/300);
  for(let row=0;row<count;row++){
    const z=start-125-row*300;
    if(almaty){
      if(route){
        if(Math.abs(z-dostyk.abay)>120){terrain.box('asphalt',-235,-.035,z,470,.14,18);if(Math.abs(z-(center-900))>=650)terrain.box('asphalt',235,-.035,z,470,.14,18);}
      }else{
        terrain.box('asphalt',-272,-.035,z,366,.14,22);
        if(Math.abs(z-(center-900))>=650)terrain.box('asphalt',272,-.035,z,366,.14,22);
      }
    }
    else if((!route||z>anchors.akorda+225)&&!crossStreets.some(s=>Math.abs(s.z-z)<100)){
      if(pedestrian){
        const circleDz=Math.max(0,Math.abs(z-anchors.baiterek)-13);
        const circleEdge=circleDz<165?125*Math.sqrt(Math.max(0,1-(circleDz/165)**2))+8:0;
        const edge=Math.max(importedLandmarks&&Math.abs(z-arch.z)<145?174:78,circleEdge);
        for(const sign of [-1,1]){
          const left=sign<0?-455:edge,right=sign<0?-edge:455;
          const cutLeft=watergreen.x-48,cutRight=watergreen.x+58;
          if(importedLandmarks&&Math.abs(z-watergreen.z)<125&&sign<0){
            for(const [a,b] of [[left,Math.min(right,cutLeft)],[Math.max(left,cutRight),right]])if(b>a)terrain.box('asphalt',(a+b)/2,-.035,z,b-a,.14,25);
          }else terrain.box('asphalt',(left+right)/2,-.035,z,right-left,.14,25);
        }
        // The transverse continuation through the park is a footpath, without zebra markings.
        if((!importedLandmarks||Math.abs(z-arch.z)>152)&&Math.abs(z-anchors.baiterek)>175)terrain.box('paving',0,.21,z,146,.12,5);
      }else if(importedLandmarks&&Math.abs(z-watergreen.z)<125){
        // The old uniform street grid must not cut through the authored complex.
        const left=watergreen.x-48,right=watergreen.x+58;
        terrain.box('asphalt',(-455+left)/2,-.035,z,left+455,.14,25);
        terrain.box('asphalt',(455+right)/2,-.035,z,455-right,.14,25);
      }else terrain.box('asphalt',0,-.035,z,910,.14,25);
    }
    if(!route)for(const x of [-avenue,avenue])for(let k=-4;k<=4;k++)terrain.box('marking',x+k*2.25,.045,z+19,1.05,.025,5.2);
    if(!almaty&&Math.abs((pedestrian?z-73:z)-(route?anchors.baiterek:center+150))>(pedestrian?190:130)&&Math.abs(z-(route?anchors.khan:end+150))>160&&(!route||z>anchors.akorda+270)&&(!importedLandmarks||Math.abs(z-73-arch.z)>210)){terrain.box('stone',0,.4,z-73,18,.8,63);terrain.box('water',0,.85,z-73,16,.05,61);}
    for(const x of almaty?(route?[-330,-125,125,330]:[-380,-190,190,380]):[-345,-145,145,345]){
      if(!almaty&&!route&&x===145&&Math.abs(z-(center-40))<235)continue;
      if(!almaty&&!route&&x===-345&&Math.abs(z-(end+320))<170)continue;
      if(!almaty&&route&&Math.abs(x)===145&&Math.abs(z-anchors.akorda)<325)continue;
      if(!almaty&&route&&Math.abs(x)===145&&Math.abs(z-(anchors.akorda+430))<200)continue;
      if(!almaty&&Math.abs(x)===145&&Math.abs(z-(route?anchors.khan:end+150))<240)continue;
      if(almaty&&!route&&x===-190&&Math.abs(z-(center-1040))<150)continue;
      if(almaty&&!route&&x===-380&&Math.abs(z-(center-1130))<230)continue;
      if(almaty&&route&&x>0&&Math.abs(z-dostyk.hotel.z)<220)continue;
      if(almaty&&route&&Math.abs(x)===125&&z<end+260)continue;
      if(almaty&&x>(route?250:0)&&Math.abs(z-(center-900))<650)continue;
      const rotation=(row+(x<0?1:0)+(almaty?1:0))%2?Math.PI:0;
      const variant=(row*7+Math.abs(x)+seed)%3;
      const far=distant[variant].group.clone(true),scenery=prototypes[variant].scenery.clone(true);
      if(pedestrian&&Math.abs(x)===345)removeStaticStreetCars(scenery);
      for(const part of [far,scenery]){part.position.set(x,0,z);part.rotation.y=rotation;group.add(part);}
      chunks.push({x,z,rotation,variant,near:null,far,scenery,detailed:false});
    }
  }
  if(route){
    // A street-facing residential edge, not a second isolated object on a lawn.
    // Reuse the existing recessed facade kit and its exact silhouette LOD.
    const arrival=createReferenceDistrict({city:almaty?'almaty':'astana',ground:false,buildings:[
      {name:'Угловой дом у общественного сада',x:-46,z:57,floors:almaty?5:8,finish:'brick',plan:[[-27,-26],[-27,26],[-11,26],[-11,-9],[27,-9],[27,-26]]},
      {name:'Жилой двор',x:46,z:57,floors:almaty?7:10,finish:'limestone',balcony:true,plan:[[-28,-27],[-28,27],[-13,27],[-13,-10],[13,-10],[13,27],[28,27],[28,-27]]},
      {name:'Деловой корпус',x:-46,z:-59,floors:almaty?8:12,finish:'metal',glass:true,plan:[[-24,-23],[-24,16],[-17,23],[24,23],[24,-16],[17,-23]]},
      {name:'Дом с террасой',x:46,z:-60,floors:almaty?5:7,finish:'concrete',balcony:true,plan:[[-26,-25],[-26,25],[26,25],[26,-25]]},
      {name:'Верхняя терраса',x:46,z:-65,floors:2,base:almaty?20:28,finish:'limestone',balcony:true,plan:[[-19,-18],[-19,18],[19,18],[19,-18]]},
    ]});
    const variant=prototypes.length;prototypes.push(arrival);distant.push(createDistantDistrict(arrival.buildings));
    for(const p of [...arrivalDistricts(almaty?'almaty':'astana',end),...(!almaty?khanDistricts(anchors.khan):[])]){
      const far=distant[variant].group.clone(true),scenery=arrival.scenery.clone(true);
      for(const part of [far,scenery]){part.position.set(p.x,0,p.z);group.add(part);}
      chunks.push({...p,rotation:0,variant,near:null,far,scenery,detailed:false});
    }
    const arrivalSurface=(key:'asphalt'|'paving'|'marking',x:number,y:number,z:number,w:number,h:number,d:number)=>{
      let pieces=[{left:x-w/2,right:x+w/2,front:z-d/2,back:z+d/2}];
      for(const cut of riverReservations)pieces=pieces.flatMap(p=>subtractCityRect(p,cut));
      for(const p of pieces)terrain.box(key,(p.left+p.right)/2,y,(p.front+p.back)/2,p.right-p.left,h,p.back-p.front);
    };
    arrivalSurface('asphalt',0,-.035,end-350,910,.14,25);
    for(const side of [-1,1])arrivalSurface('paving',0,.12,end-350+side*15.5,910,.2,5);
    for(const x of [-125,125]){
      arrivalSurface('asphalt',x,-.035,end-350,25,.14,50);
      for(let k=-4;k<=4;k++)arrivalSurface('marking',x+k*2.3,.055,end-329,1.2,.02,5);
    }
    for(let x=-440;x<450;x+=12)arrivalSurface('marking',x,.045,end-350,5,.02,.14);
  }
  if(almaty&&!route){
    // A compact residential street edge between the park avenue and the hill.
    // Its eastern edge is x=170; Kok-Tobe terrain starts at x=180. No blocks
    // intersect the hill and no unconnected asphalt strips run into its slope.
    const frontage=createReferenceDistrict({ground:false,buildings:[{name:'Дом у предгорного парка',x:0,z:0,floors:6,finish:'concrete',balcony:true,plan:[[-22,-32],[-22,32],[22,32],[22,-32]]}]});
    const variant=prototypes.length;prototypes.push(frontage);distant.push(createDistantDistrict(frontage.buildings));
    for(let z=end+25;z<center-350;z+=108){
      const far=distant[variant].group.clone(true),scenery=new THREE.Group();
      far.position.set(148,0,z);group.add(far,scenery);
      chunks.push({x:148,z,rotation:0,variant,near:null,far,scenery,detailed:false});
      terrain.box('paving',148,.08,z,57,.18,78);
      terrain.box('grass',148,.22,z+45,48,.16,9);
    }
  }
  if(importedLandmarks)buildArchApproaches(terrain,arch.z);
  if(access)buildNurzholAccess(terrain,access,anchors.khan);
  const ground=terrain.finish({...palette.materials,ground:palette.materials.grass,paving:prototype.materials.paving,asphalt:prototype.materials.asphalt,stone:prototype.materials.limestone});ground.name='City ground and paths';group.add(ground);
  if(almaty)almatyLandmarks(shell,detail,center,route);else landmarks(shell,detail,center,end,route,importedLandmarks);
  const landmarkShell=shell.finish(palette.materials),landmarkDetail=detail.finish(palette.materials,true);group.add(landmarkShell,landmarkDetail);
  for(const part of [ground,landmarkShell,landmarkDetail,boulevard.group])cutCrossStreetSurfaces(part,crossStreets);
  for(const part of [ground,landmarkShell,landmarkDetail,boulevard.group])cutLowCitySurfaces(part,quarterPlots);
  const quarterShell=new CityBatch(),quarterDetail=new CityBatch(),quarterSiteBatch=new CityBatch();
  if(quarterPlots.length)buildBaiterekQuarter(quarterShell,quarterDetail,anchors.baiterek,anchors.akorda,quarterSiteBatch);
  const quarter=quarterShell.finish(palette.materials),quarterFine=quarterDetail.finish(palette.materials,true);
  quarter.name='Baiterek green-roof residential complexes';quarterFine.name='Baiterek residential facade details';
  const quarterFallback=new THREE.Group();quarterFallback.name='Fallback quarter';quarterFallback.add(quarter,quarterFine);
  const quarterSite=quarterSiteBatch.finish(palette.materials);quarterSite.name='Baiterek residential site';
  group.add(quarterFallback,quarterSite);
  const crossBatch=new CityBatch();buildNurzholCrossStreets(crossBatch,crossStreets,horizon.streetConnections);
  const crossRoads=crossBatch.finish({...palette.materials,asphalt:prototype.materials.asphalt,paving:prototype.materials.paving});crossRoads.name='Three Nurzhol transverse streets';group.add(crossRoads);
  const governmentShell=new CityBatch(),governmentDetail=new CityBatch(),riverShell=new CityBatch(),riverDetail=new CityBatch();
  if(route&&!almaty){buildGovernmentQuarter(governmentShell,governmentDetail,anchors.akorda);buildIshimRiver(riverShell,riverDetail,anchors.akorda);}
  const government=governmentShell.finish(palette.materials),governmentFine=governmentDetail.finish(palette.materials,true);
  government.name='Government curved wings';governmentFine.name='Government facade details';
  const river=riverShell.finish(palette.materials),riverFine=riverDetail.finish(palette.materials,true);river.name='Ishim river and embankments';
  group.add(government,governmentFine,river,riverFine);
  const governmentFootprints=landmarkCoverage(government);
  const assetFallbacks:THREE.Group[]=[],fallbackDetails:THREE.Group[]=[],assets:ReturnType<typeof createLandmarkAsset>[]=[];
  let watergreenAsset:ReturnType<typeof createLandmarkAsset>|null=null;
  let ktzAsset:ReturnType<typeof createLandmarkAsset>|null=null;
  let emeraldAsset:ReturnType<typeof createLandmarkAsset>|null=null;
  let archAsset:ReturnType<typeof createLandmarkAsset>|null=null;
  let transportAsset:ReturnType<typeof createLandmarkAsset>|null=null;
  if(importedLandmarks){
    assets.push(createLandmarkAsset({parent:group,fallback:quarterFallback,kind:'quarter',z:(anchors.baiterek-222+anchors.akorda+536)/2}));
    for(const kind of ['akorda','gateway'] as const){
      const z=anchors.akorda+(kind==='gateway'?430:0),s=new CityBatch(),d=new CityBatch();
      if(kind==='akorda')buildAkordaBuilding(s,d,z);else buildGoldenGateway(s,d,z);
      const fallback=new THREE.Group(),fine=d.finish(palette.materials,true);
      fallback.name=`Fallback ${kind}`;fallback.add(s.finish(palette.materials),fine);group.add(fallback);
      assetFallbacks.push(fallback);fallbackDetails.push(fine);
      assets.push(createLandmarkAsset({parent:group,fallback,kind,z}));
    }
    const fallback=new THREE.Group();fallback.name='Watergreen loading anchor';group.add(fallback);assetFallbacks.push(fallback);
    watergreenAsset=createLandmarkAsset({parent:group,fallback,kind:'watergreen',x:watergreen.x,z:watergreen.z,rotation:Math.PI/2});
    assets.push(watergreenAsset);
    const ktzFallback=new THREE.Group();ktzFallback.name='KTZ loading anchor';group.add(ktzFallback);assetFallbacks.push(ktzFallback);
    ktzAsset=createLandmarkAsset({parent:group,fallback:ktzFallback,kind:'ktz',x:ktz.x,z:ktz.z,rotation:Math.PI/2});
    assets.push(ktzAsset);
    const emeraldFallback=new THREE.Group();emeraldFallback.name='Emerald loading anchor';group.add(emeraldFallback);assetFallbacks.push(emeraldFallback);
    emeraldAsset=createLandmarkAsset({parent:group,fallback:emeraldFallback,kind:'emerald',x:emerald.x,z:emerald.z,rotation:Math.PI/2});
    assets.push(emeraldAsset);
    const archFallback=new THREE.Group();archFallback.name='Arch loading anchor';group.add(archFallback);assetFallbacks.push(archFallback);
    archAsset=createLandmarkAsset({parent:group,fallback:archFallback,kind:'arch',x:arch.x,z:arch.z});assets.push(archAsset);
    const transport=transportQuarterPlan(arch.z),transportFallback=new THREE.Group();
    transportFallback.name='Transport quarter loading anchor';group.add(transportFallback);assetFallbacks.push(transportFallback);
    transportAsset=createLandmarkAsset({parent:group,fallback:transportFallback,kind:'transport',x:transport.x,z:transport.z});assets.push(transportAsset);
  }
  group.userData.landmarkAssets=importedLandmarks;
  let quality:CityQuality=opts.quality??'high',disposed=false,lastBuild=-1;
  const destroyNear=(chunk:Chunk)=>{
    if(!chunk.near)return;chunk.near.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});group.remove(chunk.near);chunk.near=null;
  };
  const world=new THREE.Vector3();
  const localCamera=new THREE.Vector3();
  const replacementAssets=[watergreenAsset,ktzAsset,emeraldAsset,archAsset,transportAsset].filter(owner=>owner!==null);
  const pedestrianZone=pedestrian?new THREE.Box3(new THREE.Vector3(-78,-1,roadEnd),new THREE.Vector3(78,2,roadStart)):undefined;
  const crossingClearance=importedLandmarks?new THREE.Box3(new THREE.Vector3(-365,-1,arch.z-37),new THREE.Vector3(365,20,arch.z-3)):undefined;
  // Reserve the actual existing stepped cluster, not whole surrounding quarters.
  const fixedFootprints=route&&!almaty?[new THREE.Box3(
    new THREE.Vector3(-296,0,anchors.baiterek-160),new THREE.Vector3(-173,260,anchors.baiterek-27)),
    ...quarterPlots,...governmentFootprints,...crossBounds,...riverReservations.map(r=>new THREE.Box3(new THREE.Vector3(r.left,-1,r.front),new THREE.Vector3(r.right,300,r.back)))]:[];
  const replacements=chunks.map(chunk=>({chunk,removed:new Set<number>(),scenerySignature:'',lod:null as ReturnType<typeof createDistantDistrict>|null,
    transform:new THREE.Matrix4().compose(new THREE.Vector3(chunk.x,0,chunk.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),chunk.rotation),new THREE.Vector3(1,1,1))}));
  let replacementSignature=fixedFootprints.length?'pending':replacementAssets.map(()=>'0').join('');
  return {group,center,stats:{buildings:chunks.reduce((n,c)=>n+prototypes[c.variant].buildingCount,0)+(almaty?3:4),outerBuildings:horizon.buildingCount,chunks:chunks.length,seed},
    setNight(value:number){palette.materials.lit.emissiveIntensity=value*2;},
    setQuality(value:CityQuality){quality=value;},
    update(time:number,camera?:THREE.Camera){
      if(disposed||!camera)return;camera.getWorldPosition(world);
      group.updateWorldMatrix(true,false);localCamera.copy(world);group.worldToLocal(localCamera);
      assets.forEach(asset=>asset.update(localCamera,quality));
      greenery.setAuthoredVisible(archAsset?.state==='ready');
      boulevard.update(time,archAsset?.state==='ready');
      group.userData.archAssetState=archAsset?.state??'disabled';
      group.userData.archAssetError=archAsset?.error??null;
      const signature=replacementAssets.map(asset=>asset.state==='ready'?'1':'0').join('');
      if(signature!==replacementSignature){
        replacementSignature=signature;
        const footprints=[...fixedFootprints,...(access?.plaza??[]),...replacementAssets.flatMap(asset=>asset.state==='ready'?asset.footprints:[])];
        for(const replacement of replacements){
          const {chunk:c,transform}=replacement,source=prototypes[c.variant];
          const crossing=importedLandmarks?[new THREE.Box3(new THREE.Vector3(-334,0,arch.z-35),new THREE.Vector3(334,10,arch.z-5))]:[];
          const removed=replacedBuildings(source.buildings,transform,[...footprints,...crossing,...(access?.clearances??[])]);
          if([...removed].join(',')!==[...replacement.removed].join(',')){
            destroyNear(c);c.detailed=false;group.remove(c.far);replacement.lod?.dispose();
            replacement.lod=createDistantDistrict(source.buildings.filter((_,i)=>!removed.has(i)));
            c.far=replacement.lod.group;c.far.position.set(c.x,0,c.z);c.far.rotation.y=c.rotation;group.add(c.far);
            replacement.removed=removed;
          }
          // Rebuild scenery only in affected parcels, and only when a new import arrives.
          const parcel=new THREE.Box3(new THREE.Vector3(-95,-1,-220),new THREE.Vector3(95,200,220)).applyMatrix4(transform);
          const nearby=footprints.filter(f=>parcel.intersectsBox(f)),park=pedestrianZone&&parcel.intersectsBox(pedestrianZone)?pedestrianZone:undefined;
          const streets=[...(crossingClearance?[crossingClearance]:[]),...(access?.clearances??[])].filter(b=>parcel.intersectsBox(b));
          const street=streets.length?streets:undefined;
          const scenerySignature=nearby.map(f=>f.min.toArray().join(',')).join(';')+(park?':pedestrian':'')+(street?':crossing':'');
          if(scenerySignature===replacement.scenerySignature)continue;
          replacement.scenerySignature=scenerySignature;
          // Preserve the surrounding streets/trees, excluding only pieces inside imports.
          group.remove(c.scenery);disposeDistrictInstances(c.scenery);
          c.scenery=cloneDistrictSubset(source.scenery,new Set(),transform,nearby,park,street);
          if(pedestrian&&Math.abs(c.x)===345)removeStaticStreetCars(c.scenery);
          c.scenery.position.set(c.x,0,c.z);c.scenery.rotation.y=c.rotation;group.add(c.scenery);
        }
        group.userData.replacedBuildingParts=replacements.reduce((count,r)=>count+r.removed.size,0);
        group.userData.retainedDistrictBuildings=replacements.reduce((count,r)=>count+prototypes[r.chunk.variant].buildings.filter((b,i)=>!b.base&&!r.removed.has(i)).length,0);
        // Lightweight plan metadata also makes geometry regression tests use
        // the assembled city rather than a second, guessed placement formula.
        group.userData.districtPlan=replacements.flatMap(r=>prototypes[r.chunk.variant].buildings.flatMap((b,i)=>{
          if(b.base||r.removed.has(i))return [];
          return [{name:b.name,floors:b.floors,infill:b.name==='Дворовой корпус у межквартального прохода',
            points:b.plan.map(([x,z])=>{const p=new THREE.Vector3(x+b.x,0,z+b.z).applyMatrix4(r.transform);return [p.x,p.z];})}];
        }));
      }
      const near=quality==='ultra'?660:quality==='high'?560:quality==='medium'?460:360,far=near+80;
      const ordered=replacements.map(({chunk:c,removed})=>({c,removed,d:Math.hypot(localCamera.x-c.x,localCamera.z-c.z)})).sort((a,b)=>a.d-b.d);
      let built=false;
      for(const {c,d,removed} of ordered){
        if(!c.near&&d<far+110&&!built&&time-lastBuild>.035){
          c.near=cloneDistrictSubset(prototypes[c.variant].architecture,removed);c.near.position.set(c.x,0,c.z);c.near.rotation.y=c.rotation;
          group.add(c.near);built=true;lastBuild=time;
        }
        // Hysteresis prevents threshold chatter; distant silhouettes match exactly.
        // Never screen-door detailed windows: moving noise was visible in the facade.
        c.detailed=!!c.near&&(c.detailed?d<far:d<near);
        c.far.visible=!c.detailed;if(c.near)c.near.visible=c.detailed;
        c.scenery.visible=d<1350;
        if(d>far+650)destroyNear(c);
      }
      landmarkDetail.visible=quality!=='low';
      governmentFine.visible=quality!=='low';riverFine.visible=quality!=='low';
      quarterFine.visible=quality!=='low';
      if(assets.length){
        fallbackDetails.forEach(part=>{part.visible=quality!=='low';});
      }
      horizon.update(camera);
    },
    dispose(){
      if(disposed)return;disposed=true;
      assets.forEach(asset=>asset.dispose());
      replacements.forEach(replacement=>replacement.lod?.dispose());
      for(const c of chunks){destroyNear(c);c.scenery.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});}
      for(const part of [ground,landmarkShell,landmarkDetail,crossRoads,quarter,quarterFine,quarterSite,government,governmentFine,river,riverFine,...assetFallbacks])part.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
      boulevard.dispose();greenery.dispose();horizon.dispose();prototypes.forEach(p=>p.dispose());distant.forEach(p=>p.dispose());palette.dispose();group.clear();
    },
  };
}
