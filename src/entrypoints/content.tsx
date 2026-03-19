// Lightweight content script — only listens for messages from background.
// The heavy React UI is injected programmatically only when needed.
// This script itself has ZERO imports from React/Dexie/Tailwind.

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    // Listen for messages from background to inject UI
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'injectBlockPage') {
        injectBlockOverlay(message.settings);
      }
      if (message.action === 'injectTicker') {
        injectTicker(message.settings);
      }
      if (message.action === 'toggleCommandPalette') {
        injectPalette();
      }
    });

    // On load, ask background if this page needs blocking
    try {
      chrome.runtime.sendMessage(
        { action: 'checkPage', hostname: window.location.hostname },
        (response) => {
          if (chrome.runtime.lastError) return;
          if (response?.needsBlock) {
            injectBlockOverlay(response.settings);
          }
          if (response?.needsTicker) {
            injectTicker(response.settings);
          }
        }
      );
    } catch {
      // Extension context invalidated
    }
  },
});

// ── Inline block overlay (no React, no Tailwind — pure DOM + inline styles) ──

function injectBlockOverlay(settings: any) {
  if (document.getElementById('ayamir-block-overlay')) return;

  const isDeepWork = settings?.isDeepWorkActive;
  const quotes = [
    'I am choosing short-term comfort over long-term goals.',
    'Procrastination is the thief of time and the grave of opportunity.',
    'Discipline is choosing between what you want now and what you want most.',
  ];

  const overlay = document.createElement('div');
  overlay.id = 'ayamir-block-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '2147483647',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
  });

  let timerHtml = '';
  if (isDeepWork && settings.deepWorkEndTime) {
    const remaining = Math.max(0, Math.floor((settings.deepWorkEndTime - Date.now()) / 1000));
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    timerHtml = `<div style="font-size:48px;font-weight:800;color:#818cf8;font-family:ui-monospace,monospace;letter-spacing:-2px;margin-top:12px">${mm}:${ss}</div>`;
  }

  overlay.innerHTML = `
    <div style="max-width:420px;text-align:center;padding:40px">
      <div style="width:80px;height:80px;margin:0 auto 32px;border-radius:24px;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${isDeepWork ? '#818cf8' : '#94a3b8'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          ${isDeepWork
            ? '<path d="M12 2a7 7 0 0 0-7 7c0 3 2 6 4 8l3 3 3-3c2-2 4-5 4-8a7 7 0 0 0-7-7z"/>'
            : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'}
        </svg>
      </div>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px">
        ${isDeepWork ? 'Deep Work Active' : 'Focus Mode Active'}
      </h1>
      <p style="color:rgba(255,255,255,0.4);font-size:15px;margin:0 0 8px;line-height:1.5">
        ${isDeepWork
          ? 'You are in a focus session. Stay on track.'
          : 'You have tasks to complete. Is this site really needed?'}
      </p>
      ${timerHtml}
      <div style="margin-top:32px;display:flex;flex-direction:column;gap:12px">
        <button id="ayamir-close-tab" style="width:100%;padding:16px;border:0;border-radius:16px;background:${isDeepWork ? '#4f46e5' : 'rgba(255,255,255,0.1)'};color:#fff;font-size:15px;font-weight:600;cursor:pointer">
          Close Tab & Get to Work
        </button>
        <button id="ayamir-continue" style="width:100%;padding:12px;border:0;background:transparent;color:rgba(255,255,255,0.25);font-size:13px;cursor:pointer">
          I really need this for work (Continue)
        </button>
      </div>
      <div id="ayamir-challenge" style="display:none;text-align:left;margin-top:24px">
        <div style="padding:16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:16px;font-size:13px;color:#fca5a5;margin-bottom:16px">
          Type the following text exactly to proceed:<br><br>
          <strong id="ayamir-quote" style="color:rgba(255,255,255,0.85);user-select:none"></strong>
        </div>
        <textarea id="ayamir-challenge-input" rows="3" style="width:100%;padding:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;color:#fff;font-size:13px;resize:none;outline:none;box-sizing:border-box" placeholder="Type the text above..."></textarea>
        <div style="display:flex;gap:12px;margin-top:12px">
          <button id="ayamir-challenge-cancel" style="flex:1;padding:12px;border:0;border-radius:16px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);font-size:13px;cursor:pointer">Cancel</button>
          <button id="ayamir-challenge-submit" disabled style="flex:1;padding:12px;border:0;border-radius:16px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.15);font-size:13px;cursor:not-allowed">Unlock Site</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  overlay.querySelector('#ayamir-close-tab')!.addEventListener('click', () => {
    try { chrome.runtime.sendMessage({ action: 'closeTab' }); } catch {}
  });

  overlay.querySelector('#ayamir-continue')!.addEventListener('click', () => {
    const challengeDiv = overlay.querySelector('#ayamir-challenge') as HTMLElement;
    const continueBtn = overlay.querySelector('#ayamir-continue') as HTMLElement;
    (overlay.querySelector('#ayamir-quote') as HTMLElement).textContent = quote;
    challengeDiv.style.display = 'block';
    continueBtn.style.display = 'none';
  });

  overlay.querySelector('#ayamir-challenge-cancel')!.addEventListener('click', () => {
    const challengeDiv = overlay.querySelector('#ayamir-challenge') as HTMLElement;
    const continueBtn = overlay.querySelector('#ayamir-continue') as HTMLElement;
    challengeDiv.style.display = 'none';
    continueBtn.style.display = 'block';
    (overlay.querySelector('#ayamir-challenge-input') as HTMLTextAreaElement).value = '';
  });

  const input = overlay.querySelector('#ayamir-challenge-input') as HTMLTextAreaElement;
  const submitBtn = overlay.querySelector('#ayamir-challenge-submit') as HTMLButtonElement;

  input.addEventListener('paste', e => e.preventDefault());
  input.addEventListener('input', () => {
    const match = input.value === quote;
    submitBtn.disabled = !match;
    submitBtn.style.background = match ? '#dc2626' : 'rgba(255,255,255,0.05)';
    submitBtn.style.color = match ? '#fff' : 'rgba(255,255,255,0.15)';
    submitBtn.style.cursor = match ? 'pointer' : 'not-allowed';
  });

  submitBtn.addEventListener('click', () => {
    if (input.value === quote) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  });

  // Update timer every second if deep work
  if (isDeepWork && settings.deepWorkEndTime) {
    const timerEl = overlay.querySelector('div[style*="font-size:48px"]');
    if (timerEl) {
      const interval = setInterval(() => {
        const rem = Math.max(0, Math.floor((settings.deepWorkEndTime - Date.now()) / 1000));
        if (rem <= 0) { clearInterval(interval); return; }
        const m = String(Math.floor(rem / 60)).padStart(2, '0');
        const s = String(rem % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
      }, 1000);
    }
  }
}

// ── Floating Deep Work ticker (pure DOM) ──

function injectTicker(settings: any) {
  if (document.getElementById('ayamir-ticker')) return;
  if (!settings?.deepWorkEndTime) return;

  const ticker = document.createElement('div');
  ticker.id = 'ayamir-ticker';
  Object.assign(ticker.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483645',
    background: 'rgba(15,23,42,0.95)', color: '#fff', padding: '14px 20px',
    borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    border: '1px solid rgba(51,65,85,0.5)', backdropFilter: 'blur(12px)',
    fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '10px',
    transition: 'transform 0.2s', cursor: 'default',
  });

  ticker.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a7 7 0 0 0-7 7c0 3 2 6 4 8l3 3 3-3c2-2 4-5 4-8a7 7 0 0 0-7-7z"/>
    </svg>
    <div>
      <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Deep Work</div>
      <div id="ayamir-ticker-time" style="font-size:20px;font-weight:800;font-family:ui-monospace,monospace;letter-spacing:-1px">--:--</div>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:#1e293b;border-radius:0 0 16px 16px;overflow:hidden">
      <div id="ayamir-ticker-bar" style="height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);transition:width 1s linear"></div>
    </div>
  `;

  document.body.appendChild(ticker);
  ticker.addEventListener('mouseenter', () => { ticker.style.transform = 'scale(1.05)'; });
  ticker.addEventListener('mouseleave', () => { ticker.style.transform = 'scale(1)'; });

  const timeEl = ticker.querySelector('#ayamir-ticker-time')!;
  const barEl = ticker.querySelector('#ayamir-ticker-bar') as HTMLElement;
  const totalSec = settings.deepWorkModeDuration * 60;

  const interval = setInterval(() => {
    const rem = Math.max(0, Math.floor((settings.deepWorkEndTime - Date.now()) / 1000));
    if (rem <= 0) { ticker.remove(); clearInterval(interval); return; }
    const m = String(Math.floor(rem / 60)).padStart(2, '0');
    const s = String(rem % 60).padStart(2, '0');
    timeEl.textContent = `${m}:${s}`;
    barEl.style.width = `${(rem / totalSec) * 100}%`;
  }, 1000);
}

