import { brand, locations } from "@/data/site";

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: brand.name,
        legalName: brand.legalName,
        url: "https://pizzeriadoublezero.com",
        sameAs: [brand.instagram, brand.facebook, brand.twitter],
      },
      {
        "@type": "Restaurant",
        name: "Double Zero Manchester",
        servesCuisine: ["Neapolitan", "Pizza", "Italian"],
        priceRange: "££",
        telephone: locations.manchester.phone,
        email: locations.manchester.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: locations.manchester.address,
          addressLocality: "Manchester",
          postalCode: locations.manchester.postcode,
          addressCountry: "GB",
        },
        url: "https://pizzeriadoublezero.com/manchester",
      },
      {
        "@type": "Restaurant",
        name: "Double Zero Chorlton",
        servesCuisine: ["Neapolitan", "Pizza", "Italian"],
        priceRange: "££",
        telephone: locations.chorlton.phone,
        email: locations.chorlton.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: locations.chorlton.address,
          addressLocality: "Manchester",
          postalCode: locations.chorlton.postcode,
          addressCountry: "GB",
        },
        url: "https://pizzeriadoublezero.com/chorlton",
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
