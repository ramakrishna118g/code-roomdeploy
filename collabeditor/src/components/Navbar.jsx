import { useState } from "react";
import logo from "../assets/logo.png";
import "../pages/Editor/Editor.css";

function Navbar({
  lan,
  setlan,
  roomId,
  fileName,
  onFileNameChange,
  onSave,
  onRun,
  isRunning,
  userName,
  onNameChange,
  onReview,
  isReviewing,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [editingFile, setEditingFile] = useState(false);
  const [fileDraft, setFileDraft] = useState("");

  const [copied, setCopied] = useState(false);

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
    setFileDraft(fileName || "main.txt");
    setEditingFile(true);
  }

  function commitFileEdit() {
    const trimmed = fileDraft.trim();
    if (trimmed && trimmed !== fileName) {
      onFileNameChange(trimmed);
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
        {/* Editable File Name Badge */}
        {editingFile ? (
          <input
            className="name-input"
            value={fileDraft}
            autoFocus
            maxLength={35}
            onChange={(e) => setFileDraft(e.target.value)}
            onBlur={commitFileEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitFileEdit();
              if (e.key === "Escape") setEditingFile(false);
            }}
            style={{ width: "140px" }}
          />
        ) : (
          <span
            className="room-id"
            onClick={startFileEdit}
            title="Click to rename file"
            style={{ cursor: "pointer", color: "#60a5fa", fontWeight: 600 }}
          >
            📄 {fileName || "main.txt"} ✏️
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

        <button className="btn ai" onClick={onReview} disabled={isReviewing}>
          {isReviewing ? "Reviewing..." : "✦ AI Review"}
        </button>
        <button className="btn run" onClick={onRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Run ▶"}
        </button>
        <button className="btn store" onClick={onSave} title={`Download ${fileName || "file"}`}>
          Save
        </button>
      </div>
    </div>
  );
}

export default Navbar;
