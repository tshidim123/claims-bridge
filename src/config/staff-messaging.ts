export const controlledSystemMessageTypes = ["CONVERSATION_REOPENED"] as const;
export type ControlledSystemMessageType = (typeof controlledSystemMessageTypes)[number];

export const controlledSystemMessages: Readonly<Record<ControlledSystemMessageType, { body: string }>> = {
  CONVERSATION_REOPENED: { body: "Claims Bridge has reopened secure messaging for this claim." },
};
