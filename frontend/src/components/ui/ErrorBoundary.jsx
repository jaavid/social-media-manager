/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { Component } from 'react';
import RouteFailure from './RouteFailure';

export default class ErrorBoundary extends Component {
  state = { failed: false, referenceId: null };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    const referenceId = globalThis.crypto?.randomUUID?.() || Date.now().toString(16);
    this.setState({ referenceId });
    // Raw errors, editor contents and component stacks never enter logs or error UI.
    this.props.onError?.({ name: 'RenderError' }, null, referenceId);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <RouteFailure
        referenceId={this.state.referenceId}
        reset={() => this.setState({ failed: false, referenceId: null })}
      />
    );
  }
}
