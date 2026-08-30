import Sidebar from "../../components/Sidebar.jsx";

function HistoryPage() {
  return (
    <div id="layout">
      <Sidebar />
      <div style={{ padding: "40px", color: "white" }}>
        <h1>History</h1>
        <p>Session history and saved room logs will appear here.</p>
      </div>
    </div>
  );
}

export default HistoryPage;
