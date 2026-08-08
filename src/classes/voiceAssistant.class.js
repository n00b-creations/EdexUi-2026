(function (global) {
  // Voice assistant using Web Speech API (speech recognition + TTS).
  // This class does NOT ship any API keys. It uses browser-native SpeechRecognition
  // and SpeechSynthesis available in Electron/Chromium. It will gracefully
  // fail if the platform doesn't support recognition.
  function VoiceAssistant(opts = {}) {
    this.enabled = !!opts.enabled;
    this.language = opts.language || 'en-US';
    this.interimResults = !!opts.interimResults;
    this.continuous = !!opts.continuous;
    this.onCommand = typeof opts.onCommand === 'function' ? opts.onCommand : null; // callback(text)
    this.autoSpeak = !!opts.autoSpeak; // whether assistant should TTS short confirmations

    this.recognition = null;
    this._initRecognition();
  }

  VoiceAssistant.prototype._initRecognition = function () {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = this.language;
      this.recognition.interimResults = this.interimResults;
      this.recognition.continuous = this.continuous;

      this.recognition.onresult = (ev) => {
        let transcript = '';
        for (let i = ev.resultIndex; i < ev.results.length; ++i) {
          transcript += ev.results[i][0].transcript;
        }
        transcript = transcript.trim();
        if (ev.results[ev.results.length-1].isFinal) {
          this._handleFinalTranscript(transcript);
        }
      };

      this.recognition.onerror = (ev) => {
        console.warn('VoiceAssistant recognition error', ev);
      };

      this.recognition.onend = () => {
        // auto-restart if enabled
        if (this.enabled && this.recognition && this.continuous) {
          try { this.recognition.start(); } catch(e){}
        }
      };
    } catch (e) {
      console.warn('VoiceAssistant init failed', e);
      this.recognition = null;
    }
  };

  VoiceAssistant.prototype._handleFinalTranscript = function (text) {
    if (!text) return;
    // Clean up common filler
    const cleaned = text.replace(/\s+\./g, '.').trim();

    if (this.onCommand) {
      try { this.onCommand(cleaned); } catch(e) { console.warn(e); }
    } else {
      // default: write to the current terminal and press enter
      try {
        if (window.term && window.currentTerm !== undefined && window.term[window.currentTerm]) {
          const termClient = window.term[window.currentTerm];
          const fn = (typeof termClient.writelr === 'function') ? 'writelr' : 'write';
          termClient[fn](cleaned);
        }
      } catch (e) {
        console.warn('VoiceAssistant default onCommand failed', e);
      }
    }

    if (this.autoSpeak) {
      this.speak('Command received: ' + cleaned);
    }
  };

  VoiceAssistant.prototype.start = function () {
    if (!this.recognition) return false;
    try {
      this.recognition.start();
      this.enabled = true;
      return true;
    } catch (e) {
      console.warn('VoiceAssistant start failed', e);
      return false;
    }
  };

  VoiceAssistant.prototype.stop = function () {
    if (!this.recognition) return false;
    try {
      this.recognition.stop();
      this.enabled = false;
      return true;
    } catch (e) {
      console.warn('VoiceAssistant stop failed', e);
      return false;
    }
  };

  VoiceAssistant.prototype.speak = function (text) {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return false;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = this.language;
      synth.speak(utter);
      return true;
    } catch (e) {
      console.warn('VoiceAssistant speak failed', e);
      return false;
    }
  };

  VoiceAssistant.prototype.toggle = function () {
    if (this.enabled) return this.stop();
    return this.start();
  };

  // Global helper
  global.createVoiceAssistant = function (opts) {
    return new VoiceAssistant(opts || {});
  };

})(window);
