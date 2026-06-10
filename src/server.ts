import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Deterministic pseudo-random number generator seeded by a string.
// Uses a simple hash so the same city always yields the same values.
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return ((h >>> 0) / 0xffffffff);
  };
}

const CONDITIONS = [
  "Sunny",
  "Partly Cloudy",
  "Cloudy",
  "Overcast",
  "Light Rain",
  "Heavy Rain",
  "Thunderstorm",
  "Snowy",
  "Foggy",
  "Windy",
];

const CONDITION_EMOJI: Record<string, string> = {
  "Sunny": "☀️",
  "Partly Cloudy": "⛅",
  "Cloudy": "☁️",
  "Overcast": "🌥️",
  "Light Rain": "🌦️",
  "Heavy Rain": "🌧️",
  "Thunderstorm": "⛈️",
  "Snowy": "❄️",
  "Foggy": "🌫️",
  "Windy": "💨",
};

const DASHBOARD_CITIES = ["Chennai", "London", "Tokyo", "New York", "Sydney"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mockWeather(city: string, daySeed = "") {
  const rand = seededRandom(city.toLowerCase() + daySeed);
  const temp = Math.round(rand() * 50 - 5);           // -5 to 45 °C
  const humidity = Math.round(rand() * 60 + 30);       // 30–90 %
  const conditionIndex = Math.floor(rand() * CONDITIONS.length);
  const windSpeed = Math.round(rand() * 60 + 5);       // 5–65 km/h

  return {
    temperature: temp,
    unit: "C",
    condition: CONDITIONS[conditionIndex],
    humidity,
    windSpeed,
  };
}

// GET / — HTML dashboard
app.get("/", (_req: Request, res: Response) => {
  const cards = DASHBOARD_CITIES.map((name) => {
    const w = mockWeather(name);
    const emoji = CONDITION_EMOJI[w.condition] ?? "🌡️";
    const tempColor = w.temperature >= 35 ? "#ff6b6b"
      : w.temperature >= 20 ? "#ffd93d"
      : w.temperature >= 5  ? "#6bcb77"
      : "#74b9ff";

    return `
      <div class="card">
        <div class="city">${name}</div>
        <div class="emoji">${emoji}</div>
        <div class="temp" style="color:${tempColor}">${w.temperature}°C</div>
        <div class="condition">${w.condition}</div>
        <div class="meta">
          <span title="Humidity">💧 ${w.humidity}%</span>
          <span title="Wind">🌬️ ${w.windSpeed} km/h</span>
        </div>
      </div>`;
  }).join("");

  const now = new Date().toUTCString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #fff;
      padding: 2rem 1.5rem 3rem;
    }

    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    header h1 {
      font-size: clamp(1.8rem, 4vw, 2.8rem);
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #a78bfa, #60a5fa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    header p {
      margin-top: 0.4rem;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.45);
      letter-spacing: 0.5px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.25rem;
      max-width: 1100px;
      margin: 0 auto;
    }

    .card {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 1.75rem 1.5rem 1.5rem;
      text-align: center;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: default;
    }

    .card:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      border-color: rgba(255,255,255,0.25);
    }

    .city {
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.75);
      text-transform: uppercase;
      font-size: 0.78rem;
      margin-bottom: 0.75rem;
    }

    .emoji {
      font-size: 3.5rem;
      line-height: 1;
      margin-bottom: 0.6rem;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    }

    .temp {
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: -1px;
      line-height: 1;
      margin-bottom: 0.4rem;
    }

    .condition {
      font-size: 0.82rem;
      color: rgba(255,255,255,0.55);
      margin-bottom: 1.1rem;
      font-weight: 400;
    }

    .meta {
      display: flex;
      justify-content: center;
      gap: 1rem;
      font-size: 0.78rem;
      color: rgba(255,255,255,0.5);
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 0.85rem;
    }

    .meta span {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    footer {
      text-align: center;
      margin-top: 2.5rem;
      font-size: 0.75rem;
      color: rgba(255,255,255,0.25);
      letter-spacing: 0.3px;
    }

    footer a {
      color: rgba(255,255,255,0.4);
      text-decoration: none;
    }

    footer a:hover { color: rgba(255,255,255,0.7); }
  </style>
</head>
<body>
  <header>
    <h1>🌍 Weather Dashboard</h1>
    <p>Updated ${now}</p>
  </header>
  <div class="grid">
    ${cards}
  </div>
  <footer>
    <p>Mock data &nbsp;·&nbsp; <a href="/health">/health</a> &nbsp;·&nbsp; <a href="/weather/london">/weather/:city</a> &nbsp;·&nbsp; <a href="/forecast/london">/forecast/:city</a></p>
  </footer>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// GET /health
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// GET /weather/:city
app.get("/weather/:city", (req: Request, res: Response) => {
  const { city } = req.params;
  const weather = mockWeather(city);

  res.json({
    city: city.charAt(0).toUpperCase() + city.slice(1),
    ...weather,
  });
});

// GET /forecast/:city
app.get("/forecast/:city", (req: Request, res: Response) => {
  const { city } = req.params;

  // Build a base date (today at midnight) so day labels are stable within a day
  const now = new Date();
  const baseDay = now.getDay(); // 0 = Sunday

  const forecast = Array.from({ length: 5 }, (_, i) => {
    const dayLabel = DAYS[(baseDay + i) % 7];
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    return {
      day: dayLabel,
      date: dateStr,
      ...mockWeather(city, String(i)),
    };
  });

  res.json({
    city: city.charAt(0).toUpperCase() + city.slice(1),
    forecast,
  });
});

app.listen(PORT, () => {
  console.log(`Weather API running on http://localhost:${PORT}`);
});

export default app;
