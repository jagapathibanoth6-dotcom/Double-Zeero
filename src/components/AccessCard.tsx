import Link from "next/link";

export type AccessInfo = {
  email?: string;
  tempPassword?: string | null;
  isNew?: boolean;
};

export function AccessCard({ access }: { access?: AccessInfo | null }) {
  if (!access?.email) return null;
  return (
    <div className="account-access">
      <p className="account-kicker is-light">Your Double Zero login</p>
      <p className="serif mt-3 text-3xl text-cream">Use this to manage bookings and orders</p>
      <dl className="account-access-meta">
        <div>
          <dt>Email</dt>
          <dd>{access.email}</dd>
        </div>
        {access.tempPassword ? (
          <div>
            <dt>Temporary password</dt>
            <dd>{access.tempPassword}</dd>
          </div>
        ) : (
          <p>Use the password already sent to this email.</p>
        )}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-cream/70">
        The same details are in your confirmation email. Check inbox and spam. Your dashboard holds table bookings, click
        & collect, party menus and offers.
      </p>
      <Link href="/account" className="btn btn-ember mt-6">
        Open my dashboard
      </Link>
    </div>
  );
}
