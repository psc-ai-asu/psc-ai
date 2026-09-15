"use client";

import { useState } from "react";
import { supabase } from "../../app/lib/supabaseClient";

export default function EditBioModal({ currentBio, onClose, onSave }) {
  const [bio, setBio] = useState(currentBio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ bio })
      .eq("id", user.id);

    if (updateError) {
      setError("Failed to save. Please try again.");
      setSaving(false);
      return;
    }
    onSave(bio);
    setSaving(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "var(--borderLight)",
          borderRadius: 16,
          padding: "26px",
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
        {/* Header */}
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, fontFamily: "var(--font-sans)", color: "var(--text)" }}>
            Edit bio
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            Tell others a little about yourself.
          </p>
        </div>

        {/* Textarea */}
        <div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. Building AI agents..."
            maxLength={300}
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 11px",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: "var(--text)",
              background: "var(--bg-raised)",
              border: "var(--border)",
              borderRadius: 8,
              outline: "none",
              resize: "vertical",
            }}/>
          <div style={{ fontSize: 10, color: "var(--textDim)", fontFamily: "var(--font-sans)", marginTop: 4, textAlign: "right" }}>
            {bio.length} / 300
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: "var(--red)", fontFamily: "var(--font-sans)" }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "9px", fontSize: 12,
              fontFamily: "var(--font-sans)", fontWeight: 500,
              color: "var(--textMuted)", background: "var(--surface2)",
              border: "var(--border)", borderRadius: 8, cursor: "pointer",
            }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: "9px", fontSize: 12,
              fontFamily: "var(--font-sans)", fontWeight: 600,
              color: "var(--text)", background: saving ? "var(--textDim)" : "var(--accent)",
              border: "none", borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
            {saving ? "Saving…" : "Save bio"}
          </button>
        </div>
      </div>
    </div>
  );
}
