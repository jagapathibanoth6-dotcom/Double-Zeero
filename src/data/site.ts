export const brand = {
  name: "Double Zero",
  legalName: "Double Zero Pizzeria Ltd",
  tagline: "Independent, authentic, handmade Neapolitan pizza.",
  flourLine: "Named after the 00 flour that makes the dough.",
  description:
    "Double Zero is Manchester’s independent Neapolitan pizzeria. Dough is made on site every day from four ingredients — flour, water, salt and yeast — fermented for at least 48 hours, stretched by hand and cooked in under 90 seconds at 450°C in a Stefano Ferrara wood-fired oven from Naples.",
  instagram: "https://www.instagram.com/double_zero_pizzeria/",
  facebook: "https://www.facebook.com/profile.php?id=100063723543441",
  twitter: "https://twitter.com/double00pizza",
};

export type DayHours = { open: string; close: string };
export type VisitType = "table" | "collection";

type WeeklyHours = Record<0 | 1 | 2 | 3 | 4 | 5 | 6, DayHours | null>;

export type LocationId = "manchester" | "chorlton";

export const locations = {
  manchester: {
    id: "manchester" as const,
    shortName: "City Centre",
    name: "Manchester City Centre",
    headline: "Spring Gardens",
    address: "55 Spring Gardens",
    city: "Manchester",
    postcode: "M2 2BY",
    phone: "0161 914 6212",
    phoneHref: "tel:+441619146212",
    email: "mcr@pizzeriadoublezero.com",
    emailAlt: "info@doublezeroltd.com",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=Double+Zero+Pizzeria+55+Spring+Gardens+Manchester+M2+2BY",
    embedUrl:
      "https://maps.google.com/maps?q=55%20Spring%20Gardens%20Manchester%20M2%202BY&t=&z=16&ie=UTF8&iwloc=&output=embed",
    hours: [
      { days: "Sunday – Thursday", time: "12:00pm – 10:00pm" },
      { days: "Friday – Saturday", time: "12:00pm – 11:00pm" },
    ],
    notes: [
      "Full bar — cocktails, Italian and European wines.",
      "Groups of 10 or more must pre-order up to 24 hours before.",
      "Ask in your booking notes if you need a highchair or pram space.",
    ],
    byob: false,
    opened: "March 2024",
    bookingPath: "/manchester/book",
    menuPath: "/manchester/menu",
    dishCultUrl: "https://www.dishcult.com/restaurant/doublezeropizzeria",
    resdiaryMicrosite: "DoubleZeroPizzeria",
    maxOnlineGuests: 8,
    groupFrom: 9,
    visitTypes: ["table"] as VisitType[],
    weeklyHours: {
      0: { open: "12:00", close: "22:00" },
      1: { open: "12:00", close: "22:00" },
      2: { open: "12:00", close: "22:00" },
      3: { open: "12:00", close: "22:00" },
      4: { open: "12:00", close: "22:00" },
      5: { open: "12:00", close: "23:00" },
      6: { open: "12:00", close: "23:00" },
    } satisfies WeeklyHours,
    collectionHours: {
      0: { open: "12:00", close: "22:00" },
      1: { open: "12:00", close: "22:00" },
      2: { open: "12:00", close: "22:00" },
      3: { open: "12:00", close: "22:00" },
      4: { open: "12:00", close: "22:00" },
      5: { open: "12:00", close: "23:00" },
      6: { open: "12:00", close: "23:00" },
    } satisfies WeeklyHours,
  },
  chorlton: {
    id: "chorlton" as const,
    shortName: "Chorlton",
    name: "Chorlton",
    headline: "Barlow Moor Road",
    address: "368 Barlow Moor Road",
    city: "Chorlton-cum-Hardy, Manchester",
    postcode: "M21 8AZ",
    phone: "0161 943 8980",
    phoneHref: "tel:+441619438980",
    email: "chorlton@pizzeriadoublezero.com",
    emailAlt: "doublezeromcr@gmail.com",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=Double+Zero+Pizzeria+368+Barlow+Moor+Road+Chorlton+M21+8AZ",
    embedUrl:
      "https://maps.google.com/maps?q=368%20Barlow%20Moor%20Road%20Chorlton-cum-Hardy%20Manchester%20M21%208AZ&t=&z=16&ie=UTF8&iwloc=&output=embed",
    hours: [
      { days: "Monday – Thursday", time: "6:00pm – 10:00pm" },
      { days: "Friday – Saturday", time: "5:00pm – 11:00pm" },
      { days: "Sunday", time: "4:00pm – 9:30pm" },
    ],
    notes: [
      "Bring your own alcohol. No soft drinks or mixers permitted. £2.50 per person BYOB charge.",
      "Co-op and Carrington’s Wine Merchants are a few doors away.",
      "Collections: book a slot here, or call 0161 943 8980.",
    ],
    byob: true,
    opened: "2015",
    bookingPath: "/chorlton/book",
    menuPath: "/chorlton/menu",
    dishCultUrl: "https://www.dishcult.com/restaurant/doublezero",
    resdiaryMicrosite: "DoubleZero",
    maxOnlineGuests: 8,
    groupFrom: 9,
    visitTypes: ["table", "collection"] as VisitType[],
    weeklyHours: {
      0: { open: "16:00", close: "21:30" },
      1: { open: "18:00", close: "22:00" },
      2: { open: "18:00", close: "22:00" },
      3: { open: "18:00", close: "22:00" },
      4: { open: "18:00", close: "22:00" },
      5: { open: "17:00", close: "23:00" },
      6: { open: "17:00", close: "23:00" },
    } satisfies WeeklyHours,
    collectionHours: {
      0: { open: "16:00", close: "22:00" },
      1: { open: "18:00", close: "22:00" },
      2: { open: "18:00", close: "22:00" },
      3: { open: "18:00", close: "22:00" },
      4: { open: "18:00", close: "22:00" },
      5: { open: "17:00", close: "23:00" },
      6: { open: "17:00", close: "23:00" },
    } satisfies WeeklyHours,
  },
};

