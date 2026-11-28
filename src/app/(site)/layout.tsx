import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import "./site.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dz-site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <div className="site-shell">
        <JsonLd />
        <main id="main-content">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
