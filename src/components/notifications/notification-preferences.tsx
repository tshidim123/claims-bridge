"use client";

import { useState } from "react";

type Preference = { category: string; label: string; description: string; essential: boolean; defaultEnabled: boolean; enabled: boolean };

export function NotificationPreferences({ initialPreferences }: { initialPreferences: Preference[] }) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function update(category: string, enabled: boolean) {
    setSaving(category);
    setFeedback("");
    setError("");
    try {
      const response = await fetch("/api/account/preferences/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, enabled }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We couldn't save that preference.");
      setPreferences((items) => items.map((item) => item.category === category ? { ...item, enabled } : item));
      setFeedback("In-app notification preference saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't save that preference.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="notification-preferences">
      {feedback && <p className="notification-preferences__feedback" role="status">{feedback}</p>}
      {error && <p className="notification-preferences__error" role="alert">{error}</p>}
      <section className="notification-preferences__section" aria-labelledby="in-app-preferences-title">
        <div className="notification-preferences__heading"><div><p className="eyebrow">Available now</p><h2 id="in-app-preferences-title">In-app notifications</h2></div><span>Claims Bridge Centre</span></div>
        <p className="notification-preferences__intro">Essential notices remain enabled so important claim communication and requested action are not missed.</p>
        <div className="notification-preferences__list">
          {preferences.map((preference) => (
            <div className="notification-preference" key={preference.category}>
              <div><h3>{preference.label}</h3><p>{preference.description}</p>{preference.essential && <span className="notification-preference__essential">Essential</span>}</div>
              {preference.essential ? <span className="notification-preference__state">Always on</span> : <label className="notification-preference__toggle"><span className="sr-only">Receive {preference.label.toLowerCase()} in-app notifications</span><input type="checkbox" checked={preference.enabled} disabled={saving === preference.category} onChange={(event) => update(preference.category, event.target.checked)} /><span aria-hidden="true" /></label>}
            </div>
          ))}
        </div>
      </section>
      <section className="notification-preferences__future" aria-labelledby="future-channels-title">
        <p className="eyebrow">Not active</p>
        <h2 id="future-channels-title">Other delivery channels</h2>
        <p>Email, SMS and push delivery are not configured. No controls here imply that those channels are active.</p>
      </section>
    </div>
  );
}
