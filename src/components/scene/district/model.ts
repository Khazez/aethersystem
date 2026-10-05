import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Point = [number, number];
type Finish = 'brick' | 'limestone' | 'concrete' | 'metal';
export type DistrictBuilding = {name:string; x:number; z:number; floors:number; finish:Finish; plan:Point[]; balcony?:boolean; glass?:boolean; base?:number; pitched?:boolean};
const rectangle = (w:number,d:number):Point[] => [[-w/2,-d/2],[-w/2,d/2],[w/2,d/2],[w/2,-d/2]];
function roundedPlan(w:number,d:number,r:number):Point[]{
  // Clockwise in the X/Z plane, like the other footprints. The same outline
  // drives recessed openings, roof slabs and every LOD, not a decorative shell.
  const points:Point[]=[];
  for(const [cx,cz,angle] of [[-w/2+r,-d/2+r,Math.PI*1.5],[-w/2+r,d/2-r,Math.PI],[w/2-r,d/2-r,Math.PI/2],[w/2-r,-d/2+r,0]]){
    for(let i=0;i<=4;i++){const a=angle-i*Math.PI/8;points.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}
  }
  return points;
}
export const districtBuildings:DistrictBuilding[] = [
  {name:'Угловой кирпичный корпус',x:-46,z:37,floors:8,finish:'brick',plan:[[-25,-19],[-25,19],[-9,19],[-9,-3],[25,-3],[25,-19]]},
  {name:'Каменный дом с внутренним двором',x:48,z:40,floors:10,finish:'limestone',balcony:true,plan:[[-29,-22],[-29,22],[-15,22],[-15,-7],[15,-7],[15,22],[29,22],[29,-22]]},
  {name:'Офисная башня со скошенными углами',x:-43,z:-45,floors:19,finish:'metal',glass:true,plan:[[-21,-14],[-21,14],[-14,21],[14,21],[21,14],[21,-14],[14,-21],[-14,-21]]},
  {name:'Террасный жилой корпус',x:45,z:-44,floors:7,finish:'concrete',balcony:true,plan:rectangle(48,30)},
  {name:'Верхние террасы',x:51,z:-48,floors:3,base:28,finish:'limestone',balcony:true,plan:rectangle(30,20)},
  {name:'Кирпичный периметр',x:-47,z:102,floors:6,finish:'brick',plan:rectangle(54,24)},
  {name:'Тонкая офисная пластина',x:45,z:104,floors:13,finish:'limestone',glass:true,plan:rectangle(48,23)},
  {name:'Низкий общественный корпус',x:48,z:-100,floors:3,finish:'limestone',plan:rectangle(51,22)},
];
// Almaty is not the Astana kit scaled down: separate street walls, deeper
// loggias, a lower roofline and occasional business buildings behind the park.
const almatyBuildings:DistrictBuilding[]=[
  {name:'Угловой дом у парка',x:-46,z:37,floors:5,finish:'limestone',plan:[[-27,-18],[-27,18],[-10,18],[-10,-1],[27,-1],[27,-18]]},
  {name:'Жилой двор с лоджиями',x:48,z:40,floors:7,finish:'concrete',balcony:true,plan:[[-28,-22],[-28,22],[-14,22],[-14,-7],[14,-7],[14,22],[28,22],[28,-22]]},
  {name:'Деловой корпус у предгорий',x:-43,z:-45,floors:11,finish:'metal',glass:true,plan:roundedPlan(44,38,9)},
  {name:'Террасный дом',x:45,z:-44,floors:5,finish:'limestone',balcony:true,plan:rectangle(48,30)},
  {name:'Пентхаусы с террасами',x:51,z:-48,floors:2,base:20,finish:'concrete',balcony:true,plan:rectangle(30,20)},
  {name:'Невысокий жилой фронт',x:-47,z:102,floors:4,finish:'brick',plan:rectangle(56,24),pitched:true},
  {name:'Жилой корпус с глубокими лоджиями',x:45,z:104,floors:8,finish:'limestone',balcony:true,plan:rectangle(49,24)},
  {name:'Павильон у сквера',x:48,z:-100,floors:3,finish:'limestone',plan:rectangle(51,22),pitched:true},
];

