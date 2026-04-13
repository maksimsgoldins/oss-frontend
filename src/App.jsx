import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import ServicesPage from "./pages/ServicesPage";
import OrderAimsPage from "./pages/OrderAimsPage";
import AttributesPage from "./pages/AttributesPage";
import AttributeInvolvementPage from "./pages/AttributeInvolvementPage";
import RelationsPage from "./pages/RelationsPage";
import DiagramPage from "./pages/DiagramPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/order-aims" element={<OrderAimsPage />} />
        <Route path="/attributes" element={<AttributesPage />} />
        <Route path="/attribute-involvement" element={<AttributeInvolvementPage />} />
        <Route path="/relations" element={<RelationsPage />} />
        <Route path="/diagram" element={<DiagramPage />} />
      </Routes>
    </Layout>
  );
}
