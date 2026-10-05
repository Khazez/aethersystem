import * as T from 'three';
import {CityBatch} from './batch';
import type {MaterialKey} from './materials';

/** Photo-led proportions, not a surveyed street/lane plan. */
export const KHAN_CROSSING={offset:-145,deck:4.8,deckEnd:58,rampEnd:130,streetEnd:355,width:16,cars:48} as const;
export function khanRoadHeight(x:number){
  const k=KHAN_CROSSING;
  const street=.30-.22*T.MathUtils.clamp((Math.abs(x)-240)/25,0,1);
  return street+(k.deck-street)*T.MathUtils.clamp((k.rampEnd-Math.abs(x))/(k.rampEnd-k.deckEnd),0,1);
}

export function buildKhanCrossing(batch:CityBatch,khan:number){
  const k=KHAN_CROSSING,z=khan+k.offset;
  // Flat lower court is above the existing ground. No hidden tunnel cut into
  // the scene's solid ground slab, and no asphalt at pedestrian level.
  batch.box('paving',0,.28,z,116,.16,108);
  for(const x of [-44,0,44])batch.box('stone',x,.366,z,1,.012,108);
  batch.box('stone',0,k.deck-.6,z,k.deckEnd*2,1,23);
  batch.box('asphalt',0,k.deck-.035,z,k.deckEnd*2,.07,k.width);
  // Three generous openings, with slim piers kept off the centre walkway.
  for(const x of [-57,-20,20,57])for(const dz of [-7.5,7.5]){
    batch.box('stone',x,2.12,z+dz,.85,3.52,1.2);
    batch.box('stone',x,.49,z+dz,1.3,.26,1.6);
  }
  const slope=Math.atan2(k.deck-.30,k.rampEnd-k.deckEnd);
  const strip=(key:MaterialKey,a:number,b:number,dz:number,width:number,lift:number,thickness:number)=>{
    const ya=khanRoadHeight(a),yb=khanRoadHeight(b),g=new T.BoxGeometry(Math.hypot(b-a,yb-ya),thickness,width);
    g.rotateZ(Math.atan2(yb-ya,b-a));g.translate((a+b)/2,(ya+yb)/2+lift-thickness/2,z+dz);batch.geometry(key,g);
  };
  for(const side of [-1,1]){
    const a=side<0?-k.rampEnd:k.deckEnd,b=side<0?-k.deckEnd:k.rampEnd;
    strip('asphalt',a,b,0,k.width,0,.12);
    for(const [a0,b0] of [[130,240],[240,265],[265,k.streetEnd]])strip('asphalt',side<0?-b0:a0,side<0?-a0:b0,0,k.width,0,.12);
    const support=new T.BoxGeometry(b-a,1,23),p=support.getAttribute('position');
    for(let i=0;i<p.count;i++){
      const x=p.getX(i)+(a+b)/2;
      p.setXYZ(i,x,p.getY(i)>0?khanRoadHeight(x)-.14:-.15,p.getZ(i)+z);
    }
    support.computeVertexNormals();batch.geometry('stone',support);
    // Recessed dark bays along the retaining walls, with a light stone frame.
    for(const x of [64,73,82,91])for(const dz of [-11.52,11.52]){
      const h=Math.min(2.6,khanRoadHeight(x)-.65);
      batch.box('pane',side*x,.4+h/2,z+dz,6.4,h,.06);
      batch.box('trim',side*x,.4+h/2,z+dz+Math.sign(dz)*.04,.08,h,.04);
    }
    for(const dz of [-9.7,9.7]){
      strip('paving',a,b,dz,2.8,.18,.25);
      for(const [a0,b0] of [[130,135],[145,240],[240,265],[265,330]])strip('paving',side<0?-b0:a0,side<0?-a0:b0,dz,2.8,.18,.25);
    }
  }
  for(const dz of [-9.7,9.7])batch.box('paving',0,k.deck+.055,z+dz,k.deckEnd*2,.25,2.8);
  // Continuous restrained parapet follows the grade; lamps are on the pavement.
  for(const dz of [-11,11]){
    for(let x=-130;x<=130;x+=6.5)batch.box('trim',x,khanRoadHeight(x)+.78,z+dz,.09,1.2,.09);
    for(const [a,b] of [[-130,-58],[-58,58],[58,130]])for(const lift of [.6,1.38])
      batch.rod('trim',new T.Vector3(a,khanRoadHeight(a)+lift,z+dz),new T.Vector3(b,khanRoadHeight(b)+lift,z+dz),.045,6);
    for(const x of [-248,-124,0,124,248]){
      const y=khanRoadHeight(x)+.18;
      batch.box('trim',x,y+3.75,z+dz,.14,7.5,.14);
      batch.box('trim',x,y+7.5,z+dz-Math.sign(dz),.14,.12,2.2);
      batch.box('white',x,y+7.38,z+dz-Math.sign(dz)*1.8,.55,.08,.9);
    }
  }
  // Two lanes each way, double centre line; no invented third lane.
  for(let x=-350;x<351;x+=8){
    const pitch=Math.abs(x)>k.deckEnd&&Math.abs(x)<k.rampEnd?-Math.sign(x)*slope:0;
    for(const dz of [-4,4,-.16,.16,-7.7,7.7]){
      const paint=new T.BoxGeometry(Math.abs(dz)===4?4:8,.012,.12);
      paint.rotateZ(pitch);paint.translate(x,khanRoadHeight(x)+.016,z+dz);batch.geometry('marking',paint);
    }
  }
}

/** Constant-speed, separated illustrative streams; shares the city's clock. */
export function khanCrossingCarPose(index:number,time:number,khan:number){
  const k=KHAN_CROSSING,lane=Math.floor(index/12),direction=lane<2?1:-1;
  const t=((index%12)/12+lane*.013+time*(10+lane%2*2)/(k.streetEnd*2))%1;
  const x=direction*(t*k.streetEnd*2-k.streetEnd);
  const slope=Math.abs(x)>k.deckEnd&&Math.abs(x)<k.rampEnd?-Math.sign(x)*(k.deck-.30)/(k.rampEnd-k.deckEnd):Math.abs(x)>240&&Math.abs(x)<265?-Math.sign(x)*.22/25:0;
  return {x,y:khanRoadHeight(x)-.09,z:khan+k.offset+[-6,-2,2,6][lane],yaw:direction*Math.PI/2,pitch:-Math.atan(slope*direction)};
}
