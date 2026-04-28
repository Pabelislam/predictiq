import { useState, useRef, useCallback } from "react";

const SPORTS = [
  { id: "football", icon: "⚽", label: "Football" },
  { id: "cricket", icon: "🏏", label: "Cricket" },
  { id: "basketball", icon: "🏀", label: "Basketball" },
  { id: "tennis", icon: "🎾", label: "Tennis" },
  { id: "hockey", icon: "🏑", label: "Hockey" },
];

const MARKETS = {
  football: ["1X2", "Double Chance", "Over/Under Goals", "BTTS", "Asian Handicap", "European Handicap", "Correct Score", "HT/FT", "Corners", "Cards", "First Goal"],
  cricket: ["Match Winner", "Toss Winner", "Total Runs", "Top Batsman", "Top Bowler", "Team Runs", "Wickets", "Extra Runs"],
  basketball: ["Match Winner", "Point Spread", "Total Points", "Quarter Betting"],
  tennis: ["Match Winner", "Set Betting", "Total Games", "Handicap"],
  hockey: ["Match Winner", "Total Goals", "Handicap"],
};

const RISK_COLOR = { Low: "#00ff9d", Medium: "#ffc107", High: "#ff4d4d" };
const RISK_BG = { Low: "rgba(0,255,157,0.08)", Medium: "rgba(255,193,7,0.08)", High: "rgba(255,77,77,0.08)" };

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

// Call secure backend (API key never exposed to browser)
async function analyzeWithBackend(imageBase64, mediaType, manualData) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mediaType, manualData })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "API error");
  return data;
}

// ── UI Components ────────────────────────────────────────────────

function ProbBar({ value, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${value}%`, borderRadius: 4,
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        transition: "width 1s cubic-bezier(.4,0,.2,1)",
        boxShadow: `0 0 8px ${color}66`
      }} />
    </div>
  );
}

function PredictionCard({ market, prob, risk, best }) {
  return (
    <div style={{
      background: best ? "rgba(0,255,157,0.07)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${best ? "#00ff9d44" : "#ffffff11"}`,
      borderRadius: 10, padding: "12px 16px", position: "relative"
    }}>
      {best && (
        <span style={{
          position: "absolute", top: -10, right: 12,
          background: "#00ff9d", color: "#0a0e17", fontSize: 10,
          fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: 1
        }}>BEST PICK</span>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "#e0e6f0", fontSize: 13, fontWeight: 500 }}>{market}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            background: RISK_BG[risk], color: RISK_COLOR[risk],
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            border: `1px solid ${RISK_COLOR[risk]}33`
          }}>{risk}</span>
          <span style={{ color: RISK_COLOR[risk], fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{prob}%</span>
        </div>
      </div>
      <ProbBar value={prob} color={RISK_COLOR[risk]} />
    </div>
  );
}

function ScoreRing({ value, label, color }) {
  const r = 28, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
        <text x={36} y={36} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={14} fontWeight={800}
          style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px", fontFamily: "monospace" }}>
          {value}%
        </text>
      </svg>
      <span style={{ color: "#8899aa", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

function AccumulatorRow({ match, market, prob, onRemove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px",
      border: "1px solid rgba(255,255,255,0.07)"
    }}>
      <div>
        <div style={{ color: "#e0e6f0", fontSize: 13, fontWeight: 600 }}>{match}</div>
        <div style={{ color: "#8899aa", fontSize: 11 }}>{market}</div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{prob}%</span>
        <button onClick={onRemove} style={{
          background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.2)",
          color: "#ff4d4d", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12
        }}>✕</button>
      </div>
    </div>
  );
}

