import Image from "next/image";
import { Logo } from "@/components/site/Logo";
import { Heart, Star } from "@/components/ui/Icon";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-center text-sm text-ink-2">🔒 Your information is private and secure.</p>
      </div>

      <div className="relative hidden overflow-hidden border-l-[2.5px] border-ink bg-blue lg:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[.12]"
          style={{ backgroundImage: "radial-gradient(#fff 1.2px, transparent 1.3px)", backgroundSize: "26px 26px" }}
        />
        <div className="absolute inset-0 grid place-items-center p-12">
          <div className="relative h-[520px] w-full max-w-[480px]">
            <figure className="polaroid left-0 top-0 h-[72%] w-[66%] -rotate-6">
              <div className="ph">
                <Image src="/images/panda-balloons.jpg" alt="" fill sizes="320px" className="object-cover object-[center_25%]" />
              </div>
              <figcaption>made with love ♡</figcaption>
            </figure>
            <figure className="polaroid bottom-0 right-0 h-[56%] w-[52%] rotate-[5deg]">
              <div className="ph">
                <Image src="/images/good-things.jpg" alt="" fill sizes="260px" className="object-cover object-[center_30%]" />
              </div>
              <figcaption>good things ✦</figcaption>
            </figure>
            <div className="sticker anim-spin -right-4 top-6 h-[120px] w-[120px] rounded-full bg-sun font-hand text-2xl leading-none">
              <span className="anim-spin-rev block">you belong<br />here</span>
            </div>
            <Star className="anim-bob absolute -left-6 bottom-24 w-14" />
            <Heart className="anim-bob absolute bottom-[52%] right-[30%] w-11" style={{ animationDelay: ".6s" }} />
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-10 text-center font-display text-2xl font-medium italic text-white">
          &ldquo;Healing isn&apos;t linear, and that&apos;s okay.&rdquo;
        </p>
      </div>
    </div>
  );
}
