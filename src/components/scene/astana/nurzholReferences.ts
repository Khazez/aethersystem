/** User-supplied map pins, not cadastral footprints or surveyed building centres.
 * Keep separate objects separate; never infer a whole complex's height from one block. */
export const nurzholReferences = [
  {id:'water-green',name:'На Водно-Зеленом Бульваре',address:'Конаева, 12/1',lon:71.427639,lat:51.129809,floors:14,source:'https://2gis.kz/astana/firm/70000001018085215'},
  {id:'emerald-b',name:'Изумрудный квартал, блок Б',address:'Конаева, 8',lon:71.422712,lat:51.130468,floors:45,source:'https://2gis.kz/astana/geo/9570784863380235'},
  {id:'ktz',name:'Қазақстан темір жолы',address:'Конаева, 6',lon:71.421923,lat:51.131226,floors:40,source:'https://2gis.kz/astana/firm/70000001018107083'},
  {id:'arch-b',name:'Комплекс с аркой, блок B',address:'Кабанбай батыра, 19, блок B',lon:71.412794,lat:51.131195,floors:17,source:'https://2gis.kz/astana/geo/70030076129756061'},
] as const;

/** X points to the right when looking from Khan Shatyr toward Akorda (+south).
 * Z runs toward Khan Shatyr. Both axes use the same scale to preserve proportions. */
export function projectNurzhol(lon:number,lat:number,start:number,end:number){
  if(![lon,lat,start,end].every(Number.isFinite)||start<=end)throw new Error('Invalid Nurzhol projection');
  const cos=Math.cos(51.13*Math.PI/180),east=(71.40389-71.442072)*cos,north=51.13222-51.126481;
  const length=Math.hypot(east,north),e=(lon-71.442072)*cos,n=lat-51.126481;
  const akorda=end-160,scale=(start+150-akorda)/length;
  return {x:(n*east-e*north)/length*scale||0,z:akorda+(e*east+n*north)/length*scale};
}

export function nurzholReferencePlan(start:number,end:number){
  return nurzholReferences.map(reference=>({...reference,...projectNurzhol(reference.lon,reference.lat,start,end),status:'reference-only' as const}));
}
