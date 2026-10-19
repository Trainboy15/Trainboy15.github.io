const SERVER_ADDRESS = 'play.skyframesmp.dev';
document.getElementById('server-ip').textContent = SERVER_ADDRESS;

async function copyIP() {
  const button = document.getElementById('copyIP');
  const feedback = document.getElementById('copyFeedback');
  try {
    await navigator.clipboard.writeText(SERVER_ADDRESS);
    button.textContent = '✓ Copied';
    feedback.textContent = 'Server IP copied to clipboard';
  } catch {
    button.textContent = 'Copy failed';
    feedback.textContent = 'Clipboard access failed';
  }
  setTimeout(() => {
    button.textContent = 'Copy IP';
    feedback.textContent = '';
  }, 1200);
}

async function fetchStatus() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  
  const updateVisualState = (state) => {
    dot.classList.remove('online', 'offline');
    dot.classList.add(state);
  };

  try {
    const res = await fetch(`https://beacon.skyframesmp.dev/status`);
    
    if (!res.ok) {
      updateVisualState('offline');
      text.textContent = 'Server offline';
      return;
    }

    const data = await res.json();

    // FIXED: Changed '=' to '===' so it checks the status instead of forcing it to true
    if (data.success === true) {
      updateVisualState('online');
      
      const currentPlayers = data.server.players.online;
      const maxPlayers = data.server.players.max;

      text.textContent = Number.isInteger(currentPlayers) && Number.isInteger(maxPlayers)
        ? `Online - ${currentPlayers}/${maxPlayers} players`
        : 'Server is Online';
    } else {
      updateVisualState('offline');
      text.textContent = 'Server is currently offline.';
    }
  } catch (error) {
    updateVisualState('offline');
    text.textContent = 'Unable to check status right now';
    console.error('Status fetch failed:', error);
  }
}

let latestNewsId = null;



fetchStatus();
setInterval(fetchStatus, 10000);
setInterval(loadNews, 30000);
