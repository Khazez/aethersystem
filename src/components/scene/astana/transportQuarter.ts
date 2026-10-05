/** Photo-led placement within the existing stylised route, NOT cadastral data.
 * The supplied 2GIS URL's camera coordinate is not a surveyed tower centre.
 * Keep the low opposite frontage separate; the boulevard remains between them.
 */
export function transportQuarterPlan(archZ:number){
  return {x:-202,z:archZ-207,source:'https://2gis.kz/astana/firm/70000001043897415'};
}
