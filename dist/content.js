let tickerElement: HTMLElement | null = null;
let nudgeElement: HTMLElement | null = null;
let tickerTimeout: number | null = null;

// Type declarations for Chrome APIs
declare const chrome: any;

const createTicker = (task: any, timeLeft: string) => {
  if (tickerElement) {
    tickerElement.remove();
  }

  tickerElement = document.createElement('div');
  tickerElement.id = 'edgetask-ticker';
  tickerElement.className = 'edgetask-ticker';
  
  // Calculate progress and color
  const now = new Date();
  const startTime = new Date(task.startTime);
  const totalTime = startTime.getTime() - task.createdAt?.getTime() || startTime.getTime() - now.getTime();
  const elapsed = startTime.getTime() - now.getTime();
  const progress = Math.max(0, Math.min(100, ((totalTime - elapsed) / totalTime) * 100));
  
  let progressColor = 'edgetask-progress-green';
  if (progress < 25) {
    progressColor = 'edgetask-progress-red';
  } else if (progress < 50) {
    progressColor = 'edgetask-progress-yellow';
  }
  
  tickerElement.innerHTML = `
    <div class="edgetask-ticker-content">
      <span class="edgetask-ticker-icon">⏰</span>
      <div class="edgetask-ticker-text-container">
        <span class="edgetask-ticker-text">Until "${task.title}" there are ${timeLeft} left</span>
        <div class="edgetask-ticker-progress-container">
          <div class="edgetask-ticker-progress-bar ${progressColor}" style="width: ${progress}%"></div>
        </div>
      </div>
      <button class="edgetask-ticker-close" aria-label="Close">&times;</button>
    </div>
  `;

  document.body.appendChild(tickerElement);

  const closeBtn = tickerElement.querySelector('.edgetask-ticker-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (tickerElement) {
        // Clear progress interval
        if ((tickerElement as any).progressInterval) {
          clearInterval((tickerElement as any).progressInterval);
        }
        tickerElement.remove();
        tickerElement = null;
      }
    });
  }

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
          if (tickerElement) {
            // Clear progress interval
            if ((tickerElement as any).progressInterval) {
              clearInterval((tickerElement as any).progressInterval);
            }
            tickerElement.remove();
            tickerElement = null;
          }
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
          if ((tickerElement as any).progressInterval) {
            clearInterval((tickerElement as any).progressInterval);
          }
          tickerElement.remove();
          tickerElement = null;
        }
      }, 300);
    }
  }, 10000);

  // Update progress bar every second
  const updateProgress = () => {
    if (!tickerElement) return;
    
    const progressBar = tickerElement.querySelector('.edgetask-ticker-progress-bar') as HTMLElement;
    if (!progressBar) return;
    
    const now = new Date();
    const startTime = new Date(task.startTime);
    const totalTime = startTime.getTime() - task.createdAt?.getTime() || startTime.getTime() - now.getTime();
    const elapsed = startTime.getTime() - now.getTime();
    const progress = Math.max(0, Math.min(100, ((totalTime - elapsed) / totalTime) * 100));
    
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
  if (tickerElement) {
    (tickerElement as any).progressInterval = progressInterval;
  }
};

const createNudge = async (message: string, mode: string) => {
  if (nudgeElement) {
    nudgeElement.remove();
  }

  if (mode === 'hard') {
    nudgeElement = document.createElement('div');
    nudgeElement.id = 'edgetask-nudge-block';
    nudgeElement.className = 'edgetask-nudge-block';
    nudgeElement.innerHTML = `
      <div class="edgetask-nudge-block-content">
        <h2 class="edgetask-nudge-block-title">Focus Mode Active</h2>
        <p class="edgetask-nudge-block-message">${message}</p>
        <div class="edgetask-nudge-block-buttons">
          <button class="edgetask-nudge-btn edgetask-nudge-btn-primary" data-action="back">Back to Work</button>
          <button class="edgetask-nudge-btn edgetask-nudge-btn-secondary" data-action="ignore">Ignore 15 min</button>
        </div>
      </div>
    `;
  } else {
    nudgeElement = document.createElement('div');
    nudgeElement.id = 'edgetask-nudge';
    nudgeElement.className = 'edgetask-nudge';
    nudgeElement.innerHTML = `
      <div class="edgetask-nudge-content">
        <span class="edgetask-nudge-icon">🎯</span>
        <p class="edgetask-nudge-message">${message}</p>
        <button class="edgetask-nudge-close" aria-label="Close">&times;</button>
      </div>
    `;
  }

  document.body.appendChild(nudgeElement);

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

      if (nudgeElement) {
        nudgeElement.remove();
        nudgeElement = null;
      }
    });
  });
};

const checkFocusMode = async () => {
  try {
    const response = await chrome.storage.local.get(['focusedTask', 'settings', 'ignoreUntil']);
    const focusedTask = response.focusedTask;
    const settings = response.settings || { blacklist: [], whitelist: [], nudgeMode: 'soft', humorTone: 'default', isPaused: false };
    const ignoreUntil = response.ignoreUntil || 0;

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
      
      if (now < pauseEndTime) {
        // Pause is still active, don't show nudges
        if (nudgeElement) {
          nudgeElement.remove();
          nudgeElement = null;
        }
        
        // Update ticker to show pause status
        if (focusedTask.startTime) {
          const minutesLeft = Math.floor((pauseEndTime.getTime() - now.getTime()) / 60000);
          
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

    if (isWhitelisted || !isBlacklisted) {
      if (nudgeElement) {
        nudgeElement.remove();
        nudgeElement = null;
      }
      return;
    }

    // Use the enhanced humor system
    import('./lib/humor').then(({ getHumorMessage }) => {
      const message = getHumorMessage(
        settings.humorTone || 'default',
        'nudge',
        focusedTask.title,
        currentDomain
      );
      createNudge(message, settings.nudgeMode);
    });

    if (focusedTask.startTime) {
      const startTime = new Date(focusedTask.startTime);
      const now = new Date();
      const minutesLeft = Math.floor((startTime.getTime() - now.getTime()) / 60000);

      if (minutesLeft > 0 && minutesLeft <= 60) {
        createTicker(focusedTask, `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`);
      }
    }
  } catch (error) {
    console.error('Error checking focus mode:', error);
  }
};

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === 'toggleFocus') {
    checkFocusMode();
  }
});

setInterval(checkFocusMode, 5000);
checkFocusMode();
