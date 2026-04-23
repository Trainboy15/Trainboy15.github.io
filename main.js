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

let latestNewsId = null;

async function loadNews() {
  const container = document.getElementById('newsList');
  try {
    const res = await fetch('https://skyframesmp.dev/news.json');
    if (!res.ok) throw new Error();

    const news = await res.json();
    if (!news || news.length === 0) return;

    const currentTopItem = news.id; 
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
      icon: "https://skyframesmp.dev/favicon.png"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Skyframe SMP News", {
          body: `New update: ${newsTitle}`,
          icon: "https://skyframesmp.dev/favicon.png"
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
sendNewsNotification("")