export const craft = [
  {
    kicker: "01",
    title: "Four ingredients",
    copy: "Flour, water, salt and yeast. Nothing else goes into the dough. It is mixed and proved on site every day.",
  },
  {
    kicker: "02",
    title: "48-hour ferment",
    copy: "A long, slow rise develops flavour and keeps the crust light and easy to digest — the Neapolitan way.",
  },
  {
    kicker: "03",
    title: "Hand-stretched",
    copy: "Each pizza is opened by hand, topped with Italian ingredients, then slid into the wood fire.",
  },
  {
    kicker: "04",
    title: "90 seconds at 450°C",
    copy: "A Stefano Ferrara oven, built in Naples, finishes the pie with leopard-spotted cornicione in under a minute and a half.",
  },
];

export const awards = [
  {
    title: "Best pizza in the UK",
    detail: "Named number one pizza spot in the country, 2023.",
  },
  {
    title: "Deliveroo",
    detail: "Best pizza in the North West and Midlands.",
  },
  {
    title: "Independent since 2015",
    detail: "Chorlton first. City centre from 2024.",
  },
];

export const gallery = [
  { src: "/images/menu/miele-sizzler.jpg", alt: "Miele Sizzler from the wood oven", tall: false },
  { src: "/images/interior.jpg", alt: "Sharing pizzas at Double Zero", tall: false },
  { src: "/images/menu/partenopea-pizza.jpg", alt: "Partenopea with burrata and Parma ham", tall: false },
  { src: "/images/menu/vulcano.jpg", alt: "Vulcano with jalapeños and hot honey", tall: true },
  { src: "/images/menu/calzone.jpg", alt: "Wood-fired calzone", tall: false },
  { src: "/images/menu/caprese.jpg", alt: "Caprese with sourdough", tall: false },
  { src: "/images/menu/burrata.jpg", alt: "Burrata at Double Zero Chorlton", tall: false },
  { src: "/images/menu/margherita-bufala.jpg", alt: "Margherita Bufala", tall: false },
  { src: "/images/menu/meatballs.jpg", alt: "Meatballs in marinara", tall: false },
];

export const reviews = [
  {
    quote:
      "The pizza is by far the best I have eaten anywhere in the world — yes, including Italy. The Vulcano with fresh green chillies is my personal favourite.",
    name: "Tripadvisor guest",
    source: "Manchester City Centre",
  },
  {
    quote:
      "An independent Manchester institution. Dough fermented for 48 hours, Italian ingredients, and a Naples-built oven doing exactly what it was made to do.",
    name: "Manchester Evening News",
    source: "March 2024",
  },
  {
    quote:
      "Warm, inviting rooms and pizzas with chewy, blistered crusts. Garlic bread with cheese and the arancini are worth the visit on their own.",
    name: "Regular guest",
    source: "Chorlton & City Centre",
  },
];
