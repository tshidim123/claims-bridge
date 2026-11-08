import { Icon } from "@/components/ui/icon";

import deliveryStyles from "./delivery.module.css";
import { CheckoutPreview, CopyTrackingCode } from "./shipment-controls";
import styles from "./shipment-continuation.module.css";

const trackingCode = "NS47********";
const deliveryFee = "18.99";
const shipmentDetails = [
  { label: "Delivery service", value: "Economy Service" },
  { label: "Shipment type", value: "Standard parcel" },
  { label: "Parcel info", value: "1 parcel · 5.856 kg" },
  { label: "Last updated", value: <time dateTime="2026-11-08T15:27:00+02:00">08 Nov 2026 at 3:27 PM</time> },
];
const activity = [
  { title: "Parcel received", description: "Registered at the collection facility." },
  { title: "Inspection completed", description: "Passed the routine processing check." },
  { title: "Sorting centre processed", description: "Assigned to the next delivery route." },
];

export function ShipmentContinuation({ status }: { status: string }) {
  return (
    <div className={styles.continuation}>
      <section className={styles.card} aria-labelledby="shipment-details-title">
        <header className={styles.cardHeading}>
          <div>
            <h2 id="shipment-details-title">Shipment details</h2>
            <p>Verify the information matches your delivery</p>
          </div>
          <span className={`${deliveryStyles.status} ${styles.detailsStatus}`}><span>{status}</span></span>
        </header>

        <div className={styles.cardBody}>
          <div className={styles.notice}>
            <span className={styles.noticeIcon} aria-hidden="true">!</span>
            <div>
              <p className={styles.noticeTitle}>Action required</p>
              <p>Please confirm the shipping fee within 48 hours so the parcel can move to the final delivery stage.</p>
            </div>
          </div>

          <dl className={styles.detailsList}>
            {shipmentDetails.map(({ label, value }) => (
              <div className={styles.detailTile} key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div className={`${styles.detailTile} ${styles.trackingTile}`}>
              <dt>Tracking code</dt>
              <dd>
                <code>{trackingCode}</code>
                <CopyTrackingCode trackingCode={trackingCode} />
              </dd>
            </div>
          </dl>

          <section className={styles.activity} aria-labelledby="shipment-activity-title">
            <h3 id="shipment-activity-title">Shipment activity</h3>
            <ol role="list">
              {activity.map(({ title, description }) => (
                <li key={title}>
                  <p className={styles.eventTitle}>{title}</p>
                  <p>{description}</p>
                </li>
              ))}
              <li aria-current="step">
                <span className={styles.currentEvent}>Now</span>
                <p className={styles.eventTitle}>Shipping fee confirmation</p>
                <p>Confirmation required before final delivery.</p>
              </li>
            </ol>
          </section>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="payment-summary-title">
        <header className={styles.cardHeading}>
          <div>
            <h2 id="payment-summary-title">Payment summary</h2>
            <p>Secure checkout details</p>
          </div>
        </header>

        <div className={styles.cardBody}>
          <dl className={styles.feeTotal}>
            <dt>Total shipping fee</dt>
            <dd><span>R</span>{deliveryFee}</dd>
          </dl>
          <dl className={styles.feeBreakdown}>
            <div><dt>Delivery fee</dt><dd>R{deliveryFee}</dd></div>
            <div><dt>Additional charges</dt><dd>R0.00</dd></div>
          </dl>

          <section className={styles.paymentMethod} aria-labelledby="payment-method-title">
            <h3 id="payment-method-title">Payment method</h3>
            <div className={styles.cardMethod}>
              <span className={styles.selectedMethod} aria-hidden="true" />
              <div>
                <p className={styles.methodTitle}><Icon name="shield" />Pay by card</p>
                <p>Use your debit or credit card through our secure hosted checkout.</p>
                <ul className={styles.cardBrands} role="list" aria-label="Supported card brands">
                  <li className={styles.visa}>Visa</li>
                  <li className={styles.mastercard} aria-label="Mastercard"><span aria-hidden="true" />MC</li>
                  <li className={styles.amex} aria-label="American Express">Amex</li>
                  <li className={styles.discover} aria-label="Discover">Disc<span aria-hidden="true" /></li>
                </ul>
              </div>
            </div>
          </section>

          <ul className={styles.paymentAssurances} role="list">
            <li><span aria-hidden="true">✓</span> Secure checkout</li>
            <li><span aria-hidden="true">✓</span> Encrypted payment</li>
          </ul>
          <CheckoutPreview fee={`R${deliveryFee}`} />
          <p className={styles.confirmationNote}>By continuing, you confirm that the shipment information shown above is correct.</p>
        </div>
      </section>
    </div>
  );
}
