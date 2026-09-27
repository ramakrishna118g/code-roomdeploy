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

const DEFAULT_BASE_FILENAMES = {
  javascript: "index",
  java: "Main",
  python: "main",
  cpp: "main",
  typescript: "index",
};

const EXT_MAP = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  cpp: ".cpp",
  typescript: ".ts",
};

function EditorPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const roomId = location.state?.roomId || null;
  const languageFromRoute = location.state?.language || "javascript";
  const baseFileNameFromRoute = location.state?.baseFileName || DEFAULT_BASE_FILENAMES[languageFromRoute] || "main";

  const [lan, setlan] = useState(languageFromRoute);
  const [baseFileName, setBaseFileName] = useState(baseFileNameFromRoute);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [yjsStatus, setYjsStatus] = useState("connecting");
  const [userName, setUserName] = useState(
    location.state?.userName || localStorage.getItem("cr_username") || "User"
  );

  // AI Chat Assistant States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const ytextRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const userColorRef = useRef(randomColor());
  const userNameRef = useRef(userName);
  const chatBottomRef = useRef(null);

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
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatSending]);

  useEffect(() => {
    if (!roomId) return;

    let ydoc;
    let provider;

    function getWsUrl() {
      let url = import.meta.env.VITE_WS_URL || import.meta.env.VITE_BACKEND_URL || "ws://localhost:1234";
      url = url.trim().replace(/\/+$/, "");
      if (typeof window !== "undefined" && window.location.protocol === "https:") {
        url = url.replace(/^http:\/\//i, "wss://").replace(/^https:\/\//i, "wss://").replace(/^ws:\/\//i, "wss://");
      } else {
        url = url.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
      }
      return url;
    }

    try {
      ydoc = new Y.Doc();
      const ytext = ydoc.getText("monaco");
      provider = new WebsocketProvider(
        `${getWsUrl()}/yjs`,
        roomId,
        ydoc
      );

      // Yjs Room Metadata Sync (language & baseFileName)
      const metaMap = ydoc.getMap("room-metadata");

      if (languageFromRoute && !metaMap.get("language")) {
        metaMap.set("language", languageFromRoute);
      } else if (metaMap.get("language")) {
        const syncedLang = metaMap.get("language");
        setlan(syncedLang);
        updateMonacoLanguage(syncedLang);
      }

      if (baseFileNameFromRoute && !metaMap.get("baseFileName")) {
        metaMap.set("baseFileName", baseFileNameFromRoute);
      } else if (metaMap.get("baseFileName")) {
        setBaseFileName(metaMap.get("baseFileName"));
      }

      metaMap.observe(() => {
        const syncedLang = metaMap.get("language");
        if (syncedLang) {
          setlan(syncedLang);
          updateMonacoLanguage(syncedLang);
        }
        const syncedBaseName = metaMap.get("baseFileName");
        if (syncedBaseName) {
          setBaseFileName(syncedBaseName);
        }
      });

      provider.on("status", ({ status }) => {
        setYjsStatus(status === "connected" ? "connected" : "connecting");
      });

      provider.on("connection-error", (err) => {
        console.error("Yjs WS connection error:", err);
        setYjsStatus("error");
      });

      ydocRef.current = ydoc;
      providerRef.current = provider;
      ytextRef.current = ytext;

      provider.awareness.setLocalStateField("user", {
        name: userNameRef.current,
        color: userColorRef.current,
      });

      provider.awareness.on("change", () => {
        if (!editorRef.current || !monacoRef.current) return;
        renderRemoteCursors(
          provider.awareness.getStates(),
          editorRef.current,
          monacoRef.current
        );
      });
    } catch (err) {
      console.error("Yjs init error:", err);
      setYjsStatus("error");
    }

    return () => {
      bindingRef.current?.destroy();
      provider?.destroy();
      ydoc?.destroy();
    };
  }, [roomId]);

  function updateMonacoLanguage(newLang) {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, newLang);
      }
    }
  }

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, lan);
    }

    if (ytextRef.current && providerRef.current) {
      bindingRef.current = new MonacoBinding(
        ytextRef.current,
        editor.getModel(),
        new Set([editor]),
        providerRef.current.awareness
      );
    }
  }

  function renderRemoteCursors(states, editor, monaco) {
    const localClientID = providerRef.current?.awareness.clientID;
    const newDecorations = [];

    states.forEach((state, clientID) => {
      if (clientID === localClientID) return;
      if (!state.user || !state.cursor) return;

      const { name, color } = state.user;
      const { selectionHead, selectionAnchor } = state.cursor;
      const className = `remote-cursor-${clientID}`;

      if (!injectedStylesRef.current.has(className)) {
        injectedStylesRef.current.add(className);
        const style = document.createElement("style");
        style.textContent = `
          .${className} {
            position: absolute;
            background-color: ${color};
            width: 2px !important;
          }
          .${className}::after {
            content: "${name}";
            position: absolute;
            top: -18px;
            left: 0;
            background-color: ${color};
            color: #000;
            font-size: 10px;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 2px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 10;
          }
        `;
        document.head.appendChild(style);
      }

      const model = editor.getModel();
      if (!model) return;

      const headPos = model.getPositionAt(selectionHead);
      const anchorPos = model.getPositionAt(selectionAnchor);

      newDecorations.push({
        range: new monaco.Range(
          Math.min(headPos.lineNumber, anchorPos.lineNumber),
          Math.min(headPos.column, anchorPos.column),
          Math.max(headPos.lineNumber, anchorPos.lineNumber),
          Math.max(headPos.column, anchorPos.column)
        ),
        options: { className, stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWithTyping },
      });
    });

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current || [],
      newDecorations
    );
  }

  function changeLanguage(newLang) {
    setlan(newLang);
    updateMonacoLanguage(newLang);

    if (ydocRef.current) {
      const metaMap = ydocRef.current.getMap("room-metadata");
      metaMap.set("language", newLang);
    }
  }

  function handleBaseFileNameChange(newBaseName) {
    const cleanBaseName = newBaseName.trim().replace(/\.[^/.]+$/, "");
    if (!cleanBaseName) return;
    setBaseFileName(cleanBaseName);
    if (ydocRef.current) {
      const metaMap = ydocRef.current.getMap("room-metadata");
      metaMap.set("baseFileName", cleanBaseName);
    }
  }

  function handleUserNameChange(newName) {
    setUserName(newName);
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

  function toggleAiChat() {
    setShowChatPanel((prev) => {
      const nextState = !prev;
      if (nextState && chatMessages.length === 0) {
        setChatMessages([
          {
            id: 1,
            role: "assistant",
            text: "Hi there! 👋 Welcome to CodeRoom AI Chat.\n\nI'm your coding assistant. Ask me questions, request a code review, or ask how to fix errors!",
          },
        ]);
      }
      return nextState;
    });
  }

  async function handleSendChat(customText = null) {
    const textToSend = customText || chatInput.trim();
    if (!textToSend || isChatSending) return;
    if (!customText) setChatInput("");

    const newMessages = [...chatMessages, { id: Date.now(), role: "user", text: textToSend }];
    setChatMessages(newMessages);
    setIsChatSending(true);

    const code = editorRef.current ? editorRef.current.getValue() : "";

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:1234"}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, code, language: lan }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: "assistant", text: "Error: " + (data.error || "Failed to get AI reply.") },
        ]);
        return;
      }

      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: data.reply },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: "Network Error: " + err.message },
      ]);
    } finally {
      setIsChatSending(false);
    }
  }

  function saveFile(code) {
    const ext = EXT_MAP[lan] || ".txt";
    const downloadName = `${baseFileName || "main"}${ext}`;
    const blob = new Blob([code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={styles.appContainer}>
      <Navbar
        lan={lan}
        setlan={changeLanguage}
        baseFileName={baseFileName}
        onBaseFileNameChange={handleBaseFileNameChange}
        onRun={runCode}
        isRunning={isRunning}
        roomId={roomId}
        userName={userName}
        onNameChange={handleUserNameChange}
        onSave={() => saveFile(editorRef.current?.getValue() || "")}
        onAiChat={toggleAiChat}
      />

      {yjsStatus === "error" && (
        <div style={{ ...styles.statusBar, backgroundColor: "#b91c1c", color: "#fef2f2" }}>
          ⚠ Sync connection failed — changes may not be shared
        </div>
      )}

      {yjsStatus === "connecting" && (
        <div style={{ ...styles.statusBar, backgroundColor: "#1e3a8a", color: "#dbeafe" }}>
          Connecting to room synchronization...
        </div>
      )}

      <div style={styles.mainArea}>
        {/* Editor + Bottom Terminal Output Column */}
        <div style={styles.editorTerminalColumn}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Editor
              height="100%"
              defaultLanguage={languageFromRoute}
              theme="hc-black"
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

        {/* AI Assistant Chat Drawer */}
        {showChatPanel && (
          <div style={styles.reviewPanel}>
            <div style={styles.reviewHeader}>
              <span>✦ CodeRoom AI Chat</span>
              <button onClick={() => setShowChatPanel(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.chatBody}>
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={msg.role === "user" ? styles.userBubbleContainer : styles.aiBubbleContainer}
                >
                  <div style={msg.role === "user" ? styles.userBubble : styles.aiBubble}>
                    <div style={styles.bubbleRoleHeader}>
                      {msg.role === "user" ? "You" : "✦ CodeRoom AI"}
                    </div>
                    <pre style={styles.bubbleText}>{msg.text}</pre>
                  </div>
                </div>
              ))}

              {isChatSending && (
                <div style={styles.aiBubbleContainer}>
                  <div style={styles.aiBubble}>
                    <span style={styles.reviewLoading}>✦ Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Action Suggestion Chips */}
            <div style={styles.quickChipsRow}>
              <button
                style={styles.chipBtn}
                onClick={() => handleSendChat("Please do a clean, structured code review of my code.")}
                disabled={isChatSending}
              >
                🔍 Review My Code
              </button>
              <button
                style={styles.chipBtn}
                onClick={() => handleSendChat("Are there any bugs, resource leaks, or edge cases in this code?")}
                disabled={isChatSending}
              >
                🐛 Find Bugs
              </button>
            </div>

            <div style={styles.chatInputContainer}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Ask CodeRoom AI anything about your code..."
                style={styles.chatInput}
              />
              <button onClick={() => handleSendChat()} disabled={isChatSending} style={styles.sendBtn}>
                Send
              </button>
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
    backgroundColor: "#000000",
    color: "#ffffff",
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
    borderTop: "1px solid #333333",
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
    backgroundColor: "#0a0a0a",
    borderTop: "2px solid #333333",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  outputHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: "1px solid #333333",
    fontSize: "13px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#000000",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
  },
  outputText: {
    flex: 1,
    padding: "16px",
    margin: 0,
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#ffffff",
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  reviewPanel: {
    width: "40%",
    backgroundColor: "#0a0a0a",
    borderLeft: "2px solid #333333",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #333333",
    fontSize: "14px",
    fontWeight: 700,
    color: "#c084fc",
    backgroundColor: "#000000",
  },
  chatBody: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  reviewLoading: {
    color: "#a1a1aa",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  reviewErrorText: {
    color: "#f87171",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  userBubbleContainer: {
    display: "flex",
    justifyContent: "flex-end",
  },
  aiBubbleContainer: {
    display: "flex",
    justifyContent: "flex-start",
  },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    borderRadius: "12px 12px 2px 12px",
    padding: "10px 14px",
  },
  aiBubble: {
    maxWidth: "88%",
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    color: "#f4f4f5",
    borderRadius: "12px 12px 12px 2px",
    padding: "10px 14px",
  },
  bubbleRoleHeader: {
    fontSize: "11px",
    fontWeight: "bold",
    marginBottom: "4px",
    opacity: 0.8,
  },
  bubbleText: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  quickChipsRow: {
    display: "flex",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "#0a0a0a",
    borderTop: "1px solid #27272a",
  },
  chipBtn: {
    backgroundColor: "#27272a",
    color: "#d4d4d8",
    border: "1px solid #3f3f46",
    borderRadius: "16px",
    padding: "4px 12px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: "500",
  },
  chatInputContainer: {
    display: "flex",
    gap: "8px",
    padding: "12px",
    borderTop: "1px solid #333333",
    backgroundColor: "#000000",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "6px",
    color: "#ffffff",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
  },
  sendBtn: {
    backgroundColor: "#8b5cf6",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default EditorPage;
