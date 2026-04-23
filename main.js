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
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_ADDRESS}`);
    if (!res.ok) {
      text.textContent = res.status >= 500
        ? 'Status API unavailable'
        : 'Unable to check status — please refresh';
      return;
    }
    const data = await res.json();
    if (data.online) {
      dot.classList.add('online');
      const o = data.players?.online;
      const m = data.players?.max;
      text.textContent = typeof o === 'number' && typeof m === 'number'
        ? `Online - ${o}/${m} players`
        : 'Server is Online';
    } else {
      dot.classList.add('offline');
      text.textContent = 'Server is currently offline.';
    }
  } catch {
    text.textContent = 'Unable to check status right now';
  }
}

let latestNewsId = null; // Stores the ID of the most recent news item

async function loadNews() {
  const container = document.getElementById('newsList');

  try {
    const res = await fetch('https://skyframesmp.dev/news.json');
    if (!res.ok) throw new Error();

    const news = await res.json();
    if (!news || news.length === 0) return;

    // --- NOTIFICATION LOGIC START ---
    const currentTopItem = news[0]; // Assumes the first item is the newest
    const currentId = currentTopItem.id || currentTopItem.title; 

    // If this isn't the first load AND the ID is new, notify the user
    if (latestNewsId !== null && currentId !== latestNewsId) {
      sendNewsNotification(currentTopItem.title);
    }

    // Update the tracker to the latest ID
    latestNewsId = currentId;
    // --- NOTIFICATION LOGIC END ---

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

// Custom send function for news
function sendNewsNotification(newsTitle) {
  if (Notification.permission === "granted") {
    new Notification("Skyframe SMP News", {
      body: `New update: ${newsTitle}`,
      icon: "https://skyframesmp.dev/favicon.png" // Change to your actual icon
    });
  } else {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Skyframe SMP News", {
            body: `New update: ${newsTitle}`,
            icon: "https://skyframesmp.dev/favicon.png" // Change to your actual icon
        });
      }
  }
}
}

fetchStatus();
setInterval(fetchStatus, 10000);
loadNews();
setInterval(loadNews, 30000);
