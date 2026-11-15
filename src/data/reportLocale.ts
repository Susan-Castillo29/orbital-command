import { missions } from './missions.ts';
import { localiseMission } from './missionLocale.ts';
import { localiseLabText } from './labLocale.ts';
const english: Record<string, string> = {
 'Observar nubes, océanos y vegetación ayuda a formular preguntas sobre cambios ambientales en nuestro planeta.':'Observing clouds, oceans and vegetation helps frame questions about environmental change on our planet.',
 'La geología lunar conserva pistas sobre impactos y procesos tempranos del sistema solar.':'Lunar geology preserves clues to impacts and early processes in the solar system.',
 'Comparar cráteres y materiales ayuda a estudiar la evolución de los mundos rocosos.':'Comparing craters and materials helps study the evolution of rocky worlds.',
 'Venus ofrece un contraste para estudiar atmósferas densas y efecto invernadero.':'Venus provides a contrast for studying dense atmospheres and the greenhouse effect.',
 'Algunos minerales y antiguos relieves marcianos aportan evidencia de ambientes que tuvieron agua líquida.':'Some minerals and ancient Martian landforms provide evidence of environments that once had liquid water.',
 'Las bandas y tormentas permiten estudiar la dinámica de un gigante gaseoso.':'Bands and storms allow us to study the dynamics of a gas giant.',
 'La corteza de hielo y las señales magnéticas son indicios que ayudan a investigar un posible océano; no prueban la existencia de vida.':'The ice crust and magnetic signals are clues for investigating a possible ocean; they do not prove life exists.',
 'Las observaciones de los anillos y lunas permiten estudiar partículas de hielo y dinámicas orbitales.':'Observations of rings and moons support the study of ice particles and orbital dynamics.',
 'Titán permite comparar procesos atmosféricos y cuerpos líquidos de hidrocarburos con los de la Tierra.':'Titan allows atmospheric processes and liquid hydrocarbon bodies to be compared with those on Earth.',
 'El estudio de Urano ayuda a comparar la estructura y la atmósfera de los gigantes helados.':'Studying Uranus helps compare the structure and atmosphere of ice giants.',
 'Neptuno ofrece un laboratorio distante para estudiar atmósferas y tormentas.':'Neptune offers a distant laboratory for studying atmospheres and storms.',
 'La actividad solar puede afectar al entorno espacial y a tecnologías de comunicaciones y navegación.':'Solar activity can affect the space environment and communication and navigation technologies.',
 'Los asteroides conservan información sobre materiales y procesos del sistema solar temprano.':'Asteroids preserve information about materials and processes in the early solar system.',
 'Cámara multiespectral':'Multispectral camera','Espectrómetro y sensores ambientales':'Spectrometer and environmental sensors','Espectrómetro avanzado y sensores':'Advanced spectrometer and sensors',
 'índice simulado / 100':'simulated index / 100','índice / 100':'index / 100','índice relativo':'relative index','índice':'index',
};
export function localiseReportText(value: string, language: 'en' | 'es'): string {
 return language === 'en' ? english[value] ?? localiseLabText(value, language) : value;
}
export function localiseReportMission(missionId: string, field: 'destination' | 'objective', value: string, language: 'en' | 'es'): string {
 const mission = missions.find(item => item.id === missionId);
 return language === 'en' && mission && mission[field] === value ? localiseMission(mission, language)[field] : value;
}
