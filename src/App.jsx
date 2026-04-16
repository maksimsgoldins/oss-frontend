import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import ServicesPage from "./pages/ServicesPage";
import OrderAimsPage from "./pages/OrderAimsPage";
import AttributesPage from "./pages/AttributesPage";
import InvolvementsPage from "./pages/InvolvementsPage";
import DecompositionPage from "./pages/DecompositionPage";
import AttributePropagationPage from "./pages/AttributePropagationPage";
import DiagramPage from "./pages/DiagramPage";
import TaskSpecsPage from "./pages/TaskSpecsPage";
import ProcessSpecsPage from "./pages/ProcessSpecsPage";
import ProcessElementsPage from "./pages/ProcessElementsPage";
import ProcessFlowsPage from "./pages/ProcessFlowsPage";
import ProcessDiagramPage from "./pages/ProcessDiagramPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/order-aims" element={<OrderAimsPage />} />
        <Route path="/attributes" element={<AttributesPage />} />
        <Route path="/involvements" element={<InvolvementsPage />} />
        <Route path="/decomposition" element={<DecompositionPage />} />
        <Route path="/attribute-propagation" element={<AttributePropagationPage />} />
        <Route path="/diagram" element={<DiagramPage />} />
        <Route path="/orchestrator/task-specs" element={<TaskSpecsPage />} />
        <Route path="/orchestrator/process-specs" element={<ProcessSpecsPage />} />  
        <Route path="/orchestrator/process-elements" element={<ProcessElementsPage />} />
        <Route path="/orchestrator/process-flows" element={<ProcessFlowsPage />} />  
        <Route path="/orchestrator/process-diagram" element={<ProcessDiagramPage />} />
      </Routes>
    </Layout>
  );
}
