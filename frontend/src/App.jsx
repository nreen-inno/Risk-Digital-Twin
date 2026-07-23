import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MonitoringObjectivesPage from "./pages/MonitoringObjectivesPage.jsx";
import InformationSourcesPage from "./pages/InformationSourcesPage.jsx";
import SourceAdvisorPage from "./pages/SourceAdvisorPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/configure/objectives" replace />} />
        <Route path="/configure/objectives" element={<MonitoringObjectivesPage />} />
        {/* AI Source Advisor — current second page of the Configure workflow */}
        <Route
          path="/configure/objectives/:objectiveId/source-advisor"
          element={<SourceAdvisorPage />}
        />
        {/* Earlier manual-selection variant, kept reachable for comparison */}
        <Route
          path="/configure/objectives/:objectiveId/sources"
          element={<InformationSourcesPage />}
        />
        <Route path="*" element={<Navigate to="/configure/objectives" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