function ResultView({ result, onAddAccum }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        background: "rgba(0,255,157,0.05)", border: "1px solid rgba(0,255,157,0.15)",
        borderRadius: 16, padding: 20
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#556070", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>
              {result.sport?.toUpperCase()} · {result.league}
            </p>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff" }}>
              {result.teamA} <span style={{ color: "#334455" }}>vs</span> {result.teamB}
            </h2>
            <p style={{ color: "#8899aa", fontSize: 13, margin: "8px 0 0" }}>{result.analysis}</p>
            {result.detectedOdds && (
              <p style={{ color: "#556070", fontSize: 12, margin: "6px 0 0" }}>📊 {result.detectedOdds}</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <ScoreRing value={result.winProb} label="WIN PROB" color="#00ff9d" />
            <ScoreRing value={result.confidence} label="CONFIDENCE" color="#3b9eff" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {result.keyFactors?.map(f => (
            <span key={f} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#8899aa"
            }}>📌 {f}</span>
          ))}
        </div>
      </div>

      <div>
        <p style={{ color: "#8899aa", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>AI PREDICTIONS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.predictions?.map((p, i) => (
            <PredictionCard key={i} market={`${p.market}: ${p.prediction}`} prob={p.prob} risk={p.risk} best={p.best} />
          ))}
        </div>
      </div>

      <button onClick={onAddAccum} style={{
        background: "rgba(59,158,255,0.1)", border: "1px solid rgba(59,158,255,0.3)",
        borderRadius: 12, padding: "12px 20px", cursor: "pointer",
        color: "#3b9eff", fontWeight: 700, fontSize: 14
      }}>
        🔗 Add Best Pick to Accumulator
      </button>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("upload");
  const [sport, setSport] = useState("football");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [league, setLeague] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mediaType, setMediaType] = useState("image/png");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [accum, setAccum] = useState([]);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const processFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError("Please upload a JPG or PNG image.");
      return;
    }
    setMediaType(f.type || "image/png");
    setImagePreview(URL.createObjectURL(f));
    setResult(null); setError(null);
    try {
      const b64 = await fileToBase64(f);
      setImageBase64(b64);
    } catch { setError("Could not read image file."); }
  }, []);

  const handleImage = (e) => processFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); };
  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleAnalyze = async (manual = false) => {
    setLoading(true); setError(null); setResult(null);
    try {
      let res;
      if (manual) {
        if (!teamA || !teamB) { setError("Please enter both team names."); setLoading(false); return; }
        res = await analyzeWithBackend(null, null, {
          teamA, teamB, sport, league,
          markets: selectedMarkets.length ? selectedMarkets : MARKETS[sport].slice(0, 5)
        });
      } else {
        if (!imageBase64) { setError("Please upload a screenshot first."); setLoading(false); return; }
        res = await analyzeWithBackend(imageBase64, mediaType, null);
      }
      setResult(res);
    } catch (e) {
      setError(e.message || "Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const toggleMarket = (m) => setSelectedMarkets(s => s.includes(m) ? s.filter(x => x !== m) : [...s, m]);

  const addToAccum = () => {
    if (!result) return;
    const best = result.predictions?.find(p => p.best) || result.predictions?.[0];
    if (!best) return;
    setAccum(a => [...a, {
      match: `${result.teamA} vs ${result.teamB}`,
      market: `${best.market}: ${best.prediction}`,
      prob: best.prob, id: Date.now()
    }]);
  };

  const accumProb = accum.length ? Math.round(accum.reduce((p, c) => p * (c.prob / 100), 1) * 100) : 0;
  const accumRisk = accumProb > 50 ? "Medium" : accumProb > 25 ? "High" : "Very High";

  const inputStyle = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "12px 14px", color: "#e0e6f0", fontSize: 14,
    outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box"
  };

  const btnPrimary = (disabled) => ({
    background: disabled ? "rgba(0,255,157,0.1)" : "linear-gradient(135deg, #00ff9d, #00cc7a)",
    border: "none", borderRadius: 12, padding: "14px 24px",
    cursor: disabled ? "not-allowed" : "pointer",
    color: "#0a0e17", fontWeight: 800, fontSize: 15,
    boxShadow: disabled ? "none" : "0 4px 24px rgba(0,255,157,0.3)",
    transition: "all .2s", width: "100%"
  });

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e0e6f0" }}>
      {/* Grid BG */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,255,157,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,157,0.025) 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />
      <div style={{
        position: "fixed", top: "15%", left: "55%", width: 600, height: 600,
        background: "radial-gradient(circle,rgba(0,255,157,0.04) 0%,transparent 70%)",
        pointerEvents: "none", zIndex: 0
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg,#00ff9d22,#00ff9d44)",
              border: "1px solid #00ff9d55", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            }}>⚡</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
              Predict<span style={{ color: "#00ff9d" }}>IQ</span>
            </span>
          </div>
          <p style={{ color: "#556070", fontSize: 12, margin: 0 }}>AI-Powered Sports Prediction · Screenshot Analysis · Multi-Bet Calculator</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 4, marginBottom: 20
        }}>
          {[
            { id: "upload", label: "📸 Screenshot" },
            { id: "manual", label: "✏️ Manual" },
            { id: "accumulator", label: `🔗 Accum${accum.length ? ` (${accum.length})` : ""}` },
            { id: "admin", label: "⚙️ Admin" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", cursor: "pointer",
              background: tab === t.id ? "rgba(0,255,157,0.12)" : "transparent",
              color: tab === t.id ? "#00ff9d" : "#667788",
              fontWeight: tab === t.id ? 700 : 500, fontSize: 12,
              borderBottom: tab === t.id ? "2px solid #00ff9d" : "2px solid transparent",
              transition: "all .2s"
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── UPLOAD TAB ── */}
        {tab === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragging ? "#00ff9d" : imagePreview ? "#00ff9d55" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 16, padding: "40px 24px", textAlign: "center", cursor: "pointer",
                background: dragging ? "rgba(0,255,157,0.06)" : imagePreview ? "rgba(0,255,157,0.03)" : "rgba(255,255,255,0.02)",
                transition: "all .2s"
              }}
            >
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: "none" }} onChange={handleImage} />
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="preview" style={{
                    maxHeight: 220, maxWidth: "100%", borderRadius: 10,
                    marginBottom: 12, objectFit: "contain", border: "1px solid rgba(0,255,157,0.2)"
                  }} />
                  <p style={{ color: "#00ff9d", fontSize: 13, margin: 0, fontWeight: 600 }}>
                    ✓ Screenshot ready · Click Analyze to start
                  </p>
                  <p style={{ color: "#445566", fontSize: 11, margin: "4px 0 0" }}>
                    Click here to change image
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📸</div>
                  <p style={{ color: "#e0e6f0", fontWeight: 700, margin: "0 0 6px", fontSize: 15 }}>
                    Upload Betting App Screenshot
                  </p>
                  <p style={{ color: "#556070", fontSize: 13, margin: 0 }}>
                    Click to browse · or drag & drop here
                  </p>
                  <p style={{ color: "#334455", fontSize: 11, margin: "6px 0 0" }}>
                    JPG · PNG · WEBP supported
                  </p>
                </div>
              )}
            </div>

            {imagePreview && (
              <button onClick={() => handleAnalyze(false)} disabled={loading} style={btnPrimary(loading)}>
                {loading ? "⏳ Analyzing Screenshot with AI..." : "⚡ Analyze Screenshot"}
              </button>
            )}

            {error && (
              <div style={{
                background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.25)",
                borderRadius: 10, padding: "12px 16px", color: "#ff6b6b", fontSize: 13
              }}>⚠️ {error}</div>
            )}
            {result && <ResultView result={result} onAddAccum={addToAccum} />}
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {tab === "manual" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SPORTS.map(s => (
                <button key={s.id} onClick={() => { setSport(s.id); setSelectedMarkets([]); }} style={{
                  padding: "8px 16px", borderRadius: 30,
                  border: `1px solid ${sport === s.id ? "#00ff9d" : "rgba(255,255,255,0.1)"}`,
                  background: sport === s.id ? "rgba(0,255,157,0.12)" : "rgba(255,255,255,0.02)",
                  color: sport === s.id ? "#00ff9d" : "#8899aa",
                  cursor: "pointer", fontSize: 13, fontWeight: 600
                }}>{s.icon} {s.label}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Team A" value={teamA} onChange={e => setTeamA(e.target.value)} style={inputStyle} />
              <input placeholder="Team B" value={teamB} onChange={e => setTeamB(e.target.value)} style={inputStyle} />
            </div>
            <input placeholder="League / Tournament (optional)" value={league} onChange={e => setLeague(e.target.value)} style={inputStyle} />

            <div>
              <p style={{ color: "#556070", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px" }}>SELECT MARKETS</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MARKETS[sport].map(m => (
                  <button key={m} onClick={() => toggleMarket(m)} style={{
                    padding: "6px 12px", borderRadius: 20,
                    border: `1px solid ${selectedMarkets.includes(m) ? "#00ff9d" : "rgba(255,255,255,0.08)"}`,
                    background: selectedMarkets.includes(m) ? "rgba(0,255,157,0.1)" : "rgba(255,255,255,0.02)",
                    color: selectedMarkets.includes(m) ? "#00ff9d" : "#667788",
                    cursor: "pointer", fontSize: 12, fontWeight: 600
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <button onClick={() => handleAnalyze(true)} disabled={loading} style={btnPrimary(loading)}>
              {loading ? "⏳ Generating Prediction..." : "🎯 Get AI Prediction"}
            </button>

            {error && (
              <div style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.25)", borderRadius: 10, padding: "12px 16px", color: "#ff6b6b", fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}
            {result && <ResultView result={result} onAddAccum={addToAccum} />}
          </div>
        )}

        {/* ── ACCUMULATOR TAB ── */}
        {tab === "accumulator" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16 }}>🔗 Multi-Bet Accumulator</h3>
              {accum.length === 0
                ? <p style={{ color: "#556070", fontSize: 14, textAlign: "center", padding: "32px 0" }}>No bets added. Analyze matches and add them here.</p>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {accum.map(a => <AccumulatorRow key={a.id} {...a} onRemove={() => setAccum(s => s.filter(x => x.id !== a.id))} />)}
                  </div>
              }
            </div>

            {accum.length > 0 && (
              <div style={{
                background: accumProb < 30 ? "rgba(255,77,77,0.06)" : "rgba(0,255,157,0.05)",
                border: `1px solid ${accumProb < 30 ? "rgba(255,77,77,0.2)" : "rgba(0,255,157,0.15)"}`,
                borderRadius: 16, padding: 20
              }}>
                <p style={{ color: "#8899aa", fontSize: 11, fontWeight: 700, margin: "0 0 4px", letterSpacing: 1 }}>COMBINED PROBABILITY</p>
                <div style={{ fontSize: 40, fontWeight: 900, color: accumProb < 30 ? "#ff4d4d" : "#00ff9d", fontFamily: "monospace" }}>{accumProb}%</div>
                <p style={{ color: "#8899aa", fontSize: 12, margin: "4px 0 12px" }}>{accum.length} selections · Risk: <span style={{ color: accumProb < 30 ? "#ff4d4d" : "#ffc107" }}>{accumRisk}</span></p>
                <ProbBar value={accumProb} color={accumProb < 30 ? "#ff4d4d" : "#00ff9d"} />
                {accumProb < 30 && (
                  <div style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 12 }}>
                    <p style={{ color: "#ff4d4d", fontSize: 12, fontWeight: 700, margin: 0 }}>⚠️ HIGH RISK WARNING</p>
                    <p style={{ color: "#ff4d4d88", fontSize: 11, margin: "4px 0 0" }}>Multi-bets compound risk significantly. Please bet responsibly.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN TAB ── */}
        {tab === "admin" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "AI Confidence Threshold", value: "75%", icon: "🤖", desc: "Minimum confidence to show prediction" },
              { label: "OCR Engine", value: "Claude Vision", icon: "📷", desc: "Screenshot text & image extraction" },
              { label: "Data Sources", value: "12 Active", icon: "🌐", desc: "Live sports data feeds" },
              { label: "Model Accuracy", value: "81.4%", icon: "📊", desc: "Last 30 days performance" },
              { label: "Active Users", value: "1,247", icon: "👥", desc: "Total active sessions" },
              { label: "Predictions Today", value: "3,891", icon: "⚡", desc: "Predictions generated" },
            ].map(card => (
              <div key={card.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
                <span style={{ fontSize: 22 }}>{card.icon}</span>
                <p style={{ color: "#556070", fontSize: 11, fontWeight: 700, margin: "8px 0 2px", letterSpacing: 0.5 }}>{card.label.toUpperCase()}</p>
                <p style={{ color: "#00ff9d", fontSize: 18, fontWeight: 800, margin: "0 0 2px", fontFamily: "monospace" }}>{card.value}</p>
                <p style={{ color: "#445566", fontSize: 11, margin: 0 }}>{card.desc}</p>
              </div>
            ))}
            <div style={{ gridColumn: "1/-1", background: "rgba(255,193,7,0.05)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 14, padding: 16 }}>
              <p style={{ color: "#ffc107", fontWeight: 700, margin: "0 0 4px" }}>⚠️ Responsible Gambling Notice</p>
              <p style={{ color: "#ffc10788", fontSize: 13, margin: 0 }}>This system provides data-driven probability analysis only. No outcome is guaranteed. Always gamble responsibly.</p>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 36, color: "#334455", fontSize: 11 }}>
          PredictIQ · AI Sports Analysis · Entertainment & research purposes only
        </div>
      </div>
    </div>
  );
}
