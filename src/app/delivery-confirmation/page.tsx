import { GeistSansNonVariable } from "geist/font/sans-non-variable";
import type { Metadata, Viewport } from "next";
import Image from "next/image";

import { Icon } from "@/components/ui/icon";

import styles from "./delivery.module.css";
import { ShipmentContinuation } from "./shipment-continuation";

const description = "Review your shipment and complete the final step";
const status = "In Transit";
const shipment = [
  { label: "Tracking", value: "NS47••••" },
  { label: "Status", value: status },
  { label: "Weight", value: "5.86 kg" },
  { label: "Service", value: "Economy" },
];
const deliverySteps = ["Order received", "Parcel collected", "Shipment processed", status, "Delivered"];
const currentStep = 4;

export const metadata: Metadata = {
  title: { absolute: "Delivery Confirmation | Buffalo" },
  description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { colorScheme: "light", themeColor: "#f4f0e5" };

export default function DeliveryConfirmationPage() {
  return (
    <div className={`${styles.page} ${GeistSansNonVariable.className}`} id="delivery-home">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="#delivery-home" aria-label="Buffalo delivery confirmation">
            <Image
              className={styles.logo}
              src="/images/delivery-confirmation/buffalo-wordmark.webp"
              alt="Buffalo · We Deliver Hope"
              width={248}
              height={59}
              unoptimized
            />
            <span aria-hidden="true">Buffalo</span>
          </a>
          <nav className={styles.nav} aria-label="Delivery navigation">
            <a className={styles.homeLink} href="#delivery-home" aria-label="Delivery home">
              <Icon name="home" />
            </a>
            <a href="#delivery-progress" aria-label="View delivery progress">
              <Icon name="truck" />
            </a>
          </nav>
        </div>
      </header>

      <main className={styles.main} id="main-content">
        <h1>Delivery <span>Confirmation</span></h1>
        <p className={styles.subtitle}>{description}</p>

        <div className={styles.toolbar}>
          <span className={styles.status}>{status}</span>
          <details className={styles.disclosure} name="delivery-tools">
            <summary aria-label="Shipment notifications">
              <Icon name="notification" />
            </summary>
            <div className={styles.panel}>
              <strong>Shipment notifications</strong>
              <p>Your parcel is in transit.</p>
            </div>
          </details>
          <details className={styles.disclosure} name="delivery-tools">
            <summary aria-label="Delivery settings">
              <Icon name="settings" />
            </summary>
            <div className={styles.panel}>
              <strong>Delivery settings</strong>
              <p>This design preview uses sample shipment details.</p>
            </div>
          </details>
        </div>

        <article className={styles.shipment} aria-labelledby="shipment-title">
          <div className={styles.hero}>
            <Image
              className={styles.heroImage}
              src="/images/delivery-confirmation/courier.webp"
              alt=""
              fill
              sizes="(min-width: 1120px) 650px, (min-width: 900px) 60vw, (min-width: 640px) 590px, 92vw"
              loading="eager"
              fetchPriority="high"
            />
            <div className={styles.heroDecoration} aria-hidden="true">
              <i /><i /><i /><i /><i />
            </div>
            <div className={styles.heroCopy}>
              <p className={styles.update}>Shipment update</p>
              <h2 id="shipment-title">Your delivery is <em>nearly<br />complete</em>.</h2>
              <p className={styles.heroDescription}>
                Review your parcel details below, confirm the shipping fee, and continue to your authorised payment provider.
              </p>
            </div>
          </div>

          <section className={styles.overview} aria-labelledby="shipment-overview">
            <h3 id="shipment-overview">Shipment overview</h3>
            <dl>
              {shipment.map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <section className={styles.progress} id="delivery-progress" aria-labelledby="progress-title">
          <div className={styles.progressHeading}>
            <h2 id="progress-title">Delivery progress</h2>
            <p>Step {currentStep} of {deliverySteps.length}</p>
          </div>
          <ol role="list">
            {deliverySteps.map((step, index) => (
              <li key={step} aria-current={index + 1 === currentStep ? "step" : undefined}>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <ShipmentContinuation status={status} />
        <p className={styles.previewNote}>Design preview · Sample shipment</p>
      </main>
    </div>
  );
}
