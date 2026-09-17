import { notFound } from "next/navigation";
import { prisma } from "@zeal/database/server";
import Link from "next/link";

interface Props { params: Promise<{ subdomain: string }>; }

export default async function WhiteLabelServicesPage({ params }: Props) {
  const { subdomain } = await params;
  const consultant = await prisma.consultant.findUnique({ where: { subdomain } });
  if (!consultant || !consultant.subdomainActive) notFound();

  const services = [
    { key: "chat",     label: "Chat Consultation",  rate: consultant.chatRate },
    { key: "audio",    label: "Audio Call",         rate: consultant.audioRate },
    { key: "video",    label: "Video Consultation", rate: consultant.videoRate },
    { key: "physical", label: "In-Person Session",  rate: consultant.physicalRate },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-light text-[#5E4B8B] mb-8">Services</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s) => (
          <div key={s.key} className="p-6 rounded-2xl border border-[#E1C5E7] bg-white">
            <h3 className="font-semibold text-[#5E4B8B] mb-1">{s.label}</h3>
            <p className="text-sm text-[#B8A1D9] mb-4">{s.rate ? "₹" + s.rate + "/min" : "Contact for pricing"}</p>
            <Link href={"/white-label/" + subdomain + "/book?service=" + s.key} className="inline-block px-4 py-2 rounded-xl text-sm font-medium" style={{ color: "var(--wl-primary)", background: "rgba(157,125,197,0.1)" }}>
              Book →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

