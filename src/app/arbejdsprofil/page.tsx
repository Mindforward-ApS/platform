import { Suspense } from "react";
import { Arbejdsprofil } from "./Arbejdsprofil";

export const metadata = { title: "Din arbejdsprofil · Mindforward" };

export default function Page() {
  return <Suspense><Arbejdsprofil /></Suspense>;
}
