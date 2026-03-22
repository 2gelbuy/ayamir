// Lightweight content script — only listens for messages from background.
// The heavy React UI is injected programmatically only when needed.
// This script itself has ZERO imports from React/Dexie/Tailwind.
// All UI is built with createElement/textContent — no innerHTML for XSS safety.

import type { ContentScriptSettings } from '@/lib/db';

const t = (key: string, fallback: string) => chrome.i18n.getMessage(key) || fallback;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style?: Partial<CSSStyleDeclaration>,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (style) Object.assign(node.style, style);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function svgEl(html: string, w: number, h: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  // SVG paths are static/hardcoded — safe to use innerHTML for SVG internals only
  svg.innerHTML = html;
  return svg;
}

// Track overlay count to properly restore overflow
let overlayCount = 0;
let savedOverflow = '';

function pushOverflow() {
  if (overlayCount === 0) savedOverflow = document.body.style.overflow;
  overlayCount++;
  document.body.style.overflow = 'hidden';
}

function popOverflow() {
  overlayCount = Math.max(0, overlayCount - 1);
  if (overlayCount === 0) document.body.style.overflow = savedOverflow;
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  async main() {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (sender.id !== chrome.runtime.id) return;
      if (message.action === 'injectBlockPage') injectBlockOverlay(message.settings);
      if (message.action === 'injectTicker') injectTicker(message.settings);
      if (message.action === 'toggleCommandPalette') injectPalette();
    });

    try {
      chrome.runtime.sendMessage(
        { action: 'checkPage', hostname: window.location.hostname },
        (response) => {
          if (chrome.runtime.lastError) return;
          if (response?.needsBlock) injectBlockOverlay(response.settings);
          if (response?.needsTicker) injectTicker(response.settings);
        }
      );
    } catch {
      // Extension context invalidated
    }
  },
});

// ── Block overlay (pure DOM — no innerHTML for user/i18n data) ──

