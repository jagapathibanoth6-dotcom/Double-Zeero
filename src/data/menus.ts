import type { LocationId } from "@/data/site";

export type DietTag = "v" | "vg" | "n";

export type MenuItem = {
  name: string;
  description: string;
  price?: string;
  sizes?: { label: string; price: string }[];
  tags?: DietTag[];
  photo?: string;
  photoAlt?: string;
  note?: string;
  unavailable?: boolean;
};

export type LocationMenu = {
  id: LocationId;
  label: string;
  intro: string;
  parmesanNote: string;
  starters: MenuItem[];
  kids: MenuItem[];
  pizzas: MenuItem[];
  calzones: MenuItem[];
  salads: MenuItem[];
  dippers: MenuItem[];
  toppings: { title: string; price: string; items: string }[];
  drinks?: MenuItem[];
  juices?: MenuItem[];
  desserts?: MenuItem[];
  byob?: string;
  notes: string[];
};

const photos = {
  margherita: {
    photo: "/images/menu/official-margherita.jpg",
    photoAlt: "Margherita — tomato, fior di latte and basil, wood-fired crust",
  },
  rustica: {
    photo: "/images/menu/official-rustica.jpg",
    photoAlt: "Rustica — aubergine, sun-dried tomatoes and artichoke",
  },
  chorizo: {
    photo: "/images/menu/official-chorizo.jpg",
    photoAlt: "Chorizo pizza with chicken and red pepper",
  },
  miele: {
    photo: "/images/menu/official-vulcano.jpg",
    photoAlt: "Miele Sizzler — ’nduja, pepperoni, chorizo and hot honey",
  },
  calzone: {
    photo: "/images/menu/official-calzone.jpg",
    photoAlt: "Wood-fired meat calzone with tomato, parmesan and basil",
  },
  caprese: {
    photo: "/images/menu/official-caprese.jpg",
    photoAlt: "Caprese — buffalo mozzarella, cherry tomatoes, basil and sourdough",
  },
  tiramisu: {
    photo: "/images/menu/official-tiramisu.jpg",
    photoAlt: "Homemade tiramisu",
  },
  arancini: {
    photo: "/images/menu/arancini.jpg",
    photoAlt: "Arancini con carne di manzo with marinara",
  },
  meatballs: {
    photo: "/images/menu/meatballs.jpg",
    photoAlt: "Italian meatballs in marinara with mozzarella",
  },
  triplePepperoni: {
    photo: "/images/menu/official-chorizo.jpg",
    photoAlt: "Triple Pepperoni wood-fired pizza",
  },
  vulcano: {
    photo: "/images/menu/official-vulcano.jpg",
    photoAlt: "Vulcano — pepperoni, ’nduja, jalapeños and hot honey",
  },
  antipasti: {
    photo: "/images/menu/official-antipasti.jpg",
    photoAlt: "Meat antipasti platter with cured meats, cheese and olives",
  },
  calzoneVeg: {
    photo: "/images/menu/official-calzone.jpg",
    photoAlt: "Vegetarian calzone with tomato, rocket and parmesan",
  },
  garlic: {
    photo: "/images/menu/garlic-bread.jpg",
    photoAlt: "Wood-fired garlic bread with rosemary",
  },
  garlicCheese: {
    photo: "/images/menu/garlic-bread-cheese.jpg",
    photoAlt: "Garlic bread with melted mozzarella",
  },
  olives: {
    photo: "/images/menu/olives.jpg",
    photoAlt: "Marinated olives with chilli and herbs",
  },
  burrata: {
    photo: "/images/menu/burrata.jpg",
    photoAlt: "Burrata with cherry tomatoes, basil and parmesan",
  },
  bufala: {
    photo: "/images/menu/official-margherita-bufala.jpg",
    photoAlt: "Margherita Bufala — tomato, buffalo mozzarella and basil",
  },
  vegAntipasti: {
    photo: "/images/menu/official-veg-antipasti.jpg",
    photoAlt: "Vegetable antipasti platter",
  },
  partenopea: {
    photo: "/images/menu/partenopea-pizza.jpg",
    photoAlt: "Partenopea — burrata, Parma ham and heirloom tomatoes",
  },
  marinara: {
    photo: "/images/food-8.webp",
    photoAlt: "Marinara — tomato, garlic and oregano",
  },
  napoli: {
    photo: "/images/food-3.webp",
    photoAlt: "Napoli pizza with olives and anchovies",
  },
  sempliciotta: {
    photo: "/images/food-5.webp",
    photoAlt: "Sempliciotta with salami Napoli",
  },
  funghi: {
    photo: "/images/menu/official-funghi.jpg",
    photoAlt: "Funghi e Pollo with mushrooms and chicken",
  },
  grandeRossa: {
    photo: "/images/food-7.webp",
    photoAlt: "La Grande Rossa with ’nduja and salami",
  },
  bianca: {
    photo: "/images/food-9.webp",
    photoAlt: "Bianca Neve with truffle mushrooms",
  },
  formaggio: {
    photo: "/images/food-10.webp",
    photoAlt: "Formaggio with mixed cheeses",
  },
  estiva: {
    photo: "/images/food-11.webp",
    photoAlt: "Estiva with courgette and goat’s cheese",
  },
  ragu: {
    photo: "/images/food-12.webp",
    photoAlt: "Beef ragu pizza",
  },
  salumi: {
    photo: "/images/pizza-2.jpg",
    photoAlt: "Le Grande Salumi with pepperoni and salami",
  },
  mezzaluna: {
    photo: "/images/pizza-3.jpg",
    photoAlt: "Mezzaluna half pizza, half calzone",
  },
  croquette: {
    photo: "/images/menu/arancini.jpg",
    photoAlt: "Cheese croquette",
  },
  kids: {
    photo: "/images/menu/official-margherita.jpg",
    photoAlt: "Kids pizza meal deal",
  },
  rocket: {
    photo: "/images/menu/caprese.jpg",
    photoAlt: "Rocket and parmesan salad",
  },
  tomatoSalad: {
    photo: "/images/menu/vegetable-antipasti.jpg",
    photoAlt: "Cherry tomato and red onion salad",
  },
  dip: {
    photo: "/images/menu/garlic-bread.jpg",
    photoAlt: "House dip",
  },
  drink: {
    photo: "/images/food-5.webp",
    photoAlt: "Soft drink",
  },
};

