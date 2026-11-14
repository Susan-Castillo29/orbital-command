import { Component, type ReactNode } from 'react';
export default class SceneBoundary extends Component<{ children: ReactNode; language: 'en' | 'es' }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      const spanish = this.props.language === 'es';
      return <section className="systems-loading" role="alert"><div><h2>{spanish ? 'No se pudo abrir esta vista' : 'This view could not be opened'}</h2><p>{spanish ? 'Si la aplicación se actualizó o falló la conexión, recarga la página. Comprueba también que WebGL esté habilitado.' : 'If the app was updated or the connection failed, reload the page. Check that WebGL is enabled.'}</p><button className="primary-button" onClick={() => window.location.reload()}>{spanish ? 'Recargar aplicación' : 'Reload application'}</button></div></section>;
    }
    return this.props.children;
  }
}
