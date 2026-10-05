import type {FleetKind} from './fleet';

export const flightFleetOrder:FleetKind[]=['industrial','cargo','taxi'];
export const fleetBoundaries=[.28,.57];
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};

/** World-space overtaking handoff: the lead climbs away along the avenue,
 * the successor joins from a separated lane. Never slide a model across the lens.
 */
export function fleetFlightPose(index:number,progress:number){
  let x=0,bank=0,forward=0,up=0,yaw=0,visible=true;
  if(index>0){
    const start=fleetBoundaries[index-1]-.012;
    if(progress<start)return {x:-1.2,bank:0,forward:-120,up:-10,yaw:0,visible:false};
    const t=clamp((progress-start)/.067),s=smooth(t);
    x=-1.2*(1-s);forward=-120*(1-s);up=-10*(1-s);bank=.12*Math.sin(Math.PI*t);yaw=-.12*Math.sin(Math.PI*t);
  }
  if(index<flightFleetOrder.length-1){
    const start=fleetBoundaries[index]-.045;
    if(progress>=start+.085)return {x:1.2,bank:0,forward:-650,up:100,yaw:0,visible:false};
    if(progress>start){const t=clamp((progress-start)/.085),s=smooth(t);x=1.2*s;forward=-650*s;up=100*s;bank=-.16*Math.sin(Math.PI*t);yaw=.14*Math.sin(Math.PI*t);}
  }
  visible=Math.abs(x)<1.2;
  return {x,bank,forward,up,yaw,visible};
}

export function landingMotion(progress:number){
  const align=smooth(progress/.58);
  const descend=smooth((progress-.60)/.30);
  const rotorSpeed=1-smooth((progress-.92)/.08);
  return {align,descend,rotorSpeed};
}

/** A continuous three-quarter arrival shot. Keep the full terminal in frame,
 * including its street entrance, before and after the aircraft touches down. */
export function landingCameraPose(progress:number,aircraft?:{x:number;y:number;z:number},aspect=1.77){
  const t=smooth(progress);
  const follow=aircraft?(1-landingMotion(progress).align)*.5:0;
  const dx=(aircraft?.x??0)*follow,dy=(aircraft?.y??0)*follow,dz=(aircraft?.z??0)*follow;
  const distance=(1+Math.hypot(dx,dy,dz)/130)*Math.max(1,Math.sqrt(.9/Math.max(.3,aspect)));
  return {x:(126-24*t)*distance+dx,y:(72-20*t)*distance+dy,z:(184-32*t)*distance+dz,lookX:dx,lookY:5+5*t+dy,lookZ:4-4*t+dz,fov:50-2*t};
}
