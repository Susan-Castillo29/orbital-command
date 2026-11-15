import type { CampaignRecord } from '../systems/campaignLegacy';

export default function ExplorerDiploma({ record, language, onClose }: { record: CampaignRecord; language: 'en' | 'es'; onClose: () => void }) {
  const es = language === 'es';
  const names = ['Caos Torres', 'Susan Castillo', 'Israel Melo', 'Wady Cruz', 'Emil Castillo', 'Gabriela'];
  return <div className="diploma-overlay" role="dialog" aria-modal="true" aria-labelledby="diploma-title">
    <div className="diploma-toolbar"><button className="campaign-secondary" onClick={onClose}>{es ? 'CERRAR' : 'CLOSE'}</button><button className="campaign-primary" onClick={() => window.print()}>{es ? 'IMPRIMIR / GUARDAR PDF' : 'PRINT / SAVE PDF'}</button></div>
    <article className="explorer-diploma" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}illustrations/explorer-diploma.png)` }}>
      <p className="diploma-brand">ORBITAL COMMAND · THE LAST HORIZON</p>
      <p className="diploma-kicker">{es ? 'CERTIFICADO DE EXPLORACIÓN' : 'CERTIFICATE OF EXPLORATION'}</p>
      <h2 id="diploma-title">{es ? 'Medalla de Explorador Galáctico' : 'Galactic Explorer Medal'}</h2>
      <p>{es ? 'Otorgado a' : 'Awarded to'}</p><strong className="diploma-recipient">{record.commander || (es ? 'Comandante' : 'Commander')}</strong>
      <p className="diploma-description">{es ? 'Por completar la campaña científica, transmitir sus descubrimientos y explorar para comprender y proteger nuestro hogar.' : 'For completing the science campaign, transmitting discoveries and exploring to understand and protect our home.'}</p>
      <p className="diploma-date">{new Date(record.completedAt).toLocaleDateString(es ? 'es-DO' : 'en-GB', { dateStyle: 'long' })} · {record.missionCount} {es ? 'misiones' : 'missions'}</p>
      <div className="diploma-signatures">{names.map(name => <span key={name}>{name}</span>)}</div>
      <small>{es ? 'Reconocimiento dentro de la simulación' : 'Recognition within the simulation'}</small>
    </article>
  </div>;
}
