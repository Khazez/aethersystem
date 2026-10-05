import * as THREE from 'three';

/** Procedural atmospheric sky. No panorama download or video sequence. */
export function createAtmosphere(renderer: THREE.WebGLRenderer) {
  const uniforms={uNight:{value:0},uClouds:{value:.48},uTime:{value:0}};
  const material=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,uniforms,
    vertexShader:`varying vec3 vRay; void main(){vRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 vRay; uniform float uNight,uClouds,uTime;
      float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p*2.03+vec2(17.1,8.3);a*=.5;}return v;}
      float cloud(vec2 p){float shape=fbm(p*.33);float detail=fbm(p*1.7+shape);return smoothstep(.57-uClouds*.22,.72-uClouds*.15,shape*.72+detail*.28);}
      void main(){
        vec3 ray=normalize(vRay);float h=max(ray.y,0.);
        vec3 zenith=mix(vec3(.12,.32,.59),vec3(.018,.032,.085),uNight);
        vec3 horizon=mix(vec3(.72,.79,.82),vec3(.29,.25,.28),uNight);
        vec3 color=mix(horizon,zenith,pow(h,.44));
        vec3 sun=normalize(vec3(-.62,mix(.48,.08,uNight),-.32));
        float sd=max(dot(ray,sun),0.);
        color+=mix(vec3(1.,.81,.55),vec3(1.,.42,.18),uNight)*(pow(sd,32.)*.18+pow(sd,1200.)*3.);
        if(ray.y>.005){
          vec2 p=ray.xz/max(ray.y,.045)*2.7+vec2(uTime*.0017,12.);
          float density=cloud(p);
          float shadow=cloud(p+vec2(-.6,-.35));
          float edge=clamp((density-shadow)*2.,0.,1.);
          vec3 cloudColor=mix(vec3(.49,.59,.68),vec3(1.04,1.03,.97),.5+edge*.5-shadow*.18);
          cloudColor=mix(cloudColor,vec3(.19,.20,.27)+vec3(.26,.13,.055)*edge,uNight);
          float coverage=density*smoothstep(.005,.12,ray.y)*.98;
          color=mix(color,cloudColor,coverage);
          // Broad, thin cirrus at altitude; small amplitude prevents mottled noise.
          float cirrus=pow(fbm(ray.xz/(ray.y+.12)*vec2(3.,18.)+43.),5.);
          color+=vec3(cirrus*.15*(1.-uNight));
        }
        color=mix(color,horizon,1.-smoothstep(-.2,.01,ray.y));
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const geometry=new THREE.SphereGeometry(12000,32,16);
  const sky=new THREE.Mesh(geometry,material);sky.name='Procedural sky';sky.frustumCulled=false;sky.renderOrder=-100;
  const envScene=new THREE.Scene();
  const envSky=new THREE.Mesh(geometry,material);envScene.add(envSky);
  const pmrem=new THREE.PMREMGenerator(renderer);
  let environment=pmrem.fromScene(envScene,.02,.1,20000);
  return {
    sky,
    get environment(){return environment.texture;},
    setNight(n:number,scene:THREE.Scene) {uniforms.uNight.value=n;const next=pmrem.fromScene(envScene,.02,.1,20000);scene.environment=next.texture;environment.dispose();environment=next;},
    setClouds(n:number){uniforms.uClouds.value=n;},
    update(time:number,camera:THREE.Camera) {uniforms.uTime.value=time;sky.position.copy(camera.position);},
    dispose(){environment.dispose();pmrem.dispose();geometry.dispose();material.dispose();},
  };
}
