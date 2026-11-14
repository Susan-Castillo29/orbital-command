import type { Mission } from './missions';

type LocalisedMission = { destination: string; category: string; duration: string; objective: string; description: string };
const english: Record<string, LocalisedMission> = {
  earth: { destination:'Earth', category:'Earth observation', duration:'90 days', objective:'Measure changes in cloud cover and vegetation.', description:'A low-Earth-orbit satellite studies the climate and surface of our home planet.' },
  moon: { destination:'Moon', category:'Lunar exploration', duration:'12 days', objective:'Investigate the composition of lunar soil and identify regions of scientific interest.', description:'Choose a safe site, deploy a rover, study rock formations and transmit sample results to mission control.' },
  mars: { destination:'Mars', category:'Planetary exploration', duration:'210 days', objective:'Analyse the geology of an ancient delta.', description:'A long-duration robotic mission. Signal delay and energy consumption are key challenges.' },
  asteroid: { destination:'Asteroid Psyche', category:'Asteroid science', duration:'3 years', objective:'Study the composition of a metallic body.', description:'An interplanetary journey to investigate the building blocks of the solar system.' },
  europa: { destination:'Europa', category:'Orbital exploration', duration:'5 years', objective:'Investigate fractures and features of Europa’s icy surface.', description:'A radiation-resistant probe studies the moon from orbit. Landing in unverified regions is not permitted.' },
  saturn: { destination:'Saturn', category:'Orbital observation', duration:'3 years', objective:'Photograph the rings and study Saturn’s moons.', description:'Observe ring regions and follow the moons remotely, without attempting to land on the gas giant.' },
  jupiter: { destination:'Jupiter', category:'Atmospheric observation', duration:'4 years', objective:'Observe the Great Red Spot and record changes in storms.', description:'Atmospheric instruments observe from orbit; Jupiter has no accessible solid surface.' },
  sun: { destination:'Sun', category:'Heliophysics', duration:'60 days', objective:'Observe solar activity and ejections.', description:'A solar observation probe must carefully manage heat and communications.' },
  mercury: { destination:'Mercury', category:'Orbital geology', duration:'Several years', objective:'Compare illuminated and dark regions and study cratered terrain.', description:'A robotic orbital mission. Proximity to the Sun requires thermal protection and a careful trajectory.' },
  venus: { destination:'Venus', category:'Atmospheric science', duration:'Several months', objective:'Study Venus’s atmosphere and clouds for comparison with Earth.', description:'Remote instruments conduct the exploration; surface conditions do not permit a human walk.' },
  titan: { destination:'Titan', category:'Moon of Saturn', duration:'Several years', objective:'Investigate Titan’s atmosphere and regions with hydrocarbon lakes.', description:'A robotic investigation from the Saturn system. Observations are shown as simulated data.' },
  uranus: { destination:'Uranus', category:'Ice giants', duration:'Many years', objective:'Observe Uranus’s atmosphere and magnetic environment.', description:'A long-duration probe examines an ice giant without attempting to land.' },
  neptune: { destination:'Neptune', category:'Ice giants', duration:'Many years', objective:'Investigate Neptune’s atmosphere and environment.', description:'A distant robotic mission observes storms and moons with limited resources.' },
};
export function localiseMission(mission: Mission, language: 'en' | 'es'): LocalisedMission {
  return language === 'en' && english[mission.id] ? english[mission.id] : mission;
}
