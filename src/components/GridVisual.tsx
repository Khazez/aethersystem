'use client';

import {useId,useState} from 'react';
import type {Locale} from '@/i18n';
import './grid-visual.css';

type State='free'|'loaded'|'restricted';
const states:State[]=['free','loaded','restricted'];
const colors={free:'#a9c5be',loaded:'#d7b981',restricted:'#c88c86'};
const copy={
  ru:{demo:'Иллюстрация принципа работы · не текущая воздушная обстановка',route:'Маршрут A → B',detail:{free:'Доступные ячейки формируют коридор полёта.',loaded:'Повышенная загрузка учитывается при выборе маршрута.',restricted:'Маршрут обходит зоны с ограничением доступа.'}},
  en:{demo:'Illustrative example · not current airspace conditions',route:'Route A → B',detail:{free:'Available cells form a flight corridor.',loaded:'Higher traffic is considered when selecting a route.',restricted:'The route avoids restricted-access areas.'}},
  kk:{demo:'Жұмыс қағидасының мысалы · ағымдағы әуе жағдайы емес',route:'A → B бағыты',detail:{free:'Қолжетімді ұяшықтар ұшу дәлізін құрайды.',loaded:'Бағытты таңдауда жоғары жүктеме ескеріледі.',restricted:'Бағыт қолжетімділігі шектеулі аймақтарды айналып өтеді.'}},
};
export default function GridVisual({legendFree,legendLoaded,legendRestricted,locale='ru'}:{legendFree:string;legendLoaded:string;legendRestricted:string;locale?:Locale}){
  const [active,setActive]=useState<State>('free'),id=useId(),c=copy[locale],labels={free:legendFree,loaded:legendLoaded,restricted:legendRestricted};
  const cells=Array.from({length:96},(_,i)=>{const x=i%12,y=Math.floor(i/12);const state:State=x>=5&&x<=7&&y>=2&&y<=4?'restricted':x>=8&&x<=10&&y>=5&&y<=6?'loaded':'free';return {x,y,state};});
  return <div className="airspace-visual">
    <div className="airspace-map">
      <div className="airspace-heading"><span>{c.route}</span><span>12 × 8</span></div>
      <svg viewBox="0 0 464 324" role="img" aria-labelledby={id}>
        <title id={id}>{`${c.route}. ${labels[active]}. ${c.detail[active]}`}</title>
        <g fill="#afb9b4" fillOpacity=".09" stroke="#bdc7c3" strokeOpacity=".09">
          <path d="M38 40h75v52H38z M131 40h94v52h-94z M250 40h72v52h-72z M344 40h83v52h-83z M38 110h110v63H38z M171 111h84v60h-84z M281 112h145v59H281z M38 195h94v87H38z M153 195h139v86H153z M315 196h112v85H315z"/>
        </g>
        {cells.map(({x,y,state})=><rect key={`${x}:${y}`} x={27+x*34} y={24+y*34} width={32} height={32} fill={colors[state]} fillOpacity={state===active?(state==='free'?.10:.36):state==='free'?.025:.1} stroke={colors[state]} strokeOpacity={state===active?.5:.16} strokeWidth=".7"/>)}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M78 245H146V75H384" stroke="#0c171b" strokeWidth="8"/>
          <path d="M78 245H146V75H384" stroke="#bed4ca" strokeWidth="2.5"/>
          <path d="m138 141 8-10 8 10 M286 67l10 8-10 8" stroke="#bed4ca" strokeWidth="2"/>
        </g>
        <g fill="#d5e1d9" stroke="#152128" strokeWidth="2"><circle cx="78" cy="245" r="6"/><circle cx="384" cy="75" r="6"/></g>
        <g fill="#e3e9e2" fontSize="12" fontFamily="inherit"><text x="66" y="270">A</text><text x="394" y="79">B</text></g>
        <g stroke="#c88c86" strokeWidth="1.5" opacity={active==='restricted'?1:.4}><path d="m208 106 78 78m0-78-78 78"/></g>
      </svg>
    </div>
    <div className="airspace-legend" role="group" aria-label={c.route}>{states.map(state=><button key={state} aria-pressed={active===state} onClick={()=>setActive(state)}><span style={{background:colors[state]}} aria-hidden="true"/>{labels[state]}</button>)}</div>
    <p className="airspace-explanation" aria-live="polite">{c.detail[active]}</p>
    <p className="airspace-disclaimer">{c.demo}</p>
  </div>;
}
