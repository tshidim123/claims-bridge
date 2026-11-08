import styles from "./shipment-continuation.module.css";

export function CardBrands() {
  return (
    <ul className={styles.cardBrands} role="list" aria-label="Card brands shown in preview">
      <li className={styles.visa}>Visa</li>
      <li className={styles.mastercard} aria-label="Mastercard"><span aria-hidden="true" />MC</li>
      <li className={styles.amex} aria-label="American Express">Amex</li>
      <li className={styles.discover} aria-label="Discover">Disc<span aria-hidden="true" /></li>
    </ul>
  );
}
