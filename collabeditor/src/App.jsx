import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage.jsx";
import DashboardPage from "./pages/Dashboard/DashboardPage.jsx";
import EditorPage from "./pages/Editor/EditorPage.jsx";
import ConferencePage from "./pages/Conference/ConferencePage.jsx";
import ConferenceRoomPage from "./pages/Conference/ConferenceRoomPage.jsx";
import HistoryPage from "./pages/History/HistoryPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<DashboardPage />} />
      <Route path="/room" element={<EditorPage />} />
      <Route path="/conference" element={<ConferencePage />} />
      <Route path="/conference/:roomId" element={<ConferenceRoomPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  );
}

export default App;
