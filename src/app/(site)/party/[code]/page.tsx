import { PartyDesk } from "@/components/PartyDesk";

export default async function PartyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PartyDesk code={code} />;
}
