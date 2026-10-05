import * as T from 'three';
import {createAlatau} from './almaty';
import {terrainHeight} from '../noise';

export const ALATAU_DEM={columns:321,rows:193,west:76.68,east:77.26,north:43.215,south:43.005,datum:850} as const;

/** Reduced Mapzen/USGS elevation grid. Measured terrain, artistic vegetation /
 * snow coverage; edge blending joins the geographic relief to the city study. */
export function alatauDemGeometry(bytes:ArrayBuffer,end:number){
  const d=ALATAU_DEM;
  if(bytes.byteLength!==d.columns*d.rows*2)throw new Error('Invalid Alatau elevation grid');
  const data=new DataView(bytes),width=(d.east-d.west)*111320*Math.cos(43.11*Math.PI/180),depth=(d.north-d.south)*111320;
  const geometry=new T.PlaneGeometry(width,depth,d.columns-1,d.rows-1);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position;
  for(let row=0;row<d.rows;row++)for(let col=0;col<d.columns;col++){
    const i=row*d.columns+col,altitude=data.getInt16(i*2,true);
    if(altitude<500||altitude>5500){geometry.dispose();throw new Error('Invalid Alatau elevation sample');}
    const x=(d.west+(d.east-d.west)*col/(d.columns-1)-76.9567)*111320*Math.cos(43.11*Math.PI/180);
    const forward=depth*row/(d.rows-1);
    const rim=T.MathUtils.smoothstep(forward,0,1100)*(1-T.MathUtils.smoothstep(forward,depth-2400,depth));
    const side=T.MathUtils.smoothstep(col,0,10)*T.MathUtils.smoothstep(d.columns-1-col,0,10);
    p.setXYZ(i,x,Math.max(0,altitude-d.datum)*rim*side,end-2800-forward);
  }
  // PlaneGeometry's rows originally run toward +Z after rotateX. Geographic
  // north-to-south rows above run toward -Z, so reverse winding as well.
  // Without this the slopes face downward and back-face culling cuts bands.
  const indices=geometry.index!;
  for(let i=0;i<indices.count;i+=3){const b=indices.getX(i+1);indices.setX(i+1,indices.getX(i+2));indices.setX(i+2,b);}
  geometry.computeVertexNormals();const normal=geometry.attributes.normal,colors=[];
  for(let i=0;i<p.count;i++){
    const h=p.getY(i),slope=normal.getY(i),variation=terrainHeight(p.getX(i)*.005,p.getZ(i)*.005,731,3);
    const color=new T.Color(0x566650).lerp(new T.Color(0x7a7c78),T.MathUtils.smoothstep(h,1000,2400));
    color.multiplyScalar(.85+variation*.22);
    const snow=T.MathUtils.smoothstep(h+variation*240,2550,3380)*T.MathUtils.smoothstep(slope,.35,.83);
    color.lerp(new T.Color(0xd6e0e7),snow);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();return geometry;
}

export function createDemAlatau(end:number){
  const group=new T.Group();group.name='Alatau terrain from geographic elevation';
  const fallback=createAlatau(end);group.add(fallback.group);
  const controller=new AbortController();let disposed=false,mesh:T.Mesh|undefined;
  const ready=fetch('/terrain/alatau-dem.i16',{signal:controller.signal})
    .then(response=>{if(!response.ok)throw new Error(`Alatau DEM HTTP ${response.status}`);return response.arrayBuffer();})
    .then(bytes=>{
      if(disposed)return false;
      const geometry=alatauDemGeometry(bytes,end),material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});
      material.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
          float terrainHaze=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth*0.014);
          gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,terrainHaze);
        #endif`);
      };
      material.customProgramCacheKey=()=> 'alatau-dem-haze-v1';
      mesh=new T.Mesh(geometry,material);mesh.position.y=-252;group.add(mesh);group.remove(fallback.group);fallback.dispose();return true;
    }).catch(error=>{if(!disposed)console.warn('Geographic terrain unavailable; procedural fallback retained.',error);return false;});
  return {group,ready,dispose(){
    if(disposed)return;disposed=true;controller.abort();
    if(mesh){mesh.geometry.dispose();(mesh.material as T.Material).dispose();}else fallback.dispose();
    group.clear();
  }};
}
