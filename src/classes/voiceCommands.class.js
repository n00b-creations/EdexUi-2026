(function (global) {
  // Simple voice commands mapper. Map phrases to structured actions.
  // Rule: each entry has a regex and a function that returns an action object.
  function VoiceCommands(rules) {
    this.rules = rules || [];
  }

  VoiceCommands.prototype.map = function (text) {
    if (!text) return null;
    const t = text.toLowerCase().trim();
    for (let r of this.rules) {
      const m = t.match(r.pattern);
      if (m) {
        try { return r.action(m, text); } catch (e) { console.warn('voice rule failed', e); }
      }
    }
    return null;
  };

  // common rules provided factory
  VoiceCommands.common = function () {
    return new VoiceCommands([
      { pattern: /^(?:open|show) app(?:lication)?s?/, action: () => ({ type: 'openAppManager' }) },
      { pattern: /^(?:open|show) files|(?:open|show) file explorer/, action: () => ({ type: 'openSystemExplorer' }) },
      { pattern: /^(?:show|display) processes|(?:show|display) process list/, action: () => ({ type: 'showProcesses' }) },
      { pattern: /^(?:run|execute) (.+)/, action: (m, raw) => ({ type: 'term', payload: { command: m[1], raw: true } }) },
      { pattern: /^speak (.+)/, action: (m) => ({ type: 'speak', payload: { text: m[1] } }) }
    ]);
  };

  global.createVoiceCommands = function () { return VoiceCommands.common(); };

})(window);
