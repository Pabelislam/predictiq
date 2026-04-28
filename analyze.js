// api/analyze.js  ← Vercel Serverless Function
// API key শুধু এখানে থাকে, frontend-এ কখনো যায় না

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured. Vercel Environment Variables-এ ANTHROPIC_API_KEY সেট করুন।" });
  }

  try {
    const { imageBase64, mediaType, manualData } = req.body;

    let messages;

    if (imageBase64) {
      // Screenshot mode — Vision API
      messages = [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType || "image/png", data: imageBase64 }
          },
          {
            type: "text",
            text: `You are a sports betting analyst AI. Carefully read this betting app screenshot.
Extract all visible match info: team names, sport, league, odds, and available betting markets.
Then provide AI predictions for ALL visible markets.

Respond ONLY in valid JSON, no markdown fences:
{
  "teamA": "<team name from screenshot>",
  "teamB": "<team name from screenshot>",
  "sport": "<Football|Cricket|Basketball|Tennis|Hockey>",
  "league": "<league or tournament name>",
  "confidence": <60-92>,
  "winProb": <55-88>,
  "riskLevel": "<Low|Medium|High>",
  "predictions": [
    {"market": "<market>", "prediction": "<pick>", "prob": <50-90>, "risk": "<Low|Medium|High>", "best": <true|false>}
  ],
  "analysis": "<2 sentence match analysis>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"],
  "detectedOdds": "<brief summary of odds seen>"
}`
          }
        ]
      }];
    } else {
      // Manual mode
      messages = [{
        role: "user",
        content: `You are a sports betting analyst AI. Analyze this match.

Match: ${manualData.teamA} vs ${manualData.teamB}
Sport: ${manualData.sport}
League: ${manualData.league || "Unknown"}
Markets: ${manualData.markets.join(", ")}

Respond ONLY in valid JSON, no markdown:
{
  "teamA": "${manualData.teamA}",
  "teamB": "${manualData.teamB}",
  "sport": "${manualData.sport}",
  "league": "${manualData.league || "Unknown"}",
  "confidence": <60-92>,
  "winProb": <55-88>,
  "riskLevel": "<Low|Medium|High>",
  "predictions": [
    {"market": "<market>", "prediction": "<pick>", "prob": <50-90>, "risk": "<Low|Medium|High>", "best": <true|false>}
  ],
  "analysis": "<2 sentence analysis>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`
      }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1200,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Anthropic API error" });
    }

    const text = data.content.map(b => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Analysis failed: " + err.message });
  }
}
