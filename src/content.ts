import { getHumorMessage } from './lib/humor';

let tickerHost: HTMLElement | null = null;
let nudgeHost: HTMLElement | null = null;
let nudgeElement: HTMLElement | null = null;
let tickerTimeout: ReturnType<typeof setTimeout> | null = null;

const createShadowContainer = (hostId: string) => {
  const host = document.createElement('div');
  host.id = hostId;
  const shadow = host.attachShadow({ mode: 'open' });
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('content.css');
  shadow.appendChild(styleLink);
  return { host, shadow };
};

const createTicker = (task: any, timeLeft: string) => {
  if (tickerHost) {
    tickerHost.remove();
  }

  const { host, shadow } = createShadowContainer('edgetask-ticker-host');

  const tickerElement = document.createElement('div');
  tickerElement.id = 'edgetask-ticker';
  tickerElement.className = 'edgetask-ticker';

  // Calculate progress and color
  const now = new Date();
  const startTime = new Date(task.startTime);
  const createdAtRaw = task.createdAt;
  if (createdAtRaw && Object.prototype.toString.call(createdAtRaw) !== '[object Date]') {
    console.warn('EdgeTask Debug [content]: task.createdAt stored as non-Date', {
      taskId: task.id,
      title: task.title,
      createdAtRaw
    });
  }
  if (Number.isNaN(startTime.getTime())) {
    console.warn('EdgeTask Debug [content]: invalid startTime in createTicker', {
      taskId: task.id,
      title: task.title,
      startTime: task.startTime
    });
  }
  const createdAtTime = createdAtRaw ? new Date(createdAtRaw).getTime() : NaN;
  const totalTime = Number.isFinite(createdAtTime)
    ? startTime.getTime() - createdAtTime
    : startTime.getTime() - now.getTime();
  const elapsed = startTime.getTime() - now.getTime();
  const progress = Math.max(0, Math.min(100, totalTime !== 0 ? ((totalTime - elapsed) / totalTime) * 100 : 0));
  if (!Number.isFinite(progress)) {
    console.warn('EdgeTask Debug [content]: progress calculation produced non-finite value', {
      taskId: task.id,
      title: task.title,
      totalTime,
      elapsed,
      createdAtTime
    });
  }

  let progressColor = 'edgetask-progress-green';
  if (progress < 25) {
    progressColor = 'edgetask-progress-red';
  } else if (progress < 50) {
    progressColor = 'edgetask-progress-yellow';
  }

  // Build DOM safely to prevent XSS
  const content = document.createElement('div');
  content.className = 'edgetask-ticker-content';

  const icon = document.createElement('span');
  icon.className = 'edgetask-ticker-icon';
  icon.textContent = '⏰';
  content.appendChild(icon);

  const textContainer = document.createElement('div');
  textContainer.className = 'edgetask-ticker-text-container';

  const tickerText = document.createElement('span');
  tickerText.className = 'edgetask-ticker-text';
  tickerText.textContent = `Until "${task.title}" there are ${timeLeft} left`;
  textContainer.appendChild(tickerText);

  const progressContainer = document.createElement('div');
  progressContainer.className = 'edgetask-ticker-progress-container';

  const progressBar = document.createElement('div');
  progressBar.className = `edgetask-ticker-progress-bar ${progressColor}`;
  progressBar.style.width = `${progress}%`;
  progressContainer.appendChild(progressBar);
  textContainer.appendChild(progressContainer);
  content.appendChild(textContainer);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'edgetask-ticker-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';
  content.appendChild(closeBtn);

  tickerElement.appendChild(content);

  shadow.appendChild(tickerElement);
  document.body.appendChild(host);

  // Add event listener to close button
  closeBtn.addEventListener('click', () => {
    if ((host as any)?.progressInterval) {
      clearInterval((host as any).progressInterval);
    }
    host.remove();
    tickerHost = null;
  });

  tickerElement.addEventListener('mouseenter', () => {
    if (tickerTimeout) {
      clearTimeout(tickerTimeout);
      tickerTimeout = null;
    }
  });

  tickerElement.addEventListener('mouseleave', () => {
    tickerTimeout = setTimeout(() => {
      if (tickerElement) {
        tickerElement.classList.add('edgetask-ticker-fade-out');
        setTimeout(() => {
          if ((host as any)?.progressInterval) {
            clearInterval((host as any).progressInterval);
          }
          host.remove();
          tickerHost = null;
        }, 300);
      }
    }, 10000);
  });

  tickerTimeout = setTimeout(() => {
    if (tickerElement) {
      tickerElement.classList.add('edgetask-ticker-fade-out');
      setTimeout(() => {
        if (tickerElement) {
          // Clear progress interval
          if ((host as any).progressInterval) {
            clearInterval((host as any).progressInterval);
          }
          host.remove();
          tickerHost = null;
        }
      }, 300);
    }
  }, 10000);

  // Update progress bar every second
  const updateProgress = () => {
    if (!host || !tickerElement) return;

    const progressBar = tickerElement.querySelector('.edgetask-ticker-progress-bar') as HTMLElement;
    if (!progressBar) return;

    const now = new Date();
    const startTime = new Date(task.startTime);
    const totalTime = Number.isFinite(createdAtTime)
      ? startTime.getTime() - createdAtTime
      : startTime.getTime() - now.getTime();
    const elapsed = startTime.getTime() - now.getTime();
    const progress = Math.max(0, Math.min(100, totalTime !== 0 ? ((totalTime - elapsed) / totalTime) * 100 : 0));

    progressBar.style.width = `${progress}%`;

    // Update color based on progress
    progressBar.classList.remove('edgetask-progress-green', 'edgetask-progress-yellow', 'edgetask-progress-red');
    if (progress < 25) {
      progressBar.classList.add('edgetask-progress-red');
    } else if (progress < 50) {
      progressBar.classList.add('edgetask-progress-yellow');
    } else {
      progressBar.classList.add('edgetask-progress-green');
    }

    // Update time left text
    const textElement = tickerElement.querySelector('.edgetask-ticker-text') as HTMLElement;
    if (textElement) {
      const minutesLeft = Math.floor(elapsed / 60000);
      const newTimeLeft = `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`;
      textElement.textContent = `Until "${task.title}" there are ${newTimeLeft} left`;
    }
  };

  const progressInterval = setInterval(updateProgress, 1000);

  // Store interval ID on the element for cleanup
  if (host) {
    (host as any).progressInterval = progressInterval;
  }

  tickerHost = host;
};

