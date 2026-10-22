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
  }
}

let latestNewsId = null;



fetchStatus();
setInterval(fetchStatus, 10000);
// 1. Set your target future date and time
const targetDate = new Date("Oct 24, 2026 12:00:00").getTime();

function updateCountdown() {
  const now = Date.now();
  const distance = targetDate - now;
  
  // 2. Standard time math
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  
  // 3. Format strings with 'd', 'h', 'm', 's' suffixes
  const dStr = `${days}d`;
  const hStr = `${hours}h`;
  const mStr = `${minutes}m`;
  const sStr = `${seconds}s`;
  
  // 4. Update the single container string
  document.getElementById("countDown").textContent = `${dStr} ${hStr} ${mStr} ${sStr}`;
  
  // 5. Expiration check
  if (distance < 0) {
    clearInterval(timerInterval);
    document.getElementById("countdown-text").textContent = "Expired";
  }
}

// Fire immediately to avoid a 1-second delay, then set the loop
updateCountdown(); 
const timerInterval = setInterval(updateCountdown, 1000);
