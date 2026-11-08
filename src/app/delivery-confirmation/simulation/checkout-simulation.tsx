"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useReducer, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { deliveryFee, deliveryPaymentPath } from "@/lib/delivery-preview";

import paymentStyles from "../payment/payment.module.css";
import checkoutStyles from "../shipment-continuation.module.css";
import styles from "./simulation.module.css";

const cardholders = ["Alex Sample", "Jordan Example", "Morgan Test"];
const cardNumbers = ["0000 0000 0000 1000", "0000 0000 0000 2000", "0000 0000 0000 3000"];
const expiries = ["08/28", "12/29", "05/31"];
const testCodes = ["042618", "305824", "206475"];
const processingDuration = 30_000;
const checkDuration = 2_200;
const resendDuration = 45_000;

type Flow = {
  phase: "details" | "processing" | "verification" | "checking" | "complete";
  now: number;
  deadline: number;
  resendAt: number;
  digits: number;
  codeIndex: number;
  failures: number;
};

type Action =
  | { type: "start" | "tick" | "resend" | "check"; now: number }
  | { type: "add-digit" | "clear-digits" | "reset" };

const initialFlow: Flow = {
  phase: "details", now: 0, deadline: 0, resendAt: 0, digits: 0, codeIndex: 0, failures: 0,
};

function updateFlow(flow: Flow, action: Action): Flow {
  switch (action.type) {
    case "start":
      return { ...initialFlow, phase: "processing", now: action.now, deadline: action.now + processingDuration };
    case "tick":
      if (flow.phase === "processing" && action.now >= flow.deadline) {
        return { ...flow, phase: "verification", now: action.now, resendAt: action.now + resendDuration };
      }
      if (flow.phase === "checking" && action.now >= flow.deadline) {
        return flow.failures === 0
          ? { ...flow, phase: "verification", now: action.now, digits: 0, failures: 1 }
          : { ...flow, phase: "complete", now: action.now };
      }
      return { ...flow, now: action.now };
    case "resend":
      if (flow.phase !== "verification" || action.now < flow.resendAt) return flow;
      return { ...flow, now: action.now, resendAt: action.now + resendDuration, digits: 0, codeIndex: (flow.codeIndex + 1) % testCodes.length };
    case "check":
      if (flow.phase !== "verification" || flow.digits !== testCodes[flow.codeIndex].length) return flow;
      return { ...flow, phase: "checking", now: action.now, deadline: action.now + checkDuration };
    case "add-digit":
      return { ...flow, digits: Math.min(flow.digits + 1, testCodes[flow.codeIndex].length) };
    case "clear-digits":
      return { ...flow, digits: 0 };
    case "reset":
      return initialFlow;
  }
}

