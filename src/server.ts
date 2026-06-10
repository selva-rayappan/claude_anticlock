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
