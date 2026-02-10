import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/report", label: "Report" },
];

export default function TopNav() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/paila-logo.png"
            alt="Paila logo"
            width={44}
            height={44}
            className="h-11 w-11"
            priority
          />
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Paila</p>
            <h1 className="text-lg font-semibold text-slate-900">Nepal Pothole Radar</h1>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
