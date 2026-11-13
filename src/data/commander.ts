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