// ── Command Palette (pure DOM — no React) ──

function injectPalette() {
  const existing = document.getElementById('ayamir-palette');
  if (existing) { existing.remove(); document.body.style.overflow = ''; return; }

  const backdrop = document.createElement('div');
  backdrop.id = 'ayamir-palette';
  Object.assign(backdrop.style, {
    position: 'fixed', inset: '0', zIndex: '2147483647',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20vh',
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
    fontFamily: 'system-ui, sans-serif',
  });

  let currentPriority = 'medium';

  backdrop.innerHTML = `
    <div style="background:#fff;width:100%;max-width:540px;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden">
      <form id="ayamir-palette-form" style="display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid #f1f5f9">
        <div style="width:32px;height:32px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <input id="ayamir-palette-input" type="text" placeholder="Add a quick task..." style="flex:1;border:0;outline:0;font-size:17px;font-weight:500;color:#1e293b;background:transparent" autofocus />
        <button id="ayamir-palette-submit" type="submit" style="display:none;padding:8px 16px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:0;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">Save</button>
      </form>
      <div style="background:#f8fafc;padding:10px 16px;display:flex;align-items:center;justify-content:space-between">
        <div id="ayamir-priorities" style="display:flex;gap:6px"></div>
        <span style="font-size:10px;font-weight:600;color:#94a3b8">ESC to close</span>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  const input = backdrop.querySelector('#ayamir-palette-input') as HTMLInputElement;
  const submitBtn = backdrop.querySelector('#ayamir-palette-submit') as HTMLButtonElement;
  const form = backdrop.querySelector('#ayamir-palette-form') as HTMLFormElement;
  const prioContainer = backdrop.querySelector('#ayamir-priorities') as HTMLElement;

  const priorities = [
    { id: 'low', color: '#94a3b8' },
    { id: 'medium', color: '#3b82f6' },
    { id: 'high', color: '#f97316' },
    { id: 'urgent', color: '#ef4444' },
  ];

  function renderPriorities() {
    prioContainer.innerHTML = '';
    priorities.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = currentPriority === p.id;
      Object.assign(btn.style, {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '8px', border: '0',
        background: isActive ? '#1e293b' : 'transparent',
        color: isActive ? '#fff' : '#94a3b8',
        fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '0.5px', cursor: 'pointer',
      });
      btn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>${p.id}`;
      btn.addEventListener('click', () => { currentPriority = p.id; renderPriorities(); });
      prioContainer.appendChild(btn);
    });
  }
  renderPriorities();

  input.addEventListener('input', () => {
    submitBtn.style.display = input.value.trim() ? 'block' : 'none';
  });

  const closePalette = () => {
    backdrop.remove();
    document.body.style.overflow = '';
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closePalette();
  });

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closePalette();
      document.removeEventListener('keydown', escHandler);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    try {
      chrome.runtime.sendMessage({
        action: 'createTask',
        task: {
          title: input.value.trim(),
          startTime: null,
          isCompleted: false,
          createdAt: new Date(),
          priority: currentPriority,
          url: window.location.href,
        }
      }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response?.success) closePalette();
      });
    } catch {
      // Extension context invalidated
    }
  });

  input.focus();
}
