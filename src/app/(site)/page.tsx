import Image from "next/image";
import Link from "next/link";
import { JourneyChoices } from "@/components/JourneyChoices";
import { MenuPhotoCard } from "@/components/MenuPhotoCard";
import { RoomCard } from "@/components/RoomCard";
import { SocialRail } from "@/components/SocialRail";
import { Button, SectionTitle } from "@/components/ui";
import { awards, brand, craft, reviews } from "@/data/site";
import { featuredPizzasLive } from "@/lib/platform/menu";
import { listGalleryPhotos } from "@/lib/platform/gallery";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featuredPizzas, gallery] = await Promise.all([featuredPizzasLive("manchester"), listGalleryPhotos()]);
  return (
    <>
      <section className="hero grain">
        <Image
          src="/images/food-1.jpg"
          alt="Wood-fired Neapolitan Margherita at Double Zero"
          fill
          priority
          className="object-cover object-[center_40%] opacity-60"
        />
        <div className="hero-shade" />
        <SocialRail />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="hero-kicker">Manchester · Chorlton · since 2015</p>
            <div className="gold-rule mt-4" />
            <h1 className="hero-title">
              The home of independent, authentic and handmade <em>Neapolitan pizza</em>.
            </h1>
            <p className="hero-lede">
              Four ingredients. Forty-eight hours. Ninety seconds in a Naples-built wood oven.
            </p>
            <JourneyChoices />
          </div>
          <div className="hero-places">
            <Link href="/manchester" className="hero-place">
              <span className="serif block text-lg leading-tight">City Centre</span>
              <span className="mt-1 block text-sm text-cream/70">55 Spring Gardens, M2 2BY</span>
            </Link>
            <Link href="/chorlton" className="hero-place">
              <span className="serif block text-lg leading-tight">Chorlton</span>
              <span className="mt-1 block text-sm text-cream/70">368 Barlow Moor Road, M21 8AZ</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-ink text-cream">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-3 md:px-8">
          {awards.map((item) => (
            <div key={item.title}>
              <p className="display text-[0.7rem] tracking-[0.28em] text-gold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/75">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:px-8 md:py-28">
        <div className="relative aspect-[4/5] overflow-hidden img-zoom md:aspect-[5/6]">
          <Image src="/images/pizza-1.jpg" alt="Fresh dough balls at Double Zero" fill className="object-cover" />
        </div>
        <div>
          <SectionTitle
            eyebrow="Named after 00 flour"
            title="Independent pizza, made the Neapolitan way."
            copy={brand.description}
          />
          <p className="mt-6 text-mute leading-relaxed">
            Neapolitan pizza is softer than its flatter, crispier cousins — loved for its chewy crust and flavour. Toppings
            such as fior di latte, scamorza and fennel sausage come from Italy. The oven is a Stefano Ferrara, shipped from
            Naples, the home of pizza.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/about">Our story</Button>
            <Button href="/gallery" variant="ghost">
              Gallery
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <SectionTitle
            eyebrow="The craft"
            title="From dough tray to wood fire."
            copy="Every pizza is made in front of you. No shortcuts, no frozen bases — just time, heat and a hard-working kitchen."
          />
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {craft.map((step) => (
              <article key={step.kicker} className="border-t border-ink/15 pt-6">
                <p className="display text-gold">{step.kicker}</p>
                <h3 className="serif mt-3 text-2xl">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mute">{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionTitle
            eyebrow="On the menu"
            title="Pizzas, calzones and starters."
            copy="Separate menus for City Centre and Chorlton. Gluten-free base +£2. Parmesan can be left off on request."
          />
          <Button href="/menu" variant="ghost">
            Full menu
          </Button>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {featuredPizzas.map((item) => (
            <MenuPhotoCard key={item.name} item={item}>
              <div className={`site-card flex items-start gap-4 p-5 sm:gap-5 sm:p-6 md:p-8 ${item.unavailable ? "is-unavailable" : ""}`}>
                {item.photo ? (
                  <div className="img-zoom relative h-24 w-24 shrink-0 overflow-hidden sm:h-28 sm:w-32">
                    <Image
                      src={item.photo}
                      alt={item.photoAlt || item.name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="serif text-2xl">{item.name}</h3>
                    {item.unavailable ? <em className="menu-unavailable">Unavailable</em> : null}
                    {item.tags?.map((tag) => (
                      <span key={tag} className="display text-[0.62rem] tracking-[0.2em] text-ember">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-mute">{item.description}</p>
                  {item.price ? <p className="mt-3 text-sm">from {item.price}</p> : null}
                </div>
              </div>
            </MenuPhotoCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="flex items-end justify-between gap-6">
          <SectionTitle eyebrow="Gallery" title="From the kitchen and the table." />
          <Button href="/gallery" variant="ghost" className="hidden sm:inline-flex">
            All photos
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {gallery.slice(0, 8).map((shot) => (
            <div key={shot.src} className="img-zoom relative aspect-[4/5]">
              <Image src={shot.src} alt={shot.alt} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-3 md:px-8 md:py-28">
          {reviews.map((review) => (
            <blockquote key={review.name} className="flex flex-col">
              <p className="serif text-2xl leading-snug">“{review.quote}”</p>
              <footer className="mt-6 text-sm text-mute">
                <span className="text-ink">{review.name}</span>
                <span className="mx-2">·</span>
                {review.source}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <SectionTitle
          eyebrow="Offers"
          title="Current offers."
          copy="Collection discount, first online order and weekday promotions, applied when you check out."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/offers">See offers</Button>
          <Button href="/order" variant="ghost">
            Order online
          </Button>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <SectionTitle
            eyebrow="Find us"
            title="Two Manchester restaurants."
            copy="Book online for up to eight guests. For larger groups, call the restaurant. Parties of ten or more need a pre-order."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <RoomCard id="manchester" />
            <RoomCard id="chorlton" />
          </div>
        </div>
      </section>

      <section className="grain relative overflow-hidden bg-ember py-24 text-cream">
        <div className="relative mx-auto max-w-4xl px-5 text-center md:px-8">
          <p className="display text-[0.72rem] tracking-[0.32em] text-cream/80">Reservations</p>
          <h2 className="serif mt-4 text-4xl md:text-6xl">Book a table.</h2>
          <p className="mx-auto mt-5 max-w-xl text-cream/85">
            City Centre has a full bar. Chorlton is bring-your-own. Both kitchens use the same dough, the same oven and
            the same pizza.
          </p>
          <JourneyChoices tone="warm" />
        </div>
      </section>
    </>
  );
}
