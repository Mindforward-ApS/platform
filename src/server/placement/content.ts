import catalogJson from "../../../content/placement/catalog.v1.json";
import chatgptJson from "../../../content/placement/chatgpt.v1.json";
import claudeJson from "../../../content/placement/claude.v1.json";
import copilotJson from "../../../content/placement/copilot.v1.json";
import { PLACEMENT_TRACKS, type PlacementTrackSlug } from "@/lib/config/placement";
import { catalogSchema, placementTestSchema, type Catalog, type PlacementTest } from "@/lib/schemas/placement";

// Placement tests are bundled JSON (static imports, so they ship with every serverless function) and
// validated with Zod on first use. `pnpm content:validate` checks the same files in CI.

export type PlacementTrack = "CHATGPT" | "COPILOT" | "CLAUDE";

const RAW: Record<PlacementTrack, unknown> = { CHATGPT: chatgptJson, COPILOT: copilotJson, CLAUDE: claudeJson };
const cache = new Map<PlacementTrack, PlacementTest>();
let catalog: Catalog | undefined;

export function getPlacementTest(track: PlacementTrack): PlacementTest {
  let test = cache.get(track);
  if (!test) {
    test = placementTestSchema.parse(RAW[track]);
    if (test.track !== track) throw new Error(`placement test for ${track} declares track ${test.track}`);
    cache.set(track, test);
  }
  return test;
}

/** "placement-chatgpt.v1" — stored on PlacementResult.testVersion. */
export function testVersionOf(test: PlacementTest): string {
  return `${test.id}.v${test.version}`;
}

/** Inverse of testVersionOf; results are always re-scored against the version they were taken with. */
export function getPlacementTestByVersion(testVersion: string): PlacementTest | null {
  for (const track of Object.keys(RAW) as PlacementTrack[]) {
    const test = getPlacementTest(track);
    if (testVersionOf(test) === testVersion) return test;
  }
  return null;
}

export function getCatalog(): Catalog {
  catalog ??= catalogSchema.parse(catalogJson);
  return catalog;
}

export function trackFromSlug(slug: string): PlacementTrack | null {
  return (PLACEMENT_TRACKS as readonly string[]).includes(slug) ? (slug.toUpperCase() as PlacementTrack) : null;
}

export function slugFromTrack(track: PlacementTrack): PlacementTrackSlug {
  return track.toLowerCase() as PlacementTrackSlug;
}