function injectBlockOverlay(settings: ContentScriptSettings | null) {
  if (document.getElementById('ayamir-block-overlay')) return;

  const isDeepWork = settings?.isDeepWorkActive;
  const quotes = [
    t('quote1', 'I am choosing short-term comfort over long-term goals.'),
    t('quote2', 'Procrastination is the thief of time and the grave of opportunity.'),
    t('quote3', 'Discipline is choosing between what you want now and what you want most.'),
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  const overlay = el('div', {
    position: 'fixed', inset: '0', zIndex: '2147483647',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a, #134e4a)',
    fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff',
  });
  overlay.id = 'ayamir-block-overlay';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-label', isDeepWork ? 'Deep Work Active' : 'Focus Mode Active');

  const card = el('div', { maxWidth: '420px', textAlign: 'center', padding: '40px' });

  // Icon
  const iconWrap = el('div', {
    width: '80px', height: '80px', margin: '0 auto 32px', borderRadius: '24px',
    background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  const svg = svgEl(
    isDeepWork
      ? '<path d="M12 2a7 7 0 0 0-7 7c0 3 2 6 4 8l3 3 3-3c2-2 4-5 4-8a7 7 0 0 0-7-7z"/>'
      : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    40, 40
  );
  svg.setAttribute('stroke', isDeepWork ? '#818cf8' : '#94a3b8');
  iconWrap.appendChild(svg);
  card.appendChild(iconWrap);

  // Title
  const h1 = el('h1', { fontSize: '28px', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.5px' });
  h1.textContent = isDeepWork ? t('blockDeepWorkActive', 'Deep Work Active') : t('blockFocusActive', 'Focus Mode Active');
  card.appendChild(h1);

  // Subtitle
  const subtitle = el('p', { color: 'rgba(255,255,255,0.4)', fontSize: '15px', margin: '0 0 8px', lineHeight: '1.5' });
  subtitle.textContent = isDeepWork
    ? t('blockDeepWorkMsg', 'You are in a focus session. Stay on track.')
    : t('blockFocusMsg', 'You have tasks to complete. Is this site really needed?');
  card.appendChild(subtitle);

  // Timer (deep work only)
  let timerEl: HTMLElement | null = null;
  if (isDeepWork && settings?.deepWorkEndTime) {
    timerEl = el('div', {
      fontSize: '48px', fontWeight: '800', color: '#818cf8',
      fontFamily: 'ui-monospace,monospace', letterSpacing: '-2px', marginTop: '12px',
    });
    const remaining = Math.max(0, Math.floor((settings.deepWorkEndTime - Date.now()) / 1000));
    timerEl.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    card.appendChild(timerEl);
  }

  // Buttons
  const btnWrap = el('div', { marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' });

  const closeTabBtn = el('button', {
    width: '100%', padding: '16px', border: '0', borderRadius: '16px',
    background: isDeepWork ? '#4f46e5' : 'rgba(255,255,255,0.1)',
    color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  });
  closeTabBtn.textContent = t('blockCloseTab', 'Close Tab & Get to Work');

  const continueBtn = el('button', {
    width: '100%', padding: '12px', border: '0', background: 'transparent',
    color: 'rgba(255,255,255,0.25)', fontSize: '13px', cursor: 'pointer',
  });
  continueBtn.textContent = t('blockContinue', 'I really need this for work (Continue)');

  btnWrap.appendChild(closeTabBtn);
  btnWrap.appendChild(continueBtn);
  card.appendChild(btnWrap);

  // Challenge section
  const challengeDiv = el('div', { display: 'none', textAlign: 'left', marginTop: '24px' });

  const promptBox = el('div', {
    padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '16px', fontSize: '13px', color: '#fca5a5', marginBottom: '16px',
  });
  const promptText = document.createTextNode(t('blockTypePrompt', 'Type the following text exactly to proceed:'));
  promptBox.appendChild(promptText);
  promptBox.appendChild(document.createElement('br'));
  promptBox.appendChild(document.createElement('br'));
  const quoteStrong = el('strong', { color: 'rgba(255,255,255,0.85)', userSelect: 'none' });
  quoteStrong.textContent = quote;
  promptBox.appendChild(quoteStrong);
  challengeDiv.appendChild(promptBox);

  const textarea = el('textarea', {
    width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
    color: '#fff', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box',
  }, { rows: '3', placeholder: t('blockTypePlaceholder', 'Type the text above...') });

  challengeDiv.appendChild(textarea);

  const challengeBtns = el('div', { display: 'flex', gap: '12px', marginTop: '12px' });
  const cancelBtn = el('button', {
    flex: '1', padding: '12px', border: '0', borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer',
  });
  cancelBtn.textContent = t('cancel', 'Cancel');

  const submitBtn = el('button', {
    flex: '1', padding: '12px', border: '0', borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)', fontSize: '13px', cursor: 'not-allowed',
  });
  submitBtn.textContent = t('blockUnlock', 'Unlock Site');
  submitBtn.disabled = true;

  challengeBtns.appendChild(cancelBtn);
  challengeBtns.appendChild(submitBtn);
  challengeDiv.appendChild(challengeBtns);
  card.appendChild(challengeDiv);

  overlay.appendChild(card);
  pushOverflow();
  document.body.appendChild(overlay);

  let blockInterval: ReturnType<typeof setInterval> | null = null;
  const removeOverlay = () => {
    if (blockInterval) clearInterval(blockInterval);
    overlay.remove();
    popOverflow();
  };

  closeTabBtn.addEventListener('click', () => {
    removeOverlay();
    try { chrome.runtime.sendMessage({ action: 'closeTab' }); } catch {}
  });

  continueBtn.addEventListener('click', () => {
    challengeDiv.style.display = 'block';
    continueBtn.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    challengeDiv.style.display = 'none';
    continueBtn.style.display = 'block';
    textarea.value = '';
  });

  textarea.addEventListener('paste', e => e.preventDefault());
  textarea.addEventListener('input', () => {
    const match = textarea.value === quote;
    submitBtn.disabled = !match;
    submitBtn.style.background = match ? '#dc2626' : 'rgba(255,255,255,0.05)';
    submitBtn.style.color = match ? '#fff' : 'rgba(255,255,255,0.15)';
    submitBtn.style.cursor = match ? 'pointer' : 'not-allowed';
  });

  submitBtn.addEventListener('click', () => {
    if (textarea.value === quote) removeOverlay();
  });

  // Timer update
  if (isDeepWork && settings?.deepWorkEndTime && timerEl) {
    const endTime = settings.deepWorkEndTime;
    blockInterval = setInterval(() => {
      const rem = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      if (rem <= 0) { clearInterval(blockInterval!); return; }
      timerEl!.textContent = `${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(rem % 60).padStart(2, '0')}`;
    }, 1000);
  }
}

// ── Floating Deep Work ticker (pure DOM) ──

function injectTicker(settings: ContentScriptSettings | null) {
  if (document.getElementById('ayamir-ticker')) return;
  if (!settings?.deepWorkEndTime) return;
  const endTime = settings.deepWorkEndTime;
  const totalSec = settings.deepWorkModeDuration * 60;

  const ticker = el('div', {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483645',
    background: 'rgba(15,23,42,0.95)', color: '#fff', padding: '14px 20px',
    borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    border: '1px solid rgba(51,65,85,0.5)', backdropFilter: 'blur(12px)',
    fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '10px',
    transition: 'transform 0.2s', cursor: 'default',
  });
  ticker.id = 'ayamir-ticker';

  // Icon
  const tickerSvg = svgEl('<path d="M12 2a7 7 0 0 0-7 7c0 3 2 6 4 8l3 3 3-3c2-2 4-5 4-8a7 7 0 0 0-7-7z"/>', 20, 20);
  tickerSvg.setAttribute('stroke', '#818cf8');
  ticker.appendChild(tickerSvg);

  // Text container
  const textDiv = el('div');
  const labelDiv = el('div', {
    fontSize: '9px', fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '1px',
  });
  labelDiv.textContent = 'Deep Work';
  const timeDiv = el('div', {
    fontSize: '20px', fontWeight: '800', fontFamily: 'ui-monospace,monospace', letterSpacing: '-1px',
  });
  timeDiv.textContent = '--:--';
  textDiv.appendChild(labelDiv);
  textDiv.appendChild(timeDiv);
  ticker.appendChild(textDiv);

  // Progress bar
  const barBg = el('div', {
    position: 'absolute', bottom: '0', left: '0', right: '0', height: '3px',
    background: '#1e293b', borderRadius: '0 0 16px 16px', overflow: 'hidden',
  });
  const barFill = el('div', {
    height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
    transition: 'width 1s linear',
  });
  barBg.appendChild(barFill);
  ticker.appendChild(barBg);

  document.body.appendChild(ticker);
  ticker.addEventListener('mouseenter', () => { ticker.style.transform = 'scale(1.05)'; });
  ticker.addEventListener('mouseleave', () => { ticker.style.transform = 'scale(1)'; });

  const interval = setInterval(() => {
    const rem = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    if (rem <= 0) { ticker.remove(); clearInterval(interval); return; }
    timeDiv.textContent = `${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(rem % 60).padStart(2, '0')}`;
    barFill.style.width = `${(rem / totalSec) * 100}%`;
  }, 1000);
}

// ── Command Palette (pure DOM — no innerHTML) ──

function injectPalette() {
  const existing = document.getElementById('ayamir-palette');
  if (existing) { existing.remove(); popOverflow(); return; }

  let currentPriority = 'medium';

  const backdrop = el('div', {
    position: 'fixed', inset: '0', zIndex: '2147483647',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20vh',
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
    fontFamily: 'system-ui, sans-serif',
  });
  backdrop.id = 'ayamir-palette';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-label', 'Add new task');

  const panel = el('div', {
    background: '#fff', width: '100%', maxWidth: '540px', borderRadius: '16px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
  });

  // Form row
  const form = document.createElement('form');
  Object.assign(form.style, {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
    borderBottom: '1px solid #f1f5f9',
  });

  const iconDiv = el('div', {
    width: '32px', height: '32px', borderRadius: '12px',
    background: 'linear-gradient(135deg,#0d9488,#059669)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  });
  const boltSvg = svgEl('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', 16, 16);
  boltSvg.setAttribute('stroke', '#fff');
  boltSvg.setAttribute('stroke-width', '2');
  iconDiv.appendChild(boltSvg);

  const input = el('input', {
    flex: '1', border: '0', outline: '0', fontSize: '17px', fontWeight: '500',
    color: '#1e293b', background: 'transparent',
  }, { type: 'text', placeholder: t('quickTaskPlaceholder', 'Add a quick task...'), autofocus: '' });
  input.setAttribute('aria-label', 'Task title');

  const saveBtn = el('button', {
    display: 'none', padding: '8px 16px',
    background: 'linear-gradient(135deg,#0d9488,#059669)', color: '#fff',
    border: '0', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
  }, { type: 'submit' });
  saveBtn.textContent = 'Save';

  form.appendChild(iconDiv);
  form.appendChild(input);
  form.appendChild(saveBtn);
  panel.appendChild(form);

  // Footer
  const footer = el('div', {
    background: '#f8fafc', padding: '10px 16px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
  });
  const prioContainer = el('div', { display: 'flex', gap: '6px' });
  const escHint = el('span', { fontSize: '10px', fontWeight: '600', color: '#94a3b8' });
  escHint.textContent = 'ESC to close';
  footer.appendChild(prioContainer);
  footer.appendChild(escHint);
  panel.appendChild(footer);
  backdrop.appendChild(panel);

  const priorities = [
    { id: 'low', color: '#94a3b8' },
    { id: 'medium', color: '#3b82f6' },
    { id: 'high', color: '#f97316' },
    { id: 'urgent', color: '#ef4444' },
  ];

  function renderPriorities() {
    prioContainer.replaceChildren();
    priorities.forEach(p => {
      const btn = el('button', {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '8px', border: '0',
        background: currentPriority === p.id ? '#1e293b' : 'transparent',
        color: currentPriority === p.id ? '#fff' : '#94a3b8',
        fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '0.5px', cursor: 'pointer',
      }, { type: 'button' });
      const dot = el('span', {
        width: '8px', height: '8px', borderRadius: '50%',
        background: p.color, display: 'inline-block',
      });
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(p.id));
      btn.addEventListener('click', () => { currentPriority = p.id; renderPriorities(); });
      prioContainer.appendChild(btn);
    });
  }
  renderPriorities();

  pushOverflow();
  document.body.appendChild(backdrop);

  input.addEventListener('input', () => {
    saveBtn.style.display = input.value.trim() ? 'block' : 'none';
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closePalette();
  };

  const closePalette = () => {
    backdrop.remove();
    popOverflow();
    document.removeEventListener('keydown', escHandler);
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closePalette();
  });

  document.addEventListener('keydown', escHandler);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    const url = window.location.href;
    const safeUrl = /^https?:\/\//.test(url) ? url : undefined;
    try {
      chrome.runtime.sendMessage({
        action: 'createTask',
        task: { title, startTime: null, isCompleted: false, createdAt: new Date(), priority: currentPriority, url: safeUrl }
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
