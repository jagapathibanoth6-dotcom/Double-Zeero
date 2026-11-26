"use client";

const ACTIONS = [
  { note: "Reserve", title: "Book a table" },
  { note: "Takeaway", title: "Click & collect" },
  { note: "To your door", title: "Home delivery" },
];

function qrImage(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=800x800&ecc=H&margin=14&color=23-16-12&bgcolor=255-248-239&data=${encodeURIComponent(data)}`;
}

export function PosterPrint({
  href,
  posterName,
  restaurant,
}: {
  href: string;
  posterName: string;
  restaurant: {
    shortName: string;
    name: string;
    address: string;
    city: string;
    postcode: string;
    phone: string;
    hours: { days: string; time: string }[];
  };
}) {
  return (
    <div className="dz-poster-page">
      <div className="dz-poster-bar">
        <div>
          <p>A4 colour poster</p>
          <span>Print in colour, background graphics on, margins none.</span>
        </div>
        <button type="button" className="btn btn-ember" onClick={() => window.print()}>
          Print poster
        </button>
      </div>

      <article className="dz-poster">
        <div className="dz-poster-edge" />
        <div className="dz-poster-frame">
          <header className="dz-poster-hero">
            <span className="dz-poster-mark">DZ</span>
            <p className="dz-poster-kicker">Independent Neapolitan pizza · Manchester</p>
            <h1>Double Zero</h1>
            <p className="dz-poster-place">{restaurant.shortName}</p>
            <p className="dz-poster-addr">
              {restaurant.address}, {restaurant.postcode}
            </p>
          </header>

          <section className="dz-poster-body">
            <div className="dz-poster-plate">
              <i />
              <i />
              <i />
              <i />
              <img src={qrImage(href)} alt={`Scan Double Zero ${restaurant.shortName}`} />
            </div>
            <p className="dz-poster-scan">Scan to order</p>
            <p className="dz-poster-lead">One code for the table, the counter and home.</p>

            <div className="dz-poster-names">
              {ACTIONS.map((row) => (
                <div key={row.title}>
                  <em>{row.note}</em>
                  <strong>{row.title}</strong>
                </div>
              ))}
            </div>
          </section>

          <footer className="dz-poster-foot">
            <div className="dz-poster-hours">
              {restaurant.hours.map((row) => (
                <p key={row.days}>
                  <b>{row.days}</b>
                  <span>{row.time}</span>
                </p>
              ))}
            </div>
            <p className="dz-poster-meta">
              <span>{restaurant.phone}</span>
              <span>{posterName}</span>
              <span>@double_zero_pizzeria</span>
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