export function pitchedRoofGeometry(b:DistrictBuilding){
  const top=(b.base??0)+b.floors*4,[[x0,z0],,[x1,z1]]=b.plan,positions:number[]=[];
  const a=[x0+b.x-.5,top+.4,z0+b.z-.5],c=[x1+b.x+.5,top+.4,z1+b.z+.5];
  const left=[a[0],top+4,(a[2]+c[2])/2],right=[c[0],top+4,(a[2]+c[2])/2];
  positions.push(...a,...left,...right,...a,...right,c[0],a[1],a[2]);
  positions.push(a[0],c[1],c[2],...c,...right,a[0],c[1],c[2],...right,...left);
  positions.push(...a,a[0],c[1],c[2],...left,c[0],a[1],a[2],...right,...c);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Array(positions.length/3*2).fill(0),2));g.computeVertexNormals();return g;
}

/** Roof plant follows the actual polygon and avoids upper terrace volumes. */
export function roofEquipment(b:DistrictBuilding,neighbors:DistrictBuilding[]){
  if(b.pitched)return [];
  const inside=(x:number,z:number,plan:Point[])=>{
    let hit=false;
    for(let i=0,j=plan.length-1;i<plan.length;j=i++){
      const [ax,az]=plan[i],[bx,bz]=plan[j];
      if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)hit=!hit;
    }
    return hit;
  };
  const top=(b.base??0)+b.floors*4,result:{x:number;z:number;w:number;d:number;h:number}[]=[];
  const xs=b.plan.map(p=>p[0]),zs=b.plan.map(p=>p[1]);
  for(let z=Math.min(...zs)+7;z<Math.max(...zs)-5;z+=11)for(let x=Math.min(...xs)+7;x<Math.max(...xs)-5;x+=13){
    if(result.length>=(b.glass?4:3))return result;
    const w=result.length===0?5:3.2,d=result.length===0?6:4;
    const corners=[[-w/2-1,-d/2-1],[-w/2-1,d/2+1],[w/2+1,d/2+1],[w/2+1,-d/2-1]];
    if(!corners.every(([dx,dz])=>inside(x+dx,z+dz,b.plan)))continue;
    if(neighbors.some(n=>n!==b&&(n.base??0)>=top&&corners.some(([dx,dz])=>inside(x+b.x+dx-n.x,z+b.z+dz-n.z,n.plan))))continue;
    result.push({x:x+b.x,z:z+b.z,w,d,h:result.length===0?2.6:1.4});
  }
  return result;
}

function random(seed=734) {return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

// One GPU texture set shared by all district prototypes and the terminal.
let surfaceUsers=0;
let sharedSurfaces:{concrete:T.Texture;normal:T.Texture;rough:T.Texture;asphalt:T.Texture}|undefined;
function acquireSurfaces(){
  if(!sharedSurfaces){
    const loader=new T.TextureLoader();
    const load=(file:string,color=false)=>{const t=loader.load(`/textures/surfaces/${file}.jpg`);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
    sharedSurfaces={concrete:load('concrete-Diffuse',true),normal:load('concrete-nor_gl'),rough:load('concrete-Rough'),asphalt:load('asphalt-Diffuse',true)};
  }
  surfaceUsers++;
  return sharedSurfaces;
}
function releaseSurfaces(){if(--surfaceUsers===0&&sharedSurfaces){Object.values(sharedSurfaces).forEach(t=>t.dispose());sharedSurfaces=undefined;}}

/** Original small, tileable material maps. No photograph or painted window atlas. */
function surfaceMap(brick:boolean) {
  const size=512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d')!,rnd=random(brick?51:93);
  ctx.fillStyle=brick?'#b1a397':'#d4d5ce';ctx.fillRect(0,0,size,size);
  if(brick){
    for(let row=0;row<32;row++)for(let col=-1;col<9;col++){
      const tone=80+Math.floor(rnd()*25);ctx.fillStyle=`rgb(${tone+27},${tone+9},${tone-3})`;
      ctx.fillRect(col*64+(row%2)*32+1,row*16+1,61,13);
    }
  }
  const pixels=ctx.getImageData(0,0,size,size);
  for(let i=0;i<pixels.data.length;i+=4){const n=(rnd()-.5)*(brick?23:12);for(let c=0;c<3;c++)pixels.data[i+c]+=n;}
  ctx.putImageData(pixels,0,0);
  const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  const bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
  return {map,bump};
}

function foliageMap(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d')!,rnd=random(846);
  for(let i=0;i<650;i++){
    const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*(91+11*Math.sin(a*5)+7*Math.cos(a*3)),x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;
    const light=105+Math.floor(rnd()*65);c.fillStyle=`rgb(${Math.floor(light*.72)},${light},${Math.floor(light*.44)})`;
    c.beginPath();c.ellipse(x,y,3+rnd()*5,1.8+rnd()*3.5,rnd()*Math.PI,0,Math.PI*2);c.fill();
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;
}

function canopyOcclusion(){
  const data=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5),i=(y*64+x)*4;
    data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-r),1.6));
  }
  const t=new T.DataTexture(data,64,64);t.needsUpdate=true;t.magFilter=t.minFilter=T.LinearFilter;return t;
}

