import { notFound } from "next/navigation";
import { prisma } from "@zeal/database/server";
import Link from "next/link";

interface Props { params: Promise<{ subdomain: string }>; }

export default async function WhiteLabelBookPage({ params }: Props) {
  const { subdomain } = await params;

  const consultant = await prisma.consultant.findUnique({
    where: { subdomain },
    include: { user: { select: { name: true } } },
  });
  if (!consultant || !consultant.subdomainActive) notFound();

  const name = consultant.user.name || "the consultant";
  const loginHref =
    "/auth/login?redirect=" +
    encodeURIComponent("/white-label/" + subdomain + "/book");

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-light text-[#5E4B8B] mb-2">
        Book a session with {name}
      </h1>
      <p className="text-[#B8A1D9] mb-8">
        Choose a service, pick a time, and pay securely.
      </p>

      <div className="p-8 rounded-2xl border border-[#E1C5E7] bg-white text-center">
        <p className="text-[#5E4B8B] mb-4">
          Booking is available when signed in. Please log in to continue.
        </p>
        <Link
          href={loginHref}
          className="inline-block px-6 py-3 rounded-xl text-white font-medium"
          style={{
            background:
              "linear-gradient(135deg, var(--wl-primary), var(--wl-accent))",
          }}
        >
          Sign in to Book
        </Link>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

