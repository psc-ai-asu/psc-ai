"use client";

import { useState } from "react";
import { timeAgo, statusConfig } from "./helpers";
import { StatusDot, FrameworkTag, Pill } from "./UI";

export default function AgentCard({ agent, onFire, onViewReviews }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg-raised)",
        border: `1px solid ${hovered ? "var(--borderLight)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 11,
        transition: "border-color 0.15s",
        cursor: "default",
      }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              color: "var(--text)",
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            {agent.version} · updated {timeAgo(agent.updated_at)}
          </div>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
          {agent.description}
        </p>
      )}

      {/* Tags + Framework */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        <StatusDot status={agent.status} />
        <FrameworkTag framework={agent.framework} />
        {(agent.tags || []).map((tag) => (
          <Pill key={tag} textColor={"var(--text-dim)"} bgColor={"var(--surface2)"}>
            #{tag}
          </Pill>
        ))}
      </div>

      {/* Metrics row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          paddingTop: 10,
          borderTop: `1px solid ${"var(--border)"}`,
        }}>
        {[
          { label: "Reviews",   value: agent.review_count ?? 0 },
          { label: "Status",    value: statusConfig(agent.status).label },
        ].map(({ label, value }) => (
          <div key={label}>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 2,
              }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
              }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 7 }}>
        <button
          //onClick={() => onViewReviews(agent)}
          style={{
            flex: 1,
            padding: "6px 10px",
            fontSize: 11,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            color: "var(--text-muted)",
            background: "var(--bg-raised)",
            border: `1px solid "var(--border)`,
            borderRadius: 7,
            cursor: "pointer",
          }}>
          View Reviews
        </button>
        {agent.status !== "fired" && (
          <button
            //onClick={() => onFire(agent.id)}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              color: "var(--red)",
              background: "rgba(255,77,77,0.09)",
              border: `1px solid rgba(255,77,77,0.15)`,
              borderRadius: 7,
              cursor: "pointer",
            }}>
            Fire agent
          </button>
        )}
        
      </div>
    </div>
  );
}
