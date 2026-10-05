import { CityBatch } from './batch';
import { seededRandom } from './random';

export type Building = { x: number; z: number; width: number; depth: number; floors: number; style: 'office'|'residential'|'stepped'|'commercial'; seed: number };

export function buildBuilding(b: Building, shell: CityBatch, detail: CityBatch) {
  const rnd = seededRandom(b.seed);
  const { x,z,width:w,depth:d,floors,style } = b;
  const fh = 3.6;
  const h = floors*fh;
  const office = style === 'office' || style === 'stepped';
  shell.box('paving',x,.35,z,w+9,.7,d+9);
  shell.box('stone',x,2.4,z,w+3,4.8,d+3);
  shell.box('pane',x,2.8,z+d/2+1.6,w*.8,3.4,.15);
  // All bases start on the same street datum. Setbacks get narrower upward.
  const tiers = style === 'stepped' ? 2 : 1;
  for (let t=0; t<tiers; t++) {
    const tw=w*(1-t*.17), td=d*(1-t*.15), th=(h-5)/tiers, y=5+t*th;
    shell.box(office?'glass':'stone',x,y+th/2,z,tw,th,td);
    shell.box('roof',x,y+th+.2,z,tw+.3,.4,td+.3);
    shell.box('trim',x,y+th-.25,z+td/2,.3+tw,.45,.4);
    shell.box('trim',x,y+th-.25,z-td/2,.3+tw,.45,.4);
    shell.box('trim',x-tw/2,y+th-.25,z,.4,.45,td);
    shell.box('trim',x+tw/2,y+th-.25,z,.4,.45,td);
    const n=Math.floor(th/fh);
    if (office) {
      for(let f=1;f<n;f++) {
        shell.box('trim',x,y+f*fh,z,tw+.5,.22,td+.5);
      }
      for(let i=0; i<=Math.floor(tw/5); i++) {
        const px=x-tw/2+i*tw/Math.floor(tw/5);
        shell.box('trim',px,y+th/2,z+td/2+.2,.22,th,.5);
        shell.box('trim',px,y+th/2,z-td/2-.2,.22,th,.5);
      }
      for(let i=0; i<=Math.floor(td/5); i++) {
        const pz=z-td/2+i*td/Math.floor(td/5);
        shell.box('trim',x+tw/2+.2,y+th/2,pz,.5,th,.28);
        shell.box('trim',x-tw/2-.2,y+th/2,pz,.5,th,.28);
      }
    } else {
      for(let f=0;f<n;f++) {
        const py=y+f*fh+1.8;
        for(let i=0;i<Math.floor(tw/4.4);i++) {
          const px=x-tw/2+2.4+i*4.4;
          for(const side of [-1,1]) {
            const pz=z+side*(td/2+.18);
            shell.box(rnd()>.82?'lit':'pane',px,py,pz,2.5,2.4,.24);
            shell.box('trim',px,py-1.25,pz+side*.12,2.8,.18,.45);
            if(style==='residential' && i%3===0) {
              detail.box('white',px,py-1.35,pz+side*.7,3.2,.22,1.6);
              detail.box('pane',px,py-.8,pz+side*1.4,3.1,.9,.12);
            }
          }
        }
        for(let i=0;i<Math.floor(td/4.4);i++) {
          const pz=z-td/2+2.4+i*4.4;
          shell.box('pane',x+tw/2+.18,py,pz,.24,2.4,2.5);
          shell.box('pane',x-tw/2-.18,py,pz,.24,2.4,2.5);
        }
      }
    }
    // Deterministic illuminated office strips; no point light per window.
    if(office) for(let f=1;f<n;f++) {
      if(rnd()>.68) shell.box('lit',x+(rnd()-.5)*tw*.55,y+f*fh+1.4,z+td/2+.2,tw*.12,1.5,.24);
    }
  }
  const rw=w*(1-(tiers-1)*.17);
  shell.box('roof',x,h+1.5,z,rw*.36,3,d*.26);
  detail.box('trim',x+rw*.26,h+.9,z,3,1.8,4.6);
  detail.box('trim',x-rw*.26,h+.9,z,3,1.8,4.6);
  // Entrance canopy and columns give human scale to the street edge.
  detail.box('white',x,4.2,z+d/2+3,w*.35,.35,4);
  for(const s of [-1,1]) detail.box('trim',x+s*w*.16,2.1,z+d/2+4,.35,4.2,.35);
}
