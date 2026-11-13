import { Component, type ReactNode } from 'react';
export default class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="systems-loading" role="alert"><div><h2>No se pudo abrir esta vista</h2><p>Comprueba que WebGL esté habilitado. Puedes reintentar o volver a Operaciones.</p><button className="primary-button" onClick={() => this.setState({ failed: false })}>Reintentar vista</button></div></section>;
    return this.props.children;
  }
}
