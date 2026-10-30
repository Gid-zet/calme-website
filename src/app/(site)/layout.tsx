import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
