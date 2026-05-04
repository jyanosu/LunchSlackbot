import { addToMasterList, getMasterList } from "../store";

const SEED_PLACES = [
  "Taco Bell",
  "Chipotle",
  "In-N-Out Burger",
  "Panda Express",
  "Subway",
  "Qdoba",
  "Moe's Southwest Grill",
  "Jimmy John's",
  "Panera Bread",
  "Wingstop",
  "Chick-fil-A",
  "Domino's Pizza",
  "Pizza Hut",
  "Little Caesars",
  "Five Guys",
  "Shake Shack",
  "Popeyes",
  "KFC",
  "McDonald's",
  "Burger King",
];

export default async function handleSeedMasterlist({
  say,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const before = getMasterList().size;

  for (const place of SEED_PLACES) {
    addToMasterList(place);
  }

  const after = getMasterList().size;
  const added = after - before;

  await say(`Seeded master list. ${added} new places added (${after} total).`);
}
