"use client";

import { useState } from "react";
import { statusConfig } from "./helpers";

export const FW_COLORS = {
  LangChain:     { text: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  CrewAI:        { text: "#A78BFA", bg: "rgba(167,139,250,0.08)" },
  LangGraph:     { text: "#22C98A", bg: "rgba(34,201,138,0.08)" },
  "OpenAI Swarm":{ text: "#F5A623", bg: "rgba(245,166,35,0.08)" },
};

export function Avatar({ name, avatarUrl, size = 65 }) {
  const [imgErr, setImgErr] = useState(false);
  const initial = name?.trim()?.[0]?.toUpperCase() || "?";
  const fontSize = Math.round(size * 0.35);
  const style = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: "var(--accentDim)",
    color: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize,
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    flexShrink: 0,
    overflow: "hidden",
    border: `1.5px solid var(--accent)`,
  };
  return (
    <div style={style}>
      {avatarUrl && !imgErr ? (
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgErr(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}

export function Pill({ children, textColor, bgColor }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: 0.2,
        color: textColor,
        background: bgColor,
        borderRadius: 99,
        padding: "2px 7px",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </span>
  );
}

export function StatusDot({ status }) {
  const cfg = statusConfig(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      <Pill textColor={cfg.text} bgColor={cfg.bg}>
        {cfg.label}
      </Pill>
    </span>
  );
}

export function FrameworkTag({ framework }) {
  const cfg = FW_COLORS[framework] || { text: "var(--text-muted)", bg: "var(--surface2)" };
  return (
    <Pill textColor={cfg.text} bgColor={cfg.bg}>
      {framework}
    </Pill>
  );
}

export function StatCard({ label, value, sub }) {
  return (
    <div style={{
        background: "var(--surface2)",
        border: `1px solid var(--border)`,
        borderRadius: 10,
        padding: "14px 16px",
        minWidth: 0,
    }}>
    <div style={{
        fontSize: 10,
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        marginBottom: 6,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        }}>
        {label}
    </div>
    <div style={{
        fontSize: 24,
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        color: "var(--text)",
        lineHeight: 1,
        }}>
        {value}
    </div>
    {sub && ( <div style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "var(--font-sans)",
            marginTop: 4,
            }}>
        {sub}
    </div>
    )}</div>
  );
}