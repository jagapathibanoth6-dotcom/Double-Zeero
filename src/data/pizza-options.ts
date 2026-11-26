export type ExtraTopping = {
  name: string;
  pence: number;
  group: "Meat & fish" | "Cheese" | "Vegetables" | "Base";
};

export const extraToppings: ExtraTopping[] = [
  { name: "Gluten-free base", pence: 200, group: "Base" },
  { name: "Anchovies", pence: 250, group: "Meat & fish" },
  { name: "Grilled chicken", pence: 250, group: "Meat & fish" },
  { name: "Chorizo", pence: 250, group: "Meat & fish" },
  { name: "Italian pepperoni", pence: 250, group: "Meat & fish" },
  { name: "Italian herb ham", pence: 250, group: "Meat & fish" },
  { name: "’Nduja", pence: 250, group: "Meat & fish" },
  { name: "Parma ham", pence: 250, group: "Meat & fish" },
  { name: "Salami Napoli", pence: 250, group: "Meat & fish" },
  { name: "Salami finocchiona", pence: 250, group: "Meat & fish" },
  { name: "Fior di latte", pence: 250, group: "Cheese" },
  { name: "Mozzarella", pence: 250, group: "Cheese" },
  { name: "Bufala mozzarella", pence: 250, group: "Cheese" },
  { name: "Parmesan", pence: 250, group: "Cheese" },
  { name: "Smoked mozzarella", pence: 250, group: "Cheese" },
  { name: "Buffalo burrata", pence: 350, group: "Cheese" },
  { name: "Stracciatella", pence: 250, group: "Cheese" },
  { name: "Vegan mozzarella", pence: 250, group: "Cheese" },
  { name: "Goat’s cheese", pence: 250, group: "Cheese" },
  { name: "Gorgonzola", pence: 250, group: "Cheese" },
  { name: "Artichoke", pence: 200, group: "Vegetables" },
  { name: "Mixed mushrooms", pence: 200, group: "Vegetables" },
  { name: "Olives", pence: 200, group: "Vegetables" },
  { name: "Rocket", pence: 200, group: "Vegetables" },
  { name: "Sun-dried tomatoes", pence: 200, group: "Vegetables" },
  { name: "Capers", pence: 200, group: "Vegetables" },
  { name: "Vegan ’nduja", pence: 200, group: "Vegetables" },
  { name: "Cherry tomatoes", pence: 200, group: "Vegetables" },
  { name: "Jalapeños", pence: 200, group: "Vegetables" },
  { name: "Red peppers", pence: 200, group: "Vegetables" },
  { name: "Courgette", pence: 200, group: "Vegetables" },
  { name: "Aubergine", pence: 200, group: "Vegetables" },
  { name: "Red onion", pence: 200, group: "Vegetables" },
  { name: "Hot honey", pence: 200, group: "Vegetables" },
];

export const toppingGroups = ["Base", "Meat & fish", "Cheese", "Vegetables"] as const;

export function includedToppings(description: string) {
  return description
    .replace(/^No cheese\.\s*/i, "")
    .replace(/\.\s*Optional.*$/i, "")
    .replace(/\s*Halal option available\.?/i, "")
    .replace(/\s*Ask in restaurant\.?/i, "")
    .split(/,| and /)
    .map((part) => part.replace(/\.$/, "").trim())
    .filter((part) => part.length > 1 && !/^no /i.test(part) && !/option/i.test(part));
}

export function pizzaNotes(extras: string[], removed: string[], note: string) {
  const bits = [
    extras.length ? `Extra: ${extras.join(", ")}` : "",
    removed.length ? `No: ${removed.join(", ")}` : "",
    note.trim() ? `Note: ${note.trim()}` : "",
  ].filter(Boolean);
  return bits.join(". ");
}

export function toppingPrice(name: string) {
  const lower = name.trim().toLowerCase();
  const exact = extraToppings.find((item) => item.name.toLowerCase() === lower);
  if (exact) return exact.pence;
  const loose = extraToppings.find((item) => {
    const label = item.name.toLowerCase();
    return lower.includes(label) || label.includes(lower);
  });
  return loose?.pence || 0;
}

export function extrasPence(extras: string[], removed: string[] = []) {
  const extraCost = extras.reduce((sum, name) => sum + toppingPrice(name), 0);
  if (!extras.length) return 0;
  const swapSlots = extras.filter((name) => extraToppings.find((row) => row.name === name)?.group !== "Base").length;
  const credit = removed
    .map(toppingPrice)
    .filter((pence) => pence > 0)
    .sort((a, b) => b - a)
    .slice(0, swapSlots)
    .reduce((sum, pence) => sum + pence, 0);
  return Math.max(0, extraCost - credit);
}

export function parsePizzaNotes(notes: string) {
  const extraMatch = notes.match(/Extra:\s*([^.]+)/i);
  const removedMatch = notes.match(/No:\s*([^.]+)/i);
  const noteMatch = notes.match(/Note:\s*(.+)$/i);
  const split = (value?: string) =>
    (value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  return {
    extras: split(extraMatch?.[1]),
    removed: split(removedMatch?.[1]),
    special: noteMatch?.[1]?.trim() || "",
  };
}