const photoByName: Record<string, { photo: string; photoAlt: string }> = {
  "Garlic Bread": photos.garlic,
  "Garlic Bread with Cheese": photos.garlicCheese,
  Olives: photos.olives,
  Caprese: photos.caprese,
  Meatballs: photos.meatballs,
  "Arancini con Carne di Manzo": photos.arancini,
  Croquette: photos.croquette,
  Burrata: photos.burrata,
  "Meat Antipasti": photos.antipasti,
  "Vegetable Antipasti": photos.vegAntipasti,
  "Kids Pizza Meal Deal": photos.kids,
  Margherita: photos.margherita,
  "Margherita Bufala": photos.bufala,
  Marinara: photos.marinara,
  Napoli: photos.napoli,
  Sempliciotta: photos.sempliciotta,
  "Funghi e Pollo": photos.funghi,
  Chorizo: photos.chorizo,
  "La Grande Rossa": photos.grandeRossa,
  "Miele Sizzler": photos.miele,
  "Bianca Neve": photos.bianca,
  Vulcano: photos.vulcano,
  Formaggio: photos.formaggio,
  Partenopea: photos.partenopea,
  Rustica: photos.rustica,
  "Triple Pepperoni": photos.triplePepperoni,
  Estiva: photos.estiva,
  "Beef Ragu": photos.ragu,
  "Le Grande Salumi": photos.salumi,
  Mezzaluna: photos.mezzaluna,
  Meat: photos.calzone,
  Vegetarian: photos.calzoneVeg,
  "Homemade Tiramisu": photos.tiramisu,
  "Rocket & Parmesan": photos.rocket,
  "Cherry Tomato & Red Onion": photos.tomatoSalad,
};

export function menuPhotoFor(name: string) {
  return photoByName[name];
}