const createNudge = async (message: string, mode: string) => {
  if (nudgeHost) {
    nudgeHost.remove();
  }

  const { host, shadow } = createShadowContainer('edgetask-nudge-host');

  let nudgeElement: HTMLElement | null = null;

  if (mode === 'hard') {
    nudgeElement = document.createElement('div');
    nudgeElement.id = 'edgetask-nudge-block';
    nudgeElement.className = 'edgetask-nudge-block';

    // Build DOM safely to prevent XSS
    const blockContent = document.createElement('div');
    blockContent.className = 'edgetask-nudge-block-content';

    const title = document.createElement('h2');
    title.className = 'edgetask-nudge-block-title';
    title.textContent = 'Focus Mode Active';
    blockContent.appendChild(title);

    const msgEl = document.createElement('p');
    msgEl.className = 'edgetask-nudge-block-message';
    msgEl.textContent = message;
    blockContent.appendChild(msgEl);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'edgetask-nudge-block-buttons';

    const backBtn = document.createElement('button');
    backBtn.className = 'edgetask-nudge-btn edgetask-nudge-btn-primary';
    backBtn.setAttribute('data-action', 'back');
    backBtn.textContent = 'Back to Work';
    buttonsDiv.appendChild(backBtn);

    const ignoreBtn = document.createElement('button');
    ignoreBtn.className = 'edgetask-nudge-btn edgetask-nudge-btn-secondary';
    ignoreBtn.setAttribute('data-action', 'ignore');
    ignoreBtn.textContent = 'Ignore 15 min';
    buttonsDiv.appendChild(ignoreBtn);

    blockContent.appendChild(buttonsDiv);
    nudgeElement.appendChild(blockContent);
  } else {
    nudgeElement = document.createElement('div');
    nudgeElement.id = 'edgetask-nudge';
    nudgeElement.className = 'edgetask-nudge';

    // Build DOM safely to prevent XSS
    const nudgeContent = document.createElement('div');
    nudgeContent.className = 'edgetask-nudge-content';

    const nudgeIcon = document.createElement('span');
    nudgeIcon.className = 'edgetask-nudge-icon';
    nudgeIcon.textContent = '🎯';
    nudgeContent.appendChild(nudgeIcon);

    const nudgeMsg = document.createElement('p');
    nudgeMsg.className = 'edgetask-nudge-message';
    nudgeMsg.textContent = message;
    nudgeContent.appendChild(nudgeMsg);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'edgetask-nudge-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    nudgeContent.appendChild(closeBtn);

    nudgeElement.appendChild(nudgeContent);
  }

  if (!nudgeElement) return;

  shadow.appendChild(nudgeElement);
  document.body.appendChild(host);

  const buttons = nudgeElement.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      const action = (e.target as HTMLButtonElement).dataset.action;

      if (action === 'back') {
        window.history.back();
      } else if (action === 'ignore') {
        chrome.storage.local.set({
          ignoreUntil: Date.now() + 15 * 60 * 1000
        });
      }

      if (nudgeHost) {
        nudgeHost.remove();
        nudgeHost = null;
      }
    });
  });

  nudgeHost = host;
};

