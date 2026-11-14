export type Transmission = { id: string; title: string; text: string };

export const introduction: Transmission = {
  id: 'welcome',
  title: 'DÍA 1 · EL COMIENZO',
  text: 'Bienvenido a ORBITAL COMMAND. Hoy comienza algo que durante generaciones solo fue un sueño. Tu misión no consiste únicamente en explorar el espacio. Cada dato que obtengamos nos permitirá comprender mejor el lugar al que llamamos hogar. Confía en tu preparación, revisa tus sistemas y recuerda que millones de personas estarán siguiendo nuestro trabajo.',
};

export const operationsGuide: Transmission[] = [
  introduction,
  { id: 'operations', title: 'CENTRO DE OPERACIONES', text: 'Este es el centro de operaciones. La lista contiene las misiones disponibles y el mapa muestra un modelo simplificado del sistema solar. Arrastra para cambiar la vista y usa la rueda para acercarte.' },
  { id: 'missions', title: 'SELECCIÓN DE MISIÓN', text: 'Selecciona un destino para consultar su objetivo, duración estimada y dificultad. Abre el expediente para preparar la exploración.' },
  { id: 'ship', title: 'NAVE Y RECURSOS', text: 'En ingeniería puedes elegir una nave, un instrumento, energía, antena y lanzador. Revisa el presupuesto, la masa y la potencia: cada elección tiene consecuencias. Durante la exploración vigila los recursos de la nave.' },
  { id: 'instruments', title: 'DÍA 2 · INSTRUMENTOS Y ENERGÍA', text: 'La cámara genera menos datos y consume menos potencia. Un espectrómetro avanzado puede aportar más valor científico, pero aumenta la masa, el coste, la demanda energética y los datos que deberás almacenar o transmitir.' },
  { id: 'communications', title: 'DÍA 2 · COMUNICACIONES', text: 'Compara la producción de datos con la capacidad de tu antena. Si llenas el almacenamiento, transmite paquetes antes de continuar. Conserva energía y capacidad de enlace para enviar el informe final.' },
  { id: 'launch-vehicle', title: 'DÍA 2 · MASA Y LANZADOR', text: 'La masa total no puede superar la capacidad del vehículo de lanzamiento. Un lanzador mayor transporta más carga, pero consume más presupuesto. Mercurio, Venus y el Sol requieren además protección térmica reforzada.' },
  { id: 'countdown', title: 'DÍA 3 · EL LANZAMIENTO', text: 'Cuando la configuración sea compatible, elige un día de lanzamiento simulado y comienza la cuenta regresiva. Durante el trayecto podrás pausar y acelerar el tiempo; las decisiones importantes requieren tu confirmación.' },
  { id: 'flight', title: 'PREPARACIÓN DEL VUELO', text: 'Abre el expediente, configura la nave y planifica el viaje. En vuelo libre usa W, A, S y D para maniobrar y F para alternar la cámara. Los tiempos y trayectorias son una simulación educativa.' },
];

export function missionTransmission(name: string, destination: string, phase: 'briefing' | 'exploration'): Transmission {
  if (phase === 'briefing') return {
    id: `briefing-${name}`,
    title: `EXPEDIENTE · ${name}`,
    text: `Tripulación, revisa el objetivo de ${destination} antes de iniciar la exploración. Recuerda que cada observación debe llegar a la Tierra con sus limitaciones claramente identificadas.`,
  };
  return {
    id: `exploration-${name}`,
    title: `EN MISIÓN · ${name}`,
    text: `Estamos en el entorno de ${destination}. Revisa los recursos antes de comenzar las observaciones. El centro de control está contigo.`,
  };
}

export function selectSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const spanish = voices.filter((voice) => /^es(?:-|_|$)/i.test(voice.lang));
  const score = (voice: SpeechSynthesisVoice) => (/^es[-_](?:do|mx|us|co|ar|cl|pe|ve)/i.test(voice.lang) ? 10 : 0) + (/natural|neural|premium|enhanced/i.test(voice.name) ? 5 : 0);
  return spanish.sort((a, b) => score(b) - score(a))[0];
}

