'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, RotateCcw, Play, Pause, Sun, Moon, Settings2 } from 'lucide-react';
import { createSceneEngine, type SceneView, type SceneStats } from './sceneEngine';
import type { CityQuality } from './astana/architecturalCity';
import './preview.css';

const views:{id:SceneView;label:string}[]=[{id:'overview',label:'Город'},{id:'flight',label:'Полёт'},{id:'baiterek',label:'Байтерек'},{id:'khan',label:'Хан Шатыр'},{id:'drone',label:'Ваш дрон'},{id:'sky',label:'Небо'}];

export default function CityPreview(){
  const mount=useRef<HTMLDivElement>(null);
  const engine=useRef<ReturnType<typeof createSceneEngine>|null>(null);
  const [view,setView]=useState<SceneView>('overview');
  const [night,setNight]=useState(false);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [stats,setStats]=useState<SceneStats|null>(null);
  const [settings,setSettings]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [model,setModel]=useState('high');
  const [quality,setQuality]=useState('auto');
  useEffect(()=>{
    if(!mount.current)return;
    try{engine.current=createSceneEngine(mount.current,{onStats:setStats,onReady:()=>setReady(true),onError:setError});}
    catch{queueMicrotask(()=>setError('Браузер не смог запустить трёхмерную сцену. Проверьте, включено ли аппаратное ускорение, и обновите страницу.'));}
    return()=>{engine.current?.dispose();engine.current=null;};
  },[]);
  const switchView=(value:SceneView)=>{setView(value);engine.current?.setView(value);};
  const toggleNight=()=>{setNight(!night);engine.current?.setNight(!night);};
  return <main className="aether-preview">
    <div ref={mount} className="preview-canvas"/>
    <header className="preview-header">
      <Link href="/ru" className="preview-brand">AETHER<span>SYSTEM & CO.</span></Link>
      <p>Локальный предпросмотр <span>· Астана</span></p>
      <Link href="/ru" className="preview-site">На локальной главной <ArrowUpRight size={16}/></Link>
    </header>
    <div className="preview-caption" aria-live="polite">
      <h1>{view==='drone'?'Ваш аппарат.':view==='sky'?'Небо и свет.':view==='baiterek'?'Байтерек.':view==='khan'?'Хан Шатыр.':view==='flight'?'Над Астаной.':'Горизонт Астаны.'}</h1>
      <p>{view==='drone'?'Авторская модель · материалы и освещение':view==='sky'?'Процедурная атмосфера · облачность и солнечный свет':view==='flight'?'Управляйте пролётом ползунком внизу':view==='overview'?'Архитектурная композиция по мотивам города': 'Процедурная архитектурная модель'}</p>
    </div>
    {!ready&&!error&&<p className="preview-loading" role="status">Загружаем вашу модель…</p>}
    {error&&<p className="preview-error" role="alert">{error}</p>}
    <div className="preview-actions">
      <button onClick={toggleNight} aria-label={night?'Включить дневной свет':'Включить вечерний свет'}>{night?<Sun size={18}/>:<Moon size={18}/>}<span>{night?'День':'Вечер'}</span></button>
      <button onClick={()=>engine.current?.resetView()} aria-label="Вернуть исходный ракурс"><RotateCcw size={18}/></button>
      <button onClick={()=>setSettings(!settings)} aria-label="Настройки сцены" aria-expanded={settings}><Settings2 size={18}/></button>
    </div>
    {settings&&<aside className="preview-settings" aria-label="Параметры сцены">
      <label>Качество<select value={quality} onChange={e=>{const q=e.target.value;setQuality(q);engine.current?.setQuality(q==='auto'?'high':q as CityQuality,q==='auto');}}><option value="auto">Автоматически</option><option value="ultra">Ultra</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label>Облачность<input type="range" min="0" max="1" step=".01" defaultValue=".48" onChange={e=>engine.current?.setClouds(Number(e.target.value))}/></label>
      <label>Модель дрона<select value={model} onChange={e=>{setModel(e.target.value);void engine.current?.loadModel(e.target.value==='high',e.target.value!=='original');}}><option value="high">Исходник 2048 px + мягкий материал</option><option value="web">Веб-версия + мягкий материал</option><option value="original">Веб-версия + исходный материал</option></select></label>
      <p>{stats?`${stats.fps} FPS · ${stats.calls} вызовов отрисовки`:'Измеряем производительность…'}<br/>{stats?`${(stats.triangles/1000).toFixed(0)} тыс. треугольников · ${stats.quality}`:''}<br/>{stats?.model}</p>
      <p>Винты объединены с корпусом в исходном файле и пока неподвижны.</p>
    </aside>}
    <footer className="preview-footer">
      {view==='flight'&&<div className="preview-timeline"><button aria-label={playing?'Приостановить полёт':'Запустить полёт'} onClick={()=>{setPlaying(!playing);engine.current?.setPlaying(!playing);}}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><input aria-label="Положение на маршруте" type="range" min="0" max="1" step=".001" defaultValue=".34" onChange={e=>{setPlaying(false);engine.current?.setPlaying(false);engine.current?.setFlight(Number(e.target.value));}}/></div>}
      <nav aria-label="Ракурс сцены">{views.map(v=><button key={v.id} aria-pressed={view===v.id} onClick={()=>switchView(v.id)}>{v.label}</button>)}</nav>
      <p className="preview-hint">{['flight','sky'].includes(view)?'День и вечер — справа':'Перетаскивайте для обзора · колесо — приближение'}<span>{stats?.fps ? `${stats.fps} FPS`:''}</span></p>
    </footer>
  </main>;
}
