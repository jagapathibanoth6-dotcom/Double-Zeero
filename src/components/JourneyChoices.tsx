export const defaultJourneys = [
  {
    href: "/book",
    kicker: "Reserve",
    title: "Book a table",
    copy: "Choose a restaurant and a sitting.",
  },
  {
    href: "/order/collect?via=Website",
    kicker: "Takeaway",
    title: "Click & collect",
    copy: "Order now and pick it up at the counter.",
  },
];

export function JourneyChoices({
  items = defaultJourneys,
  tone = "hero",
}: {
  items?: typeof defaultJourneys;
  tone?: "hero" | "warm" | "paper";
}) {
  return (
    <div className={`journey-choices ${tone === "hero" ? "" : `is-${tone}`}`}>
      {items.map((item) => (
        <a key={item.href} href={item.href} className="journey-card">
          <em>{item.kicker}</em>
          <strong>{item.title}</strong>
          <span>{item.copy}</span>
        </a>
      ))}
    </div>
  );
}