export function createReferenceDistrict(options:{city?:'astana'|'almaty';ground?:boolean;buildings?:DistrictBuilding[];variant?:number;infill?:boolean}={}) {
  const group=new T.Group(),rnd=random(),brick=surfaceMap(true),stone=surfaceMap(false),foliage=foliageMap(),shade=canopyOcclusion(),surfaces=acquireSurfaces();
  const architecture=new T.Group(),scenery=new T.Group();group.add(architecture,scenery);
  const buildings=options.buildings??(options.city==='almaty'?almatyBuildings:districtBuildings).map(b=>({...b}));
  if(!options.buildings&&options.variant){
    const shifts=options.variant===1?[2,-2,4,1,0,2,-3,0]:[-2,2,-4,-1,1,0,3,1];
    buildings.forEach((b,i)=>{b.floors=Math.max(3,b.floors+shifts[i]);});
    buildings[4].base=buildings[3].floors*4;
    if(options.variant===2){buildings[0].finish='limestone';buildings[5].finish='concrete';}
    if(options.variant===1){
      buildings[2].plan=roundedPlan(46,44,10);buildings[2].floors-=3;
      buildings[0].plan=[[-28,-19],[-28,25],[-13,25],[-13,-4],[28,-4],[28,-19]];
      buildings[0].balcony=true;
      buildings[6].plan=roundedPlan(54,24,6);buildings[6].glass=true;
      buildings[6].finish='metal';buildings[6].floors=options.city==='almaty'?6:10;
    }
    // Wider terraces and slimmer slab blocks change the street silhouette,
    // while respecting the existing parcel and the upper terrace's support.
    if(options.variant===2){
      // Residential ensemble: a broad corner wall replaces the repeated
      // office tower. Neighboring terraces still sit on their actual base.
      buildings[2].plan=[[-28,-25],[-28,25],[-12,25],[-12,-8],[28,-8],[28,-25]];
      buildings[2].glass=false;buildings[2].balcony=true;buildings[2].finish='concrete';
      buildings[2].floors=options.city==='almaty'?6:11;
      buildings[6].plan=rectangle(58,23);buildings[6].glass=false;
      buildings[6].balcony=true;buildings[6].floors=options.city==='almaty'?5:8;
    }
  }
  if(options.infill&&!options.buildings){
    // Opposite corners remain invariant under the district's 180-degree rotation.
    // They close the 60-metre inter-block gaps without covering the street spine.
    const plan:Point[]=[[-21,-10],[-21,10],[-9,10],[-9,2],[21,2],[21,-10]];
    for(const sign of [-1,1])buildings.push({name:'Дворовой корпус у межквартального прохода',x:sign*46,z:-sign*146,
      floors:4+(options.variant??0)%2,finish:sign<0?'limestone':'brick',balcony:true,
      plan:sign<0?plan:plan.map(([x,z])=>[-x,-z] as Point)});
  }
  let buildingPhase=true,buildingIndex=-1;
  const mat={
    brick:new T.MeshStandardMaterial({map:brick.map,bumpMap:brick.bump,bumpScale:.028,roughness:.91,color:0xd8c5b6}),
    limestone:new T.MeshStandardMaterial({map:stone.map,bumpMap:stone.bump,bumpScale:.018,color:0xe0e0d7,roughness:.84}),
    concrete:new T.MeshStandardMaterial({map:surfaces.concrete,normalMap:surfaces.normal,normalScale:new T.Vector2(.22,.22),roughnessMap:surfaces.rough,color:0xe4e8e5,roughness:.94}),
    metal:new T.MeshStandardMaterial({color:0x74858d,metalness:.48,roughness:.45}),
    frame:new T.MeshStandardMaterial({color:0x343c3e,metalness:.67,roughness:.32}),
    reveal:new T.MeshStandardMaterial({color:0x85847a,roughness:.92}),
    glass:new T.MeshPhysicalMaterial({color:0x788b91,metalness:.08,roughness:.22,clearcoat:.75,clearcoatRoughness:.19,envMapIntensity:1.15}),
    back:new T.MeshStandardMaterial({color:0x263034,roughness:.9}),
    sill:new T.MeshStandardMaterial({color:0xcbd2d0,roughness:.78}),
    roof:new T.MeshStandardMaterial({map:stone.map,color:0x666d6b,roughness:.97}),
    asphalt:new T.MeshStandardMaterial({map:surfaces.asphalt,color:0xadb5b7,roughness:.98}),
    paving:new T.MeshStandardMaterial({map:stone.map,color:0xb0b8b6,roughness:.93}),
    marking:new T.MeshStandardMaterial({color:0xbab8a7,roughness:.91}),
    soil:new T.MeshStandardMaterial({color:0x454a38,roughness:1}),
    leaf:new T.MeshStandardMaterial({map:foliage,color:0xb3c59b,roughness:.97,side:T.DoubleSide,alphaTest:.38}),
    canopyShade:new T.MeshBasicMaterial({map:shade,color:0x101a0e,transparent:true,opacity:.36,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
    turf:new T.MeshStandardMaterial({color:0x4e7b45,roughness:1}),
    bark:new T.MeshStandardMaterial({color:0x5d5748,roughness:.98}),
    car:new T.MeshStandardMaterial({color:0xffffff,roughness:.36,metalness:.48}),
    rubber:new T.MeshStandardMaterial({color:0x171b1c,roughness:.92}),
  };
  for(const [material,metres] of [[mat.asphalt,5],[mat.paving,2.56]] as const){
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
      vec4 roadPosition=vec4(position,1.0);
      #ifdef USE_INSTANCING
        roadPosition=instanceMatrix*roadPosition;
      #endif
      roadPosition=modelMatrix*roadPosition;
      vMapUv=roadPosition.xz/${metres.toFixed(2)};`);
  };
  material.customProgramCacheKey=()=> `district-ground-world-metres-${metres}-v2`;
  }
  // An inexpensive interior impression beneath the reflection. Each window
  // gets a deterministic blind height and curtain width from its location.
  mat.glass.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 roomUV; varying float roomSeed;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      roomUV=uv;
      #ifdef USE_INSTANCING
        roomSeed=fract(sin(dot(instanceMatrix[3].xyz,vec3(12.31,4.73,6.17)))*43758.5453);
      #else
        roomSeed=0.5;
      #endif`);
    shader.fragmentShader='varying vec2 roomUV; varying float roomSeed;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float curtain=step(roomUV.x,0.07+roomSeed*0.3)+step(0.92-roomSeed*0.13,roomUV.x);
      float blind=step(0.94-roomSeed*0.38,roomUV.y)*step(0.62,roomSeed);
      float pleat=0.8+0.2*sin(roomUV.x*110.0);
      diffuseColor.rgb=mix(diffuseColor.rgb*0.8,vec3(0.21,0.205,0.18)*pleat,clamp(curtain+blind,0.0,1.0));
      diffuseColor.rgb*=mix(0.63,1.0,smoothstep(0.0,0.18,roomUV.y));`);
  };
  mat.glass.customProgramCacheKey=()=> 'district-interiors-v2';
  type Key=keyof typeof mat;
  // The same frame, sill and wall meshes are shared by every opening of a type.
  const geometries=new Map<string,T.BufferGeometry>(),batches=new Map<string,{geometry:T.BufferGeometry; material:Key; transforms:T.Matrix4[]; colors:T.Color[]; owners:number[]; detail:boolean; building:boolean}>();
  const dummy=new T.Object3D(),local=new T.Object3D();
  function add(key:string,geometry:()=>T.BufferGeometry,material:Key,matrix:T.Matrix4,color=0xffffff,detail=false){
    if(!geometries.has(key))geometries.set(key,geometry());
    const id=`${key}:${material}:${detail}:${buildingPhase}`;
    if(!batches.has(id))batches.set(id,{geometry:geometries.get(key)!,material,transforms:[],colors:[],owners:[],detail,building:buildingPhase});
    const batch=batches.get(id)!;batch.transforms.push(matrix.clone());batch.colors.push(new T.Color(color));
    batch.owners.push(buildingPhase?buildingIndex:-1);
  }
  function box(material:Key,x:number,y:number,z:number,w:number,h:number,d:number,angle=0,color=0xffffff,detail=false){
    dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(w,h,d);dummy.updateMatrix();
    add('unit-box',()=>new T.BoxGeometry(),material,dummy.matrix,color,detail);
  }
  function moduleGeometry(parts:number[][]){
    const pieces=parts.map(([x,y,z,w,h,d])=>{
      const g=new T.BoxGeometry(w,h,d).translate(x,y,z),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
      for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.56,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.56);
      return g;
    });
    const merged=mergeGeometries(pieces)!;pieces.forEach(p=>p.dispose());return merged;
  }
  function opening(width:number,glass:boolean,loggia=false){
    const h=4,ww=glass?width-.18:width*(loggia?.86:.64),wh=glass?3.35:loggia?3.15:2.45,top=(h-wh)/2;
    return {wall:[[0,(h+wh)/4,-.21,width,top,.42],[0,-(h+wh)/4,-.21,width,top,.42],[-(width+ww)/4,0,-.21,(width-ww)/2,wh,.42],[(width+ww)/4,0,-.21,(width-ww)/2,wh,.42]],
      frame:[[-ww/2,0,-.32,.075,wh,.13],[ww/2,0,-.32,.075,wh,.13],[0,wh/2,-.32,ww,.075,.13],[0,-wh/2,-.32,ww,.075,.13],[0,0,-.31,.055,wh,.12]],
      reveal:[[-ww/2-.025,0,-.21,.05,wh,.42],[ww/2+.025,0,-.21,.05,wh,.42],[0,wh/2+.025,-.21,ww,.05,.42],[0,-wh/2-.025,-.21,ww,.05,.42]],
      pane:[[0,0,-.405,ww-.04,wh-.04,.025]],sill:[[0,-wh/2-.07,.045,ww+.24,.13,.65]],ww,wh};
  }
  function build(b:DistrictBuilding,index:number){
    buildingIndex=index;
    const bottom=b.base??0,top=bottom+b.floors*4;
    const outline=b.plan.map(([x,z])=>[x+b.x,z+b.z] as Point);
    const shape=new T.Shape(outline.map(([x,z])=>new T.Vector2(x,-z)));
    const slab=new T.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:false,steps:1});slab.rotateX(-Math.PI/2);slab.translate(0,top,0);
    const mesh=new T.Mesh(slab,mat.roof);mesh.userData.buildingIndex=index;mesh.castShadow=mesh.receiveShadow=true;architecture.add(mesh);geometries.set(`roof-${index}`,slab);
    if(b.pitched){
      const g=pitchedRoofGeometry(b);
      const roof=new T.Mesh(g,mat.metal);roof.userData.buildingIndex=index;roof.castShadow=roof.receiveShadow=true;architecture.add(roof);geometries.set(`pitched-${index}`,g);
    }
    for(let edge=0;edge<outline.length;edge++){
      const a=outline[edge],b2=outline[(edge+1)%outline.length],dx=b2[0]-a[0],dz=b2[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx);
      const cells=Math.round(length/3.6),width=length/cells;
      const transform=(x:number,y:number,z=0)=>{
        dummy.position.set(a[0]+dx*x/length,y,a[1]+dz*x/length);dummy.rotation.set(0,angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
        local.position.set(0,0,z);local.rotation.set(0,0,0);local.scale.set(1,1,1);local.updateMatrix();return dummy.matrix.clone().multiply(local.matrix);
      };
      for(let floor=0;floor<b.floors;floor++)for(let cell=0;cell<cells;cell++){
        const loggia=!!b.balcony&&floor>0&&cell%3===1;
        const glazed=!!b.glass||(floor===0&&!b.base),kit=opening(3.6,glazed,loggia),prefix=`canonical:${glazed}:${loggia}`;
        const matrix=transform((cell+.5)*width,bottom+floor*4+2);
        matrix.scale(new T.Vector3(width/3.6,1,1));
        // Continuous dark loggia bays and restrained base/top zoning replace
        // the same white punched-window grid on every residential facade.
        const finish=floor===0&&!b.base?'limestone':loggia?'metal':b.finish;
        add(`${prefix}:wall`,()=>moduleGeometry(kit.wall),finish,matrix);
        add(`${prefix}:frame`,()=>moduleGeometry(kit.frame),'frame',matrix);
        add(`${prefix}:reveal`,()=>moduleGeometry(kit.reveal),'reveal',matrix);
        const tint=new T.Color().setHSL(.55,.08,.76+rnd()*.12).getHex();
        add(`${prefix}:pane`,()=>new T.BoxGeometry(kit.ww-.04,kit.wh-.04,.025).translate(0,0,-.405),'glass',matrix,tint);
        if(!glazed)add(`${prefix}:sill`,()=>moduleGeometry(kit.sill),'sill',matrix);
        if(floor===0&&!b.base)add(`${prefix}:transom`,()=>moduleGeometry([[0,.92,-.29,kit.ww,.065,.16]]),'frame',matrix);
        // Recessed loggias: floor projection, solid side cheeks and thin rails.
        if(loggia){
          add(`${prefix}:balcony`,()=>moduleGeometry([[0,-1.88,.45,3.6*.96,.18,1.45],[-3.6*.48,-.5,.45,.14,2.65,1.45],[3.6*.48,-.5,.45,.14,2.65,1.45]]),b.finish,matrix);
          add(`${prefix}:balustrade`,()=>moduleGeometry([[0,-1.27,1.08,3.6*.9,.96,.035]]),'glass',matrix,0x8d9b96);
          add(`${prefix}:rail`,()=>moduleGeometry([[0,-.75,1.13,3.6*.86,.07,.07],[0,-1.25,1.13,.07,1.05,.07],[-3.6*.4,-1.25,1.13,.07,1.05,.07],[3.6*.4,-1.25,1.13,.07,1.05,.07]]),'frame',matrix);
        }
      }
      const mx=(a[0]+b2[0])/2,mz=(a[1]+b2[1])/2;
      box('sill',mx,top+.28,mz,length,.56,.45,angle);
      if(!b.glass){
        box('sill',mx,bottom+4.03,mz,length,.19,.64,angle);
        for(let floor=2;floor<b.floors;floor+=3)box(b.finish,mx,bottom+floor*4,mz,length,.14,.57,angle);
      }
      if(b.glass)for(let floor=1;floor<b.floors;floor++)box('metal',mx,bottom+floor*4,mz,length,.32,.65,angle);
      if(!b.base&&length>20){
        const p=transform(length*.5,3.15,1.2);add('canopy',()=>new T.BoxGeometry(6,.18,2.6),'frame',p);
      }
    }
    // Service equipment sits on real roofs rather than floating facade caps.
    if(b.pitched)return;
    for(const [i,p] of roofEquipment(b,buildings).entries()){
      box('roof',p.x,top+.35+p.h/2,p.z,p.w,p.h,p.d);
      box('sill',p.x,top+.42+p.h,p.z,p.w+.2,.12,p.d+.2);
      if(i===0){box('frame',p.x,top+1.5,p.z-p.d/2-.025,1.2,2.1,.08);}
      else for(let k=0;k<7;k++)box('frame',p.x,top+.55+p.h,p.z-1.6+k*.52,p.w-.3,.06,.13);
    }
  }
  buildings.forEach(build);buildingPhase=false;
  if(!options.buildings){
    // Planted interiors stay inside the actual U/L footprints, not over roads.
    box('turf',48,.24,49,25,.16,24);box('turf',-48,.24,72,54,.16,10);
    box('paving',48,.34,49,3,.08,24);
    for(const x of [39,57])for(const z of [44,54]){
      box('soil',x,.42,z,4,.22,4);box('turf',x,.82,z,3.8,.6,3.8);
    }
    for(const x of [-78,78])for(const z of [-74,74]){
      box('turf',x,.25,z,8,.17,104);
      box('turf',x*.61,.25,z<0?-76:126,48,.17,7);
    }
  }
  // Two perimeter blocks and a connected street network, dimensions in metres.
  if(options.ground!==false)box('asphalt',0,-.15,0,12000,.25,12000);
  else{box('asphalt',0,-.15,0,25,.25,300);box('asphalt',0,-.15,0,174,.25,25);}
  for(const x of [-48,48])for(const z of [-73,73]){
    // A planted parcel with perimeter footways, not one enormous concrete
    // rectangle beneath every pair of buildings.
    box('turf',x,.02,z,71,.12,119);
    for(const side of [-1,1])box('paving',x+side*33.5,.1,z,5,.18,120);
    for(const side of [-1,1])box('paving',x,.1,z+side*57.5,62,.18,5);
    for(const side of [-1,1])box('sill',x+side*36,.15,z,.22,.25,120);
    for(const side of [-1,1])box('sill',x,.15,z+side*60,72,.25,.22);
  }
  const aprons:T.BufferGeometry[]=[];
  for(const b of buildings)if(!b.base){
    const shape=new T.Shape(b.plan.map(([x,z])=>new T.Vector2(x*1.07,-z*1.07)));
    aprons.push(new T.ShapeGeometry(shape).rotateX(-Math.PI/2).translate(b.x,.13,b.z));
    // Front door connects to the nearest street-side pavement.
    const edge=b.x<0?-14:14;
    box('paving',(b.x+edge)/2,.15,b.z,Math.abs(b.x-edge),.08,3);
  }
  if(aprons.length){
    dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
    add('parcel-aprons',()=>{
      let first=0;
      const parts=aprons.map(g=>{g.computeBoundingBox();const count=g.index!.count,p={first,count,min:g.boundingBox!.min.toArray(),max:g.boundingBox!.max.toArray()};first+=count;return p;});
      const merged=mergeGeometries(aprons)!;merged.userData.apronParts=parts;
      aprons.forEach(g=>g.dispose());return merged;
    },'paving',dummy.matrix);
  }
  for(let k=-26;k<=26;k++){
    box('marking',-1,.008,k*8,.12,.018,3.5);box('marking',1,.008,k*8,.12,.018,3.5);
    if(Math.abs(k*8)>18&&Math.abs(k*8)<82)box('marking',k*8,.008,0,3.5,.018,.13);
  }
  for(const sign of [-1,1])for(let k=-4;k<=4;k++){
    box('marking',sign*18,.016,k*2,4,.02,1);
    box('marking',k*2,.016,sign*18,1,.02,4);
  }
  const streetTrees:Point[]=[];
  if(options.infill&&!options.buildings)for(const sign of [-1,1]){
    const x=sign*46,z=-sign*146;
    box('paving',x,.10,z,48,.18,27);
    box('paving',sign*14.5,.10,-sign*141,5,.18,22);
    box('soil',x-sign*7,.23,z-sign*6,18,.20,5);
    box('turf',x-sign*7,.35,z-sign*6,17.5,.05,4.5);
    box('bark',x-sign*7,.61,z-sign*10,3,.15,.5);
    streetTrees.push([x-sign*7,z-sign*6]);
  }
  for(const x of options.city==='almaty'?[-82,-15,15,82]:[-15,15])for(let z=-126;z<134;z+=14)if(Math.abs(z)>=20)streetTrees.push([x,z]);
  if(!options.buildings){
    // Pocket garden in the unbuilt southwest parcel, behind the office.
    for(const x of [-64,-37])for(const z of [-118,-92])streetTrees.push([x,z]);
    box('paving',-50,.15,-105,48,.08,3);
    for(const x of [-65,-37])box('bark',x,.7,-102,3,.15,.6);
  }
  for(const [x,z] of streetTrees){
    box('soil',x,.17,z,2.8,.12,3.8);box('bark',x,3,z,.24,5.8,.25);
    dummy.position.set(x,.24,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(15,15,1);dummy.updateMatrix();
    add('canopy-shade',()=>new T.PlaneGeometry(1,1),'canopyShade',dummy.matrix);
    // Small leaf clusters produce a broken silhouette without polyhedral balls.
    for(let leaf=0;leaf<26;leaf++){
      const theta=rnd()*Math.PI*2,r=Math.sqrt(rnd())*3.5;
      dummy.position.set(x+Math.cos(theta)*r,5.2+rnd()*3.4,z+Math.sin(theta)*r);dummy.rotation.set(rnd(),rnd()*6,rnd());dummy.scale.set(1.2+rnd()*.6,.9+rnd()*.65,1.1+rnd()*.5);dummy.updateMatrix();
      add('leaf-cluster',()=>{
        const cards=[new T.PlaneGeometry(2.8,2.8),new T.PlaneGeometry(2.8,2.8).rotateY(Math.PI/2),new T.PlaneGeometry(2.8,2.8).rotateX(Math.PI/2)];
        const g=mergeGeometries(cards)!;cards.forEach(c=>c.dispose());return g;
      },'leaf',dummy.matrix,new T.Color().setHSL(.22,.09,.7+rnd()*.25).getHex());
    }
    box('frame',x>0?x+2:x-2,3.7,z+5,.09,7.4,.09);
    box('frame',x>0?x+1.25:x-1.25,7.35,z+5,1.6,.10,.28);
  }
  for(let i=0;i<26;i++){
    const side=i%2===0?1:-1,x=side*(i%3===0?8.8:5.6),z=-130+i*10.5;
    if(Math.abs(z)<23)continue;
    const color=[0xdddcd7,0x596267,0x8f9290,0x30393c,0x81776e][i%5];
    box('car',x,.73,z,1.85,.72,4.45,0,color);box('glass',x,1.3,z-.1,1.59,.65,2.15);
    box('car',x,1.65,z-.1,1.57,.08,1.9,0,color);
    for(const dx of [-.94,.94])for(const dz of [-1.37,1.37])box('rubber',x+dx,.43,z+dz,.15,.6,.65);
  }
  // Paving joints and benches are near-only; structural facades never pop out.
  for(const x of [-12.8,12.8])for(let z=-130;z<140;z+=2)if(Math.abs(z)>15)box('reveal',x,.153,z,2,.008,.018,0,0xffffff,true);
  for(const x of [-20,20])for(const z of [-80,-30,35,86]){
    box('bark',x,.62,z,2.1,.13,.48);box('frame',x-.75,.35,z,.08,.55,.42);box('frame',x+.75,.35,z,.08,.55,.42);
  }
  const details=new T.Group();scenery.add(details);
  let instanceCount=0;
  for(const batch of batches.values()){
    const mesh=new T.InstancedMesh(batch.geometry,mat[batch.material],batch.transforms.length);
    if(batch.building)mesh.userData.buildingOwners=batch.owners;
    batch.transforms.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,batch.colors[i]);});
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.castShadow=!['glass','marking','asphalt','paving','reveal','canopyShade'].includes(batch.material);mesh.receiveShadow=true;
    mesh.name=batch.material;mesh.computeBoundingSphere();(batch.detail?details:batch.building?architecture:scenery).add(mesh);instanceCount+=batch.transforms.length;
  }
  let disposed=false;
  return {group,architecture,scenery,buildings,materials:mat,buildingCount:buildings.filter(b=>!b.base).length,instanceCount,update(camera:T.Camera){details.visible=camera.position.y-group.position.y<105;},dispose(){
    if(disposed)return;disposed=true;
    group.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});
    geometries.forEach(g=>g.dispose());Object.values(mat).forEach(m=>m.dispose());
    [brick.map,brick.bump,stone.map,stone.bump,foliage,shade].forEach(t=>t.dispose());
    releaseSurfaces();
  }};
}
