import { notFound } from "next/navigation";
import {
  communicationPreviewEnabled,
  previewEvents,
  previewInput,
  previewScenarios,
} from "@/lib/communications/preview";
import { communicationEvents } from "@/lib/communications/registry";
import { renderCommunicationEmail } from "@/lib/communications/email";
import { EmailPreview } from "./preview-client";
import styles from "./preview.module.css";

export const metadata = {
  title: "Communications preview | Claims Bridge",
  robots: { index: false, follow: false },
};

export default async function CommunicationsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!communicationPreviewEnabled(process.env)) notFound();
  const params = await searchParams;
  const event =
    previewEvents.find((key) => key === params.event) ?? "ASSESSMENT_RECEIVED";
  const scenario =
    previewScenarios.find((key) => key === params.scenario) ?? "standard";
  const message = await renderCommunicationEmail(previewInput(event, scenario));
  const definition = communicationEvents[event];
  return (
    <main id="main-content" className={styles.studio}>
      <header className={styles.header}>
        <p>CLAIMS BRIDGE / DEVELOPMENT</p>
        <h1>Communications studio</h1>
        <p>
          Fabricated examples. No database access, live identities or email
          sending.
        </p>
      </header>
      <form className={styles.controls}>
        <label>
          Event / template
          <select name="event" defaultValue={event}>
            {previewEvents.map((key) => (
              <option key={key} value={key}>
                {communicationEvents[key].audience} · {key.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sample content
          <select name="scenario" defaultValue={scenario}>
            <option value="standard">Standard example</option>
            <option value="long">Long names, references and titles</option>
            <option value="no-due-date">No optional due date</option>
          </select>
        </label>
        <button type="submit">Load preview</button>
      </form>
      <section className={styles.envelope} aria-label="Email envelope">
        <dl>
          <div>
            <dt>Subject</dt>
            <dd>{message.subject}</dd>
          </div>
          <div>
            <dt>Preheader</dt>
            <dd>{message.preheader}</dd>
          </div>
        </dl>
        <dl className={styles.metadata}>
          {Object.entries({
            Event: event,
            Template: definition.template,
            Version: definition.version,
            Audience: definition.audience,
            Channels: definition.channels.join(" + "),
            Destination: definition.destination,
          }).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <EmailPreview html={message.html} text={message.text} />
    </main>
  );
}
