import { useState } from "react";
import logo from "../assets/logo.png";
import "../pages/Editor/Editor.css";

function Navbar({ lan, setlan, roomId, onSave, onRun, isRunning, userName, onNameChange, onReview, isReviewing }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    setDraft(userName);
    setEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== userName) {
      onNameChange(trimmed);
    }
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
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
      <div className="nav-center">
        <span className="room-id">Room: {roomId}</span>
      </div>

      {/* RIGHT */}
      <div className="nav-right">
        {/* Editable name badge */}
        {editing ? (
          <input
            className="name-input"
            value={draft}
            autoFocus
            maxLength={20}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <button className="btn people" onClick={startEdit} title="Click to change your name">
            👤 {userName}
          </button>
        )}

        <button className="btn ai" onClick={onReview} disabled={isReviewing}>
          {isReviewing ? "Reviewing..." : "✦ AI Review"}
        </button>
        <button className="btn run" onClick={onRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Run ▶"}
        </button>
        <button className="btn store" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

export default Navbar;
