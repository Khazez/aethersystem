import {projectNurzhol} from './nurzholReferences';

/** Reference anchors; scene distances are uniformly compressed to the existing
 * route length. Not cadastral footprints or an operational flight corridor. */
export function nurzholLayout(start:number,end:number){
  const akorda=end-160,khan=start+150;
  // Public coordinates: Akorda 51.126481/71.442072,
  // Baiterek 51.12833/71.43056, Khan Shatyr 51.13222/71.40389.
  return {akorda,baiterek:projectNurzhol(71.43056,51.12833,start,end).z,khan};
}

export function dostykLayout(center:number){
  // Hotel and palace are both east of Dostyk; the palace is southeast of the
  // hotel, not across the avenue. Public coordinate delta is ~178 E / 134 S.
  const hotel={x:83,z:center-280};
  return {hotel,palace:{x:hotel.x+178,z:hotel.z-134},abay:hotel.z-134};
}

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function cityRoutePose(progress:number,start:number,end:number){
  const almaty=progress>=.625;
  const t=clamp(almaty?(progress-.66)/.29:(progress-.14)/.425);
  const z=start+550+(end+110-start-550)*t;
  const axis=nurzholLayout(start,end);
  const x=almaty?0:155*Math.exp(-Math.pow((z-axis.khan)/240,2))+115*Math.exp(-Math.pow((z-axis.akorda)/240,2));
  return {x,z,city:almaty?'almaty':'astana'} as const;
}
