import {CityBatch} from './batch';

/** Clear the built portal and let the side promenades join its central opening. */
export function nurzholPathSegments(from:number,to:number,archZ?:number):[number,number][]{
  if(archZ===undefined)return [[from,to]];
  return [[from,Math.min(to,archZ+78)],[Math.max(from,archZ+152),to]].filter(([a,b])=>b>a) as [number,number][];
}

export function archGardenClearance(x:number,z:number,archZ:number){
  const dz=z-archZ+20,r=Math.hypot(x,dz);
  return r<168|| (Math.abs(x)<335&&Math.abs(dz)<18)||
    (Math.abs(x)<91&&z>archZ+60&&z<archZ+173);
}

/** Photo-led garden rhythm; approximate planting, not surveyed landscaping. */
export function buildNurzholGarden(batch:CityBatch,start:number,from:number,to:number,baiterekZ:number,archZ?:number){
  if(archZ!==undefined){
    for(const z of [archZ+72,archZ+158])batch.box('paving',0,.21,z,104,.12,12);
    // A dry, unobstructed route through the 46 m opening.
    batch.box('paving',0,.21,archZ+115,42,.12,74);
  }
  for(let z=from+100;z<to-65;z+=90){
    const crossing=((start-125-z)%300+300)%300;
    if(crossing<40||crossing>260||Math.abs(z-baiterekZ)<180)continue;
    if(archZ!==undefined&&z>archZ-170&&z<archZ+220)continue;
    for(const sign of [-1,1]){
      // Beds stay between the inner walk and the seven-metre side promenade.
      const x=sign*34;
      batch.box('stone',x,.22,z,11,.20,42);
      batch.box('grass',x,.36,z,10.4,.14,41.4);
      for(const offset of [-2.8,2.8]){
        batch.box('flowers',x+offset,.49,z,2.2,.12,36);
        for(const dz of [-12,0,12])batch.box('grass',x+offset,.57,z+dz,2.3,.18,1.2);
      }
    }
  }
}
