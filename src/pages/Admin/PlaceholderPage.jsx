import React from "react";

const PlaceholderPage = ({ title, icon, phase, description }) => {
  return (
    <div style={{
      background: "var(--admin-card-bg)",
      border: "1px solid var(--admin-border)",
      borderRadius: "0.75rem",
      padding: "40px 24px",
      textAlign: "center",
      maxWidth: "600px",
      margin: "40px auto",
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{ fontSize: "44px", marginBottom: "16px" }}>{icon}</div>
      <h2 style={{ fontSize: "22px", margin: "0 0 8px 0", color: "#fff", fontWeight: 600 }}>{title}</h2>
      <div style={{
        display: "inline-block",
        padding: "3px 12px",
        background: "rgba(255, 255, 0, 0.15)",
        border: "1px solid rgba(255, 255, 0, 0.3)",
        borderRadius: "20px",
        color: "yellow",
        fontSize: "12px",
        fontWeight: "500",
        marginBottom: "16px"
      }}>
        {phase}
      </div>
      <p style={{ color: "var(--admin-text-muted)", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
        {description}
      </p>
    </div>
  );
};

export default PlaceholderPage;