export type Language = 'en' | 'es';
export const englishGuide: Transmission[] = [
  { id: 'welcome', title: 'DAY 1 · THE BEGINNING', text: 'Welcome to ORBITAL COMMAND. Today begins a journey that generations could only dream of. We explore to understand and protect our home. Trust your training, check your systems, and know that mission control is with you.' },
  { id: 'operations', title: 'MISSION CONTROL', text: 'This is mission control. Available missions are listed beside a simplified solar system. Drag to change the view and scroll to zoom.' },
  { id: 'missions', title: 'SELECT A MISSION', text: 'Select a destination to review its objective, estimated duration and difficulty. Open the briefing to prepare your mission.' },
  { id: 'ship', title: 'SPACECRAFT AND RESOURCES', text: 'In engineering, choose your spacecraft, instrument, power source, antenna and launcher. Each choice affects mass, cost, power and data. Monitor your resources throughout the mission.' },
  { id: 'instruments', title: 'DAY 2 · INSTRUMENTS AND POWER', text: 'The camera uses less power and generates less data. An advanced spectrometer can improve the science, but adds mass, cost, power demand and data to store or transmit.' },
  { id: 'communications', title: 'DAY 2 · COMMUNICATIONS', text: 'Compare data production with antenna capacity. If storage fills, transmit data packets before continuing. Reserve enough power and communications capacity for your final report.' },
  { id: 'launch-vehicle', title: 'DAY 2 · MASS AND LAUNCHER', text: 'Total mass cannot exceed the launcher capacity. A larger launcher carries more, but costs more. Mercury, Venus and the Sun also require reinforced thermal protection.' },
  { id: 'countdown', title: 'DAY 3 · LAUNCH', text: 'Once your configuration is compatible, choose a simulated launch day and begin the countdown. You can pause or accelerate the journey. Important decisions need your confirmation.' },
  { id: 'flight', title: 'PREPARE FOR FLIGHT', text: 'Open your briefing, design the spacecraft and plan your journey. In free flight use W, A, S and D to manoeuvre and F to change camera. Flight times and trajectories are educational simulations.' },
];
export function selectEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter(voice => /^en(?:-|_|$)/i.test(voice.lang));
  const score = (voice: SpeechSynthesisVoice) => (/^en[-_]gb/i.test(voice.lang) ? 10 : 0) + (/natural|neural|premium|enhanced/i.test(voice.name) ? 5 : 0);
  return english.sort((a, b) => score(b) - score(a))[0];
}
export function englishMissionTransmission(name: string, destination: string, phase: 'briefing' | 'exploration'): Transmission {
  return phase === 'briefing'
    ? { id: `briefing-${name}`, title: `BRIEFING · ${name}`, text: `Crew, review the objective for ${destination} before you begin. Every observation must reach Earth with its limitations clearly identified.` }
    : { id: `exploration-${name}`, title: `ON MISSION · ${name}`, text: `We are approaching ${destination}. Check your resources before beginning observations. Mission control is with you.` };
}
export const englishDestinations: Record<string, string> = { earth: 'Earth', moon: 'the Moon', mars: 'Mars', mercury: 'Mercury', venus: 'Venus', jupiter: 'Jupiter', europa: 'Europa', saturn: 'Saturn', titan: 'Titan', uranus: 'Uranus', neptune: 'Neptune', sun: 'the Sun', asteroid: 'Psyche' };
export function translateTransmission(message: Transmission, destination: string): Transmission {
  const known: Record<string, [string, string]> = {
    countdown: ['COUNTDOWN', 'Systems checked. Beginning the countdown. Trust your training; we will see you in orbit.'],
    liftoff: ['LIFTOFF', 'Liftoff confirmed. Keep your attention on the telemetry; mission control will be with you throughout the journey.'],
    'course-decision': ['COURSE CORRECTION', 'A navigation decision is pending. Check your reserves and choose how to correct course; the decision is yours.'],
    'first-sample': ['THE FIRST DISCOVERY', 'You have turned a question into an opportunity to learn. This small rock brings us closer to understanding our history.'],
    'first-look-earth': ['THE FIRST LOOK', 'From here the borders disappear. We see one home. Remember why we are here.'],
    'first-look-mars': ['THE RED FRONTIER', 'There is Mars. After months of preparation, take a moment and check the systems before exploring.'],
    'mars-storm': ['DUST STORM', 'Visibility is falling. Protect the systems, watch your power and decide whether to continue or wait.'],
    'resource-warning': ['CRITICAL RESOURCE', 'A resource is critically low. Check telemetry and decide how to continue. Stay calm and protect the mission.'],
  };
  if (message.id.startsWith('complete-')) return { ...message, title: 'TRANSMISSION RECEIVED', text: `Well done. The data from ${destination} reached mission control. Our international teams can review the report and its limitations.` };
  if (message.id.startsWith('status-')) {
    const match = message.text.match(/Día de misión (\d+)\. Hemos recorrido aproximadamente ([\d.,]+) kilómetros simulados\. Quedan unos (\d+) días\. Energía (\d+) por ciento y combustible (\d+) por ciento\./);
    if (match) return { ...message, title: 'FLIGHT STATUS', text: `Mission day ${match[1]}. We have travelled approximately ${match[2]} simulated kilometres. About ${match[3]} days remain. Energy ${match[4]} per cent and fuel ${match[5]} per cent.` };
  }
  return known[message.id] ? { ...message, title: known[message.id][0], text: known[message.id][1] } : message;
}
