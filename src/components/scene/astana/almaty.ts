import * as THREE from 'three';
import {CityBatch} from './batch';
import {terrainHeight} from '../noise';
import {alatauHeight,kokTobeHeight} from './almatyTerrain';
import {dostykLayout} from './routeLayout';

/** Every glass bay, floor band and crown fin uses the same bowed elevation. */
export function hotelFacadeDepth(x:number){return 9.5+3*(1-(x/24)**2);}
export function buildHotelKazakhstan(shell:CityBatch,detail:CityBatch,x:number,z:number){
  shell.box('stone',x,1.1,z,73,2.2,49);
  shell.box('pane',x,4,z,67,3.6,42);
  shell.box('white',x,6,z,73,.6,49);
  shell.box('trim',x,52,z,47.8,96,17.8);
  for(const sign of [-1,1]){
    for(let bay=0;bay<20;bay++){
      const ax=-24+bay*2.4,bx=ax+2.4,az=sign*hotelFacadeDepth(ax),bz=sign*hotelFacadeDepth(bx);
      const length=Math.hypot(bx-ax,bz-az),angle=-Math.atan2(bz-az,bx-ax);
      const strip=(key:'pane'|'trim'|'white',height:number,y:number,depth:number,offset=0,target=shell)=>{
        const g=new THREE.BoxGeometry(length+.025,height,depth);g.rotateY(angle);g.translate(x+(ax+bx)/2,y,z+(az+bz)/2+sign*offset);target.geometry(key,g);
      };
      strip('pane',94,52,.4);
      for(let floor=0;floor<26;floor++){
        // Spandrels stay behind the projecting concrete ribs, without a flat
        // horizontal grid cutting across the curved elevation.
        strip('trim',.65,5.8+floor*3.6,.18,.22,detail);
      }
      strip('white',.65,100,.8,.22);
    }
    for(let i=0;i<=20;i++){
      const dx=-24+i*2.4,depth=hotelFacadeDepth(dx),angle=Math.atan2(sign*dx/96,1);
      const fin=new THREE.BoxGeometry(.46,95,1.25);fin.rotateY(angle);fin.translate(x+dx,52,z+sign*(depth+.5));shell.geometry('white',fin);
      // Thin folded crown blades, not solid teeth on a flat roof.
      const tip=106+5*(1-Math.abs(dx)/24),blade=new THREE.BoxGeometry(.38,tip-99,1.65);
      blade.rotateZ(-dx*.007);blade.rotateY(angle);blade.translate(x+dx,(tip+99)/2,z+sign*(depth+.6));shell.geometry('gold',blade);
    }
    shell.box('white',x+sign*24.4,52,z,.85,97,19.9);
    for(let i=0;i<13;i++)detail.box('white',x-30+i*5,4,z+sign*21.2,.28,3.8,.4);
  }
  // The arrival frontage has an actual entrance, doors and a supported canopy.
  shell.box('pane',x,3.6,z+22,14,4.5,1.2);
  shell.box('white',x,5.9,z+27,20,.55,12);
  for(const dx of [-8.5,8.5])shell.box('trim',x+dx,3,z+31,.28,5.6,.28);
  for(const dx of [-4.8,-1.6,1.6,4.8])detail.box('trim',x+dx,3.2,z+22.7,.1,4.1,.12);
  for(let step=0;step<3;step++)shell.box('stone',x,.18+step*.24,z+34-step*1.2,22,.36,3.2);
}

