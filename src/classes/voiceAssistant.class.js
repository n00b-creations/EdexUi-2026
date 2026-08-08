(function (global) {
  // Enhanced Voice Assistant with safety guards, command prefix, mapping layer and optional websocket ASR fallback
  function VoiceAssistant(opts = {}) {
    this.enabled = false;
    this.language = opts.language || 'en-US';
    this.interimResults = !!opts.interimResults;
    this.continuous = !!opts.continuous;
    this.commandPrefix = typeof opts.commandPrefix === 'string' ? opts.commandPrefix.trim() : null; // e.g. 'run'
    this.requireConfirmation = !!opts.requireConfirmation; // whether to show a confirmation modal before executing
    this.autoSpeak = !!opts.autoSpeak;
    this.mapping = opts.mapping || null; // expected to be an object with map(text) -> action
    this.wsAsrUrl = opts.wsAsrUrl || null; // ws://host:port for fallback ASR

    this.recognition = null;
    this.ws = null;
    this._init();
  }

  VoiceAssistant.prototype._init = function () {
    // Prefer native SpeechRecognition
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.language;
        this.recognition.interimResults = this.interimResults;
        this.recognition.continuous = this.continuous;

        this.recognition.onresult = (ev) => {
          let transcript = '';
          for (let i = ev.resultIndex; i < ev.results.length; ++i) transcript += ev.results[i][0].transcript;
          transcript = transcript.trim();
          if (ev.results[ev.results.length-1].isFinal) this._handleFinalTranscript(transcript);
        };

        this.recognition.onerror = (ev) => { console.warn('VoiceAssistant recognition error', ev); };
        this.recognition.onend = () => { if (this.enabled && this.continuous) { try { this.recognition.start(); } catch(e){} } };
        return;
      }
    } catch (e) {
      console.warn('Native SpeechRecognition init failed', e);
    }

    // Fallback: attempt to open WebSocket ASR if provided
    if (this.wsAsrUrl) {
      try {
        this.ws = new WebSocket(this.wsAsrUrl);
        this.ws.onopen = () => { console.info('VoiceAssistant connected to ASR WS'); };
        this.ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data && data.text) this._handleFinalTranscript(data.text.trim());
          } catch (e) {}
        };
        this.ws.onerror = (ev) => { console.warn('VoiceAssistant WS error', ev); };
        this.ws.onclose = () => { console.info('VoiceAssistant WS closed'); };
      } catch (e) {
        console.warn('VoiceAssistant WS init failed', e);
        this.ws = null;
      }
    }
  };

  VoiceAssistant.prototype._handleFinalTranscript = function (text) {
    if (!text) return;
    const cleaned = text.replace(/\s+\./g, '.').trim();

    // Check mapping first
    let mapped = null;
    if (this.mapping && typeof this.mapping.map === 'function') {
      try { mapped = this.mapping.map(cleaned); } catch (e) { console.warn('mapping failed', e); }
    }

    const execute = (action) => {
      if (!action) return;
      // If action.type === 'term' and action.payload.raw === true -> write raw terminal command
      if (action.type === 'term') {
        if (this.requireConfirmation) return this._confirmThenExecute(action.payload.command);
        this._sendToTerminal(action.payload.command);
        return;
      }
      // Known app actions: openAppManager, openSystemExplorer, showProcesses, toggleFullScreen etc.
      switch (action.type) {
        case 'openAppManager':
          if (typeof window.openAppManager === 'function') window.openAppManager();
          break;
        case 'openSystemExplorer':
          window.openSystemFileExplorer && window.openSystemFileExplorer();
          break;
        case 'showProcesses':
          // open a modal with processes, reuse appManager or custom
          if (typeof window.openAppManager === 'function') window.openAppManager();
          break;
        case 'speak':
          this.speak(action.payload.text);
          break;
        default:
          console.warn('VoiceAssistant unknown mapped action', action);
      }
    };

    if (mapped) {
      execute(mapped);
      if (this.autoSpeak && mapped.type !== 'speak') this.speak('Executed ' + (mapped.type || 'command'));
      return;
    }

    // If not mapped, check prefix
    if (this.commandPrefix) {
      const lower = cleaned.toLowerCase();
      if (lower.startsWith(this.commandPrefix.toLowerCase() + ' ')) {
        const cmd = cleaned.substring(this.commandPrefix.length).trim();
        if (!cmd) return;
        if (this.requireConfirmation) return this._confirmThenExecute(cmd);
        return this._sendToTerminal(cmd);
      }
    }

    // Default behavior: if mapping not provided and no prefix, don't execute raw commands unless confirmed
    if (this.requireConfirmation) return this._confirmThenExecute(cleaned);
    // Otherwise, send to terminal (legacy behavior)
    this._sendToTerminal(cleaned);
  };

  VoiceAssistant.prototype._confirmThenExecute = function (cmd) {
    const message = `Execute: ${cmd ? cmd : ''}`;
    // Prefer Modal if present
    try {
      if (typeof Modal === 'function') {
        new Modal({
          type: 'confirm',
          title: 'Voice Command',
          message,
          buttons: [
            { label: 'Cancel', action: 'cancel' },
            { label: 'Execute', action: 'ok' }
          ]
        }, (result) => {
          if (result && result.action === 'ok') this._sendToTerminal(cmd);
        });
        return;
      }
    } catch (e) { console.warn('Modal confirm failed', e); }

    // Fallback to browser confirm
    if (confirm(message)) this._sendToTerminal(cmd);
  };

  VoiceAssistant.prototype._sendToTerminal = function (cmd) {
    try {
      if (window.term && window.currentTerm !== undefined && window.term[window.currentTerm]) {
        const termClient = window.term[window.currentTerm];
        const fn = (typeof termClient.writelr === 'function') ? 'writelr' : 'write';
        termClient[fn](cmd);
      }
    } catch (e) { console.warn('VoiceAssistant send failed', e); }
  };

  VoiceAssistant.prototype.start = function () {
    if (this.recognition) {
      try { this.recognition.start(); this.enabled = true; return true; } catch (e) { console.warn(e); return false; }
    }
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ event: 'start' })); this.enabled = true; return true; } catch (e) { console.warn(e); }
    }
    return false;
  };
  VoiceAssistant.prototype.stop = function () {
    if (this.recognition) {
      try { this.recognition.stop(); this.enabled = false; return true; } catch (e) { console.warn(e); return false; }
    }
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ event: 'stop' })); this.enabled = false; return true; } catch (e) { console.warn(e); }
    }
    return false;
  };

  VoiceAssistant.prototype.speak = function (text) {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return false;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.language;
      synth.speak(u);
      return true;
    } catch (e) { console.warn('speak failed', e); return false; }
  };

  VoiceAssistant.prototype.toggle = function () { return this.enabled ? this.stop() : this.start(); };

  global.createVoiceAssistant = function (opts) { return new VoiceAssistant(opts || {}); };

})(window);
