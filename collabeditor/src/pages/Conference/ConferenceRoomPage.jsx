import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar.jsx";
import "./ConferenceRoom.css";

function ConferenceRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  return (
    <div id="layout">
      <Sidebar />

      <div id="conference-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", textAlign: "center", padding: "20px" }}>
        <div style={{ maxWidth: "600px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "30px", backdropFilter: "blur(10px)" }}>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "15px", color: "#60a5fa" }}>📹 Video & Audio Conference</h2>
          <p style={{ color: "#9ca3af", marginBottom: "20px", lineHeight: "1.6" }}>
            Audio & Video conferencing requires Mediasoup SFU native binaries.
            In this cloud-deployment version, video conferencing is turned off so that the core 
            <strong> Collaborative Code Editor</strong>, <strong>Yjs Real-Time Synchronization</strong>, <strong>AI Code Assistant</strong>, and <strong>Code Execution</strong> run seamlessly without heavy host dependencies.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "20px" }}>
            <button 
              onClick={() => navigate("/dashboard")}
              style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConferenceRoomPage;
