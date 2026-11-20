// Course cover photos (approved placeholders from the platform, until Marco sends one photo per course).
const COVERS: Record<string, string> = {
  chatgpt: "/img/kurser/team.jpg",
  claude: "/img/kurser/whiteboard.jpg",
  copilot: "/img/kurser/telefon.jpg",
};

export const coverFor = (slug: string) => COVERS[slug] ?? "/img/kurser/feedback.jpg";
