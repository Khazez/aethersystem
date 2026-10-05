import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CityMaterials, MaterialKey } from './materials';

/** A few batches per block, so frustum culling remains useful. */
export class CityBatch {
  constructor(private enabled=true){}
  private parts = new Map<MaterialKey, THREE.BufferGeometry[]>();
  geometry(key: MaterialKey, geo: THREE.BufferGeometry) {
    if(!this.enabled){geo.dispose();return;}
    const list = this.parts.get(key) ?? [];
    list.push(geo);
    this.parts.set(key, list);
  }
  box(key: MaterialKey, x: number, y: number, z: number, w: number, h: number, d: number) {
    if(!this.enabled)return;
    const g = new THREE.BoxGeometry(w,h,d);
    if (key === 'glass') {
      const uv = g.getAttribute('uv');
      for (let i=0; i<uv.count; i++) {
        const face = Math.floor(i/4);
        const horizontal = face < 2 ? d : w;
        uv.setXY(i,uv.getX(i)*horizontal/11,uv.getY(i)*h/11);
      }
    }
    g.translate(x,y,z);
    this.geometry(key,g);
  }
  rod(key: MaterialKey, a: THREE.Vector3, b: THREE.Vector3, radius: number, segments = 6) {
    const g = new THREE.CylinderGeometry(radius,radius,a.distanceTo(b),segments);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), b.clone().sub(a).normalize()));
    g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
    this.geometry(key,g);
  }
  finish(materials: CityMaterials, detail = false) {
    const group = new THREE.Group();
    for (const [key, parts] of this.parts) {
      const merged = mergeGeometries(parts, false);
      parts.forEach(p => p.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, materials[key]);
      mesh.userData.surface=key;
      mesh.castShadow = !detail && !['ground','grass','paving','asphalt','water','marking'].includes(key);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}
