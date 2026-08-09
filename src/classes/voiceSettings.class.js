(function(global){
  // Voice settings modal helper. Exposes openVoiceSettings() which shows a modal
  // and lets the user configure assistant options and PIN.
  function openVoiceSettingsModal() {
    if (document.getElementById('voiceSettingsModal')) return;
    try {
      const current = (typeof window.settings === 'object') ? window.settings : {};
      const prefix = current.voiceCommandPrefix || '';
      const requireConfirmation = !!current.voiceRequireConfirmation;
      const requirePin = !!current.voiceRequirePin;
      const pin = current.voicePin || '';
      const ws = current.voiceWsAsrUrl || '';
      const enableOffscreen = !!current.enableOffscreenThree;

      new Modal({
        type: 'custom',
        title: 'Voice Assistant Settings',
        html: `<div id="voiceSettingsModal">
          <table>
            <tr><td>Command Prefix</td><td><input id="voiceSettings-prefix" type="text" value="${window._escapeHtml(prefix)}" placeholder="e.g. run"></td></tr>
            <tr><td>Require Confirmation</td><td><select id="voiceSettings-requireConfirmation"><option>${requireConfirmation}</option><option>${!requireConfirmation}</option></select></td></tr>
            <tr><td>Require PIN</td><td><select id="voiceSettings-requirePin"><option>${requirePin}</option><option>${!requirePin}</option></select></td></tr>
            <tr><td>PIN (4+ chars)</td><td><input id="voiceSettings-pin" type="password" value="${window._escapeHtml(pin)}"></td></tr>
            <tr><td>ASR WebSocket URL</td><td><input id="voiceSettings-ws" type="text" value="${window._escapeHtml(ws)}" placeholder="ws://localhost:2700"></td></tr>
            <tr><td>Enable Offscreen Rendering</td><td><select id="voiceSettings-offscreen"><option>${enableOffscreen}</option><option>${!enableOffscreen}</option></select></td></tr>
          </table>
        </div>`,
        buttons: [
          { label: 'Save', action: 'save' },
          { label: 'Cancel', action: 'cancel' }
        ]
      }, (res) => {
        if (!res || res.action !== 'save') return;
        try {
          const nextSettings = {
            ...window.settings,
            voiceCommandPrefix: document.getElementById('voiceSettings-prefix').value.trim() || null,
            voiceRequireConfirmation: (document.getElementById('voiceSettings-requireConfirmation').value === 'true'),
            voiceRequirePin: (document.getElementById('voiceSettings-requirePin').value === 'true'),
            voicePin: document.getElementById('voiceSettings-pin').value.trim() || null,
            voiceWsAsrUrl: document.getElementById('voiceSettings-ws').value.trim() || null,
            enableOffscreenThree: (document.getElementById('voiceSettings-offscreen').value === 'true')
          };
          // persist
          window.settings = nextSettings;
          try { fs.writeFileSync(settingsFile, JSON.stringify(nextSettings, null, 4)); } catch(e){ console.warn('Failed to write settings', e); }
          document.getElementById('settingsEditorStatus') && (document.getElementById('settingsEditorStatus').innerText = 'Voice settings saved');
        } catch (e) {
          console.warn('Save voice settings failed', e);
        }
      });
    } catch (e) {
      console.warn('openVoiceSettingsModal failed', e);
    }
  }

  // expose to global
  global.openVoiceSettings = openVoiceSettingsModal;
})(window);
