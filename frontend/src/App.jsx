import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RiskOverviewPage from "./pages/RiskOverviewPage.jsx";
import RiskCasePage from "./pages/RiskCasePage.jsx";
import ObjectiveRiskCasesPage from "./pages/ObjectiveRiskCasesPage.jsx";
import MonitoringObjectivesPage from "./pages/MonitoringObjectivesPage.jsx";
import MonitoringObjectiveWorkspacePage from "./pages/MonitoringObjectiveWorkspacePage.jsx";
import InformationSourcesPage from "./pages/InformationSourcesPage.jsx";
import SourceAdvisorPage from "./pages/SourceAdvisorPage.jsx";
import SourceDetailsPage from "./pages/SourceDetailsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Executive home */}
        <Route path="/" element={<RiskOverviewPage />} />
        <Route
          path="/monitoring-objectives/:id/cases"
          element={<ObjectiveRiskCasesPage />}
        />
        <Route path="/risk-cases/:caseId" element={<RiskCasePage />} />

        {/* Source / connector configuration */}
        <Route path="/configure/objectives" element={<MonitoringObjectivesPage />} />
        <Route path="/monitoring-objectives/:id" element={<MonitoringObjectiveWorkspacePage />} />
        <Route
          path="/configure/objectives/:objectiveId/source-advisor"
          element={<SourceAdvisorPage />}
        />
        <Route path="/information-sources/:id" element={<SourceDetailsPage />} />
        <Route
          path="/configure/objectives/:objectiveId/sources"
          element={<InformationSourcesPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
