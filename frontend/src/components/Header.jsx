"use client";

export default function Header() {
  return (
    <header
      data-testid="app-header"
      style={{
        background: "#1B3A6B",
        color: "#fff",
        padding: "18px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 2px 16px rgba(27, 58, 107, 0.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          data-testid="iad-logo"
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          <span style={{ textTransform: "lowercase" }}>i</span>
          <span style={{ textTransform: "uppercase" }}>AD</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              marginLeft: 10,
              opacity: 0.9,
              letterSpacing: "0.18em",
            }}
          >
            IMMOBILIER
          </span>
        </div>
      </div>

      <div data-testid="betty-contact" style={{ textAlign: "right", lineHeight: 1.2 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Betty Campobasso</div>
        <div style={{ color: "#E91E8C", fontSize: 13, fontWeight: 600 }}>07 59 61 56 54</div>
      </div>
    </header>
  );
}
