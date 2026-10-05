/** Scroll-owned presentation: Astana → cloud cover → taxi hold → terminal.
 * No elapsed-time state: reverse scrolling retraces the same scene safely.
 */
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
export function presentationFlight(progress:number,landingRaw:number){
  const p=clamp(progress);
  const enter=smooth((p-.55)/.04),leave=smooth((p-.63)/.055);
  const cover=enter*(1-leave);
  const hover=smooth((p-.575)/.06);
  const reveal=hover*smooth((landingRaw+.45)/.80);
  const fogDensity=(.00024+cover*.018+hover*.007)*(1-reveal);
  return {
    routeProgress:Math.min(p,.565),cover,hover,reveal,fogDensity,
    cityVisible:p>.07&&p<.61,
    cloudOpacity:hover*(1-reveal),
    terminalVisible:hover>.99&&reveal>0,
    phase:p<.55?'astana':p<.685?'cloud-transition':landingRaw<-.45?'taxi-clouds':landingRaw<.9?'arrival':'landed',
  } as const;
}