const checkFocusMode = async () => {
  try {
    const response = await chrome.storage.local.get(['focusedTask', 'settings', 'ignoreUntil']);
    const focusedTask = response.focusedTask;
    const defaultSettings = {
      blacklist: [] as string[],
      whitelist: [] as string[],
      nudgeMode: 'soft',
      humorTone: 'default',
      isPaused: false,
      pauseEndTime: null as Date | string | null
    };
    const mergedSettings = {
      ...defaultSettings,
      ...(response.settings && typeof response.settings === 'object' ? response.settings : {})
    };

    if (response.settings !== undefined && (typeof response.settings !== 'object' || response.settings === null)) {
      console.warn('EdgeTask Debug [content]: settings value has unexpected type', {
        suppliedType: typeof response.settings,
        suppliedValue: response.settings
      });
    }

    const whitelist = Array.isArray(mergedSettings.whitelist)
      ? mergedSettings.whitelist.filter((domain: unknown): domain is string => typeof domain === 'string' && domain.trim().length > 0)
      : defaultSettings.whitelist;

    if (!Array.isArray(mergedSettings.whitelist)) {
      console.warn('EdgeTask Debug [content]: settings.whitelist not array', {
        observedType: typeof mergedSettings.whitelist,
        rawValueSample: mergedSettings.whitelist
      });
    } else if (whitelist.length !== mergedSettings.whitelist.length) {
      console.warn('EdgeTask Debug [content]: sanitized whitelist entries', {
        originalLength: mergedSettings.whitelist.length,
        sanitizedLength: whitelist.length
      });
    }

    const blacklist = Array.isArray(mergedSettings.blacklist)
      ? mergedSettings.blacklist.filter((domain: unknown): domain is string => typeof domain === 'string' && domain.trim().length > 0)
      : defaultSettings.blacklist;

    if (!Array.isArray(mergedSettings.blacklist)) {
      console.warn('EdgeTask Debug [content]: settings.blacklist not array', {
        observedType: typeof mergedSettings.blacklist,
        rawValueSample: mergedSettings.blacklist
      });
    } else if (blacklist.length !== mergedSettings.blacklist.length) {
      console.warn('EdgeTask Debug [content]: sanitized blacklist entries', {
        originalLength: mergedSettings.blacklist.length,
        sanitizedLength: blacklist.length
      });
    }

    const settings = {
      ...mergedSettings,
      whitelist,
      blacklist
    };

    const ignoreUntilRaw = response.ignoreUntil;
    const ignoreUntil = typeof ignoreUntilRaw === 'number' && Number.isFinite(ignoreUntilRaw) ? ignoreUntilRaw : 0;
    console.log('EdgeTask Debug [content]: checkFocusMode storage snapshot', {
      hasFocusedTask: !!focusedTask,
      focusedTaskTitle: focusedTask?.title,
      settingsKeys: settings ? Object.keys(settings) : [],
      blacklistLength: settings.blacklist.length,
      whitelistLength: settings.whitelist.length,
      ignoreUntil,
      isPaused: settings?.isPaused,
      pauseEndTime: settings?.pauseEndTime
    });

    if (!Array.isArray(settings.blacklist) || !Array.isArray(settings.whitelist)) {
      console.warn('EdgeTask Debug [content]: settings list shape invalid', {
        blacklistType: typeof settings.blacklist,
        whitelistType: typeof settings.whitelist,
        blacklistExample: settings.blacklist?.slice?.(0, 3),
        whitelistExample: settings.whitelist?.slice?.(0, 3)
      });
    }

    if (focusedTask) {
      const startTimeRaw = focusedTask.startTime;
      const parsedStart = new Date(startTimeRaw);
      if (Number.isNaN(parsedStart.getTime())) {
        console.warn('EdgeTask Debug [content]: focusedTask startTime unparsable', {
          taskId: focusedTask.id,
          title: focusedTask.title,
          startTimeRaw
        });
      }
      if (focusedTask.createdAt && Number.isNaN(new Date(focusedTask.createdAt).getTime())) {
        console.warn('EdgeTask Debug [content]: focusedTask createdAt unparsable', {
          taskId: focusedTask.id,
          title: focusedTask.title,
          createdAtRaw: focusedTask.createdAt
        });
      }
    }

    if (!focusedTask || Date.now() < ignoreUntil) {
      if (nudgeElement) {
        nudgeElement.remove();
        nudgeElement = null;
      }
      return;
    }

    // Check if smart pause is active
    if (settings.isPaused && settings.pauseEndTime) {
      const now = new Date();
      const pauseEndTime = new Date(settings.pauseEndTime);
      if (Number.isNaN(pauseEndTime.getTime())) {
        console.warn('EdgeTask Debug [content]: pauseEndTime is invalid', {
          pauseEndRaw: settings.pauseEndTime
        });
      }

      if (now < pauseEndTime) {
        // Pause is still active, don't show nudges
        if (nudgeElement) {
          nudgeElement.remove();
          nudgeElement = null;
        }

        // Update ticker to show pause status
        if (focusedTask.startTime) {
          const minutesLeft = Math.floor((pauseEndTime.getTime() - now.getTime()) / 60000);
          console.log('EdgeTask Debug [content]: smart pause ticker update', {
            taskId: focusedTask.id,
            title: focusedTask.title,
            minutesLeft
          });

          if (minutesLeft > 0 && minutesLeft <= 60) {
            createTicker(focusedTask, `Break ends in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`);
          }
        }
        return;
      } else {
        // Pause has ended, update settings
        chrome.storage.local.set({
          settings: { ...settings, isPaused: false, pauseEndTime: null }
        });
      }
    }

    const currentDomain = window.location.hostname;
    const isWhitelisted = settings.whitelist.some((d: string) => currentDomain.includes(d));
    const isBlacklisted = settings.blacklist.some((d: string) => currentDomain.includes(d));
    console.log('EdgeTask Debug [content]: domain evaluation', {
      currentDomain,
      isWhitelisted,
      isBlacklisted,
      blacklistSample: settings.blacklist?.slice?.(0, 5),
      whitelistSample: settings.whitelist?.slice?.(0, 5)
    });

    if (isWhitelisted || !isBlacklisted) {
      if (nudgeElement) {
        nudgeElement.remove();
        nudgeElement = null;
      }
      return;
    }

    // Use the enhanced humor system (static import)
    const message = getHumorMessage(
      settings.humorTone || 'default',
      'nudge',
      focusedTask.title,
      currentDomain
    );
    console.log('EdgeTask Debug [content]: nudge message generated', {
      tone: settings.humorTone || 'default',
      message
    });
    createNudge(message, settings.nudgeMode);

    if (focusedTask.startTime) {
      const startTime = new Date(focusedTask.startTime);
      const now = new Date();
      const minutesLeft = Math.floor((startTime.getTime() - now.getTime()) / 60000);
      if (Number.isNaN(minutesLeft)) {
        console.warn('EdgeTask Debug [content]: invalid minutesLeft for focusedTask', {
          taskId: focusedTask.id,
          title: focusedTask.title,
          startTimeRaw: focusedTask.startTime
        });
      } else {
        console.log('EdgeTask Debug [content]: ticker window for focusedTask', {
          taskId: focusedTask.id,
          title: focusedTask.title,
          minutesLeft
        });
      }

      if (minutesLeft > 0 && minutesLeft <= 60) {
        createTicker(focusedTask, `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`);
      }
    }
  } catch (error) {
    console.error('Error checking focus mode:', error);
  }
};

chrome.runtime.onMessage.addListener((message: { action?: string }, _sender, sendResponse) => {
  if (message.action === 'toggleFocus') {
    checkFocusMode().then(() => sendResponse({ success: true }));
    return true; // Keep message channel open for async response
  }
  return false;
});

setInterval(checkFocusMode, 5000);
checkFocusMode();
