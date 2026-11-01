import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { NewScan } from "./pages/NewScan";
import { ScanResults } from "./pages/ScanResults";
import { ScanDetail } from "./pages/ScanDetail";
import { Reports } from "./pages/Reports";
import { Toolbox } from "./pages/Toolbox";
import { Settings } from "./pages/Settings";
import { Projects } from "./pages/Projects";
import { AdaptiveEngine } from "./pages/AdaptiveEngine";
import { wsClient } from "./api/websocket";
import { api } from "./api/client";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

function MainDashboardApp() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [activeScansCount, setActiveScansCount] = useState(0);
  const [isWsConnected, setIsWsConnected] = useState(false);

  useEffect(() => {
    // Initial auto-login
    api.login("admin", "tornet2026").catch(() => {});

    // WebSocket global connection
    wsClient.connect("global");
    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.type === "ws_status") {
        setIsWsConnected(msg.status === "connected");
      }
      if (msg.type === "scan_progress") {
        if (msg.status === "running") {
          setActiveScansCount((prev) => Math.max(prev, 1));
        } else if (msg.status === "completed" || msg.status === "stopped") {
          setActiveScansCount((prev) => Math.max(0, prev - 1));
        }
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  const handleNavigateScan = (id) => {
    setSelectedScanId(id);
    setCurrentTab("scan-detail");
  };

  const handleScanLaunched = (newId) => {
    setSelectedScanId(newId);
    setCurrentTab("scan-detail");
  };

  return (
    <div className="app-container">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== "scan-detail") {
            setSelectedScanId(null);
          }
        }}
        activeScansCount={activeScansCount}
      />

      <div className="main-content">
        <Header 
          onNewScan={() => setCurrentTab("new-scan")} 
          isWsConnected={isWsConnected}
        />

        {currentTab === "dashboard" && (
          <Dashboard
            onNavigateScan={handleNavigateScan}
            onNewScan={() => setCurrentTab("new-scan")}
          />
        )}

        {currentTab === "adaptive" && (
          <AdaptiveEngine />
        )}

        {currentTab === "new-scan" && (
          <NewScan onScanLaunched={handleScanLaunched} />
        )}

        {currentTab === "scans" && (
          <ScanResults onSelectScan={handleNavigateScan} />
        )}

        {currentTab === "projects" && (
          <Projects onNavigateScan={handleNavigateScan} />
        )}

        {currentTab === "scan-detail" && selectedScanId && (
          <ScanDetail
            scanId={selectedScanId}
            onBack={() => setCurrentTab("scans")}
          />
        )}

        {currentTab === "reports" && <Reports />}

        {currentTab === "toolbox" && <Toolbox />}

        {currentTab === "settings" && <Settings />}
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <MainDashboardApp />
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
