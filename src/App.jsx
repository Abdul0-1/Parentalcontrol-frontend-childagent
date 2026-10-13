import { Navigate, Route, Routes } from "react-router-dom";
import Connect from "./pages/Connect";
import Agent from "./pages/Agent";

function Protected({ children }) {
  return localStorage.getItem("deviceToken")
    ? children
    : <Navigate to="/connect" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/connect" replace />} />
      <Route path="/connect" element={<Connect />} />
      <Route
        path="/agent"
        element={
          <Protected>
            <Agent />
          </Protected>
        }
      />
    </Routes>
  );
}
