export const deliveryPreviewPath = "/delivery-confirmation";
export const deliveryPaymentPath = `${deliveryPreviewPath}/payment`;
export const deliveryFee = "18.99";

export function isDeliveryPreviewPath(pathname: string) {
  return pathname === deliveryPreviewPath || pathname === deliveryPaymentPath;
}
