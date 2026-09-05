import "server-only";

import { evaluateCommunicationConfiguration } from "./config";

export function getCommunicationConfiguration() {
  return evaluateCommunicationConfiguration(process.env);
}
