import {CityBatch} from './batch';
import {dostykLayout} from './routeLayout';

/** Public-space layout study of Dostyk / Abay, not a surveyed street map. */
export function buildDostyk(batch:CityBatch,start:number,end:number){
  const {palace,abay}=dostykLayout((start+end)/2);
  // End at the terminal's drop-off junction, not under its passenger entrance.
  const streetEnd=end+66,center=(start+160+streetEnd)/2,length=start+160-streetEnd;
  batch.box('asphalt',0,-.025,center,27,.15,length);
  for(const side of [-1,1]){
    batch.box('paving',side*22,.14,center,16,.28,length);
    batch.box('stone',side*13.7,.21,center,.3,.42,length);
    batch.box('grass',side*33,.11,center,6,.2,length);
    batch.box('stone',side*30.2,.19,center,.6,.25,length);
    batch.box('water',side*30.2,.33,center,.36,.025,length);
  }
  for(let z=streetEnd+8;z<start+100;z+=10)if(Math.abs(z-abay)>24){
    for(const x of [-9,-4.5,4.5,9])batch.box('marking',x,.06,z,.12,.02,4);
    batch.box('marking',0,.06,z,.15,.02,8);
  }
  // Abay approaches Dostyk from the west, facing the square / palace.
  batch.box('asphalt',-215,-.02,abay,430,.16,26);
  for(const side of [-1,1])batch.box('paving',-215,.14,abay+side*18,430,.28,8);
  for(let x=-420;x<-25;x+=10)batch.box('marking',x,.08,abay,4,.02,.15);
  for(const side of [-1,1])for(let i=-5;i<=5;i++)batch.box('marking',i*2,.09,abay+side*21,1.05,.025,4.5);
  batch.box('paving',(palace.x+34)/2,.18,abay,palace.x-34,.36,97);
  // Low, paired water gardens preserve the public square's open sightline.
  for(const side of [-1,1]){
    batch.box('stone',122,.49,abay+side*30,48,.55,11);
    batch.box('water',122,.78,abay+side*30,46,.025,9);
    batch.box('grass',180,.42,abay+side*38,50,.14,18);
    for(let i=0;i<4;i++)batch.box('trim',90+i*13,.86,abay+side*43,3.4,.15,.7);
  }
}
