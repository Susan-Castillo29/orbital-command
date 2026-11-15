import { useState } from 'react';
import type { CampaignArchive, CampaignRecord } from '../systems/campaignLegacy';
import { campaignCommanderMessage } from '../systems/campaignLegacy';
import './campaign-celebration.css';

type Props = {
  mode: 'victory' | 'records';
  record: CampaignRecord | null;
  archive: CampaignArchive;
  language: 'en' | 'es';
  medalSaved: boolean;
  onRestart: () => void;
  onReturnToMain: () => void;
  onClose: () => void;
  onUpdateCommander: (name: string) => void;
  onListen: () => void;
};

const duration = (milliseconds: number, language: 'en' | 'es') => {
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 1) return language === 'es' ? 'Menos de un minuto' : 'Under one minute';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return language === 'es' ? `${hours} h ${remaining} min` : `${hours} h ${remaining} min`;
};

export default function CampaignCelebration({ mode, record, archive, language, medalSaved, onRestart, onReturnToMain, onClose, onUpdateCommander, onListen }: Props) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const es = language === 'es';
  const completedDate = record ? new Date(record.completedAt).toLocaleString(es ? 'es-DO' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' }) : '';

  return <div className="campaign-stage" role="dialog" aria-modal="true" aria-label={es ? 'Medalla y registro de campaña' : 'Campaign medal and record'}>
    <div className="campaign-stars" aria-hidden="true" />
    <img className="campaign-earth" src={`${import.meta.env.BASE_URL}illustrations/earth.svg`} alt="" />
    <div className="campaign-stage-glow" aria-hidden="true" />
    <div className="campaign-stage-content">
      {mode === 'victory' && record ? <>
        <span className="campaign-kicker">ORBITAL COMMAND · {es ? 'CAMPAÑA COMPLETADA' : 'CAMPAIGN COMPLETE'}</span>
        <h1>{es ? 'MEDALLA DE EXPLORADOR GALÁCTICO' : 'GALACTIC EXPLORER MEDAL'}</h1>
        <p className="campaign-intro">{es ? 'El sistema solar ya no es un mapa lejano: ahora es parte de tu historia.' : 'The solar system is no longer a distant map; it is now part of your story.'}</p>
        <div className="campaign-medal-unlock" aria-label={es ? 'Medalla dorada de campaña completada' : 'Gold campaign complete medal'}>
          <svg viewBox="0 0 300 330" role="img" aria-labelledby="campaign-medal-title">
            <title id="campaign-medal-title">{es ? 'Medalla de Explorador Galáctico' : 'Galactic Explorer Medal'}</title>
            <defs>
              <linearGradient id="medal-gold" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff2bd" /><stop offset=".35" stopColor="#e7b94f" /><stop offset=".7" stopColor="#9b5b1e" /><stop offset="1" stopColor="#ffe59a" /></linearGradient>
              <radialGradient id="medal-face"><stop stopColor="#f8df8e" /><stop offset=".72" stopColor="#bd7c2c" /><stop offset="1" stopColor="#704012" /></radialGradient>
            </defs>
            <path d="M83 15h58l14 90-48 42-48-42z" fill="#c4443f" stroke="#f4c86e" strokeWidth="5" />
            <path d="M159 15h58l24 90-48 42-48-42z" fill="#315d9b" stroke="#f4c86e" strokeWidth="5" />
            <circle cx="150" cy="166" r="112" fill="url(#medal-gold)" stroke="#fff0b8" strokeWidth="7" />
            <circle cx="150" cy="166" r="91" fill="url(#medal-face)" stroke="#704618" strokeWidth="4" />
            <circle cx="150" cy="145" r="37" fill="#317da1" stroke="#d9eff4" strokeWidth="3" />
            <path d="M133 133l19-13 17 10 6 15-16 8-10 17-13-10-14-1-4-13z" fill="#76b978" />
            <ellipse cx="150" cy="145" rx="58" ry="23" fill="none" stroke="#fff0b2" strokeWidth="3" transform="rotate(-25 150 145)" />
            <path d="M145 125l20-35 13 42 20 9-22 7-17 24-3-22-16-13z" fill="#f3f7f4" stroke="#6c512c" strokeWidth="3" />
            <path d="M146 148l-16 16 16-4m26-13 18 11-18-5" fill="#e9633d" stroke="#6c512c" strokeWidth="2" />
            <path d="M92 203h116" stroke="#ffe7a1" strokeWidth="3" />
            <text x="150" y="222" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff2bd" letterSpacing="2">{es ? 'CAMPAÑA' : 'CAMPAIGN'}</text>
            <text x="150" y="241" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff2bd" letterSpacing="2">{es ? 'COMPLETADA' : 'COMPLETE'}</text>
            <path d="M65 166l-15-8m200 8 15-8M83 88l-12-13m146 13 12-13" stroke="#fff2bd" strokeWidth="4" strokeLinecap="round" />
            <path d="M150 50v-8m-65 120h-9m148 0h-9" stroke="#fff2bd" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="campaign-medal-caption">{es ? 'CAMPAÑA COMPLETADA' : 'CAMPAIGN COMPLETE'}</div>
        <div className="campaign-command-message"><strong>{es ? 'TRANSMISIÓN DEL COMANDANTE · TIERRA' : 'COMMANDER TRANSMISSION · EARTH'}</strong><p lang="es">{campaignCommanderMessage}</p><button type="button" onClick={onListen}>{es ? '▶ ESCUCHAR TRANSMISIÓN EN ESPAÑOL' : '▶ HEAR THE COMMANDER IN SPANISH'}</button></div>
        {!medalSaved && <p className="campaign-storage-alert" role="alert">{es ? 'El navegador no permitió guardar la medalla de forma permanente. Puedes volver al menú; iniciar otra campaña podría perder este registro.' : 'The browser could not save the medal permanently. You can return to the menu; starting another campaign could lose this record.'}</p>}
        <section className="campaign-summary" aria-label={es ? 'Resumen de campaña' : 'Campaign summary'}>
          <label>{es ? 'Comandante' : 'Commander'}<input value={record.commander} placeholder={es ? 'Comandante' : 'Commander'} maxLength={48} onChange={(event) => onUpdateCommander(event.target.value)} /></label>
          <div><span>{es ? 'Misiones completadas' : 'Missions completed'}</span><b>{record.missionCount}</b></div>
          <div><span>{es ? 'Cuerpos celestes registrados' : 'Celestial bodies recorded'}</span><b>{record.destinations.length}</b></div>
          <div><span>{es ? 'Muestras simuladas' : 'Simulated samples'}</span><b>{record.sampleCount}</b></div>
          <div><span>{es ? 'Tiempo total de juego' : 'Total play time'}</span><b>{duration(record.playtimeMs, language)}</b></div>
          <div><span>{es ? 'Tiempo de misión simulado' : 'Simulated mission time'}</span><b>{record.simulatedDays.toFixed(1)} {es ? 'días' : 'days'}</b></div>
          <div><span>{es ? 'Recursos utilizados' : 'Resources used'}</span><b>{record.fuelUsedPercent.toFixed(0)}% {es ? 'combustible' : 'fuel'} · {record.energyUsedPercent.toFixed(0)}% {es ? 'energía' : 'energy'}</b></div>
          <div><span>{es ? 'Fecha de finalización' : 'Completion date'}</span><b>{completedDate}</b></div>
          <div className="campaign-destinations"><span>{es ? 'Destinos completados' : 'Completed destinations'}</span><b>{record.destinations.join(' · ')}</b></div>
        </section>
        <div className="campaign-actions"><button type="button" className="campaign-secondary" onClick={onReturnToMain}>{es ? 'VOLVER AL MENÚ PRINCIPAL' : 'RETURN TO MAIN MENU'}</button><button type="button" className="campaign-primary" onClick={() => setConfirmRestart(true)}>{es ? 'VOLVER A JUGAR' : 'PLAY AGAIN'}</button></div>
      </> : <>
        <span className="campaign-kicker">ORBITAL COMMAND · {es ? 'HISTORIAL PERMANENTE' : 'PERMANENT RECORD'}</span>
        <h1>{es ? 'MEDALLAS Y CAMPAÑAS' : 'MEDALS AND CAMPAIGNS'}</h1>
        <div className="campaign-archive-medals">{archive.medals.map((medal) => <div className="campaign-archive-medal" key={medal.id}><span>✦</span><strong>{es ? 'MEDALLA DE EXPLORADOR GALÁCTICO' : 'GALACTIC EXPLORER MEDAL'}</strong><small>{new Date(medal.earnedAt).toLocaleDateString(es ? 'es-DO' : 'en-GB')}</small></div>)}{archive.medals.length === 0 && <p>{es ? 'Aún no se han obtenido medallas.' : 'No medals have been earned yet.'}</p>}</div>
        <ol className="campaign-archive-list">{[...archive.campaigns].reverse().map((entry) => <li key={entry.id}><strong>{entry.commander}</strong><span>{entry.missionCount} {es ? 'misiones' : 'missions'} · {entry.destinations.join(', ')}</span><time dateTime={entry.completedAt}>{new Date(entry.completedAt).toLocaleString(es ? 'es-DO' : 'en-GB')}</time></li>)}</ol>
        <div className="campaign-actions"><button type="button" className="campaign-primary" onClick={onClose}>{es ? 'VOLVER' : 'BACK'}</button></div>
      </>}
    </div>
    {confirmRestart && mode === 'victory' && <div className="campaign-confirm-backdrop"><section className="campaign-confirm" role="alertdialog" aria-modal="true" aria-labelledby="campaign-confirm-title"><span className="campaign-kicker">ORBITAL COMMAND · RESET</span><h2 id="campaign-confirm-title">{es ? '¿Deseas comenzar una nueva campaña?' : 'Start a new campaign?'}</h2><p>{es ? 'Tu progreso actual de misiones se reiniciará, pero conservarás tu medalla y el registro de las campañas que hayas completado.' : 'Your current mission progress will reset, but you will keep your medal and the record of completed campaigns.'}</p><div><button type="button" className="campaign-secondary" onClick={() => setConfirmRestart(false)}>{es ? 'CANCELAR' : 'CANCEL'}</button><button type="button" className="campaign-primary" onClick={onRestart}>{es ? 'COMENZAR NUEVA CAMPAÑA' : 'START NEW CAMPAIGN'}</button></div></section></div>}
  </div>;
}
