'use client';
import {useEffect,useState} from 'react';

export default function LabControls(){
  const [info,setInfo]=useState('');
  useEffect(()=>{const id=setInterval(()=>{const scene=document.querySelector<HTMLElement>('[data-flight-backdrop]');setInfo(`${scene?.dataset.city??''} · ${scene?.dataset.progress??'0'}%`);},250);return()=>clearInterval(id);},[]);
  const jump=(p:number)=>window.scrollTo({top:p*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'});
  return <nav aria-label="Проверка полёта" style={{position:'fixed',bottom:16,left:20,right:20,zIndex:100,display:'flex',flexWrap:'wrap',gap:8,color:'#e8eef4',fontSize:13}}>{[['Начало',0],['Первый городской кадр',.17],['Смена: вылет',.255],['Смена: влёт',.305],['Астана',.46],['Золотые башни',.50],['Акорда',.54],['Облачный переход',.615],['Такси в облаках',.76],['Презентация',.855],['Раскрытие терминала',.94],['Снижение',.978],['Посадка',1]].map(([label,p])=><button key={label} onClick={()=>jump(Number(p))} style={{padding:'10px 14px',background:'#12202c',border:'1px solid #6f8b98'}}>{label}</button>)}<output style={{padding:10,background:'#12202c'}}>{info}</output></nav>;
}
