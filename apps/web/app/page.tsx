import { redirect } from "next/navigation";

// "/" é protegida pelo middleware; autenticado → agenda.
export default function Home() {
  redirect("/agenda");
}
