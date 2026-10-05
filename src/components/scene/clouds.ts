import * as THREE from 'three';

/** Low-count bounded volumes, lit internally. Clouds never follow the camera. */
export function createCloudField() {
  const group=new THREE.Group();
  const geometry=new THREE.BoxGeometry(1,1,1);
  const clouds:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>[]=[];
  const fragmentShader=`
    varying vec3 vPosition; uniform vec3 uCamera; uniform float uSeed,uNight,uDensity;
    float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float density(vec3 p){
      float hull=1.-length(p*vec3(1.85,2.35,1.85));
      float billow=noise(p*7.+uSeed)*.5+noise(p*16.+uSeed)*.23+noise(p*35.)*.09;
      float bottom=smoothstep(-.42,-.18,p.y);
      return max(0.,hull-.48+billow*.7)*bottom*uDensity;
    }
    void main(){
      vec3 ray=normalize(vPosition-uCamera), inv=1./ray;
      vec3 lo=(-vec3(.5)-uCamera)*inv,hi=(vec3(.5)-uCamera)*inv;
      vec3 mn=min(lo,hi),mx=max(lo,hi);
      float entry=max(max(mn.x,mn.y),mn.z),exitT=min(min(mx.x,mx.y),mx.z);
      entry=max(entry,0.);if(entry>=exitT)discard;
      float stepSize=(exitT-entry)/32.;vec4 result=vec4(0.);
      vec3 sun=normalize(vec3(-.6,1.,.2));
      for(int i=0;i<32;i++){
        vec3 p=uCamera+ray*(entry+(float(i)+.5)*stepSize);
        float den=density(p);if(den>.005){
          float shade=exp(-(density(p+sun*.1)+density(p+sun*.22))*2.3);
          vec3 col=mix(vec3(.44,.53,.63),vec3(1.,.99,.94),shade);
          col=mix(col,vec3(.14,.17,.23)+vec3(.36,.23,.14)*shade,uNight);
          float a=1.-exp(-den*stepSize*18.);
          result.rgb+=(1.-result.a)*a*col;result.a+=(1.-result.a)*a;
          if(result.a>.985)break;
        }
      }
      if(result.a<.01)discard;gl_FragColor=vec4(result.rgb/max(result.a,.001),result.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  for(const [i,x,y,z,w,h,d] of [[0,-320,-100,170,620,150,490],[1,270,-125,-60,670,170,530],[2,-330,-150,-430,510,145,430],[3,340,-165,-760,520,145,460],[4,-760,-95,-1050,650,180,540],[5,850,-100,-1630,700,180,650]]) {
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{uCamera:{value:new THREE.Vector3()},uSeed:{value:i*7.31},uNight:{value:0},uDensity:{value:1}},vertexShader:'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader});
    const cloud=new THREE.Mesh(geometry,material);cloud.position.set(x,y,z);cloud.scale.set(w,h,d);group.add(cloud);clouds.push(cloud);
  }
  const point=new THREE.Vector3();
  return {
    group,
    update(camera:THREE.Camera){for(const c of clouds){point.copy(camera.position);c.worldToLocal(point);c.material.uniforms.uCamera.value.copy(point);}},
    setNight(value:boolean){clouds.forEach(c=>c.material.uniforms.uNight.value=value?1:0);},
    setQuality(low:boolean){clouds.forEach((c,i)=>c.visible=!low||i<2);},
    setDensity(value:number){clouds.forEach(c=>c.material.uniforms.uDensity.value=value*1.4+.3);},
    dispose(){geometry.dispose();clouds.forEach(c=>c.material.dispose());group.clear();},
  };
}
