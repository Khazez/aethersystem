import * as T from 'three';

type Finish='brick'|'stone'|'metal';
type Atlas={color:T.DataTexture;surface:T.DataTexture};
const cache=new Map<string,{atlas:Atlas;users:number}>();
const SIZE=[384,256] as const;

/** One shared atlas per facade family. RGB surface channels encode ambient
 * occlusion, roughness and metalness, rather than painting reflections on walls. */
export function acquireFacadeAtlas(finish:Finish,glass=false,balcony=false){
  const key=`${finish}:${glass}:${balcony}`;
  let entry=cache.get(key);
  if(!entry){
    const [w,h]=SIZE,color=new Uint8Array(w*h*4),surface=new Uint8Array(w*h*4);
    const rect=(x:number,y:number,width:number,height:number,hex:number,ao=255,rough=225,metal=3)=>{
      for(let py=Math.max(0,Math.floor(y));py<Math.min(h,Math.ceil(y+height));py++)for(let px=Math.max(0,Math.floor(x));px<Math.min(w,Math.ceil(x+width));px++){
        const i=((h-1-py)*w+px)*4;
        color[i]=(hex>>16)&255;color[i+1]=(hex>>8)&255;color[i+2]=hex&255;color[i+3]=255;
        surface[i]=ao;surface[i+1]=rough;surface[i+2]=metal;surface[i+3]=255;
      }
    };
    rect(0,0,w,h,finish==='brick'?0xa29180:finish==='metal'?0x71818a:0xc1c3b9);
    for(let row=0;row<4;row++)for(let col=0;col<6;col++){
      const x=col*64,y=row*64,loggia=balcony&&col%3===1;
      const inset=glass?3:loggia?5:12,ww=glass?58:loggia?54:40,hh=glass?51:loggia?49:39;
      if(loggia)rect(x+1,y,62,64,0x48504e,170,215);
      // Thin recess, shadowed lintel and sill are visible without white grids.
      rect(x+inset-2,y+8,ww+4,hh+4,0x68716e,205,190,35);
      const tones=[0x56686e,0x4d6068,0x617178,0x435962,0x718086,0x52626a];
      rect(x+inset,y+10,ww,hh,tones[(col*7+row*11)%tones.length],238,glass?58:76,10);
      rect(x+inset,y+10,ww,3,0x35474e,158,82,10);
      rect(x+inset,y+10,2,hh,0x3c4e53,185,95,10);
      if((col+row*3)%5===0)rect(x+inset+3,y+13,ww-6,12,0x95978e,225,175,3);
      rect(x+32,y+10,1,hh,0x65706f,240,110,100);
      rect(x+inset-1,y+10+hh,ww+2,2,0x9a9f96,220,210);
      if(loggia){rect(x+4,y+49,56,13,0x6c7a78,205,110,10);rect(x+4,y+48,56,2,0x3c4849,235,100,90);}
      if(glass)rect(x,y+60,64,4,0x53656b,218,155,80);
    }
    const texture=(data:Uint8Array,srgb:boolean)=>{const map=new T.DataTexture(data,w,h);map.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.anisotropy=8;map.needsUpdate=true;return map;};
    entry={atlas:{color:texture(color,true),surface:texture(surface,false)},users:0};cache.set(key,entry);
  }
  entry.users++;let released=false;
  return {...entry.atlas,dispose(){if(released)return;released=true;if(--entry.users===0){entry.atlas.color.dispose();entry.atlas.surface.dispose();cache.delete(key);}}};
}
