"use client";

import { useState, useRef, useCallback } from "react";
import { autoDetectAndParse, splitCookieSets } from "./lib/cookieParser";

/* ═══════════════════════════════════════════════════════════════════════════
   SVG Icons (inline to avoid external deps)
   ═══════════════════════════════════════════════════════════════════════════ */
const Icons = {
  cookie: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" />
      <path d="M11 17v.01" /><path d="M7 14v.01" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  clipboardCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      <polyline points="14 19 16 21 20 17" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  // --- State --------------------------------------------------------
  const [cookieText, setCookieText] = useState("");
  const [format, setFormat] = useState("auto");
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);
  const toastIdRef = useRef(0);

  // --- Toast Helper ------------------------------------------
  const showToast = useCallback((message, type = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // --- File Upload Handler ----------------------------------
  const handleFileUpload = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setCookieText(e.target.result);
        showToast(`Loaded ${file.name}`, "success");
      };
      reader.onerror = () => showToast("Failed to read file", "error");
      reader.readAsText(file);
    },
    [showToast]
  );

  // --- Drag & Drop ------------------------------------------
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    },
    [handleFileUpload]
  );

  // --- Copy Cookies (always converts to Netscape format) ----------------------
  const copyCookies = useCallback(
    (resultItem) => {
      const netscapeLines = resultItem.cookies
        .map((c) => {
          const domain = c.domain || ".netflix.com";
          const flag = c.flag || "TRUE";
          const path = c.path || "/";
          const secure = c.secure ? "TRUE" : "FALSE";
          const expiration = c.expiration || "0";
          return `${domain}\t${flag}\t${path}\t${secure}\t${expiration}\t${c.name}\t${c.value}`;
        })
        .join("\n");
      navigator.clipboard.writeText(netscapeLines).then(() => {
        setCopiedId(resultItem.id);
        showToast("Cookies copied to clipboard!", "success");
        setTimeout(() => setCopiedId(null), 2000);
      }).catch(() => {
        showToast("Failed to copy to clipboard", "error");
      });
    },
    [showToast]
  );

  // --- Check Cookies ------------------------------------------
  const handleCheck = useCallback(async () => {
    if (!cookieText.trim()) {
      showToast("Please paste or upload cookies first", "error");
      return;
    }

    setIsChecking(true);
    setResults([]);

    try {
      // Split into individual cookie sets
      const blocks = splitCookieSets(cookieText);
      const allResults = [];

      // Parse each block
      const parsedSets = [];
      for (const block of blocks) {
        try {
          const { cookies } = autoDetectAndParse(block);
          if (cookies.length > 0) {
            parsedSets.push({ cookies, rawText: block });
          }
        } catch {
          // Skip unparseable blocks
        }
      }

      if (parsedSets.length === 0) {
        showToast("No valid cookies found. Check the format.", "error");
        setIsChecking(false);
        return;
      }

      setProgress({ current: 0, total: parsedSets.length });

      // Check each cookie set sequentially
      for (let i = 0; i < parsedSets.length; i++) {
        setProgress({ current: i + 1, total: parsedSets.length});

        try {
          const res = await fetch("/api/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookies: parsedSets[i].cookies }),
          });

          const data = await res.json();
          allResults.push({
            id: i + 1,
            status: data.status || "error",
            plan: data.details?.plan || "-",
            email: data.details?.email || "-",
            country: data.details?.country || "-",
            extraMembers: data.details?.extraMembers ?? null,
            error: data.error || null,
            cookies: parsedSets[i].cookies,
            rawText: parsedSets[i].rawText,
          });
        } catch (err) {
          allResults.push({
            id: i + 1,
            status: "error",
            plan: "-",
            email: "-",
            country: "-",
            extraMembers: null,
            error: err.message,
            cookies: parsedSets[i].cookies,
            rawText: parsedSets[i].rawText,
          });
        }

        // Update results in real time
        setResults([...allResults]);

        // Small delay between requests to avoid rate limiting
        if (i < parsedSets.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      const working = allResults.filter((r) => r.status === "working").length;
      const expired = allResults.filter((r) => r.status === "expired").length;
      showToast(
        `Done! ${working} working, ${expired} expired out of ${allResults.length}`,
        working > 0 ? "success" : "info"
      );
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setIsChecking(false);
    }
  }, [cookieText, showToast]);

  // --- Export Working Cookies ----------------------------------
  const exportWorking = useCallback(() => {
    const working = results.filter((r) => r.status === "working");
    if (working.length === 0) {
      showToast("No working cookies to export", "error");
      return;
    }

    const exportData = working.map((r, idx) => ({
      set: idx + 1,
      plan: r.plan,
      email: r.email,
      country: r.country,
      cookies: r.cookies,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `working_cookies_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${working.length} working cookie set(s)`, "success");
  }, [results, showToast]);

  // --- Clear All ------------------------------------------
  const clearAll = useCallback(() => {
    setCookieText("");
    setResults([]);
    setProgress({ current: 0, total: 0 });
  }, []);

  // --- Stats Calculation ----------------------------------
  const stats = {
    total: results.length,
    working: results.filter((r) => r.status === "working").length,
    expired: results.filter((r) => r.status === "expired").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  // --- Sort results: working first, then expired, then errors ---
  const sortedResults = [...results].sort((a, b) => {
    const order = { working: 0, expired: 1, error: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  // --- Render ------------------------------------------
  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="btn-icon">
              {t.type === "success" ? Icons.check : t.type === "error" ? Icons.x : Icons.alert}
            </span>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="header">
        <div className="logo-wrapper">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24h-4.715zm8.489 0l3.04 8.59L20 8.59V.001h-6.113zM4 .001V8.59l3.093-.001L4.68 0H4z" />
            </svg>
          </div>
          <h1 className="logo-text">
            <span>Netflix</span> Cookie Checker
          </h1>
        </div>
        <p className="header-subtitle">
          Validate Netflix cookies instantly - paste, upload, and check
        </p>
      </header>

      {/* Input Section */}
      <section className="glass-card input-section" id="input-section">
        <h2 className="section-title">
          <span className="icon">{Icons.cookie}</span>
          Cookie Input
        </h2>

        {/* Format Toggle */}
        <div className="format-toggle" id="format-toggle">
          {["auto", "json", "netscape", "combo"].map((f) => (
            <button
              key={f}
              id={`format-btn-${f}`}
              className={`format-btn ${format === f ? "active" : ""}`}
              onClick={() => setFormat(f)}
            >
              {f === "auto" ? "Auto Detect" : f === "json" ? "JSON" : f === "netscape" ? "Netscape" : "Combo"}
            </button>
          ))}
        </div>

        {/* Cookie Textarea */}
        <textarea
          id="cookie-input"
          className="cookie-textarea"
          placeholder={`Paste your Netflix cookies here...\n\nSupported formats:\n• JSON array: [{"name":"NetflixId","value":"...","domain":".netflix.com",...}]\n• Netscape: .netflix.com\tTRUE\t/\tTRUE\t0\tNetflixId\tvalue\n• Combo: email:pass | ... | NetflixCookies = NetflixId=value\n\nSeparate multiple cookie sets with blank lines (not needed for Combo format).`}
          value={cookieText}
          onChange={(e) => setCookieText(e.target.value)}
          disabled={isChecking}
        />

        {/* Drop Zone */}
        <div
          id="drop-zone"
          className={`drop-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-zone-icon">{Icons.upload}</div>
          <p className="drop-zone-text">
            <strong>Click to upload</strong> or drag & drop cookie files
          </p>
          <p className="drop-zone-text" style={{ fontSize: 12, marginTop: 4, color: "var(--text-muted)" }}>
            .txt, .json, or .cookie files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.json,.cookie,.text"
            onChange={(e) => handleFileUpload(e.target.files[0])}
            tabIndex={-1}
          />
        </div>

        {/* Actions */}
        <div className="actions-row">
          <button
            id="check-btn"
            className="btn btn-primary"
            onClick={handleCheck}
            disabled={isChecking || !cookieText.trim()}
          >
            {isChecking ? (
              <>
                <div className="spinner" />
                Checking...
              </>
            ) : (
              <>
                <span className="btn-icon">{Icons.play}</span>
                Check Cookies
              </>
            )}
          </button>

          {results.length > 0 && (
            <>
              <button id="export-btn" className="btn btn-secondary" onClick={exportWorking}>
                <span className="btn-icon">{Icons.download}</span>
                Export Working
              </button>
              <button id="clear-btn" className="btn btn-secondary" onClick={clearAll}>
                <span className="btn-icon">{Icons.trash}</span>
                Clear
              </button>
            </>
          )}
        </div>
      </section>

      {/* Progress Bar */}
      {isChecking && progress.total > 0 && (
        <section className="glass-card progress-section">
          <div className="progress-info">
            <span>
              Checking cookie set {progress.current} of {progress.total}
            </span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </section>
      )}

      {/* Stats Dashboard */}
      {results.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Checked</div>
          </div>
          <div className="stat-card working">
            <div className="stat-value">{stats.working}</div>
            <div className="stat-label">Working</div>
          </div>
          <div className="stat-card expired">
            <div className="stat-value">{stats.expired}</div>
            <div className="stat-label">Expired</div>
          </div>
          <div className="stat-card errors">
            <div className="stat-value">{stats.errors}</div>
            <div className="stat-label">Errors</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <section className="glass-card results-section">
          <div className="results-header">
            <h2 className="section-title">
              <span className="icon">{Icons.shield}</span>
              Results
            </h2>
          </div>

          <div className="results-table-wrap">
            <table className="results-table" id="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Extra Members</th>
                  <th>Copy</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr key={r.id} className={r.status === "working" ? "row-working" : ""}>
                    <td>{r.id}</td>
                    <td>
                      <span
                        className={`badge badge-${r.status === "working" ? "working" : r.status === "expired" ? "expired" : "error"}`}
                      >
                        <span className="badge-dot" />
                        {r.status}
                      </span>
                    </td>
                    <td>{r.plan}</td>
                    <td className="email-cell" title={r.email}>
                      {r.email}
                    </td>
                    <td>{r.country}</td>
                    <td>{r.extraMembers !== null ? r.extraMembers : "-"}</td>
                    <td>
                      {r.status === "working" ? (
                        <button
                          className="copy-btn"
                          onClick={() => copyCookies(r)}
                          title="Copy cookies to clipboard (same format as pasted)"
                          style={{
                            background: copiedId === r.id ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
                            border: copiedId === r.id ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: copiedId === r.id ? "#22c55e" : "var(--text-secondary, #aaa)",
                            fontSize: "12px",
                            fontWeight: 500,
                            transition: "all 0.2s ease",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            if (copiedId !== r.id) {
                              e.currentTarget.style.background = "rgba(229,9,20,0.15)";
                              e.currentTarget.style.borderColor = "rgba(229,9,20,0.4)";
                              e.currentTarget.style.color = "#e50914";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (copiedId !== r.id) {
                              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                              e.currentTarget.style.color = "var(--text-secondary, #aaa)";
                            }
                          }}
                        >
                          <span style={{ width: 16, height: 16, display: "inline-flex" }}>
                            {copiedId === r.id ? Icons.clipboardCheck : Icons.clipboard}
                          </span>
                          {copiedId === r.id ? "Copied!" : "Copy"}
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted, #555)" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty State (before checking) */}
      {results.length === 0 && !isChecking && (
        <div className="glass-card empty-state fade-in">
          <div className="empty-state-icon">{Icons.cookie}</div>
          <h3>No cookies checked yet</h3>
          <p>Paste your Netflix cookies above and click &quot;Check Cookies&quot; to start.</p>
        </div>
      )}

      {/* How to Use Instructions */}
      <section className="glass-card" id="how-to-use" style={{ marginTop: 24 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>
          <span className="icon">{Icons.alert}</span>
          How to Use Working Cookies
        </h2>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          fontSize: "14px",
          color: "var(--text-secondary, #bbb)",
          lineHeight: 1.7,
        }}>
          {/* Step 1 */}
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 32, height: 32,
              borderRadius: "50%",
              background: "rgba(229,9,20,0.15)",
              border: "1px solid rgba(229,9,20,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#e50914",
              flexShrink: 0,
            }}>1</div>
            <div>
              <strong style={{ color: "var(--text-primary, #eee)" }}>Install Cookie Editor Extension</strong>
              <br />
              Download and install the{" "}
              <a
                href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#e50914", textDecoration: "underline" }}
              >
                Cookie Editor
              </a>{" "}
              extension for your browser (available for Chrome, Firefox, and Edge).
            </div>
          </div>

          {/* Step 2 */}
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 32, height: 32,
              borderRadius: "50%",
              background: "rgba(229,9,20,0.15)",
              border: "1px solid rgba(229,9,20,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#e50914",
              flexShrink: 0,
            }}>2</div>
            <div>
              <strong style={{ color: "var(--text-primary, #eee)" }}>Copy the Working Cookie</strong>
              <br />
              After checking your cookies, find a result marked as{" "}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 4, padding: "1px 8px", fontSize: 12, color: "#22c55e",
                fontWeight: 600, verticalAlign: "middle",
              }}>working</span>{" "}
              and click the <strong style={{ color: "var(--text-primary, #eee)" }}>Copy</strong> button in the last column.
            </div>
          </div>

          {/* Step 3 */}
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 32, height: 32,
              borderRadius: "50%",
              background: "rgba(229,9,20,0.15)",
              border: "1px solid rgba(229,9,20,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#e50914",
              flexShrink: 0,
            }}>3</div>
            <div>
              <strong style={{ color: "var(--text-primary, #eee)" }}>Go to Netflix</strong>
              <br />
              Open{" "}
              <a
                href="https://www.netflix.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#e50914", textDecoration: "underline" }}
              >
                netflix.com
              </a>{" "}
              in your browser. You don&apos;t need to be logged in.
            </div>
          </div>

          {/* Step 4 */}
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 32, height: 32,
              borderRadius: "50%",
              background: "rgba(229,9,20,0.15)",
              border: "1px solid rgba(229,9,20,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#e50914",
              flexShrink: 0,
            }}>4</div>
            <div>
              <strong style={{ color: "var(--text-primary, #eee)" }}>Open Cookie Editor &amp; Delete Existing Cookies</strong>
              <br />
              Click the Cookie Editor icon in your browser toolbar. Click the{" "}
              <strong style={{ color: "var(--text-primary, #eee)" }}>trash/delete all</strong>{" "}
              button to remove any existing Netflix cookies first.
            </div>
          </div>

          {/* Step 5 */}
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 32, height: 32,
              borderRadius: "50%",
              background: "rgba(229,9,20,0.15)",
              border: "1px solid rgba(229,9,20,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#e50914",
              flexShrink: 0,
            }}>5</div>
            <div>
              <strong style={{ color: "var(--text-primary, #eee)" }}>Import the Copied Cookies</strong>
              <br />
              In Cookie Editor, click the <strong style={{ color: "var(--text-primary, #eee)" }}>Import</strong> button
              (usually at the top-right). Paste the cookies you copied earlier into the text box, then click{" "}
              <strong style={{ color: "var(--text-primary, #eee)" }}>Import</strong> to confirm.
            </div>
          </div>

          {/* Step 6 */}
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
          }}>
            <div style={{
              minWidth: 32, height: 32,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#22c55e",
              flexShrink: 0,
            }}>✓</div>
            <div>
              <strong style={{ color: "var(--text-primary, #eee)" }}>Refresh &amp; Enjoy</strong>
              <br />
              Reload the Netflix page (<strong style={{ color: "var(--text-primary, #eee)" }}>Ctrl+R</strong> or{" "}
              <strong style={{ color: "var(--text-primary, #eee)" }}>F5</strong>). You should now be logged into the account.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>
          Netflix Cookie Checker - For educational purposes only.
          <br />
          Inspired by{" "}
          <a
            href="https://github.com/matheeshapathirana/Netflix-cookie-checker"
            target="_blank"
            rel="noopener noreferrer"
          >
            matheeshapathirana/Netflix-cookie-checker
          </a>
        </p>
      </footer>
    </div>
  );
}
