import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createAtmosphere } from './atmosphere';
import { createAstanaCity, type CityQuality } from './astana/architecturalCity';
import { loadAircraftModel } from './loadModel';
import { createVertiport, type Aircraft } from './drones';

export type SceneView='overview'|'flight'|'baiterek'|'khan'|'drone'|'sky';
export type SceneStats={fps:number;calls:number;triangles:number;geometries:number;textures:number;quality:CityQuality;buildings:number;model:string};
type Options={embedded?:boolean;onStats?:(s:SceneStats)=>void;onReady?:()=>void;onError?:(message:string)=>void};

/** Shared engine: same city, atmosphere and model in the lab and local homepage. */
export function createSceneEngine(mount:HTMLElement,options:Options={}) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  const mobile=mount.clientWidth<760;
  let quality:CityQuality=mobile?'medium':'high';
  const ratio=()=>Math.min(window.devicePixelRatio,quality==='ultra'?1.8:quality==='high'?1.4:quality==='medium'?1.1:.8);
  renderer.setPixelRatio(ratio());renderer.setSize(mount.clientWidth,mount.clientHeight);
  renderer.domElement.setAttribute('aria-label','Трёхмерный вид Астаны и авторской модели дрона');
  mount.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0xc3cbd0,.00038);
  const camera=new THREE.PerspectiveCamera(47,mount.clientWidth/mount.clientHeight,2,22000);
  const atmosphere=createAtmosphere(renderer);scene.add(atmosphere.sky);scene.environment=atmosphere.environment;
  scene.environmentIntensity=.8;
  const hemi=new THREE.HemisphereLight(0xc7dcf0,0x908677,1.05);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffeed6,3.0);sun.position.set(-520,700,-700);sun.target.position.set(0,-200,-1250);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-780;sun.shadow.camera.right=780;sun.shadow.camera.top=1050;sun.shadow.camera.bottom=-1050;sun.shadow.camera.near=10;sun.shadow.camera.far=2200;sun.shadow.bias=-.00025;sun.shadow.normalBias=.7;
  const rim=new THREE.DirectionalLight(0xdbe9f7,1.1);rim.position.set(70,35,50);scene.add(rim);
  const city=createAstanaCity({zFrom:-350,zTo:-2150,roofLevel:-62,quality});scene.add(city.group);
  const pad=createVertiport();pad.group.position.set(0,-40,-2440);scene.add(pad.group);pad.group.visible=false;
  const drone=new THREE.Group();scene.add(drone);
  let aircraft:Aircraft|null=null;
  let modelGeneration=0,modelLabel='Загрузка модели';
  let disposed=false,frame=0,last=performance.now(),time=0;
  let view:SceneView=options.embedded?'flight':'overview';
  let flight=.34,playing=false,automatic=true;
  let elapsed=0,frames=0,slowWindows=0;
  let lift=1.4;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.495;controls.minDistance=18;controls.maxDistance=1800;controls.enablePan=true;
  const pointer=new THREE.Vector2(),aim=new THREE.Vector2();
  const onPointer=(e:PointerEvent)=>{pointer.set(e.clientX/window.innerWidth*2-1,e.clientY/window.innerHeight*2-1);};
  window.addEventListener('pointermove',onPointer,{passive:true});
  const setQuality=(value:CityQuality,auto=false)=>{
    quality=value;automatic=auto;city.setQuality(value);renderer.setPixelRatio(ratio());
    renderer.shadowMap.enabled=value!=='low';renderer.shadowMap.needsUpdate=true;
    slowWindows=0;
  };
  const setView=(value:SceneView)=>{
    view=value;controls.enabled=!options.embedded && !['flight','sky'].includes(value);
    city.group.visible=!['drone','sky'].includes(value);
    pad.group.visible=false;drone.visible=!['baiterek','khan','sky'].includes(value);
    camera.fov=value==='overview'?49:47;
    if(value==='overview'){camera.position.set(490,155,-470);controls.target.set(0,-165,-1180);drone.position.set(0,-25,-1060);controls.minDistance=140;}
    if(value==='baiterek'){camera.position.set(110,-125,-850);controls.target.set(0,-190,-1100);controls.minDistance=60;}
    if(value==='khan'){camera.position.set(165,-75,-1770);controls.target.set(7,-202,-2000);controls.minDistance=90;}
    if(value==='drone'){camera.position.set(22,13,34);controls.target.set(0,0,0);drone.position.set(0,0,0);controls.minDistance=20;}
    if(value==='sky'){camera.position.set(0,0,0);controls.target.set(-15,40,-100);camera.lookAt(controls.target);}
    if(camera.aspect<.8 && value==='drone')camera.position.multiplyScalar(1.5);
    camera.updateProjectionMatrix();controls.update();renderer.shadowMap.needsUpdate=true;
  };
  const loadModel=async(high:boolean,refined=true)=>{
    const generation=++modelGeneration;modelLabel='Загрузка модели';
    const next=await loadAircraftModel(high?'/models/drone-hq.glb':'/models/drone.glb',{targetSize:17,refined});
    if(disposed||generation!==modelGeneration){next?.dispose();return;}
    if(!next){modelLabel='Модель не загрузилась';options.onError?.('Не удалось загрузить файл дрона. Город доступен; обновите страницу для повторной загрузки.');return;}
    if(aircraft){drone.remove(aircraft.group);aircraft.dispose();}
    aircraft=next;drone.add(next.group);
    // Static city shadow map: drone's changing transform must not leave a ghost.
    next.group.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=false;});
    lift=Math.max(.2,-new THREE.Box3().setFromObject(next.group).min.y)+.15;
    modelLabel=(high?'2048 px':'Веб-версия')+(refined?' · мягкий материал':' · исходный материал');
    options.onReady?.();
  };
  const setNight=(value:boolean)=>{
    const n=value?1:0;atmosphere.setNight(n,scene);city.setNight(n);
    scene.fog=new THREE.FogExp2(value?0x3c3f54:0xc3cbd0,value?.0005:.00038);
    hemi.intensity=value?.45:1.05;sun.intensity=value?.65:3;sun.color.setHex(value?0xffb576:0xffeed6);
    sun.position.y=value?80:700;scene.environmentIntensity=value?.6:.8;rim.intensity=value?1.8:1.1;
    renderer.toneMappingExposure=value?1.15:1.05;renderer.shadowMap.needsUpdate=true;
  };
  setView(view);void loadModel(!mobile && !options.embedded);
  const resize=new ResizeObserver(()=>{
    const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
  });resize.observe(mount);
  const endTarget=new THREE.Vector3();
  const draw=(now:number)=>{
    if(disposed)return;
    const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;
    aim.lerp(pointer,1-Math.exp(-dt*4));
    if(view==='flight') {
      if(options.embedded){const max=document.documentElement.scrollHeight-window.innerHeight;const target=max>0?window.scrollY/max:0;flight+=(target-flight)*(1-Math.exp(-dt*5));}
      else if(playing&&!reduced.matches)flight=(flight+dt*.025)%1;
      const z=40-flight*2600;
      let landing=options.embedded?0:THREE.MathUtils.smoothstep(flight,.9,1);
      if(options.embedded){const stage=document.querySelector('[data-landing-stage]');if(stage)landing=THREE.MathUtils.smoothstep((window.innerHeight-stage.getBoundingClientRect().top)/window.innerHeight,0,1);}
      const alive=1-landing;
      const wobble=reduced.matches?0:Math.sin(time*.45)*.9;
      drone.position.set(wobble*alive,THREE.MathUtils.lerp(0,-40+lift,landing),THREE.MathUtils.lerp(z-46,-2440,landing));
      drone.rotation.set((-.055+aim.y*.08)*alive,aim.x*-.12*alive,(-aim.x*.05+wobble*.012)*alive);
      const portrait=camera.aspect<1;
      camera.position.copy(drone.position).add(new THREE.Vector3(24,portrait?29:19,portrait?78:49));
      endTarget.copy(drone.position).add(new THREE.Vector3(portrait?-5:-17,portrait?8:-4,-12));
      camera.lookAt(endTarget);
      pad.group.visible=landing>.001;
    } else {
      if(view==='drone'){drone.rotation.set(-.025,0,0);}
      controls.update();
    }
    rim.position.copy(camera.position).add(new THREE.Vector3(20,30,0));rim.target.position.copy(drone.position);
    if(!rim.target.parent)scene.add(rim.target);
    atmosphere.update(reduced.matches?0:time,camera);
    if(city.group.visible)city.update(time,camera);
    pad.update(time);aircraft?.update(time);
    renderer.render(scene,camera);
    frames++;elapsed+=dt;
    if(elapsed>=1) {
      // Wall-clock FPS, not a clamped-delta estimate.
      const span=(now-windowStart)/1000;
      const fps=Math.round(frames/Math.max(span,.01));
      options.onStats?.({fps,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,quality,buildings:city.stats.buildings,model:modelLabel});
      if(automatic && fps<26 && ++slowWindows>=3){const order:CityQuality[]=['ultra','high','medium','low'];setQuality(order[Math.min(order.indexOf(quality)+1,3)],true);}
      else if(fps>=26)slowWindows=0;
      frames=0;elapsed=0;windowStart=now;
    }
    frame=requestAnimationFrame(draw);
  };
  let windowStart=performance.now();
  const visibility=()=>{cancelAnimationFrame(frame);if(!document.hidden){last=performance.now();windowStart=last;frames=0;elapsed=0;frame=requestAnimationFrame(draw);}};
  document.addEventListener('visibilitychange',visibility);
  frame=requestAnimationFrame(draw);
  return {
    setView,setNight,setQuality,loadModel,
    setClouds(value:number){atmosphere.setClouds(value);},
    setFlight(value:number){flight=value;},
    setPlaying(value:boolean){playing=value;},
    resetView(){setView(view);},
    dispose(){disposed=true;++modelGeneration;cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('pointermove',onPointer);document.removeEventListener('visibilitychange',visibility);controls.dispose();aircraft?.dispose();pad.dispose();city.dispose();atmosphere.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();},
  };
}
