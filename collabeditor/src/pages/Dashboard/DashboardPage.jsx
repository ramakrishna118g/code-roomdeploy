import { useState } from "react";
import Sidebar from "../../components/Sidebar.jsx";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../../services/socket.js";

const DEFAULT_FILENAMES = {
  javascript: "index.js",
  java: "Main.java",
  python: "main.py",
  cpp: "main.cpp",
  typescript: "index.ts",
};

function DashboardPage() {
  const socket = getSocket();
  const [isVisible, setIsVisible] = useState(true);
  const [iscreate, setiscreate] = useState(false);
  const [isjoin, setisjoin] = useState(false);
  const [languagetype, setlanguagetype] = useState("javascript");
  const [filename, setfilename] = useState("index.js");
  const [conferencetype, setconferencetype] = useState("editor");
  const [pass, setpass] = useState("12345678");
  const [enpass, setenpass] = useState("12345678@");
  const [enroomid, setenroomid] = useState("");

  const [username, setusername] = useState(localStorage.getItem("cr_username") || "");
  const [enusername, setenusername] = useState(localStorage.getItem("cr_username") || "");

  const navigate = useNavigate();

  function createroom() {
    setIsVisible(false);
    setisjoin(false);
    setiscreate(true);
  }

  function joinroom() {
    setiscreate(false);
    setIsVisible(false);
    setisjoin(true);
  }

  function tomain() {
    setisjoin(false);
    setiscreate(false);
    setIsVisible(true);
  }

  function handleLanguageChange(lang) {
    setlanguagetype(lang);
    setfilename(DEFAULT_FILENAMES[lang] || "file.txt");
  }

  function createroomapifunc() {
    if (!username.trim()) {
      alert("Please enter your name before creating a room.");
      return;
    }

    localStorage.setItem("cr_username", username.trim());

    socket.emit("create-room", {
      password: pass,
      type: conferencetype,
    });

    socket.once("room-created", (roomId) => {
      console.log("room created:", roomId);
      navigate("/room", {
        state: {
          roomId: roomId,
          language: languagetype,
          fileName: filename.trim() || DEFAULT_FILENAMES[languagetype] || "file.txt",
          conference: conferencetype,
          userName: username.trim(),
        },
      });
    });
  }

  function tojoin() {
    if (!enusername.trim()) {
      alert("Please enter your name before joining a room.");
      return;
    }

    localStorage.setItem("cr_username", enusername.trim());

    socket.emit("join-room", {
      roomId: enroomid,
      pass: enpass,
    });

    socket.once("joined-success", (roomId) => {
      navigate("/room", {
        state: {
          roomId: roomId,
          language: languagetype,
          conference: conferencetype,
          userName: enusername.trim(),
        },
      });
    });

    socket.once("error", (msg) => {
      alert(msg);
    });
  }

  return (
    <div id="layout">
      <Sidebar />

      {isVisible && (
        <main id="content">
          <h1>Welcome to Collabin</h1>

          <button onClick={createroom}>
            + Create a Collab Room
          </button>

          <p>or</p>

          <button onClick={joinroom}>
            Join a Room
          </button>
        </main>
      )}

      {iscreate && (
        <div id="createeditordiv">
          <h1>Create Editor Room</h1>

          <label>Your Name:</label>
          <input
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setusername(e.target.value)}
          />

          <h3>Select language:</h3>
          <select
            value={languagetype}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>

          <label style={{ marginTop: "12px", display: "block" }}>Custom File Name / Class Name:</label>
          <input
            placeholder="e.g. Main.java, Calculator.java, app.js"
            value={filename}
            onChange={(e) => setfilename(e.target.value)}
          />

          <h3>Conference type:</h3>
          <select
            value={conferencetype}
            onChange={(e) => setconferencetype(e.target.value)}
          >
            <option value="editor">Only Editor</option>
            <option value="audio">Editor + Audio</option>
          </select>

          <label>Set Password:</label>
          <input placeholder="Set Password for Room" onChange={(e) => setpass(e.target.value)} />
          <button onClick={createroomapifunc}>
            Create Room
          </button>
          <button onClick={tomain}>
            Back
          </button>
        </div>
      )}

      {isjoin && (
        <div id="joineditorroom">
          <div className="popup-box">
            <h1>Join Room</h1>

            <label>Your Name:</label>
            <input
              placeholder="Enter your name"
              value={enusername}
              onChange={(e) => setenusername(e.target.value)}
            />

            <label>Enter RoomID</label>
            <input placeholder="Enter Room Id" onChange={(e) => setenroomid(e.target.value)} />
            <label>Enter Room Password</label>
            <input type="password" placeholder="Room password" onChange={(e) => setenpass(e.target.value)} />
            <button onClick={tojoin}>Join</button>
            <button onClick={tomain}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
