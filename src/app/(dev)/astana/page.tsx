import type { Metadata } from 'next';
import CityPreview from '@/components/scene/CityPreview';
export const metadata:Metadata={title:'Астана — локальный предпросмотр Aether',robots:{index:false,follow:false}};
export default function AstanaPreview(){return <CityPreview/>;}