/** Composed city study, not a surveyed map or an engineering model. */
export function almatyLandmarks(shell:CityBatch,detail:CityBatch,center:number,route=false){
  // Hotel Kazakhstan: slender, ribbed tower and crown silhouette.
  const anchors=dostykLayout(center),x=route?anchors.hotel.x:-190,z=route?anchors.hotel.z:center-1040;
  buildHotelKazakhstan(shell,detail,x,z);
  // Palace of the Republic-inspired broad floating roof and glazed foyer.
  const px=route?anchors.palace.x:-365,pz=route?anchors.palace.z:center-1130;
  shell.box('paving',px,1.1,pz,108,2.2,85);
  shell.box('pane',px,9,pz,79,16,48);
  for(let i=0;i<9;i++)shell.box('white',px-38+i*9.5,10,pz+31,.85,19,.85);
  const roof=new THREE.BoxGeometry(102,1.6,77);roof.translate(px,21,pz);shell.geometry('gold',roof);
  for(const sign of [-1,1]){
    const wing=new THREE.BoxGeometry(51,1.4,77);wing.rotateZ(sign*.055);wing.translate(px+sign*25.4,22.3,pz);shell.geometry('gold',wing);
  }
  for(let i=0;i<18;i++)detail.box('white',px-38+i*4.5,9,pz+24.2,.1,16,.15);
  // Kok Tobe-inspired hilltop broadcast tower, set outside the street grid.
  const tx=650,tz=center-900;
  const hill=new THREE.PlaneGeometry(940,1020,80,88);hill.rotateX(-Math.PI/2);
  const hp=hill.attributes.position;
  for(let i=0;i<hp.count;i++){const hx=hp.getX(i),hz=hp.getZ(i);hp.setXYZ(i,tx+hx,kokTobeHeight(hx,hz)-.15,tz+hz);}
  hill.computeVertexNormals();shell.geometry('grass',hill);
  const summit=kokTobeHeight(0,0),mastHeight=245;
  const mast=new THREE.CylinderGeometry(2.5,6,mastHeight,32);mast.translate(tx,summit+mastHeight/2,tz);shell.geometry('white',mast);
  for(const [y,r] of [[150,14],[181,12]]){const g=new THREE.CylinderGeometry(r,r+2,10,32);g.translate(tx,summit+y,tz);shell.geometry('trim',g);}
  const antenna=new THREE.CylinderGeometry(.55,2.5,105,16);antenna.translate(tx,summit+mastHeight+52.5,tz);shell.geometry('trim',antenna);
}

export function createAlatau(end:number){
  const geometry=new THREE.PlaneGeometry(22000,10600,320,170);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position,colors:number[]=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),depth=7200-p.getZ(i);p.setY(i,alatauHeight(x,depth)*.43);p.setZ(i,end-depth-2800);}
  geometry.computeVertexNormals();
  const n=geometry.attributes.normal;
  for(let i=0;i<p.count;i++){
    const h=p.getY(i),slope=n.getY(i),variation=terrainHeight(p.getX(i)*.006,p.getZ(i)*.006,73,3);
    const snow=THREE.MathUtils.smoothstep(h+(variation-.3)*300,830,1230)*THREE.MathUtils.smoothstep(slope,.57,.9);
    const rock=new THREE.Color(0x586459).lerp(new THREE.Color(0x737a80),THREE.MathUtils.smoothstep(h,90,430));
    rock.multiplyScalar(.82+variation*.5);rock.lerp(new THREE.Color(0xe0e8ed),snow);colors.push(rock.r,rock.g,rock.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 mountainPoint; varying vec3 mountainNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmountainPoint=position; mountainNormal=normal;');
    shader.fragmentShader=`varying vec3 mountainPoint; varying vec3 mountainNormal;
      float rockHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float rockNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rockHash(i),rockHash(i+vec2(1.,0.)),f.x),mix(rockHash(i+vec2(0.,1.)),rockHash(i+vec2(1.,1.)),f.x),f.y);}
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 rockUV=mountainPoint.xz*.034+vec2(mountainPoint.y*.019,0.);
      float strata=rockNoise(rockUV)*.55+rockNoise(rockUV*2.31)*.3+rockNoise(rockUV*5.27)*.15;
      float cliff=1.-smoothstep(.64,.94,normalize(mountainNormal).y);
      float scree=smoothstep(270.,750.,mountainPoint.y);
      diffuseColor.rgb*=mix(.76,1.08,strata);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.205,.215)*(0.75+strata*.5),cliff*scree*.55);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
    float mountainFog=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth*0.10);
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,mountainFog);
    #endif`);
  };
  material.customProgramCacheKey=()=> 'alatau-drainage-ridges-v3';
  const mesh=new THREE.Mesh(geometry,material);mesh.position.y=-250;mesh.name='Alatau composed ridgeline';
  return {group:mesh,dispose(){geometry.dispose();material.dispose();}};
}
