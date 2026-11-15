import { useCallback, useEffect, useState } from 'react';
import { cloudClient } from '../collaboration/client';

type Entry = { display_name: string; first_name: string; last_name: string; xp: number; updated_at: string };
export default function GlobalLeaderboard({ language }: { language: 'en' | 'es' }) {
  const es = language === 'es';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  const refresh = useCallback(async () => {
    if (!cloudClient) return;
    const { data, error } = await cloudClient.rpc('orbital_top_players');
    if (error) { setAvailable(false); setMessage(language === 'es' ? 'El podio aún no está disponible. Comprueba que la migración esté aplicada.' : 'The leaderboard is not available yet. Check that its migration has been applied.'); return; }
    setEntries((data ?? []) as Entry[]); setAvailable(true); setMessage('');
  }, [language]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function publish(remove = false) {
    if (!cloudClient) return;
    setBusy(true);
    const { data } = await cloudClient.auth.getSession();
    if (!data.session) { setMessage(es ? 'Inicia sesión en Equipos para participar.' : 'Sign in under Teams to participate.'); setBusy(false); return; }
    const result = remove ? await cloudClient.rpc('orbital_remove_score') : await cloudClient.rpc('orbital_publish_score');
    if (result.error) setMessage(es ? 'No se pudo actualizar el podio. Guarda primero tu campaña en Equipos y completa tu perfil.' : 'Could not update the leaderboard. First save your campaign under Teams and complete your profile.');
    else { await refresh(); setMessage(remove ? (es ? 'Tu puntuación fue retirada.' : 'Your score was removed.') : (es ? 'Tu puntuación fue publicada.' : 'Your score was published.')); }
    setBusy(false);
  }
  return <section className="leaderboard" aria-labelledby="leaderboard-heading">
    <span className="campaign-kicker">ORBITAL COMMAND · TOP 10</span><h2 id="leaderboard-heading">{es ? 'PODIO GLOBAL' : 'GLOBAL LEADERBOARD'}</h2>
    <p>{es ? 'Participación voluntaria. Se publican tu nombre de usuario, primer nombre y primer apellido de tu perfil y los XP de tu última copia guardada. Las puntuaciones provienen del jugador y no están verificadas.' : 'Participation is optional. Your username, first name, first surname and XP from your last saved backup are public. Scores are player-reported and unverified.'}</p>
    {!cloudClient ? <p>{es ? 'Conecta Supabase para mostrar el podio.' : 'Connect Supabase to display the leaderboard.'}</p> : <>
      {available && (entries.length ? <ol className="leaderboard-list">{entries.map((entry, index) => <li key={`${index}-${entry.display_name}`}><span className="leaderboard-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{entry.display_name}</strong><small>{entry.first_name} {entry.last_name}</small></div><b>{entry.xp.toLocaleString(es ? 'es-DO' : 'en-GB')} XP</b></li>)}</ol> : <p>{es ? 'El podio espera a sus primeros exploradores.' : 'The leaderboard awaits its first explorers.'}</p>)}
      <div className="campaign-actions"><button className="campaign-primary" disabled={busy || !available} onClick={() => void publish()}>{es ? 'PUBLICAR MIS XP' : 'PUBLISH MY XP'}</button><button className="campaign-secondary" disabled={busy || !available} onClick={() => void publish(true)}>{es ? 'RETIRARME DEL PODIO' : 'REMOVE MY SCORE'}</button></div>
    </>}{message && <p role="status">{message}</p>}
  </section>;
}
