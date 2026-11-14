import { useState } from 'react';
import { clearEvidence, evidenceExport, isAnswers, readEvidence, saveEvidence, scoreAnswers, type Answers, type LearningEvidence as RecordOfLearning } from '../systems/learningEvidence';
import './learning-evidence.css';
const questions = [
 {title:'¿Qué diferencia existe entre un registro de NASA y un escaneo del juego?',options:['Ambos son mediciones científicas reales.','El registro procede de una fuente real; el escaneo del juego es simulado.','Ambos son datos inventados por el jugador.']},
 {title:'¿Cómo se estudia Júpiter en esta misión?',options:['Caminando sobre su superficie sólida.','Aterrizando un astronauta en su núcleo.','Mediante observación remota y sondas.']},
 {title:'¿Qué indica un evento de EONET seleccionado para la misión?',options:['Que el juego ha demostrado la causa del evento.','Que una fuente ha registrado un evento; la simulación no lo mide.','Que se ha resuelto el problema ambiental.']},
];
export default function LearningEvidence({ completedMissions, transmissionCount }: { completedMissions: number; transmissionCount: number }) {
 const [record,setRecord]=useState<RecordOfLearning | null>(readEvidence);const [answers,setAnswers]=useState<number[]>([-1,-1,-1]);const [consent,setConsent]=useState(false);const [status,setStatus]=useState('');
 const waiting=!!record && !record.after && transmissionCount<=record.before.transmissionsAtAssessment;
 const finished=!!record?.after;
 const submit=(event:React.FormEvent)=>{event.preventDefault();if(!consent || !isAnswers(answers) || waiting || finished) return;
  const assessment={answers:[...answers] as Answers,missionsAtAssessment:completedMissions,transmissionsAtAssessment:transmissionCount,recordedAt:new Date().toISOString().slice(0,10)};
  const next:RecordOfLearning=record?{...record,after:assessment}:{version:1,before:assessment,after:null};
  if(!saveEvidence(next)){setStatus('El navegador no permitió guardar. Revisa la configuración de almacenamiento.');return;}
  setRecord(next);setAnswers([-1,-1,-1]);setConsent(false);setStatus(record?'Evaluación final guardada en este dispositivo.':'Evaluación inicial guardada. Completa una misión para habilitar la evaluación final.');
 };
 const download=()=>{if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(evidenceExport(record),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='orbital-learning-evidence.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section className="learning-evidence" aria-labelledby="learning-title"><h2 id="learning-title">Evaluación educativa voluntaria</h2><p>Compara tres respuestas antes y después de completar una misión. Es una actividad voluntaria, no una prueba validada de aprendizaje ni una medición del impacto del proyecto.</p><p>No escribas nombres ni otros datos personales. Las respuestas permanecen en este navegador; no se envían automáticamente. Puedes borrarlas o descargar un resumen sin respuestas individuales.</p>
 {waiting && <p role="status">Evaluación inicial guardada. Completa y transmite una misión para habilitar la evaluación final.</p>}
 {finished && record.after && <div><p>Resultado inicial: {scoreAnswers(record.before.answers)}/3 · resultado final: {scoreAnswers(record.after.answers)}/3.</p><p>Los resultados son autoseleccionados y editables; no demuestran por sí solos una mejora educativa.</p></div>}
 {!waiting && !finished && <form onSubmit={submit}><h3>{record ? 'Después de la misión' : 'Antes de la próxima misión'}</h3>{questions.map((question,index)=><fieldset key={question.title}><legend>{index+1}. {question.title}</legend>{question.options.map((option,value)=><label key={option}><input type="radio" name={`evidence-${index}`} checked={answers[index]===value} onChange={()=>setAnswers(old=>old.map((answer,i)=>i===index?value:answer))} />{option}</label>)}</fieldset>)}<label className="evidence-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} />Acepto guardar estas respuestas voluntarias en este navegador.</label><button className="systems-primary" disabled={!consent || !isAnswers(answers)}>GUARDAR EVALUACIÓN {record?'FINAL':'INICIAL'}</button></form>}
 {record && <div className="evidence-actions"><button className="systems-secondary" onClick={download}>DESCARGAR RESUMEN</button><button className="systems-secondary" onClick={()=>{if(window.confirm('¿Borrar las evaluaciones guardadas en este navegador?')){if(clearEvidence()){setRecord(null);setStatus('Evaluaciones eliminadas de este navegador.');}else setStatus('No se pudieron borrar las evaluaciones. Revisa el almacenamiento del navegador.');}}}>BORRAR EVALUACIONES</button></div>}{status && <p role="status">{status}</p>}
 </section>;
}
