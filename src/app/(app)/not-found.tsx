import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <h1 className="text-[1.375rem] font-semibold text-heading">Siden findes ikke</h1>
      <p className="mt-1 text-[0.8125rem] text-muted">Den er måske flyttet, eller linket er forkert.</p>
      <Link href="/" className="app-btn app-btn-ink mt-5">Til oversigten</Link>
    </div>
  );
}
