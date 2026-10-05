import {ishimReservations} from './ishimRiver';
import {nurzholCrossStreets} from './nurzholCrossStreets';
import {nurzholLayout} from './routeLayout';

/** Shared boundaries for close districts and the outer-city parcel planner.
 * These are composed presentation districts, not surveyed city blocks. */
export type CityRect={left:number;right:number;front:number;back:number};
export function arrivalDistricts(city:'astana'|'almaty',end:number){
  const side=city==='almaty'?330:345;
  return [{x:-side,z:end-295},{x:side,z:end-295},{x:-125,z:end-510},{x:125,z:end-510}];
}
export function khanDistricts(khan:number){return [{x:-240,z:khan+35},{x:240,z:khan+35},{x:0,z:khan+280}];}
export function cityReservations(city:'astana'|'almaty',start:number,end:number,route=false):CityRect[]{
  if(!route)return [{left:-490,right:490,front:end-350,back:start+220}];
  return [
    {left:-435,right:435,front:end-155,back:start+220},
    // Palace / passenger campus: never place a street or a parcel over it.
    {left:-235,right:235,front:end-345,back:end+80},
    ...arrivalDistricts(city,end).map(p=>({left:p.x-90,right:p.x+90,front:p.z-155,back:p.z+155})),
    {left:-455,right:455,front:end-367,back:end-332},
    ...(city==='astana'?[
      ...nurzholCrossStreets(nurzholLayout(start,end).baiterek,end-160).map(s=>({left:-s.halfLength,right:s.halfLength,front:s.z-s.clearance-10,back:s.z+s.clearance+10})),
      ...ishimReservations(end-160),
      // Reserve curved government wings outside the existing detailed core too.
      ...[-1,1].flatMap(side=>Array.from({length:10},(_,i)=>{
        const x=112+i*40,a=side*x,b=side*(x+40),z=end+270-.001*(x-112)**2;
        return {left:Math.min(a,b),right:Math.max(a,b),front:z-47,back:z+19};
      })),
      {left:-155,right:155,front:start-30,back:start+310},
      ...khanDistricts(start+150).map(p=>({left:p.x-90,right:p.x+90,front:p.z-155,back:p.z+155})),
    ]:[]),
  ];
}
export function overlapsCityRect(a:CityRect,b:CityRect){return a.left<b.right&&a.right>b.left&&a.front<b.back&&a.back>b.front;}
/** Rectangle difference also cuts streets, so geometry and zoning cannot drift. */
export function subtractCityRect(a:CityRect,b:CityRect):CityRect[]{
  if(!overlapsCityRect(a,b))return [a];
  const left=Math.max(a.left,b.left),right=Math.min(a.right,b.right),front=Math.max(a.front,b.front),back=Math.min(a.back,b.back);
  return [{...a,right:left},{...a,left:right},{left,right,front:a.front,back:front},{left,right,front:back,back:a.back}].filter(r=>r.right>r.left&&r.back>r.front);
}
