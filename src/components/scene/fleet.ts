import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type FleetKind = 'industrial' | 'cargo' | 'taxi';
export const fleetNames:Record<FleetKind,string>={industrial:'Промышленный дрон',cargo:'Грузовой дрон',taxi:'Пассажирское аэротакси'};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);

/** Original visual concepts for the Aether website. Not engineering / flight designs. */
export function createFleetModel(kind:FleetKind) {
  const group=new THREE.Group();group.name=`aether_${kind}`;
  group.userData={description:'Original visualization concept. Reference classes: inspection, cargo delivery, passenger eVTOL. Not a certified aircraft.',units:'illustrative metres'};
  const mats={
    shell:new THREE.MeshPhysicalMaterial({color:kind==='industrial'?0x505653:kind==='cargo'?0x69716e:0xc3c8c4,roughness:.32,metalness:.04,clearcoat:.62,clearcoatRoughness:.26}),
    dark:new THREE.MeshStandardMaterial({color:0x1b2328,roughness:.5,metalness:.42}),
    carbon:new THREE.MeshStandardMaterial({color:0x262a2b,roughness:.48,metalness:.08}),
    rubber:new THREE.MeshStandardMaterial({color:0x101619,roughness:.88,metalness:.04}),
    alloy:new THREE.MeshStandardMaterial({color:0x929fa7,roughness:.25,metalness:.86}),
    glass:new THREE.MeshPhysicalMaterial({color:0x6d8990,roughness:.13,metalness:0,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.05,transmission:kind==='taxi'?.48:0,thickness:.018,ior:1.47,side:THREE.DoubleSide}),
    upholstery:new THREE.MeshStandardMaterial({color:0x303b3f,roughness:.94,metalness:0}),
    lens:new THREE.MeshPhysicalMaterial({color:0x163b42,roughness:.05,metalness:.65,clearcoat:1}),
    accent:new THREE.MeshStandardMaterial({color:0xba8552,roughness:.37,metalness:.6}),
    red:new THREE.MeshStandardMaterial({color:0x9b352b,emissive:0xff3621,emissiveIntensity:.25}),
    green:new THREE.MeshStandardMaterial({color:0x326b4c,emissive:0x4bbb77,emissiveIntensity:.25}),
    light:new THREE.MeshStandardMaterial({color:0xf0ead8,emissive:0xfff4dc,emissiveIntensity:2}),
  };
  // Fine composite weave modulates roughness only: no painted checkerboard
  // or noisy colour decal. Filtering suppresses the pattern at a distance.
  mats.carbon.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 compositePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncompositePosition=position;');
    shader.fragmentShader='varying vec3 compositePosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      vec2 weave=compositePosition.xz*240.0;
      float filtered=1.0-smoothstep(.35,1.2,max(fwidth(weave.x),fwidth(weave.y)));
      roughnessFactor+=sin(weave.x)*sin(weave.y)*.065*filtered;`);
  };
  mats.carbon.customProgramCacheKey=()=> 'aether-composite-roughness-v1';
  const parts:THREE.Mesh[]=[];
  const rotors:THREE.Group[]=[];
  const discs:THREE.Mesh[]=[];
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D=group)=>{const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(parent===group)parts.push(o);return o;};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material=mats.dark,r=.035,parent:THREE.Object3D=group)=>{
    const radius=Math.min(r,w/3,h/3,d/3),s=new THREE.Shape();
    s.moveTo(-w/2+radius,-h/2);s.lineTo(w/2-radius,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+radius);s.lineTo(w/2,h/2-radius);s.quadraticCurveTo(w/2,h/2,w/2-radius,h/2);s.lineTo(-w/2+radius,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-radius);s.lineTo(-w/2,-h/2+radius);s.quadraticCurveTo(-w/2,-h/2,-w/2+radius,-h/2);
    const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.001,d-radius*2),steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:radius*.35,bevelThickness:radius,curveSegments:5});
    g.translate(x,y,z-d/2+radius);return mesh(g,m,parent);
  };
  const cylinder=(x:number,y:number,z:number,r:number,h:number,m:THREE.Material=mats.alloy,parent:THREE.Object3D=group)=>{const o=mesh(new THREE.CylinderGeometry(r,r,h,24),m,parent);o.position.set(x,y,z);return o;};
  const rod=(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material=mats.carbon)=>{const o=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),12),m);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());o.position.copy(a).add(b).multiplyScalar(.5);return o;};
  const spar=(a:THREE.Vector3,b:THREE.Vector3,w:number,h:number,m:THREE.Material=mats.carbon)=>{
    const length=a.distanceTo(b),o=box(0,0,0,w,length,h,m,Math.min(w,h)*.14);
    o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());o.position.copy(a).add(b).multiplyScalar(.5);return o;
  };
  const tube=(points:THREE.Vector3[],r:number,m:THREE.Material=mats.carbon)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),28,r,8,false),m);
  const sphere=(x:number,y:number,z:number,r:number,m:THREE.Material,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,24,16),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;};
  const ring=(x:number,y:number,z:number,r:number,t:number,m:THREE.Material=mats.alloy)=>{const o=mesh(new THREE.TorusGeometry(r,t,6,32),m);o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;};
  const fastener=(x:number,y:number,z:number,size=.018)=>cylinder(x,y,z,size,size*.5,mats.alloy);
  // Smooth swept fuselage, defined by longitudinal station profiles.
  const hull=(stations:number[][],m:THREE.Material,from=0,to=Math.PI*2,openCabin=false)=>{
    // Subdivide the longitudinal profiles to avoid faceted highlights on the shell.
    const source=stations;stations=[];
    const cubic=(a:number,b:number,c:number,d:number,t:number)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    for(let k=0;k<source.length-1;k++)for(let step=0;step<6;step++){
      const t=step/6,a=source[Math.max(0,k-1)],b=source[k],c=source[k+1],d=source[Math.min(source.length-1,k+2)];
      stations.push([b[0]+(c[0]-b[0])*t,Math.max(.005,cubic(a[1],b[1],c[1],d[1],t)),Math.max(.005,cubic(a[2],b[2],c[2],d[2],t)),cubic(a[3],b[3],c[3],d[3],t)]);
    }
    stations.push(source[source.length-1]);
    const pts:number[]=[],uvs:number[]=[],indices:number[]=[];const n=48;
    for(let k=0;k<stations.length;k++){
      const [z,rx,ry,cy]=stations[k];
      for(let j=0;j<=n;j++){const a=from+(to-from)*j/n,ca=Math.cos(a),sa=Math.sin(a),power=kind==='cargo'?1:.72;pts.push(Math.sign(ca)*Math.pow(Math.abs(ca),power)*rx,Math.sign(sa)*Math.pow(Math.abs(sa),power)*ry+cy,z);uvs.push(j/n,k/(stations.length-1));}
    }
    for(let k=0;k<stations.length-1;k++)for(let j=0;j<n;j++){
      const z=(stations[k][0]+stations[k+1][0])/2,angle=from+(to-from)*(j+.5)/n;
      // Actual holes behind the canopy. Painting dark glass on an opaque
      // fuselage prevented any cabin depth, regardless of material quality.
      const windshield=z> -1.88&&z< -.9&&angle<Math.PI;
      const sideWindow=z>=-.9&&z<1.15&&(angle<1.1||(angle>Math.PI-1.1&&angle<Math.PI));
      if(openCabin&&(windshield||sideWindow))continue;
      const a=k*(n+1)+j,b=a+n+1;indices.push(a,a+1,b,a+1,b+1,b);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,m);
  };
  const bladeGeo=(r:number)=>{
    const s=new THREE.Shape();s.moveTo(r*.08,-r*.025);s.bezierCurveTo(r*.32,-r*.10,r*.70,-r*.12,r*.94,-r*.035);s.quadraticCurveTo(r*1.02,r*.0,r*.95,r*.028);s.bezierCurveTo(r*.64,r*.005,r*.28,r*.12,r*.1,r*.05);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:r*.013,bevelEnabled:true,bevelThickness:r*.006,bevelSize:r*.005,bevelSegments:2,curveSegments:12});g.rotateX(-Math.PI/2);return g;
  };
  const rotor=(x:number,y:number,z:number,r:number,dir:number)=>{
    const index=rotors.length;
    cylinder(x,y-.11*r,z,.12*r,.24*r,mats.dark);
    cylinder(x,y-.16*r,z,.126*r,.035*r,mats.alloy);
    for(let j=0;j<12;j++){const a=j/12*Math.PI*2;box(x+Math.cos(a)*r*.115,y-.07*r,z+Math.sin(a)*r*.115,.015*r,.14*r,.03*r,mats.alloy,.002);}
    const hub=new THREE.Group();hub.name=`rotor_${index}_${dir>0?'cw':'ccw'}`;hub.position.set(x,y,z);hub.userData={spin:dir};group.add(hub);rotors.push(hub);
    const blade=bladeGeo(r);mesh(blade,mats.carbon,hub);const second=mesh(blade,mats.carbon,hub);second.rotation.y=Math.PI;
    cylinder(0,.018*r,0,r*.085,r*.065,mats.alloy,hub);
    cylinder(0,.06*r,0,r*.033,r*.018,mats.dark,hub);
    for(const angle of [0,Math.PI]){const tip=box(r*.9,0,0,.1*r,.015*r,.04*r,mats.accent,.003,hub);tip.geometry.rotateY(angle);}
    const disc=mesh(new THREE.RingGeometry(r*.18,r,64),new THREE.MeshBasicMaterial({color:0x768188,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),hub);disc.castShadow=false;disc.receiveShadow=false;disc.rotation.x=-Math.PI/2;disc.position.y=.012;disc.name=`rotor_blur_${index}`;discs.push(disc);
    return hub;
  };
  const lens=(x:number,y:number,z:number,r:number)=>{
    const bezel=cylinder(x,y,z,r,r*.5,mats.alloy);bezel.rotation.x=Math.PI/2;
    const inner=cylinder(x,y,z-.012,r*.82,r*.54,mats.rubber);inner.rotation.x=Math.PI/2;
    const glass=cylinder(x,y,z-r*.3,r*.69,.013,mats.lens);glass.rotation.x=Math.PI/2;
  };
  const gimbal=(x:number,y:number,z:number,size:number)=>{
    cylinder(x,y+.13*size,z,.12*size,.24*size,mats.dark);
    box(x,y,z,.6*size,.38*size,.30*size,mats.dark,.06*size);
    for(const s of [-1,1])box(x+s*.34*size,y+.06*size,z,.07*size,.33*size,.10*size,mats.alloy,.02*size);
    lens(x-.13*size,y,z-.18*size,.14*size);lens(x+.16*size,y+.07*size,z-.18*size,.073*size);lens(x+.16*size,y-.10*size,z-.18*size,.06*size);
  };
  if(kind==='industrial'){
    hull([[-.90,.10,.045,.07],[-.82,.30,.12,.09],[-.55,.40,.17,.10],[0,.43,.18,.10],[.42,.36,.17,.10],[.71,.25,.12,.07],[.79,.08,.03,.05]],mats.shell);
    hull([[-.72,.2,.08,-.02],[-.4,.36,.13,-.04],[.3,.34,.14,-.03],[.69,.15,.09,-.02],[.73,.01,.01,0]],mats.dark);
    box(0,.27,.14,.52,.10,.79,mats.dark,.025);
    // Separate removable battery lid and the gasket line, not a single toy shell.
    box(0,.295,.13,.46,.025,.66,mats.shell,.018);
    box(0,.33,.18,.31,.018,.10,mats.rubber,.01);
    for(let i=0;i<4;i++)box(-.09+i*.06,.344,.18,.025,.009,.035,mats.green,.002);
    for(const s of [-1,1]){box(s*.32,.285,-.30,.10,.025,.38,mats.alloy,.009);for(let j=0;j<4;j++)fastener(s*.33,.307,-.43+j*.09,.013);}
    for(const s of [-1,1]){
      lens(s*.24,.18,-.68,.055);
      box(s*.393,.12,.05,.018,.11,.48,mats.dark,.008);
      for(let i=0;i<9;i++)box(s*.408,.13,-.16+i*.047,.02,.08,.014,mats.rubber,.002);
      for(const front of [-1,1]){
        const end=V(s*(front<0?1.08:1.0),front<0?.1:.22,front*.77);
        const root=V(s*.27,.02,front*.38);
        spar(root,end,.15,.11,mats.shell);rod(root.clone().add(V(0,-.05,.04)),end.clone().add(V(0,-.035,0)),.037,mats.dark);
        const collar=root.clone().lerp(end,.22);
        spar(root.clone().lerp(end,.12),root.clone().lerp(end,.32),.18,.15,mats.dark);
        fastener(collar.x,collar.y+.09,collar.z,.021);
        cylinder(root.x,.075,root.z,.105,.20,mats.dark);ring(root.x,.175,root.z,.075,.012);
        rotor(end.x,end.y+.13,end.z,.60,s*front);
        rod(V(end.x,end.y-.05,end.z),V(end.x*1.035,-.27,end.z+.08*front),.037,mats.dark);box(end.x*1.035,-.29,end.z+.08*front,.11,.035,.17,mats.rubber,.01);
        sphere(end.x,.12,end.z+front*.1,.035,s<0?mats.red:mats.green);
      }
    }
    gimbal(0,-.17,-.74,.65);
    cylinder(0,.46,.52,.09,.12,mats.dark);sphere(0,.54,.52,.1,mats.shell,1,.3,1);
    for(const s of [-1,1])for(const z of [-.45,.44])fastener(s*.28,.30,z,.018);
  }
  if(kind==='cargo'){
    hull([[-.98,.08,.035,.34],[-.84,.39,.15,.37],[-.55,.62,.20,.40],[.4,.61,.20,.41],[.86,.37,.15,.40],[1.0,.06,.025,.39]],mats.shell);
    box(0,.06,0,1.12,.26,1.32,mats.dark,.09);
    for(const s of [-1,1]){
      box(s*.30,.69,.14,.48,.27,1.05,mats.dark,.045);
      box(s*.30,.845,.15,.16,.05,.26,mats.alloy,.025);
      for(let i=0;i<10;i++)box(s*.54,.24,-.42+i*.093,.032,.17,.025,mats.rubber,.004);
      for(const f of [-1,1]){
        const end=V(s*1.72,.35,f*1.40),root=V(s*.46,.25,f*.45);
        rod(root,end,.095);rod(root.clone().add(V(0,-.17,0)),end.clone().add(V(0,-.17,0)),.048,mats.alloy);
        cylinder(end.x,.24,end.z,.145,.50,mats.dark);
        rotor(end.x,.65,end.z,.92,s*f);rotor(end.x,.04,end.z,.92,-s*f);
        cylinder(root.x,.32,root.z,.14,.29,mats.alloy);ring(root.x,.48,root.z,.12,.02,mats.accent);
        rod(V(s*.60,.03,f*.61),V(s*.91,-1.02,f*.74),.055,mats.alloy);
      }
      tube([V(s*.92,-.94,-1.04),V(s*.92,-1.08,-.86),V(s*.92,-1.10,.6),V(s*.92,-1.04,1.01)],.056,mats.dark);
      sphere(s*1.72,.4,-1.51,.055,s<0?mats.red:mats.green);
    }
    box(0,-.61,.04,1.28,.86,1.38,mats.shell,.09);
    // A payload case has a panel system and corner protection, not one smooth
    // generic box: recessed faces, a lid joint and over-centre latch housings.
    for(const f of [-1,1]){
      box(0,-.63,.04+f*.697,1.07,.62,.022,mats.dark,.02);
      box(0,-.63,.04+f*.713,.99,.55,.018,mats.shell,.016);
      for(const x of [-.46,.46])box(x,-.29,.04+f*.72,.10,.19,.06,mats.alloy,.008);
    }
    for(const s of [-1,1]){
      box(s*.647,-.62,.04,.022,.62,1.1,mats.dark,.02);
      box(s*.664,-.62,.04,.018,.54,1.02,mats.shell,.016);
      for(const zz of [-.44,0,.44])box(s*.68,-.63,zz,.035,.53,.042,mats.alloy,.005);
    }
    for(const s of [-1,1])for(const f of [-1,1]){
      box(s*.63,-.63,f*.62,.07,.7,.11,mats.alloy,.012);
      box(s*.63,-.82,f*.45,.07,.17,.09,mats.dark,.01);
    }
    box(0,-.2,.04,1.36,.10,1.44,mats.dark,.035);
    for(const s of [-1,1]){
      box(s*.57,-.62,.04,.04,.76,1.43,mats.dark,.013);
      for(const f of [-1,1])box(s*.57,-.27,f*.62,.13,.13,.06,mats.alloy,.018);
    }
    for(let i=0;i<5;i++)box(-.45+i*.225,-.63,-.66,.045,.55,.027,mats.dark,.01);
    box(0,-.54,-.696,.45,.13,.014,mats.accent,.009);
    gimbal(0,.12,-.93,.62);
    lens(-.32,.48,-.81,.09);lens(.32,.48,-.81,.09);
  }
  if(kind==='taxi'){
    const stations=[[-2.0,.06,.04,.55],[-1.88,.48,.24,.65],[-1.50,.85,.48,.79],[-.9,1.03,.62,.90],[-.30,1.08,.72,.94],[.5,1.03,.75,.96],[1.15,.85,.65,.89],[1.6,.60,.48,.79],[1.85,.06,.04,.65]];
    hull(stations,mats.shell,0,Math.PI*2,true);
    group.userData.cabin={seats:2,openWindowShell:true};
    // Two individual seats, structural floor and instrument binnacle are
    // visible through real glazing; no driver photo or fake interior decal.
    box(0,.41,.05,1.58,.12,2.10,mats.dark,.035);
    for(const s of [-1,1]){
      box(s*.45,.59,.20,.60,.15,.72,mats.upholstery,.075);
      const back=box(s*.45,.99,.53,.58,.77,.14,mats.upholstery,.055);back.rotation.x=-.1;
      box(s*.45,1.41,.53,.31,.20,.13,mats.upholstery,.035);
      box(s*.45,.48,.20,.39,.09,.43,mats.alloy,.02);
      box(s*.77,.80,.19,.07,.07,.45,mats.dark,.018);
      rod(V(s*.43,1.24,.44),V(s*.20,.63,.03),.019,mats.rubber);
    }
    box(0,.78,-.80,1.24,.20,.27,mats.dark,.045);
    box(0,.90,-.76,.43,.014,.19,mats.lens,.016);
    box(0,.69,-.01,.17,.31,.75,mats.dark,.026);
    // Belly inspection panels, a distinct lower fairing and exposed access
    // hardware preserve the original cabin silhouette while giving it scale.
    for(const s of [-1,1]){
      box(s*.62,.27,.25,.33,.065,.82,mats.dark,.035);
      for(const zz of [-.08,.57])fastener(s*.62,.309,zz,.023);
    }
    // Continuous forward canopy with an original wraparound windshield geometry.
    const glassStations=stations.slice(1,4).map(([z,rx,ry,cy])=>[z-.018,rx*1.025,ry*1.03,cy+.012]);
    hull(glassStations,mats.glass,-.12,Math.PI+.12);
    const doorStations=stations.slice(3,7).map(([z,rx,ry,cy])=>[z,rx*1.014,ry*1.014,cy+.007]);
    hull(doorStations,mats.glass,-.06,1.1);hull(doorStations,mats.glass,Math.PI-1.1,Math.PI+.06);
    // A visible brow, centre windshield mullion and side sill provide a cabin
    // structure at city-shot distance, without replacing the existing hull.
    tube(glassStations.map(([z,,ry,cy])=>V(0,cy+ry+.018,z)),.026,mats.shell);
    for(const s of [-1,1]){
      tube(doorStations.map(([z,rx,,cy])=>V(s*rx*1.009,cy-.045,z)),.035,mats.dark);
      tube(doorStations.map(([z,rx,ry,cy])=>V(s*Math.pow(Math.cos(1.1),.72)*rx,cy+Math.pow(Math.sin(1.1),.72)*ry+.012,z)),.032,mats.shell);
    }
    for(const s of [-1,1]){
      tube([V(s*.48,.77,-1.9),V(s*.84,.95,-1.5),V(s*1.02,1.09,-.9)],.025,mats.dark);
      for(const station of [stations[3],stations[6]]){
        const [z,rx,ry,cy]=station;
        const points=Array.from({length:10},(_,i)=>{const a=.21+i/9*1.20;return V(s*Math.pow(Math.cos(a),.72)*rx*1.019,Math.pow(Math.sin(a),.72)*ry+cy+.022,z);});
        tube(points,.033,mats.shell);
      }
      // Separate side door seam, handle, sill, and boarding step.
      tube([V(s*.80,.62,-.85),V(s*.99,.83,-.34),V(s*1.01,.87,.48),V(s*.78,.62,.92)],.013,mats.dark);
      box(s*1.075,1.03,.15,.022,.035,.22,mats.alloy,.013);
      rod(V(s*.72,.31,-.7),V(s*.92,-.53,-.7),.068,mats.alloy);
      rod(V(s*.72,.32,.82),V(s*.92,-.53,.82),.068,mats.alloy);
      tube([V(s*.93,-.48,-1.25),V(s*.94,-.65,-.98),V(s*.94,-.66,.96),V(s*.93,-.51,1.25)],.075,mats.dark);
      box(s*1.0,-.05,-.07,.28,.055,.76,mats.dark,.035);
      for(let j=0;j<5;j++)box(s*1.01,-.019,-.35+j*.14,.26,.015,.03,mats.alloy,.007);
      for(const z of [-1.90,1.90]){
        const root=V(s*.55,.28,z*.32),end=V(s*2.40,.16,z);
        spar(root,end,.19,.14,mats.carbon);rod(root.clone().add(V(0,-.14,0)),end.clone().add(V(0,-.13,0)),.047,mats.alloy);
        spar(root.clone().lerp(end,.07),root.clone().lerp(end,.28),.25,.20,mats.alloy);
        tube([root.clone().add(V(0,-.08,.07)),root.clone().lerp(end,.45).add(V(0,-.12,.08)),end.clone().add(V(0,-.05,.04))],.018,mats.rubber);
        cylinder(end.x,.25,end.z,.16,.34,mats.shell);
        ring(end.x,.38,end.z,.163,.024,mats.accent);
        const spin=z>0?s:-s;rotor(end.x,.58,end.z,1.12,spin);
      }
      sphere(s*2.40,.27,-1.90,.055,s<0?mats.red:mats.green);
      lens(s*.37,.64,-1.50,.085);
    }
    box(0,1.73,.43,.32,.055,.45,mats.dark,.025);
    cylinder(0,1.83,.5,.065,.10,mats.dark);
    hull([[-1.25,.52,.13,.3],[-.5,.9,.22,.29],[.6,.88,.23,.29],[1.25,.4,.14,.3]],mats.dark);
    for(const s of [-1,1])for(let i=0;i<9;i++)box(s*.81,.88,1.08+i*.027,.04,.25,.012,mats.dark,.004);
  }
  // Static parts are merged by material; animated rotors retain individual nodes.
  group.updateMatrixWorld(true);
  const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const freed=new Set<THREE.BufferGeometry>();
  for(const part of parts){const m=part.material as THREE.Material;const array=batches.get(m)??[];const geo=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();array.push(geo.applyMatrix4(part.matrix));batches.set(m,array);group.remove(part);if(!freed.has(part.geometry)){part.geometry.dispose();freed.add(part.geometry);}}
  for(const [m,geos] of batches){const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(merged){const o=new THREE.Mesh(merged,m);o.name=`static_${m.uuid.slice(0,8)}`;o.castShadow=true;o.receiveShadow=true;group.add(o);}}
  const times=[0,.25,.5,.75,1];
  const tracks=rotors.map(r=>{
    const values=times.flatMap(t=>{const q=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),t*Math.PI*2*r.userData.spin);return q.toArray();});
    return new THREE.QuaternionKeyframeTrack(`${r.name}.quaternion`,times,values);
  });
  const clip=new THREE.AnimationClip('Rotor rotation',1,tracks);
  group.animations=[clip];
  let spinning=true,lastTime:number|undefined,speed=1;
  return {
    group,rotors,clip,
    setSpinning(value:boolean){spinning=value;},
    setRotorSpeed(value:number){speed=Math.min(1,Math.max(0,value));},
    update(time:number){const delta=lastTime===undefined?0:Math.min(.05,Math.max(0,time-lastTime));lastTime=time;for(const r of rotors)if(spinning)r.rotation.y+=delta*34*speed*r.userData.spin;for(const d of discs)(d.material as THREE.MeshBasicMaterial).opacity=spinning?.045*speed:0;},
    dispose(){const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>();group.traverse(o=>{if(o instanceof THREE.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());Object.values(mats).forEach(m=>{if(!ms.has(m))m.dispose();});group.clear();},
  };
}
