import type { Metadata } from "next";
import Image from "next/image";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { craft } from "@/data/site";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "Double Zero is an independent Manchester pizzeria named after 00 flour. Chorlton since 2015, city centre since 2024.",
};

export default function AboutPage() {
  return (
    <div>
      <SitePage wide>
        <SectionTitle
          eyebrow="Our story"
          title="Named after the flour. Built around the oven."
          copy="Double Zero takes its name from 00 — the fine Italian pizza flour. Owner Nipuna Bogoda opened the Chorlton restaurant in 2015 with a simple brief: authentic Neapolitan pizza, made properly, in Manchester."
        />
      </SitePage>

      <div className="grid md:grid-cols-2">
        <div className="relative min-h-[360px] img-zoom">
          <Image src="/images/pizza-3.jpg" alt="Handmade pizza at Double Zero" fill className="object-cover" />
        </div>
        <div className="flex flex-col justify-center bg-paper px-5 py-14 md:px-16">
          <p className="serif text-2xl leading-snug md:text-3xl">
            “We stand out because everything we do is traditional. We use the best ingredients shipped in from Italy. Our
            pizzas are light and easy to digest, and everything is made right in front of you.”
          </p>
          <p className="mt-6 text-sm text-mute">Nipuna Bogoda, owner</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:px-8 md:py-28">
        <div>
          <h2 className="serif text-3xl md:text-4xl">Chorlton, then the city.</h2>
          <p className="mt-5 leading-relaxed text-mute">
            The original pizzeria on Barlow Moor Road became a south Manchester institution — BYOB, wood fire, and a
            following that filled the room night after night. The city centre kitchen opened on 28 March 2024 at 55 Spring
            Gardens, in the former Lättsam café, with seats for around 80, a bar, and the same Stefano Ferrara oven
            philosophy.
          </p>
          <p className="mt-4 leading-relaxed text-mute">
            Head chef Pasquale Ciotola came across from Chorlton. Dough is still fermented for at least 48 hours,
            stretched to order, and given 90 seconds at 450°C.
          </p>
        </div>
        <div>
          <h2 className="serif text-3xl md:text-4xl">The method.</h2>
          <div className="mt-6 space-y-6">
            {craft.map((step) => (
              <div key={step.kicker} className="border-t border-line pt-5">
                <p className="display text-[0.7rem] tracking-[0.24em] text-gold">
                  {step.kicker} · {step.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-mute">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-ink px-5 py-20 text-cream md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="display text-[0.72rem] tracking-[0.28em] text-gold">Kitchen & floor</p>
            <h2 className="serif mt-3 text-4xl">Want to work with us?</h2>
          </div>
          <Button href="/join" variant="light">
            Join the team
          </Button>
        </div>
      </div>
    </div>
  );
}
