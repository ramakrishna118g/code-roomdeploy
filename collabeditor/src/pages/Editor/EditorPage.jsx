import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import Navbar from "../../components/Navbar.jsx";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import "./Editor.css";
import { useLocation, useNavigate } from "react-router-dom";

function randomColor() {
  const colors = ["#22d3ee", "#f472b6", "#34d399", "#fb923c", "#a78bfa", "#facc15"];
  return colors[Math.floor(Math.random() * colors.length)];
}

const JUDGE0_LANG_MAP = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  typescript: 74,
};

function EditorPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const roomId = location.state?.roomId || null;
  const languageFromRoute = location.state?.language || "javascript";

  const [lan, setlan] = useState(languageFromRoute);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [yjsStatus, setYjsStatus] = useState("connecting");
  const [userName, setUserName] = useState(
    location.state?.userName || localStorage.getItem("cr_username") || "User"
  );

  const [aiReview, setAiReview] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const ytextRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const userColorRef = useRef(randomColor());
  const userNameRef = useRef(userName);

  const decorationsRef = useRef(null);
  const injectedStylesRef = useRef(new Set());

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    if (!roomId) {
      navigate("/", { replace: true });
    }
  }, [roomId, navigate]);

  useEffect(() => {
    if (!roomId) return;

    let ydoc;
    let provider;

function getWsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/^http/, "ws");
  }
  return "ws://localhost:1234";
}

    try {
      ydoc = new Y.Doc();
      const ytext = ydoc.getText("monaco");
      provider = new WebsocketProvider(
        `${getWsUrl()}/yjs`,
        roomId,
        ydoc
      );

      provider.on("status", ({ status }) => {
        setYjsStatus(status === "connected" ? "connected" : "connecting");
      });

      provider.on("connection-error", (err) => {
        console.error("Yjs WS connection error:", err);
        setYjsStatus("error");
      });

      ydocRef.current = ydoc;
      ytextRef.current = ytext;
      providerRef.current = provider;

      provider.awareness.on("change", () => updateRemoteCursorLabels());

      if (editorRef.current) {
        rebind(editorRef.current, ytext, provider);
      }
    } catch (err) {
      console.error("Yjs setup failed:", err);
      setYjsStatus("error");
    }

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
      decorationsRef.current?.clear();
      decorationsRef.current = null;
      provider?.awareness?.off("change", updateRemoteCursorLabels);
      provider?.destroy();
      ydoc?.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
      providerRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (model) {
      monacoRef.current.editor.setModelLanguage(model, lan);
    }
  }, [lan]);

  function rebind(editor, ytext, provider) {
    try {
      bindingRef.current?.destroy();
      bindingRef.current = new MonacoBinding(
        ytext,
        editor.getModel(),
        new Set([editor]),
        provider.awareness
      );
      provider.awareness.setLocalStateField("user", {
        name: userNameRef.current,
        color: userColorRef.current,
      });

      decorationsRef.current = editor.createDecorationsCollection([]);
      updateRemoteCursorLabels();
    } catch (err) {
      console.error("MonacoBinding failed:", err);
    }
  }

  function ensureStyleForClient(clientId, color) {
    const key = `cr-cursor-style-${clientId}`;
    if (injectedStylesRef.current.has(key)) return;
    injectedStylesRef.current.add(key);

    const styleEl = document.createElement("style");
    styleEl.id = key;
    styleEl.textContent = `
      .cr-remote-cursor-${clientId} {
        position: relative;
        border-left: 2px solid ${color};
      }
      .cr-remote-cursor-${clientId}::before {
        content: attr(data-cr-name);
        position: absolute;
        top: -18px;
        left: -2px;
        background: ${color};
        color: #0d1117;
        font-size: 11px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        font-family: 'JetBrains Mono', monospace;
        pointer-events: none;
        z-index: 50;
      }
    `;
    document.head.appendChild(styleEl);
  }

  function updateRemoteCursorLabels() {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const provider = providerRef.current;
    if (!editor || !monaco || !provider || !decorationsRef.current) return;

    const localClientId = provider.awareness.clientID;
    const states = provider.awareness.getStates();
    const newDecorations = [];

    states.forEach((state, clientId) => {
      if (clientId === localClientId) return;
      if (!state?.user || !state?.cursor) return;

      const { color } = state.user;
      const { lineNumber, column } = state.cursor;

      if (!lineNumber || !column) return;

      ensureStyleForClient(clientId, color);

      newDecorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `cr-remote-cursor-${clientId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    });

    decorationsRef.current.set(newDecorations);

    requestAnimationFrame(() => {
      states.forEach((state, clientId) => {
        if (clientId === localClientId) return;
        if (!state?.user) return;
        const els = document.querySelectorAll(`.cr-remote-cursor-${clientId}`);
        els.forEach((el) => el.setAttribute("data-cr-name", state.user.name || "User"));
      });
    });
  }

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (!ytextRef.current || !providerRef.current) return;
    rebind(editor, ytextRef.current, providerRef.current);

    editor.onDidChangeCursorPosition((e) => {
      providerRef.current?.awareness.setLocalStateField("cursor", {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  function handleNameChange(newName) {
    setUserName(newName);
    userNameRef.current = newName;
    localStorage.setItem("cr_username", newName);
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField("user", {
        name: newName,
        color: userColorRef.current,
      });
    }
  }

  async function runCode() {
    if (!editorRef.current) return;

    const code = editorRef.current.getValue();
    const languageId = JUDGE0_LANG_MAP[lan];

    if (!languageId) {
      setOutput(`Language "${lan}" is not supported yet.`);
      setShowOutput(true);
      return;
    }

    setIsRunning(true);
    setShowOutput(true);
    setOutput("Running...");

    try {
      const submitRes = await fetch(
        "https://ce.judge0.com/submissions?base64_encoded=false&wait=false",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_code: code, language_id: languageId }),
        }
      );

      const { token } = await submitRes.json();

      if (!token) {
        setOutput("Failed to get submission token. Judge0 may be rate limiting you.");
        return;
      }

      let result;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const pollRes = await fetch(
          `https://ce.judge0.com/submissions/${token}?base64_encoded=false`
        );
        result = await pollRes.json();
        if (result.status?.id >= 3) break;
      }

      if (!result) setOutput("Timed out waiting for result.");
      else if (result.compile_output) setOutput("Compile Error:\n" + result.compile_output);
      else if (result.stdout) setOutput(result.stdout);
      else if (result.stderr) setOutput("Error:\n" + result.stderr);
      else setOutput("No output.");
    } catch (err) {
      setOutput("Network error:\n" + err.message);
    } finally {
      setIsRunning(false);
    }
  }

  async function reviewCode() {
    if (!editorRef.current) return;

    const code = editorRef.current.getValue();

    if (!code.trim()) {
      setReviewError("Editor is empty — nothing to review.");
      setShowReviewPanel(true);
      return;
    }

    setIsReviewing(true);
    setShowReviewPanel(true);
    setReviewError("");
    setAiReview("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:1234"}/api/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language: lan }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setReviewError(data.error || "Failed to get review.");
        return;
      }

      setAiReview(data.review);
    } catch (err) {
      setReviewError("Network error: " + err.message);
    } finally {
      setIsReviewing(false);
    }
  }

  function saveFile(code, language) {
    const extMap = { javascript: "js", python: "py", java: "java", cpp: "cpp", typescript: "ts" };
    const ext = extMap[language] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!roomId) return null;

  return (
    <div style={styles.appContainer}>
      <Navbar
        lan={lan}
        setlan={setlan}
        roomId={roomId}
        userName={userName}
        onNameChange={handleNameChange}
        onSave={() => editorRef.current && saveFile(editorRef.current.getValue(), lan)}
        onRun={runCode}
        isRunning={isRunning}
        onReview={reviewCode}
        isReviewing={isReviewing}
      />

      {yjsStatus !== "connected" && (
        <div
          style={{
            ...styles.statusBar,
            backgroundColor: yjsStatus === "error" ? "#450a0a" : "#1c1917",
            color: yjsStatus === "error" ? "#f87171" : "#a8a29e",
          }}
        >
          {yjsStatus === "error"
            ? "⚠ Sync connection failed — changes may not be shared"
            : "⟳ Connecting to sync server..."}
        </div>
      )}

      <div style={styles.mainArea}>
        {/* Editor + Bottom Terminal Output Column */}
        <div style={styles.editorTerminalColumn}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Editor
              height="100%"
              defaultLanguage={languageFromRoute}
              theme="vs-dark"
              onMount={handleMount}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on",
                cursorBlinking: "phase",
                padding: { top: 40, bottom: 20 },
                lineHeight: 1.7,
                scrollBeyondLastLine: false,
                renderLineHighlight: "gutter",
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                tabSize: 2,
              }}
            />
          </div>

          {showOutput && (
            <div style={styles.outputPanelBottom}>
              <div style={styles.outputHeader}>
                <span>Terminal Output</span>
                <button onClick={() => setShowOutput(false)} style={styles.closeBtn}>✕</button>
              </div>
              <pre style={styles.outputText}>{output}</pre>
            </div>
          )}
        </div>

        {showReviewPanel && (
          <div style={styles.reviewPanel}>
            <div style={styles.reviewHeader}>
              <span>✦ AI Code Review</span>
              <button onClick={() => setShowReviewPanel(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.reviewBody}>
              {isReviewing && <div style={styles.reviewLoading}>Analyzing your code...</div>}

              {!isReviewing && reviewError && (
                <div style={styles.reviewErrorText}>{reviewError}</div>
              )}

              {!isReviewing && !reviewError && aiReview && (
                <pre style={styles.reviewText}>{aiReview}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#0d1117",
    color: "#e6edf3",
    overflow: "hidden",
  },
  statusBar: {
    padding: "4px 16px",
    fontSize: "12px",
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
  },
  mainArea: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    overflow: "hidden",
    borderTop: "1px solid #21262d",
  },
  editorTerminalColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  outputPanelBottom: {
    height: "220px",
    maxHeight: "45%",
    backgroundColor: "#161b22",
    borderTop: "2px solid #21262d",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  outputHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: "1px solid #21262d",
    fontSize: "13px",
    fontWeight: 600,
    color: "#8b949e",
    backgroundColor: "#0d1117",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#8b949e",
    cursor: "pointer",
    fontSize: "14px",
  },
  outputText: {
    flex: 1,
    padding: "16px",
    margin: 0,
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#e6edf3",
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  reviewPanel: {
    width: "38%",
    backgroundColor: "#161b22",
    borderLeft: "1px solid #21262d",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: "1px solid #21262d",
    fontSize: "13px",
    fontWeight: 600,
    color: "#a78bfa",
    backgroundColor: "#0d1117",
  },
  reviewBody: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
  },
  reviewLoading: {
    color: "#8b949e",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  reviewErrorText: {
    color: "#f87171",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  reviewText: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    fontFamily: "'JetBrains Mono', monospace",
    color: "#e6edf3",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};

export default EditorPage;
