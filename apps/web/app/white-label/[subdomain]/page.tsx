import { notFound } from "next/navigation";
import { prisma } from "@zeal/database/server";
import Link from "next/link";

interface Props { params: Promise<{ subdomain: string }>; }

export default async function WhiteLabelHomePage({ params }: Props) {
  const { subdomain } = await params;
  const consultant = await prisma.consultant.findUnique({
    where: { subdomain },
    include: { user: { select: { name: true, username: true } } },
  });
  if (!consultant || !consultant.subdomainActive) notFound();

  const name = consultant.user.name || consultant.user.username;
  const bio = consultant.bio || "Consult with " + name + " for guidance on relationships, career, and life.";

  const services = [
    { title: "Chat",      desc: "Per-minute text consultation", price: consultant.chatRate ?? 50 },
    { title: "Audio Call", desc: "Live voice consultation",      price: consultant.audioRate ?? 75 },
    { title: "Video Call", desc: "Face-to-face video consultation", price: consultant.videoRate ?? 100 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-light text-[#5E4B8B] mb-4">Welcome to {name}</h1>
        <p className="text-lg text-[#B8A1D9] max-w-2xl mx-auto">{bio}</p>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {services.map((s) => (
          <div key={s.title} className="p-6 rounded-2xl border border-[#E1C5E7] bg-white">
            <h3 className="font-semibold text-[#5E4B8B] mb-1">{s.title}</h3>
            <p className="text-sm text-[#B8A1D9] mb-3">{s.desc}</p>
            <p className="text-lg font-bold" style={{ color: "var(--wl-primary)" }}>₹{s.price}/min</p>
          </div>
        ))}
      </section>
      <div className="text-center">
        <Link href={"/white-label/" + subdomain + "/book"} className="inline-block px-8 py-3 rounded-xl text-white font-medium shadow-lg" style={{ background: "linear-gradient(135deg, var(--wl-primary), var(--wl-accent))" }}>
          Book a Session
        </Link>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

