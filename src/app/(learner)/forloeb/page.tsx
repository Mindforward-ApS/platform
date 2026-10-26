import { redirect } from "next/navigation";

// /forloeb opens the first tool's course.
export default function CoursesIndex() {
  redirect("/forloeb/chatgpt");
}
