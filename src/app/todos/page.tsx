import { redirect } from "next/navigation";

/** Tasks tab deprecated — lists live on the dashboard. */
export default function TodosPage() {
  redirect("/");
}
