import { redirect } from "next/navigation";

// Booking now starts from choosing a psychologist; keep the old URL working.
export default function BookPage() {
  redirect("/psychologists");
}
