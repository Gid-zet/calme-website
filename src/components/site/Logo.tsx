import Image from "next/image";
import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-display text-[1.45rem] font-extrabold tracking-[-.03em] ${light ? "text-white" : "text-blue"}`}>
      <Image src="/images/calme-mark.png" alt="" width={38} height={38} className="h-[38px] w-[38px] rounded-full object-cover object-left" />
      CalMe
    </Link>
  );
}
