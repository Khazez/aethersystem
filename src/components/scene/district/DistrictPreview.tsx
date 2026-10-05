'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {HDRLoader} from 'three/examples/jsm/loaders/HDRLoader.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/examples/jsm/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {createReferenceDistrict} from './model';
import './district.css';

type View='aerial'|'street'|'facade';
type Viewer={view:(view:View)=>void;ao:(enabled:boolean)=>void};
const views:{id:View;label:string}[]=[{id:'aerial',label:'С высоты полёта'},{id:'street',label:'С улицы'},{id:'facade',label:'Фасад вблизи'}];
export default function DistrictPreview(){
  const host=useRef<HTMLDivElement>(null),api=useRef<Viewer|null>(null);
  const [view,setView]=useState<View>('street'),[ao,setAo]=useState(true),[stats,setStats]=useState('Подготовка материалов…'),[error,setError]=useState('');
  useEffect(()=>{
    const mount=host.current;if(!mount)return;
    let renderer:T.WebGLRenderer;
    try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{queueMicrotask(()=>setError('3D недоступно. Включите аппаратное ускорение браузера.'));return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.info.autoReset=false;
    renderer.domElement.setAttribute('aria-label','Проверочный квартал: вращение перетаскиванием, приближение колёсиком.');mount.appendChild(renderer.domElement);
    const scene=new T.Scene();scene.background=new T.Color(0xbbcbd1);scene.fog=new T.FogExp2(0xbac8cc,.0009);scene.environmentIntensity=.55;
    const camera=new T.PerspectiveCamera(48,1,.4,1800),controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=470;controls.maxPolarAngle=Math.PI*.495;controls.target.set(0,15,0);
    const district=createReferenceDistrict();scene.add(district.group);
    const sun=new T.DirectionalLight(0xffedd3,3.1);sun.position.set(-110,185,100);sun.target.position.set(0,15,5);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-155,right:155,top:170,bottom:-170,near:10,far:450});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.045;sun.shadow.bias=-.00006;
    scene.add(sun,sun.target,new T.HemisphereLight(0xd6e5ed,0x6a675c,.65));renderer.shadowMap.needsUpdate=true;
    const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera),aoPass=new GTAOPass(scene,camera,640,360),outputPass=new OutputPass();
    aoPass.blendIntensity=.62;aoPass.updateGtaoMaterial({radius:1.5,thickness:1,distanceExponent:1.5});
    composer.addPass(renderPass);composer.addPass(aoPass);composer.addPass(outputPass);
    let alive=true,frame=0,hdr:T.DataTexture|undefined,env:T.WebGLRenderTarget|undefined,reflection:T.WebGLRenderTarget|undefined;
    const pmrem=new T.PMREMGenerator(renderer),cubeTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType}),cubeCamera=new T.CubeCamera(.6,1200,cubeTarget);
    new HDRLoader().load('/textures/sky/sky.hdr',texture=>{
      if(!alive){texture.dispose();return;}hdr=texture;hdr.mapping=T.EquirectangularReflectionMapping;env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.background=hdr;
      scene.backgroundIntensity=.82;scene.backgroundBlurriness=.03;
      // One local reflection capture: neighboring architecture in the windows,
      // not six extra scene renders on every animation frame.
      cubeCamera.position.set(0,25,0);cubeCamera.update(renderer,scene);reflection=pmrem.fromCubemap(cubeTarget.texture);
      district.group.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshPhysicalMaterial){o.material.envMap=reflection!.texture;o.material.needsUpdate=true;}});
    },undefined,()=>{if(alive)setError('Панорама не загрузилась; показано резервное дневное освещение.');});
    const setView=(next:View)=>{
      if(next==='aerial'){camera.position.set(148,117,178);controls.target.set(0,22,5);camera.fov=46;}
      if(next==='street'){camera.position.set(-3,7.2,106);controls.target.set(-12,23,-29);camera.fov=53;}
      if(next==='facade'){camera.position.set(-3,13,24);controls.target.set(-42,16,20);camera.fov=45;}
      camera.updateProjectionMatrix();controls.update();
    };
    api.current={view:setView,ao(enabled){aoPass.enabled=enabled;}};setView('street');
    const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();composer.setSize(w,h);aoPass.setSize(Math.max(1,Math.floor(w*.65)),Math.max(1,Math.floor(h*.65)));};
    const observer=new ResizeObserver(resize);observer.observe(mount);resize();
    let sampled=performance.now(),frames=0;
    const draw=()=>{
      if(!alive)return;
      if(!document.hidden){controls.update();district.update(camera);renderer.info.reset();composer.render();frames++;
        const now=performance.now();if(now-sampled>=1500){
          setStats(`${Math.round(frames*1000/(now-sampled))} FPS · ${renderer.info.render.calls} вызовов · ${Math.round(renderer.info.render.triangles/1000)} тыс. треугольников · 7 зданий`);frames=0;sampled=now;
        }
      }else{sampled=performance.now();frames=0;}
      frame=requestAnimationFrame(draw);
    };draw();
    return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();api.current=null;controls.dispose();district.dispose();aoPass.dispose();outputPass.dispose();composer.dispose();sun.shadow.map?.dispose();reflection?.dispose();cubeTarget.dispose();env?.dispose();hdr?.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <main className="district-preview">
    <div className="district-canvas" ref={host}/>
    <header className="district-header"><Link href="/ru">AETHER <span>Локальный сайт ↗</span></Link><p>Проверка архитектуры / 01</p></header>
    <section className="district-caption"><p>ЭТАЛОННЫЙ КВАРТАЛ</p><h1>Глубина.<br/>Материал. Масштаб.</h1><p>Семь зданий · реальные проёмы · модульные фасады.<br/>Проверка качества перед переносом в Астану и Алматы.</p></section>
    {error&&<p role="alert" className="district-error">{error}</p>}
    <footer className="district-controls"><nav aria-label="Ракурс квартала">{views.map(v=><button key={v.id} aria-pressed={view===v.id} onClick={()=>{setView(v.id);api.current?.view(v.id);}}>{v.label}</button>)}<button aria-pressed={ao} onClick={()=>{setAo(!ao);api.current?.ao(!ao);}}>Контактные тени {ao?'вкл.':'выкл.'}</button></nav><p>{stats}</p><span>Перетаскивайте для обзора · колесо — приближение. Это проверочный квартал, не весь город.</span></footer>
  </main>;
}
