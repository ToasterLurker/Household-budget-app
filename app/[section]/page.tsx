import { notFound } from "next/navigation";
import DemoWorkspace from "@/components/demo-workspace";

const sections = ["accounts", "transactions", "contributions", "savings", "settings"] as const;
type Section = typeof sections[number];

export function generateStaticParams() {
  return sections.map(section => ({ section }));
}
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as Section)) notFound();
  return <DemoWorkspace section={section as Section} />;
}