const startersShared = {
  garlic: {
    name: "Garlic Bread",
    description: "Rosemary.",
    tags: ["v"] as DietTag[],
    price: "£5.90",
    ...photos.garlic,
  },
  olives: {
    name: "Olives",
    description: "Lemon, chilli, rosemary, wild oregano.",
    tags: ["vg"] as DietTag[],
    price: "£4.50",
    ...photos.olives,
  },
  caprese: {
    name: "Caprese",
    description: "Buffalo mozzarella, cherry tomatoes, basil, basil oil.",
    tags: ["v"] as DietTag[],
    price: "£6.50",
    ...photos.caprese,
  },
  meatballs: {
    name: "Meatballs",
    description: "Italian meatballs in marinara sauce and mozzarella.",
    price: "£7",
    ...photos.meatballs,
  },
  arancini: {
    name: "Arancini con Carne di Manzo",
    description: "Beef ragu, marinara sauce.",
    price: "£6.90",
    ...photos.arancini,
  },
  croquette: {
    name: "Croquette",
    description: "Cheese croquette, barbecue sauce.",
    tags: ["v"] as DietTag[],
    price: "£6.90",
    ...photos.croquette,
  },
  burrata: {
    name: "Burrata",
    description: "Buffalo burrata, grated tomatoes, garlic, basil oil and sourdough.",
    price: "£8.90",
    ...photos.burrata,
  },
  meatAntipasti: {
    name: "Meat Antipasti",
    description:
      "Wild boar salami, chorizo Ibérico, fennel salami, coppa, Italian cheese, olives, sun-dried tomatoes, artichokes, focaccia.",
    sizes: [
      { label: "Small (1–2 people)", price: "£8.50" },
      { label: "Large (3–4 people)", price: "£15" },
    ],
    ...photos.antipasti,
  },
  vegAntipasti: {
    name: "Vegetable Antipasti",
    description: "Italian cheese, marinated vegetables, crostini and focaccia.",
    tags: ["v"] as DietTag[],
    sizes: [
      { label: "Small (1–2 people)", price: "£8" },
      { label: "Large (3–4 people)", price: "£14" },
    ],
    ...photos.vegAntipasti,
  },
};

const kids: MenuItem[] = [
  {
    name: "Kids Pizza Meal Deal",
    description: "Under 12s only. Margherita and two toppings, plus a juice.",
    price: "£7.50",
    ...photos.kids,
  },
];

const pizzaIntro =
  "Sourdough Neapolitan pizza, made the way it was invented, vera Napoletana style, with a soft chewy crust.";

const parmesanNote =
  "All our pizzas are sprinkled with a non-vegetarian parmesan. Please ask if you would like it removed.";

const toppings = [
  {
    title: "Meat & fish",
    price: "+£2.50",
    items:
      "Anchovies, grilled chicken, chorizo, Italian pepperoni, Italian herb ham, ’nduja, Parma ham, salami Napoli, salami finocchiona.",
  },
  {
    title: "Cheeses",
    price: "+£2.50",
    items:
      "Fior di latte, mozzarella, bufala mozzarella, parmesan, smoked mozzarella, buffalo burrata (+£3.50), stracciatella, vegan mozzarella, goat’s cheese, gorgonzola.",
  },
  {
    title: "Vegetables",
    price: "+£2.00",
    items:
      "Artichoke, sautéed mixed mushrooms, olives, rocket, sun-dried tomatoes, capers, vegan ’nduja, cherry tomatoes, jalapeños, red peppers, courgettes, aubergine, onion.",
  },
];

const dippers: MenuItem[] = [
  { name: "Garlic and parsley aioli", description: "", price: "£2", ...photos.dip },
  { name: "’Nduja aioli", description: "", price: "£2", ...photos.dip },
  { name: "Hot honey", description: "", price: "£2", ...photos.dip },
  { name: "Garlic butter", description: "", price: "£2", ...photos.dip },
  { name: "Romesco", description: "", price: "£2", ...photos.dip },
];

const salads: MenuItem[] = [
  { name: "Rocket & Parmesan", description: "", price: "£3.50", ...photos.rocket },
  {
    name: "Cherry Tomato & Red Onion",
    description: "",
    tags: ["v"],
    price: "£3.50",
    ...photos.tomatoSalad,
  },
];

const desserts: MenuItem[] = [
  {
    name: "Homemade Tiramisu",
    description: "Ask in restaurant.",
    ...photos.tiramisu,
  },
];

const sharedNotes = [
  "100% of tips go directly to the team.",
  "Allergen information is available on request.",
  "Gluten-free pizza base +£2.",
  "10% discretionary service charge for parties of five or more.",
  "v = vegetarian · vg = vegan · n = contains nuts",
];

