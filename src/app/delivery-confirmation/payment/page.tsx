import { GeistSansNonVariable } from "geist/font/sans-non-variable";
import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { deliveryFee, deliveryPreviewPath } from "@/lib/delivery-preview";

import { CardBrands } from "../card-brands";
import deliveryStyles from "../delivery.module.css";
import { CheckoutPreview } from "../shipment-controls";
import styles from "./payment.module.css";

const sampleFields = [
  { label: "Card holder name", value: "Full name as shown on card" },
  { label: "ID / Passport number", value: "Example ID or passport number" },
  { label: "Cellphone number", value: "000 000 0000" },
  { label: "Card number", value: "•••• •••• •••• ••••" },
  { label: "Expiry (MM/YY)", value: "12/28" },
  { label: "CVV", value: "•••" },
];

export const metadata: Metadata = {
  title: { absolute: "Payment Preview | Buffalo" },
  description: "Preview the delivery checkout with sample details.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { colorScheme: "light", themeColor: "#2e1c0b" };

export default function DeliveryPaymentPage() {
  return (
    <main className={`${deliveryStyles.page} ${styles.paymentPage} ${GeistSansNonVariable.className}`} id="main-content">
      <div className={styles.shell}>
        <header className={styles.toolbar}>
          <Link className={styles.back} href={`${deliveryPreviewPath}#payment-summary-title`}>
            <Icon name="arrow" /> Back to confirmation
          </Link>
          <span className={styles.badge}><Icon name="shield" /> Demo</span>
        </header>

        <div className={styles.card} aria-hidden="true">
          <div className={styles.cardTop}>
            <span className={styles.chip} />
            <span className={styles.cardBrand}>Buffalo</span>
          </div>
          <div>
            <span className={styles.cardLabel}>Card number</span>
            <div className={styles.cardNumber}><span>••••</span><span>••••</span><span>••••</span><span>••••</span></div>
          </div>
          <div className={styles.cardBottom}>
            <div><span className={styles.cardLabel}>Card holder</span><span>Sample holder</span></div>
            <div><span className={styles.cardLabel}>Expires</span><span>MM/YY</span></div>
          </div>
        </div>

        <section className={styles.checkout} aria-labelledby="payment-title">
          <div className={styles.brands}><CardBrands /></div>
          <h1 id="payment-title">Complete your payment</h1>
          <p className={styles.intro}>Review the sample checkout details below.</p>
          <dl className={styles.fields}>
            {sampleFields.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.notice}><Icon name="shield" /> Demo checkout · Sample details only</p>
          <div className={styles.payAction}><CheckoutPreview fee={`R${deliveryFee}`} /></div>
        </section>
      </div>
    </main>
  );
}
