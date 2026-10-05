/** Tree locations match the authored Blender planter beds, not random infill.
 * Blender Y becomes negative Z in the exported city model. */
export function archPlanting(archZ:number){
  return [-1,1].flatMap(side=>[-75,-7,49,113].flatMap(y=>[-6,6].map(offset=>({
    x:side*(y===-75||y===113?51:104)+offset,
    y:.99,
    z:archZ-y,
  }))));
}
