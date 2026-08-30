import { redirect } from "next/navigation";

export default function PinocchioIndexPage() {
  redirect("/book/pinocchio/1");
}
