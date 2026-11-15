import { useMemo } from 'react';
import { scienceArchiveKey } from '../systems/telescopeDesign';
import { readStorage } from '../systems/storage';
import './telescope-mode.css';

type Props = { language:'es'|'en'; onChoose:(role:'astronaut'|'scientist')=>void };
type Archive = { missions?: unknown[]; medals?: string[] };

export default function RoleSelection({ language, onChoose }: Props) {
  const t = (es:string,en:string) => language === 'es' ? es : en;
  const archive = useMemo<Archive>(() => { try { return JSON.parse(readStorage(scienceArchiveKey) ?? '{}') as Archive; } catch { return {}; } }, []);
  const missions = Array.isArray(archive.missions) ? archive.missions.length : 0;
  const medals = Array.isArray(archive.medals) ? archive.medals.length : 0;
  return <section className="role-selection" aria-labelledby="role-title">
    <div className="role-selection-sky" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <header className="role-selection-header"><span className="telescope-kicker">ORBITAL COMMAND · THE LAST HORIZON</span><h1 id="role-title">{t('SELECCIÓN DE MISIÓN', 'SELECT YOUR ROLE')}</h1><p>{t('Dos caminos complementarios para aprender cómo investigamos el universo.', 'Two complementary ways to learn how we investigate the universe.')}</p></header>
    <div className="role-card-grid">
      <article className="role-card astronaut-role"><div className="role-symbol" aria-hidden="true">⌁</div><span className="telescope-kicker">01 · EXPLORACIÓN</span><h2>{t('Astronauta', 'Astronaut')}</h2><p>{t('Pilota una nave, viaja a destinos del sistema solar, explora superficies y transmite informes científicos.', 'Pilot a spacecraft, travel to solar-system destinations, explore surfaces and send science reports.')}</p><ul><li>{t('Misiones planetarias y trayectos', 'Planetary missions and flight')}</li><li>{t('Muestras, recursos y observaciones', 'Samples, resources and observations')}</li><li>{t('Progreso de campaña existente', 'Existing campaign progress')}</li></ul><button type="button" className="role-choice" onClick={() => onChoose('astronaut')}>{t('ENTRAR COMO ASTRONAUTA', 'CONTINUE AS ASTRONAUT')} <b>↗</b></button></article>
      <article className="role-card scientist-role"><div className="role-symbol" aria-hidden="true">✳</div><span className="telescope-kicker">02 · OBSERVATORIO</span><h2>{t('Científico', 'Scientist')}</h2><p>{t('Diseña un telescopio espacial, equilibra sus instrumentos y busca respuestas en la luz del universo.', 'Design a space telescope, balance its instruments and seek answers in the light of the universe.')}</p><ul><li>{t('Objetivos, longitudes de onda y óptica', 'Research goals, wavelengths and optics')}</li><li>{t('Masa, potencia, presupuesto y datos', 'Mass, power, budget and data')}</li><li>{t(`${missions} misiones · ${medals} medallas científicas`, `${missions} missions · ${medals} science medals`)}</li></ul><button type="button" className="role-choice" onClick={() => onChoose('scientist')}>{t('DISEÑAR TELESCOPIO', 'DESIGN A TELESCOPE')} <b>↗</b></button></article>
    </div>
    <p className="role-selection-footnote">{t('Cada rol conserva su propio progreso en este navegador.', 'Each role keeps its own progress in this browser.')}</p>
  </section>;
}
