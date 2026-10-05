'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {createFleetModel,fleetNames,type FleetKind} from './fleet';
import './fleet-preview.css';

type Viewer={select:(kind:FleetKind,instant?:boolean)=>void;spin:(value:boolean)=>void;reset:()=>void;export:()=>Promise<void>};
const kinds:FleetKind[]=['industrial','cargo','taxi'];
export default function FleetPreview(){
  const mount=useRef<HTMLDivElement>(null),api=useRef<Viewer|null>(null);
  const [kind,setKind]=useState<FleetKind>('industrial'),[spinning,setSpinning]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{
    const host=mount.current;if(!host)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch{queueMicrotask(()=>setError('Не удалось запустить 3D. Включите аппаратное ускорение браузера и обновите страницу.'));return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
    host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Трёхмерная модель аппарата. Перетаскивайте для вращения.');
    const scene=new THREE.Scene();scene.background=new THREE.Color('#e3e6e5');scene.fog=new THREE.Fog('#e3e6e5',28,70);
    const camera=new THREE.PerspectiveCamera(35,1,.05,100);
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.035);scene.environment=env.texture;scene.environmentIntensity=.8;room.dispose();
    const sun=new THREE.DirectionalLight(0xfff8ec,2.0);sun.position.set(-5,9,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.03;sun.shadow.bias=-.0001;sun.shadow.radius=5;sun.shadow.blurSamples=8;scene.add(sun);
    const fill=new THREE.DirectionalLight(0xd7eaff,1.0);fill.position.set(4,3,5);scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xc9cfce,roughness:.85}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.485;controls.minDistance=4;controls.maxDistance=24;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let current=createFleetModel('industrial'),activeKind:FleetKind='industrial',spin=!reduced.matches;
    let requestedKind:FleetKind='industrial',phase:'idle'|'exit'|'enter'='idle',phaseStart=0;
    const restPosition=new THREE.Vector3(),viewRight=new THREE.Vector3();
    queueMicrotask(()=>setSpinning(spin));
    const reset=()=>{camera.position.set(8,5,-10);controls.target.set(0,.35,0);controls.update();};
    const fit=()=>{const box=new THREE.Box3().setFromObject(current.group),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=6/Math.max(size.x,size.z);current.group.scale.setScalar(scale);current.group.position.copy(center).multiplyScalar(-scale);restPosition.copy(current.group.position);floor.position.y=-size.y*scale/2-.20;current.setSpinning(spin);scene.add(current.group);};fit();reset();
    const replace=()=>{scene.remove(current.group);current.dispose();current=createFleetModel(requestedKind);activeKind=requestedKind;fit();setKind(activeKind);};
    api.current={select(next,instant){requestedKind=next;if(reduced.matches||instant){phase='idle';replace();return;}if(phase==='idle'&&next!==activeKind){phase='exit';phaseStart=performance.now();}},spin(value){spin=value;current.setSpinning(value);},reset,async export(){
      const clean=createFleetModel(activeKind);
      try{const result=await new GLTFExporter().parseAsync(clean.group,{binary:true,animations:[clean.clip],onlyVisible:true});const url=URL.createObjectURL(new Blob([result as ArrayBuffer],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download=`aether-${activeKind}.glb`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}finally{clean.dispose();}
    }};
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<h?52:35;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
    let id=0,alive=true;const start=performance.now();
    const draw=()=>{if(!alive)return;if(!document.hidden){const now=performance.now();current.update((now-start)/1000);controls.update();
      if(phase!=='idle'){
        const t=Math.min(1,(now-phaseStart)/(phase==='exit'?500:700)),ease=t*t*(3-2*t);
        viewRight.setFromMatrixColumn(camera.matrixWorld,0);
        current.group.position.copy(restPosition).addScaledVector(viewRight,phase==='exit'?ease*20:-(1-ease)*20);
        current.group.rotation.z=-.12*Math.sin(Math.PI*t);
        if(t===1){if(phase==='exit'){replace();current.group.position.copy(restPosition).addScaledVector(viewRight,-20);phase='enter';phaseStart=performance.now();}else{phase='idle';current.group.rotation.z=0;if(requestedKind!==activeKind){phase='exit';phaseStart=now;}}}
      }
      renderer.render(scene,camera);}id=requestAnimationFrame(draw);};draw();
    return()=>{alive=false;cancelAnimationFrame(id);observer.disconnect();api.current=null;controls.dispose();current.dispose();floor.geometry.dispose();floor.material.dispose();sun.shadow.map?.dispose();env.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  const save=async()=>{setSaving(true);try{await api.current?.export();}catch{setError('Не удалось сохранить модель. Попробуйте ещё раз.');}finally{setSaving(false);}};
  return <main className="fleet-preview">
    <div ref={mount} className="fleet-stage"/>
    <header className="fleet-header"><Link href="/ru">AETHER<span>Локальная версия сайта ↗</span></Link><p>3D-концепции · не серийные аппараты</p></header>
    <section className="fleet-title" aria-live="polite"><h1>{fleetNames[kind]}</h1><p>{kind==='industrial'?'Компактный корпус · оптический и тепловизионный блок':kind==='cargo'?'Грузовой контейнер · соосная силовая установка':'Пассажирская кабина · четыре несущих винта'}</p></section>
    {error&&<p role="alert" className="fleet-error">{error}</p>}
    <footer className="fleet-controls"><nav aria-label="Выбрать аппарат">{kinds.map(k=><button key={k} aria-pressed={k===kind} onClick={e=>api.current?.select(k,e.detail===0)}>{k==='industrial'?'Промышленный':k==='cargo'?'Доставщик':'Аэротакси'}</button>)}</nav><div className="fleet-tools"><button onClick={()=>{setSpinning(!spinning);api.current?.spin(!spinning);}}>{spinning?'Остановить винты':'Запустить винты'}</button><button onClick={()=>api.current?.reset()}>Сбросить ракурс</button><button disabled={saving} onClick={save}>{saving?'Сохранение…':'Скачать GLB'}</button></div><p>Перетаскивайте аппарат для обзора · колесо — масштаб</p></footer>
  </main>;
}
