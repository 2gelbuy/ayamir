document.addEventListener('DOMContentLoaded', function() {
  // Load current settings
  loadSettings();
  
  // Set up event listeners
  document.getElementById('saveOptions').addEventListener('click', saveSettings);
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('click', importData);
  document.getElementById('clearData').addEventListener('click', clearData);
  document.getElementById('connectCalendar').addEventListener('click', connectCalendar);
});

function loadSettings() {
  chrome.storage.sync.get(['settings'], function(result) {
    const settings = result.settings || {};
    
    // Set form values
    document.getElementById('notifications').value = settings.notificationsEnabled !== false ? 'true' : 'false';
    document.getElementById('humorTone').value = settings.humorTone || 'default';
    document.getElementById('deepWorkDuration').value = settings.deepWorkModeDuration || 25;
    document.getElementById('deepWorkBreakDuration').value = settings.deepWorkModeBreakDuration || 5;
    document.getElementById('calendarEnabled').value = settings.calendarEnabled !== false ? 'true' : 'false';
  });
}

function saveSettings() {
  const settings = {
    notificationsEnabled: document.getElementById('notifications').value === 'true',
    humorTone: document.getElementById('humorTone').value,
    deepWorkModeDuration: parseInt(document.getElementById('deepWorkDuration').value),
    deepWorkModeBreakDuration: parseInt(document.getElementById('deepWorkBreakDuration').value),
    calendarEnabled: document.getElementById('calendarEnabled').value === 'true'
  };
  
  chrome.storage.sync.set({ settings }, function() {
    showNotification('Settings saved successfully!', 'success');
  });
}

function exportData() {
  chrome.storage.local.get(['tasks', 'settings', 'stats'], function(result) {
    const data = {
      tasks: result.tasks || [],
      settings: result.settings || {},
      stats: result.stats || {},
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `edgetask-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Data exported successfully!', 'success');
  });
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);
        
        if (data.tasks) {
          chrome.storage.local.set({ tasks: data.tasks });
        }
        
        if (data.settings) {
          chrome.storage.sync.set({ settings: data.settings });
        }
        
        if (data.stats) {
          chrome.storage.local.set({ stats: data.stats });
        }
        
        showNotification('Data imported successfully!', 'success');
        loadSettings(); // Reload settings to reflect imported data
      } catch (error) {
        showNotification('Error importing data: ' + error.message, 'error');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

function clearData() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    chrome.storage.local.clear(function() {
      chrome.storage.sync.clear(function() {
        showNotification('All data cleared successfully!', 'success');
        loadSettings(); // Reload settings to reflect cleared data
      });
    });
  }
}

function connectCalendar() {
  chrome.identity.getAuthToken({
    interactive: true,
    scopes: ['https://www.googleapis.com/auth/calendar']
  }, function(token) {
    if (chrome.runtime.lastError) {
      showNotification('Error connecting to Google Calendar: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    
    // Store the token
    chrome.storage.local.set({ googleCalendarToken: token }, function() {
      showNotification('Successfully connected to Google Calendar!', 'success');
    });
  });
}

function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification ' + type;
  notification.style.display = 'block';
  
  setTimeout(function() {
    notification.style.display = 'none';
  }, 3000);
}