export function CheckoutSimulation() {
  const [cardholder, setCardholder] = useState(0);
  const [cardNumber, setCardNumber] = useState(0);
  const [expiry, setExpiry] = useState(0);
  const [flow, dispatch] = useReducer(updateFlow, initialFlow);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { phase, now, deadline, resendAt, digits, codeIndex, failures } = flow;
  const checking = phase === "checking";
  const busy = phase === "processing" || checking;
  const showDetails = phase === "details" || phase === "processing";
  const step = phase === "details" ? 1 : phase === "processing" ? 2 : 3;
  const code = testCodes[codeIndex];
  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const remaining = Math.max(0, deadline - now);
  const progress = 1 - remaining / (checking ? checkDuration : processingDuration);

  useEffect(() => {
    if (phase === "details" || phase === "complete") return;
    const interval = window.setInterval(() => dispatch({ type: "tick", now: Date.now() }), busy ? 80 : 250);
    return () => window.clearInterval(interval);
  }, [phase, busy]);

  useEffect(() => {
    const overlay = dialog.current;
    if (busy) {
      overlay?.showModal();
    } else {
      overlay?.close();
      if (phase !== "details") heading.current?.focus({ preventScroll: true });
    }
  }, [phase, busy]);

  return (
    <div className={paymentStyles.shell}>
      <Link className={paymentStyles.back} href={deliveryPaymentPath}><Icon name="arrow" /> Back to checkout preview</Link>

      <ol className={styles.steps} role="list" aria-label="Simulation progress">
        {["Details", "Processing", "Test code"].map((label, index) => (
          <li key={label} aria-current={index + 1 === step ? "step" : undefined} data-complete={index + 1 < step}>
            <span aria-hidden="true">{index + 1 < step ? "✓" : index + 1}</span>{label}
          </li>
        ))}
      </ol>

      {showDetails ? (
        <>
          <div className={paymentStyles.card} role="status" aria-label="Card preview">
            <div className={paymentStyles.cardTop}>
              <span className={paymentStyles.chip} aria-hidden="true" />
              <span className={paymentStyles.cardBrand}>Sample card</span>
            </div>
            <div>
              <span className={paymentStyles.cardLabel}>Card number</span>
              <div className={paymentStyles.cardNumber}>{cardNumbers[cardNumber].split(" ").map((group, index) => <span key={index}>{group}</span>)}</div>
            </div>
            <div className={paymentStyles.cardBottom}>
              <div><span className={paymentStyles.cardLabel}>Cardholder</span><span>{cardholders[cardholder]}</span></div>
              <div><span className={paymentStyles.cardLabel}>Expires</span><span>{expiries[expiry]}</span></div>
            </div>
          </div>
          <section className={paymentStyles.checkout} aria-labelledby="sample-details-title">
            <h1 id="sample-details-title">Choose sample card details</h1>
            <p className={paymentStyles.intro}>Select an option in each field to update the card above.</p>
            <div className={styles.choices}>
              <label>Name on card
                <select value={cardholder} onChange={(event) => setCardholder(Number(event.currentTarget.value))}>
                  {cardholders.map((value, index) => <option value={index} key={value}>{value}</option>)}
                </select>
              </label>
              <label>Sample card number
                <select value={cardNumber} onChange={(event) => setCardNumber(Number(event.currentTarget.value))}>
                  {cardNumbers.map((value, index) => <option value={index} key={value}>{value}</option>)}
                </select>
              </label>
              <label>Expiration date
                <select value={expiry} onChange={(event) => setExpiry(Number(event.currentTarget.value))}>
                  {expiries.map((value, index) => <option value={index} key={value}>{value}</option>)}
                </select>
              </label>
            </div>
            <button className={checkoutStyles.confirmButton} type="button" onClick={() => dispatch({ type: "start", now: Date.now() })}>
              <Icon name="shield" /> Pay now — R{deliveryFee}
            </button>
          </section>
        </>
      ) : phase === "complete" ? (
        <section className={styles.verification} aria-labelledby="simulation-complete">
          <span className={styles.completeIcon} aria-hidden="true">✓</span>
          <h1 id="simulation-complete" ref={heading} tabIndex={-1}>Simulation complete</h1>
          <p>You verified the R{deliveryFee} sample checkout.</p>
          <button className={styles.goldButton} type="button" onClick={() => dispatch({ type: "reset" })}>Start over</button>
        </section>
      ) : (
        <section className={styles.verification} aria-labelledby="verification-title">
          <div className={styles.total}><span>Sample total</span><strong>R{deliveryFee}</strong></div>
          <h1 id="verification-title" ref={heading} tabIndex={-1}>Enter the test code</h1>
          <p>Use the built-in code below. Add one digit at a time to see your progress.</p>
          <div className={styles.codeSource}><span>On-screen test code</span><code>{code.slice(0, 3)} {code.slice(3)}</code></div>
          <div className={styles.counter} role="status">
            {digits} / {code.length} digits
            <span className={styles.dots} aria-hidden="true">
              {Array.from(code, (_, index) => <i key={index} data-filled={index < digits} />)}
            </span>
          </div>
          <div className={styles.slots} aria-hidden="true">
            {Array.from(code, (digit, index) => <span key={index} data-current={index === digits}>{index < digits ? digit : ""}</span>)}
          </div>
          <div className={styles.actions}>
            <button className={styles.secondaryButton} type="button" disabled={digits === code.length} onClick={() => dispatch({ type: "add-digit" })}>Enter next test digit</button>
            <button className={styles.secondaryButton} type="button" disabled={digits === 0} onClick={() => dispatch({ type: "clear-digits" })}>Clear digits</button>
          </div>
          <div className={styles.resend}>
            <button className={styles.secondaryButton} type="button" disabled={resendSeconds > 0} onClick={() => dispatch({ type: "resend", now: Date.now() })}>Resend test code</button>
            <span className={styles.timer}>
              <i aria-hidden="true" style={{ "--time-left": `${resendSeconds / (resendDuration / 1000) * 100}%` } as CSSProperties} />
              {resendSeconds > 0 ? `${resendSeconds}s` : "Ready"}
            </span>
          </div>
          <div className={styles.attempts}>
            <span>Test attempts remaining</span><strong>{2 - failures}</strong>
          </div>
          {failures > 0 && <p className={styles.retry} role="status"><strong>Try again.</strong> The first attempt simulates a failed check.</p>}
          <button className={styles.goldButton} type="button" disabled={digits !== code.length} onClick={() => dispatch({ type: "check", now: Date.now() })}>Verify test code</button>
        </section>
      )}

      <dialog ref={dialog} className={styles.loading} aria-labelledby="simulation-loading-title" onCancel={(event) => {
        event.preventDefault();
        dispatch({ type: "reset" });
      }}>
        {busy && (
          <div className={styles.loadingBody}>
            <span className={styles.spinner} aria-hidden="true" />
            <div role="status">
              <h2 id="simulation-loading-title">{checking ? "Checking the test code" : "Preparing test verification"}</h2>
              <p>{checking ? "Running the simulated verification check." : "The verification screen opens after the 30-second preview."}</p>
            </div>
            <progress aria-label="Simulation loading progress" value={progress} max={1} />
            <div className={styles.loadingNumbers}><span>{Math.floor(progress * 100)}%</span><span>{Math.ceil(remaining / 1000)}s</span></div>
            <button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: "reset" })}>Cancel simulation</button>
          </div>
        )}
      </dialog>
    </div>
  );
}
