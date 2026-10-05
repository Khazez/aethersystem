import * as T from 'three';
import {terrainHeight} from '../noise';
import {CityBatch} from './batch';

export const parkPathX=(z:number)=>19+11*Math.sin(z*.004)+4*Math.sin(z*.011);
export const parkWaterX=(z:number)=>-34+9*Math.sin(z*.0031);

/** A composed green corridor, not a claim to reproduce a particular real park. */
export function almatyPark(batch:CityBatch,start:number,end:number){
  batch.box('grass',0,.12,(start+end)/2,162,.18,start-end+320);
  const strip=(key:'water'|'paving'|'stone',axis:(z:number)=>number,width:number,y:number)=>{
    const points:number[]=[],uv:number[]=[];
    for(let z=end-160;z<start+160;z+=8){
      const next=Math.min(z+8,start+160),a=axis(z),b=axis(next);
      points.push(a-width/2,y,z,b-width/2,y,next,b+width/2,y,next,a-width/2,y,z,b+width/2,y,next,a+width/2,y,z);
      uv.push(0,0,0,1,1,1,0,0,1,1,1,0);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(Array.from({length:points.length/3},(_,i)=>i));g.computeVertexNormals();batch.geometry(key,g);
  };
  strip('stone',parkWaterX,5,.24);strip('water',parkWaterX,3.8,.27);strip('paving',parkPathX,6,.25);
  for(let z=end+120;z<start;z+=180){
    // Short footbridges across the aryk and transverse pedestrian connections.
    batch.box('paving',-8,.32,z,78,.2,3.5);
    for(const sign of [-1,1])batch.box('trim',parkWaterX(z),1,z+sign*1.9,7,.09,.08);
    batch.box('stone',parkPathX(z)+6,.55,z+12,.8,.9,3.2);
    batch.box('trim',parkPathX(z)+6,1.04,z+12,1,.12,3.4);
  }
}

/** Connected multiscale ridges. No linearly interpolated peak array: that
 * produced the conspicuous straight-sided pyramids in the city view. */
export function alatauHeight(x:number,depth:number){
  const front=T.MathUtils.smoothstep(depth,1900,3400);
  const noise=(x:number,z:number,seed:number,octaves=4)=>Math.sqrt(terrainHeight(x,z,seed,octaves));
  const warp=(noise(x*.00065,depth*.00065,401)-.5)*1800;
  let height=0;
  for(let chain=0;chain<3;chain++){
    const px=x+warp+chain*1240;
    const crest=4300+chain*1900+Math.sin(px*.00053+chain)*450+(noise(px*.0014,chain*3.7,276)-.5)*1500;
    const away=depth-crest;
    // Broad unequal mountain groups sit behind the smaller rocky crests.
    // Smooth envelopes avoid straight pyramid flanks, while the drainage
    // below shapes the actual surface instead of adding isolated cones.
    const massif=.10+noise(px*.00042,chain*11.3,786,3)*.25
      +1.05*Math.exp(-Math.pow((px+6200)/1250,2))
      +.62*Math.exp(-Math.pow((px+2700)/900,2))
      +.97*Math.exp(-Math.pow((px-950)/1450,2))
      +.74*Math.exp(-Math.pow((px-4700)/1000,2))
      +.90*Math.exp(-Math.pow((px-8100)/1200,2));
    const teeth=1-Math.abs(2*noise(px*.0032,chain*4.9,867,4)-1);
    const profile=380+massif*1950+teeth*520+chain*150;
    const width=(away<0?1650:2400)*(0.75+noise(px*.001,chain,144)*.65);
    const shoulder=Math.exp(-Math.pow(Math.abs(away)/width,1.38));
    // Branching drainage is sheared down the slope, and fades at the crest.
    const drainage=noise((px+away*.43)*.0042,away*.0012,991+chain,5);
    const gullies=Math.pow(1-drainage,2)*1250*T.MathUtils.smoothstep(Math.abs(away),40,620);
    const rockRelief=(noise(px*.015,depth*.012,119+chain,3)-.5)*240;
    height=Math.max(height,(profile-gullies+rockRelief)*shoulder);
  }
  const foothills=90+noise(x*.0012,depth*.001,619)*440;
  const grain=(noise(x*.012,depth*.009,190,3)-.5)*85;
  const edge=1-T.MathUtils.smoothstep(Math.abs(x),9500,11000);
  const back=1-T.MathUtils.smoothstep(depth,10500,12500);
  return Math.max(0,(Math.max(foothills,height)+grain)*front*edge*back);
}

export function kokTobeHeight(x:number,z:number){
  const edge=Math.max(0,1-Math.pow(Math.abs(x)/470,4)-Math.pow(Math.abs(z)/510,4));
  const spine=142*Math.exp(-Math.abs(x+z*.32)/180-Math.abs(z)/490);
  const shoulder=57*Math.exp(-(((x-140)/190)**2)-((z+150)/280)**2);
  const gullies=(terrainHeight(x*.015,z*.014,84,4)-.28)*32;
  return Math.max(0,(spine+shoulder+gullies)*edge);
}
