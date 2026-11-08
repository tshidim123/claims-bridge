import { GeistSansNonVariable } from "geist/font/sans-non-variable";
import type { Metadata, Viewport } from "next";

import { Icon } from "@/components/ui/icon";

import deliveryStyles from "../delivery.module.css";
import paymentStyles from "../payment/payment.module.css";
import { CheckoutSimulation } from "./checkout-simulation";

export const metadata: Metadata = {
  title: { absolute: "Checkout Simulation" },
  description: "An interactive checkout using preset card details and an on-screen test code.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { colorScheme: "light", themeColor: "#2e1c0b" };

export default function CheckoutSimulationPage() {
  return (
    <main className={`${deliveryStyles.page} ${paymentStyles.paymentPage} ${GeistSansNonVariable.className}`} id="main-content">
      <aside className={paymentStyles.simulationBanner} aria-labelledby="simulation-notice">
        <div className={paymentStyles.simulationBannerInner}>
          <Icon name="shield" />
          <div>
            <strong id="simulation-notice">Checkout simulation</strong>
            <p>Use the preset card details and the test code shown on screen.</p>
          </div>
        </div>
      </aside>
      <CheckoutSimulation />
    </main>
  );
}
