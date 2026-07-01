const express = require('express');

const port = 3000;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const allowedOrigin = 'skyframesmp.dev';

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

app.get('/health', (req, res) => {
  return sendJson(res, 200, { ok: true });
});

app.post('/api/apply', async (req, res) => {
  try {
    const payload = req.body || {};
    const requiredFields = ['username', 'discord', 'age', 'reason', 'experience'];
    const missingFields = requiredFields.filter((field) => !String(payload[field] || '').trim());

    if (missingFields.length > 0) {
      return sendJson(res, 400, { error: 'Missing required fields', missingFields });
    }

    if (!discordWebhookUrl) {
      return sendJson(res, 500, { error: 'Discord webhook is not configured' });
    }

    const application = {
      username: String(payload.username).trim(),
      discord: String(payload.discord).trim(),
      age: String(payload.age).trim(),
      reason: String(payload.reason).trim(),
      experience: String(payload.experience).trim()
    };

    const response = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `<@&1473417763803369562>`,
         embeds: [
          {
            title: 'New Application',
            color: 0x7c3aed,
            fields: [
              { name: 'Username', value: application.username, inline: true },
              { name: 'Discord', value: application.discord, inline: true },
              { name: 'Age', value: application.age, inline: true },
              { name: 'Reason', value: application.reason, inline: false },
              { name: 'Experience', value: application.experience, inline: false }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Skyframe Application' }
          }
        ],
        allowed_mentions: { parse: [] }
      })
    });

    if (!response.ok) {
      return sendJson(res, 502, { error: 'Discord webhook request failed' });
    }

    return sendJson(res, 201, {
      ok: true,
      message: 'Application received',
      forwardedTo: 'discord'
    });
  } catch (error) {
    return sendJson(res, 500, { error: 'Internal server error' });
  }
});

app.use((req, res) => {
  sendJson(res, 404, { error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Skyframe backend running on http://localhost:${port}`);
});