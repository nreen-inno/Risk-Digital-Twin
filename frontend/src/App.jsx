import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MonitoringObjectivesPage from "./pages/MonitoringObjectivesPage.jsx";
import MonitoringObjectiveWorkspacePage from "./pages/MonitoringObjectiveWorkspacePage.jsx";
import InformationSourcesPage from "./pages/InformationSourcesPage.jsx";
import SourceAdvisorPage from "./pages/SourceAdvisorPage.jsx";
import SourceDetailsPage from "./pages/SourceDetailsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/configure/objectives" replace />} />
        <Route path="/configure/objectives" element={<MonitoringObjectivesPage />} />
        {/* Monitoring Objective Workspace — open & manage one objective's sources */}
        <Route path="/monitoring-objectives/:id" element={<MonitoringObjectiveWorkspacePage />} />
        {/* AI Source Advisor — earlier standalone advisor flow, kept reachable */}
        <Route
          path="/configure/objectives/:objectiveId/source-advisor"
          element={<SourceAdvisorPage />}
        />
        {/* Source Details — business access, guidance & connector advice (Sprint 3) */}
        <Route path="/information-sources/:id" element={<SourceDetailsPage />} />
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
