import { permanentRedirect } from "next/navigation";

export const metadata = { title: "System status", robots: { index: false, follow: false } };

export default function AdminSystemStatusAlias() {
  permanentRedirect("/admin/system");
}
