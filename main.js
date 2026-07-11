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
    button.textContent = 'Copy failed X';
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
  
  // Helper to safely update the UI classes
  const updateVisualState = (state) => {
    dot.classList.remove('online', 'offline');
    dot.classList.add(state);
  };

  try {
    const res = await fetch(`https://play.skyframesmp.dev`);
    
    // Fix: Handle failed API requests safely without breaking
    if (!res.ok) {
      updateVisualState('offline');
      text.textContent = 'Server offline';
      return;
    }

    const data = await res.json();

    if (data.includes('SkyFrameSMP')) {
      updateVisualState('online');
      
      
      // Clean check for valid numbers
      text.textContent = Number.isInteger(currentPlayers) && Number.isInteger(maxPlayers)
        ? `Online - ?/? players`
        : 'Server is Online';
    } else {
      updateVisualState('offline');
      text.textContent = 'Server is currently offline.';
    }
  } catch (error) {
    updateVisualState('offline');
    text.textContent = 'Unable to check status right now';
    console.error('Status fetch failed:', error); // Helpful for debugging
  }
}

let latestNewsId = null;

async function loadNews() {
  const container = document.getElementById('newsList');
  try {
    const res = await fetch('/news.json');
    if (!res.ok) throw new Error();

    const news = await res.json();
    if (!news || news.length === 0) return;

    const currentTopItem = news[0]; 
    const currentId = currentTopItem.id || currentTopItem.title; 

    // Only notify if we already had a baseline ID (prevents notification on first page load)
    if (latestNewsId !== null && currentId !== latestNewsId) {
      sendNewsNotification(currentTopItem.title);
    }

    latestNewsId = currentId;

    container.innerHTML = news.map(item => `
      <div class="news-item">
        <h4 style="color: ${item.color}">${item.title}</h4>
        <p>${item.body}</p>
        ${item.link ? `<a href="${item.link}" target="_blank">Read more →</a>` : ''}
      </div>
    `).join('');
  } catch {
    container.innerHTML = `<p style="color: var(--muted)">Unable to load news.</p>`;
  }
}

function sendNewsNotification(newsTitle) {
  if (Notification.permission === "granted") {
    new Notification("Skyframe SMP News", {
      body: `New update: ${newsTitle}`,
      icon: "https://skyframesmp.dev"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Skyframe SMP News", {
          body: `New update: ${newsTitle}`,
          icon: "https://skyframesmp.dev"
        });
      }
    }); // Fixed: added closing parenthesis
  }
} // Fixed: added closing brace

// ADD THIS: A way for users to enable notifications via a click
async function enableNotifications() {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    new Notification("Notifications Enabled!", { body: "You will now see news updates here." });
  }
}

fetchStatus();
setInterval(fetchStatus, 10000);
loadNews();
setInterval(loadNews, 30000);