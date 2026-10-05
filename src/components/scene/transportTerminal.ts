import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createReferenceDistrict} from './district/model';

export const TERMINAL_DECK_HEIGHT=24.64;
/** Architectural presentation concept, not a certified vertiport layout.
 * Clear centreline approach; passenger access stays outside the rotor footprint.
 */
export function createTransportTerminal(groundY:number,z:number){
  const district=createReferenceDistrict({ground:false,buildings:[{name:'Городской транспортный терминал',x:0,z:0,floors:6,finish:'metal',glass:true,plan:[[-50,-43],[-50,43],[-38,55],[38,55],[50,43],[50,-43],[38,-55],[-38,-55]]}]});
  const group=new T.Group();group.name='Passenger terminal';group.position.set(0,groundY,z);group.add(district.architecture);
  const materials={
    deck:new T.MeshStandardMaterial({color:0x575e60,roughness:.94}),
    paint:new T.MeshStandardMaterial({color:0xd2d1c4,roughness:.85}),
    metal:new T.MeshStandardMaterial({color:0x556166,metalness:.55,roughness:.4}),
    stone:district.materials.limestone,glass:new T.MeshPhysicalMaterial({color:0x6e919f,roughness:.21,metalness:.18,clearcoat:.7}),
    path:new T.MeshStandardMaterial({color:0x969f9b,roughness:.96}),
    road:district.materials.asphalt,
    greenery:new T.MeshStandardMaterial({color:0x4b6a40,roughness:1}),
    wood:new T.MeshStandardMaterial({color:0x665643,roughness:.9}),
    rubber:new T.MeshStandardMaterial({color:0x222729,roughness:.95}),
    light:new T.MeshBasicMaterial({color:0xc6ddc5}),
  };
  type MaterialKey=keyof typeof materials;
  const batches=new Map<MaterialKey,T.BufferGeometry[]>();
  function box(key:MaterialKey,x:number,y:number,z:number,w:number,h:number,d:number,roofRelative=true){
    if(!batches.has(key))batches.set(key,[]);
    // Rooftop furnishings follow the deck elevation; ground access stays put.
    batches.get(key)!.push(new T.BoxGeometry(w,h,d).translate(x,y+(roofRelative&&y>10?TERMINAL_DECK_HEIGHT-12.64:0),z));
  }
  // Flat roof-integrated deck, not a floating disc or conical support.
  box('deck',0,12.48,0,30,.26,30);
  for(const sign of [-1,1]){
    box('paint',sign*11.5,12.63,0,.22,.02,23);box('paint',0,12.63,sign*11.5,23,.02,.22);
    box('paint',sign*1.8,12.63,0,.7,.02,5.4);
  }
  box('paint',0,12.63,0,3.6,.02,.7);
  // Broad glazed passenger lounge, linked to the roof access core.
  // Kept behind the pad so the arriving passenger sees a destination, not a shed.
  box('stone',0,12.64,-29,58,.45,20);
  box('stone',0,16.4,-38,56,7.2,.45);
  box('glass',0,16.3,-19.2,56,7,.16);
  for(const x of [-28,28])box('glass',x,16.3,-28.5,.16,7,18.5);
  for(let x=-28;x<=28;x+=4)box('metal',x,16.3,-19,.11,7.2,.14);
  box('stone',0,20.2,-28,63,.42,24);
  box('metal',0,19.8,-16.1,63,.16,.2);
  box('path',21,12.4,-9,5,.08,24);box('path',17,12.4,-17,13,.08,5);
  for(const x of [-26,26])for(const zz of [-7,7,25]){
    box('stone',x,12.75,zz,3.5,.85,8);box('greenery',x,13.4,zz,3.1,1.3,7.6);
  }
  // An explicit place name makes the arrival destination legible in the shot.
  const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=128;
  const signContext=signCanvas.getContext('2d')!;signContext.fillStyle='#243940';signContext.fillRect(0,0,1024,128);signContext.fillStyle='#e9f0ef';signContext.font='48px sans-serif';signContext.textAlign='center';signContext.fillText('AETHER   /   AIR TERMINAL',512,82);
  const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;
  const signMaterial=new T.MeshBasicMaterial({map:signTexture}),signGeometry=new T.PlaneGeometry(32,4);
  const sign=new T.Mesh(signGeometry,signMaterial);sign.position.set(0,TERMINAL_DECK_HEIGHT+4.46,-18.85);group.add(sign);
  const streetSign=new T.Mesh(signGeometry,signMaterial);streetSign.position.set(0,17.5,55.08);streetSign.scale.setScalar(1.4);group.add(streetSign);
  // Perimeter guardrails and a discreet steady set of inset deck lamps.
  for(let x=-36;x<=36;x+=4)for(const zz of [-53,53])box('metal',x,12.98,zz,.065,1.3,.065);
  for(let zz=-40;zz<=40;zz+=4)for(const x of [-48,48])box('metal',x,12.98,zz,.065,1.3,.065);
  for(const yy of [12.8,13.62])for(const zz of [-53,53])box('metal',0,yy,zz,72,.055,.055);
  for(const yy of [12.8,13.62])for(const x of [-48,48])box('metal',x,yy,0,.055,.055,80);
  for(const x of [-14,0,14])for(const zz of [-14,14])box('light',x,12.65,zz,.18,.07,.18);
  // Ground-level arrival canopy and drop-off pavement.
  box('path',0,.5,69,100,.15,26);
  // A forecourt connected to the avenue, with a separated pedestrian entrance.
  box('road',0,.36,93,156,.14,14);
  for(const x of [-70,70]){
    box('road',x,.36,115,14,.14,56);
    box('path',x<0?x+10:x-10,.52,115,5,.16,56);
    for(let zz=88;zz<=140;zz+=10)box('paint',x,.45,zz,.14,.02,4);
  }
  box('road',0,.36,139,210,.14,14);
  box('glass',0,3,55.12,24,5.8,.18,false);
  for(const x of [-12,-4,4,12])box('metal',x,3,55.3,.18,6,.3);
  box('path',0,.52,62,26,.18,16);
  box('metal',0,5.25,60,42,.35,13);
  for(const x of [-19,19])box('metal',x,2.6,65,.3,5.2,.3);
  // A pedestrian island connects the terminal entrance and the city footways.
  box('path',0,.51,114,116,.18,29);
  box('greenery',-33,.66,114,37,.16,17);
  box('greenery',33,.66,114,37,.16,17);
  for(let i=-5;i<=5;i++)box('paint',i*1.25,.45,93,.65,.02,11);
  for(const s of [-1,1]){
    // Public squares replace unused lawn; planting sits inside a connected
    // path network rather than becoming another uninterrupted green rectangle.
    box('path',s*143,.45,80,118,.2,274);
    for(const dz of [4,65]){
      box('stone',s*145,.66,dz,96,.45,44);
      box('greenery',s*145,.95,dz,93,.15,41);
      box('path',s*145,1.06,dz,5,.12,42);
      for(const dx of [-34,34]){
        box('stone',s*145+dx,.98,dz+14,7,.75,2);
        box('wood',s*145+dx,1.42,dz+14,7.2,.14,2.1);
      }
    }
    // Covered waiting area; columns remain outside the clear walking strip.
    box('wood',s*145,4.2,122,65,.32,9);
    for(const dx of [-29,0,29])for(const dz of [118.5,125.5])box('metal',s*145+dx,2.3,dz,.22,3.8,.22);
    for(const dx of [-22,0,22])box('wood',s*145+dx,.98,122,8,.16,1.7);
    box('road',s*145,.6,177,94,.12,57);
    box('road',s*101,.6,156,13,.12,38);
    box('path',s*152,.77,145,84,.14,5);
    for(let bay=-3;bay<=3;bay++){
      for(const dz of [159,195])box('paint',s*145+bay*11,.68,dz,.12,.025,12);
    }
    // Drop-off vehicles face along the access lane; no cars on the plaza.
    for(const dz of [109,123]){
      box('stone',s*70,1.05,dz,1.9,.65,4.4);
      box('glass',s*70,1.65,dz-.15,1.55,.65,2.1);
      box('metal',s*70,2,dz-.15,1.6,.1,2.15);
      for(const dx of [-.9,.9])for(const dd of [-1.4,1.4])box('rubber',s*70+dx,.75,dz+dd,.2,.6,.65);
    }
  }
  const treePositions:T.Vector3[]=[];
  for(const s of [-1,1])for(const x of [101,185])for(const dz of [-38,22,87,212])treePositions.push(new T.Vector3(s*x,.6,dz));
  for(const s of [-1,1]){
    box('path',s*69,.48,-5,14,.18,130);
    for(const x of [115,132,160,177])for(const dz of [4,65])for(const offset of [-12,12])treePositions.push(new T.Vector3(s*x,.98,dz+offset));
  }
  // A rear walking garden joins both squares. Its low planting leaves the
  // rooftop approach unobstructed; the terminal remains a concept, not a map.
  box('path',0,.45,-78,414,.2,12);
  box('path',0,.45,-241,414,.2,10);
  for(const x of [-201,0,201])box('path',x,.45,-160,9,.2,156);
  for(const s of [-1,1]){
    box('greenery',s*101,.37,-159,190,.12,147);
    box('path',s*101,.49,-160,190,.12,5);
    for(const x of [28,68,132,173])for(const dz of [-108,-137,-183,-214])treePositions.push(new T.Vector3(s*x+.8*Math.sin(dz),.5,dz+Math.sin(x)*3));
    for(const x of [40,100,160])box('wood',s*x,.96,-155,7,.17,1.8);
  }
  group.userData.landscapeTrees=treePositions.length;
  const leafSource=district.scenery.getObjectByName('leaf') as T.InstancedMesh;
  const treeLeaves=new T.InstancedMesh(leafSource.geometry,leafSource.material,treePositions.length*12),treeDummy=new T.Object3D();
  treeLeaves.name='Terminal plaza trees';treeLeaves.castShadow=treeLeaves.receiveShadow=true;
  treePositions.forEach((p,i)=>{
    box('wood',p.x,3.1,p.z,.35,5,.35);
    for(let j=0;j<12;j++){
      const angle=j*2.399+i,r=2.2+Math.sin(j*1.7)*.8;
      treeDummy.position.set(p.x+Math.cos(angle)*r,p.y+6+Math.sin(j)*1.3,p.z+Math.sin(angle)*r);
      treeDummy.rotation.set(j*.37,angle,j*.19);treeDummy.scale.set(2.6,2.1,2.6);treeDummy.updateMatrix();treeLeaves.setMatrixAt(i*12+j,treeDummy.matrix);
    }
  });
  treeLeaves.computeBoundingSphere();group.add(treeLeaves);
  // Expressed structural fins and a sheltered forecourt read as civic
  // infrastructure rather than a service shed behind the landing pad.
  for(const x of [-48,48])for(let zz=-38;zz<=38;zz+=9)box('stone',x,11.8,zz,.9,23.6,1.4,false);
  for(const x of [-38,38]){
    box('stone',x,12.6,-34,8,1.0,28);
    box('glass',x,16,-35,7,6,20);
    box('stone',x,19.2,-35,10,.4,23);
    box('path',x,12.45,12,10,.12,58);
    for(const zz of [18,35]){box('stone',x,.65,zz+42,10,1.2,6);box('greenery',x,1.6,zz+42,9,1.1,5);}
  }
  const geometries:T.BufferGeometry[]=[];
  for(const [key,parts] of batches){const geometry=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());geometries.push(geometry);const mesh=new T.Mesh(geometry,materials[key]);mesh.castShadow=key!=='light';mesh.receiveShadow=true;group.add(mesh);}
  let disposed=false;
  return {group,touchdown:new T.Vector3(0,groundY+TERMINAL_DECK_HEIGHT,z),
    dispose(){if(disposed)return;disposed=true;treeLeaves.dispose();district.group.add(district.architecture);district.dispose();geometries.forEach(g=>g.dispose());signTexture.dispose();signMaterial.dispose();signGeometry.dispose();Object.entries(materials).forEach(([key,m])=>{if(key!=='stone'&&key!=='road')m.dispose();});group.clear();},
  };
}