function pizzas(prices: Record<string, string>, extras?: Record<string, Partial<MenuItem>>): MenuItem[] {
  const list: MenuItem[] = [
    {
      name: "Margherita",
      description: "Tomato sauce, mozzarella fior di latte, parmesan and basil.",
      tags: ["v"],
      ...photos.margherita,
    },
    {
      name: "Margherita Bufala",
      description: "Tomato sauce, mozzarella di bufala, parmesan and basil.",
      tags: ["v"],
      ...photos.bufala,
    },
    {
      name: "Marinara",
      description: "No cheese. Tomato sauce, garlic oil, wild oregano.",
      tags: ["vg"],
      ...photos.marinara,
    },
    {
      name: "Napoli",
      description: "Tomato sauce, mozzarella fior di latte, anchovies, kalamata olives, capers, wild oregano.",
      ...photos.napoli,
    },
    {
      name: "Sempliciotta",
      description: "Tomato sauce, mozzarella fior di latte, salami Napoli, parmesan and basil.",
      ...photos.sempliciotta,
    },
    {
      name: "Funghi e Pollo",
      description: "Tomato sauce, mozzarella fior di latte, chicken, sautéed mixed mushrooms, truffle oil, parmesan and basil.",
      ...photos.funghi,
    },
    {
      name: "Chorizo",
      description: "Tomato sauce, mozzarella, chorizo, chicken, red pepper, parmesan.",
      ...photos.chorizo,
    },
    {
      name: "La Grande Rossa",
      description: "Romana style. Tomato sauce, mozzarella fior di latte, ’nduja, pepper, salami, finocchiona, chorizo.",
      ...photos.grandeRossa,
    },
    {
      name: "Miele Sizzler",
      description: "Tomato sauce, mozzarella fior di latte, ’nduja, pepperoni, chorizo, hot honey.",
      ...photos.miele,
    },
    {
      name: "Bianca Neve",
      description: "No tomato. Truffle mushroom cream base, fior di latte, mixed mushrooms, truffle oil, parmesan crisps.",
      ...photos.bianca,
    },
    {
      name: "Vulcano",
      description: "Tomato sauce, mozzarella fior di latte, pepperoni, ’nduja, jalapeños, hot honey.",
      ...photos.vulcano,
    },
    {
      name: "Formaggio",
      description: "Tomato sauce, mozzarella fior di latte, gorgonzola, parmesan, smoked mozzarella, goat’s cheese.",
      ...photos.formaggio,
    },
    {
      name: "Partenopea",
      description: "Tomato sauce, mozzarella fior di latte, post-oven burrata, Parma ham, heirloom tomatoes, parmesan shavings, basil.",
      ...photos.partenopea,
    },
    {
      name: "Rustica",
      description: "Smoked mozzarella, tomato, aubergine, sun-dried tomatoes, artichoke, pine nuts.",
      tags: ["v", "n"],
      ...photos.rustica,
    },
    {
      name: "Triple Pepperoni",
      description: "Tomato sauce, mozzarella fior di latte, triple pepperoni. Optional jalapeños +£1. Halal option available.",
      ...photos.triplePepperoni,
    },
    {
      name: "Estiva",
      description: "Tomato sauce, smoked mozzarella, courgette, artichoke, red onion, goat’s cheese.",
      ...photos.estiva,
    },
    {
      name: "Beef Ragu",
      description: "Nine-hour slow-cooked beef in rich tomato sauce, mozzarella fior di latte, parmesan, parmesan crisp.",
      ...photos.ragu,
    },
    {
      name: "Le Grande Salumi",
      description: "Romana style. Tomato sauce, mozzarella fior di latte, pepperoni, salami Napoli, salami finocchiona, parmesan shavings.",
      ...photos.salumi,
    },
    {
      name: "Mezzaluna",
      description: "Half pizza, half calzone. Tomato sauce, mozzarella fior di latte, mixed mushrooms, Italian cooked ham.",
      ...photos.mezzaluna,
    },
  ];

  return list.map((item) => ({
    ...item,
    price: prices[item.name],
    ...(extras?.[item.name] || {}),
  }));
}

