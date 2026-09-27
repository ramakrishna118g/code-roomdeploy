import { useState } from "react";
import logo from "../assets/logo.png";
import "../pages/Editor/Editor.css";

const EXT_MAP = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  cpp: ".cpp",
  typescript: ".ts",
};

function Navbar({
  lan,
  setlan,
  roomId,
  baseFileName,
  onBaseFileNameChange,
  onSave,
  onRun,
  isRunning,
  userName,
  onNameChange,
  onAiChat,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [editingFile, setEditingFile] = useState(false);
  const [fileDraft, setFileDraft] = useState("");

  const [copied, setCopied] = useState(false);

  const currentExt = EXT_MAP[lan] || ".txt";
  const displayFileName = `${baseFileName || "main"}${currentExt}`;

  function startNameEdit() {
    setNameDraft(userName);
    setEditingName(true);
  }

  function commitNameEdit() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== userName) {
      onNameChange(trimmed);
    }
    setEditingName(false);
  }

  function startFileEdit() {
    setFileDraft(baseFileName || "main");
    setEditingFile(true);
  }

  function commitFileEdit() {
    // Strip extension if user typed one in the edit input
    const cleanName = fileDraft.trim().replace(/\.[^/.]+$/, "");
    if (cleanName && cleanName !== baseFileName) {
      onBaseFileNameChange(cleanName);
    }
    setEditingFile(false);
  }

  function handleCopyRoomId() {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="navbar">
      {/* LEFT */}
      <div className="nav-left">
        <img src={logo} className="logo" alt="Logo" />
        <h2 className="brand">CodeRoom</h2>

        <select
          className="language-select"
          value={lan}
          onChange={(e) => setlan(e.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="typescript">TypeScript</option>
        </select>
      </div>

      {/* CENTER */}
      <div className="nav-center" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        {/* Editable Base File Name Badge */}
        {editingFile ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              className="name-input"
              value={fileDraft}
              autoFocus
              maxLength={30}
              onChange={(e) => setFileDraft(e.target.value)}
              onBlur={commitFileEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitFileEdit();
                if (e.key === "Escape") setEditingFile(false);
              }}
              style={{ width: "120px" }}
            />
            <span style={{ color: "#9ca3af", fontSize: "13px", marginLeft: "2px" }}>{currentExt}</span>
          </div>
        ) : (
          <span
            className="room-id"
            onClick={startFileEdit}
            title="Click to rename file / class"
            style={{ cursor: "pointer", color: "#60a5fa", fontWeight: 600 }}
          >
            📄 {displayFileName} ✏️
          </span>
        )}

        {/* Copyable Room ID Badge */}
        <span
          className="room-id"
          onClick={handleCopyRoomId}
          title="Click to copy Room ID"
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          Room: <strong>{roomId}</strong> {copied ? "✅ Copied!" : "📋"}
        </span>
      </div>

      {/* RIGHT */}
      <div className="nav-right">
        {/* Editable name badge */}
        {editingName ? (
          <input
            className="name-input"
            value={nameDraft}
            autoFocus
            maxLength={20}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitNameEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitNameEdit();
              if (e.key === "Escape") setEditingName(false);
            }}
          />
        ) : (
          <button className="btn people" onClick={startNameEdit} title="Click to change your name">
            👤 {userName}
          </button>
        )}

        <button className="btn ai" onClick={onAiChat}>
          ✦ AI Chat
        </button>
        <button className="btn run" onClick={onRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Run ▶"}
        </button>
        <button className="btn store" onClick={onSave} title={`Download ${displayFileName}`}>
          Save
        </button>
      </div>
    </div>
  );
}

export default Navbar;
