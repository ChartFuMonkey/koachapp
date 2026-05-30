import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import InstallScreen from "@/components/install/install-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("installGate");
  return { title: t("headline") };
}

export default function InstallPage() {
  return <InstallScreen />;
}
