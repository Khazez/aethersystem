import * as THREE from 'three';

export function cityMaterials() {
  const textures: THREE.Texture[] = [];
  const loader = new THREE.TextureLoader();
  const load = (kind: string, color = false) => {
    const map = loader.load(`/textures/city/glass-${kind}.jpg`);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
    if (color) map.colorSpace = THREE.SRGBColorSpace;
    textures.push(map);
    return map;
  };
  const materials = {
    glass: new THREE.MeshStandardMaterial({ color: 0x657b86, map: load('color', true), normalMap: load('normal'), roughnessMap: load('rough'), roughness: .58, metalness: .32, envMapIntensity: .7, normalScale: new THREE.Vector2(.12,.12) }),
    stone: new THREE.MeshStandardMaterial({ color: 0x958e80, roughness: .92, metalness: .01 }),
    white: new THREE.MeshStandardMaterial({ color: 0xb3b5b0, roughness: .75, metalness: .08 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x576067, roughness: .55, metalness: .5 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x646968, roughness: .95 }),
    pane: new THREE.MeshStandardMaterial({ color: 0x344d59, roughness: .38, metalness: .28, envMapIntensity: .8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc6a14c, roughness: .24, metalness: .85, envMapIntensity: 1.4 }),
    goldenGlass: new THREE.MeshPhysicalMaterial({color:0xb89b46,roughness:.29,metalness:.48,clearcoat:.6,envMapIntensity:1}),
    goldenFrame: new THREE.MeshStandardMaterial({color:0x726944,roughness:.46,metalness:.55}),
    dome: new THREE.MeshStandardMaterial({color:0x286e9a,roughness:.34,metalness:.36}),
    marble: new THREE.MeshStandardMaterial({color:0xd5d3c8,roughness:.7,metalness:.02}),
    quarterRoof: new THREE.MeshStandardMaterial({color:0x2e514d,roughness:.64,metalness:.28}),
    quarterBase: new THREE.MeshStandardMaterial({color:0x384147,roughness:.76,metalness:.08}),
    door: new THREE.MeshStandardMaterial({color:0x493c2b,roughness:.43,metalness:.23}),
    flowers: new THREE.MeshStandardMaterial({color:0xb79141,roughness:.93}),
    tent: new THREE.MeshStandardMaterial({ color: 0xd4dedc, roughness: .42, metalness: .26, side: THREE.DoubleSide }),
    ground: new THREE.MeshStandardMaterial({ color: 0x999487, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x41464a, roughness: .94 }),
    paving: new THREE.MeshStandardMaterial({ color: 0x888982, roughness: .96 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x687953, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x527047, roughness: .95 }),
    water: new THREE.MeshStandardMaterial({ color: 0x588486, roughness: .19, metalness: .55 }),
    marking: new THREE.MeshStandardMaterial({ color: 0xd5d1b7, roughness: .8 }),
    lit: new THREE.MeshStandardMaterial({ color: 0x6d756f, emissive: 0xffbd70, emissiveIntensity: 0, roughness: .48, metalness: .2 }),
    signalOff: new THREE.MeshStandardMaterial({color:0x182022,roughness:.7}),
    signalRed: new THREE.MeshStandardMaterial({color:0xbc2623,emissive:0xe62018,emissiveIntensity:.7,roughness:.35}),
    signalGreen: new THREE.MeshStandardMaterial({color:0x299f73,emissive:0x0eae63,emissiveIntensity:.7,roughness:.35}),
  };
  return { materials, dispose() { textures.forEach(t => t.dispose()); Object.values(materials).forEach(m => m.dispose()); } };
}
export type CityMaterials = ReturnType<typeof cityMaterials>['materials'];
export type MaterialKey = keyof CityMaterials;
