import React, { useState } from "react";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { Home, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import CreateAnnonceTab from "@/components/CreateAnnonceTab";
import ChangeStatusTab from "@/components/ChangeStatusTab";

function App() {
  const [tab, setTab] = useState("create");

  return (
    <div className="App">
      <Header />

      <nav
        data-testid="tabs-nav"
        style={{
          background: "#fff",
          borderBottom: "1px solid #E2E8F0",
          padding: "0 32px",
          position: "sticky",
          top: 64,
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", gap: 4 }}>
          <button
            className={`iad-tab-btn ${tab === "create" ? "active" : ""}`}
            onClick={() => setTab("create")}
            data-testid="tab-create"
          >
            <Home size={16} /> Créer une annonce
          </button>
          <button
            className={`iad-tab-btn ${tab === "status" ? "active" : ""}`}
            onClick={() => setTab("status")}
            data-testid="tab-status"
          >
            <RefreshCw size={16} /> Changer un statut
          </button>
        </div>
      </nav>

      {tab === "create" ? <CreateAnnonceTab /> : <ChangeStatusTab />}

      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: 12, border: "1px solid #D1DCEE" },
        }}
      />
    </div>
  );
}

export default App;
