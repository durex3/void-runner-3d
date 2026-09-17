const DEVICE_ICONS=['➶','◆','ϟ'];

export function buildDeviceStatus({garden,plants,combos}){
  const alive=garden.plants.filter(plant=>!plant.dead);
  return {
    total:alive.length,
    capacity:24,
    devices:plants.map((name,type)=>{
      const matching=alive.filter(plant=>plant.type===type);
      return {
        type,name,icon:DEVICE_ICONS[type],count:matching.length,
        starting:matching.filter(plant=>plant.grow>0).length,
        expiring:matching.filter(plant=>plant.life<6).length,
      };
    }),
    companions:garden.buddies.map(buddy=>({
      type:buddy.type,
      name:buddy.type==='slime'?'采集':'治愈',
      rank:buddy.rank,
    })),
    combos:combos.filter(combo=>garden.combos.has(combo.id)),
  };
}
