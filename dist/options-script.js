// Options page script

// Load saved settings
chrome.storage.local.get(['settings'], (result) => {
  const settings = result.settings || { humorTone: 'default' };
  document.getElementById('humorTone').value = settings.humorTone;
});

// Save settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const humorTone = document.getElementById('humorTone').value;
  
  chrome.storage.local.set({
    settings: {
      humorTone: humorTone
    }
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved successfully!';
    status.className = 'status success';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  });
});