export const menus: Record<LocationId, LocationMenu> = {
  chorlton: {
    id: "chorlton",
    label: "Chorlton",
    intro: pizzaIntro,
    parmesanNote,
    starters: [
      startersShared.garlic,
      { name: "Garlic Bread with Cheese", description: "Melted mozzarella.", tags: ["v"], price: "£8.50", ...photos.garlicCheese },
      startersShared.olives,
      startersShared.caprese,
      startersShared.meatballs,
      startersShared.arancini,
      startersShared.croquette,
      { ...startersShared.burrata, ...photos.burrata },
      startersShared.meatAntipasti,
      startersShared.vegAntipasti,
    ],
    kids,
    pizzas: pizzas({
      Margherita: "£11",
      "Margherita Bufala": "£13.50",
      Marinara: "£8.90",
      Napoli: "£13.50",
      Sempliciotta: "£13.50",
      "Funghi e Pollo": "£13.90",
      Chorizo: "£13.90",
      "La Grande Rossa": "£14.50",
      "Miele Sizzler": "£13.90",
      "Bianca Neve": "£13.50",
      Vulcano: "£13.50",
      Formaggio: "£13.90",
      Partenopea: "£13.90",
      Rustica: "£13.90",
      "Triple Pepperoni": "£15",
      Estiva: "£13.90",
      "Beef Ragu": "£15",
      "Le Grande Salumi": "£13.90",
      Mezzaluna: "£15",
    }),
    calzones: [
      {
        name: "Meat",
        description: "Tomato sauce, mozzarella fior di latte, salami finocchiona, cooked ham.",
        price: "£15",
        ...photos.calzone,
      },
      {
        name: "Vegetarian",
        description: "Tomato sauce, mozzarella fior di latte, courgettes, aubergine, peppers.",
        tags: ["v"],
        price: "£15",
        ...photos.calzoneVeg,
      },
    ],
    salads,
    dippers,
    toppings,
    desserts,
    drinks: [
      { name: "Coke, Diet Coke, Coke Zero, Sprite", description: "", price: "£3.50", ...photos.drink },
      { name: "San Pellegrino", description: "Lemon, orange, blood orange, or pomegranate and orange.", price: "£3.50", ...photos.drink },
      { name: "Water", description: "Still or sparkling.", price: "£3.90", ...photos.drink },
    ],
    juices: [{ name: "Apple or orange juice", description: "", price: "£3.50", ...photos.drink }],
    byob: "Please bring your own alcohol. No soft drinks or mixers permitted. £2.50 per person BYOB charge.",
    notes: sharedNotes,
  },
  manchester: {
    id: "manchester",
    label: "City Centre",
    intro: pizzaIntro,
    parmesanNote,
    starters: [
      startersShared.garlic,
      { name: "Garlic Bread with Cheese", description: "", tags: ["v"], price: "£7.90", ...photos.garlicCheese },
      startersShared.olives,
      startersShared.caprese,
      startersShared.meatballs,
      startersShared.arancini,
      startersShared.croquette,
      startersShared.burrata,
      startersShared.meatAntipasti,
      startersShared.vegAntipasti,
    ],
    kids,
    pizzas: pizzas(
      {
        Margherita: "£10.90",
        "Margherita Bufala": "£13.50",
        Marinara: "£8.90",
        Napoli: "£13.50",
        Sempliciotta: "£12.90",
        "Funghi e Pollo": "£13.90",
        Chorizo: "£13.50",
        "La Grande Rossa": "£13.90",
        "Miele Sizzler": "£13.90",
        "Bianca Neve": "£13.50",
        Vulcano: "£13.50",
        Formaggio: "£13.90",
        Partenopea: "£13.90",
        Rustica: "£13.90",
        "Triple Pepperoni": "£14.90",
        Estiva: "£13.90",
        "Beef Ragu": "£14.90",
        "Le Grande Salumi": "£13.90",
        Mezzaluna: "£14.50",
      },
      {
        Napoli: {
          description:
            "Tomato sauce, mozzarella fior di latte, anchovies, kalamata olives, capers, wild oregano. Halal option available.",
        },
      },
    ),
    calzones: [
      {
        name: "Meat",
        description: "Tomato sauce, mozzarella fior di latte, tomato, salami finocchiona, cooked ham.",
        price: "£14.90",
        ...photos.calzone,
      },
      {
        name: "Vegetarian",
        description: "Tomato sauce, mozzarella fior di latte, courgettes, aubergine, peppers.",
        tags: ["v"],
        price: "£14.90",
        ...photos.calzoneVeg,
      },
    ],
    salads,
    dippers,
    toppings,
    desserts,
    notes: [
      ...sharedNotes,
      "We cannot guarantee a 100% gluten-free environment. We use the same pizza oven for all pizzas.",
      "City Centre has a full bar — cocktails, beer and wine. Ask in restaurant for the drinks list.",
    ],
  },
};

export const featuredPizzas = menus.manchester.pizzas.filter((p) =>
  ["Margherita", "Vulcano", "Miele Sizzler", "Chorizo", "Rustica", "Partenopea"].includes(p.name),
);
