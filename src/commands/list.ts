import { getToday } from "../store";

export default async function handleList({
  say,
}: {
  say: (text: string) => Promise<unknown>;
}) {
  const today = getToday();

  if (!today?.started) {
    await say("Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start.");
    return;
  }

  if (today.suggestions.length === 0) {
    await say("No suggestions yet. Use @LunchSlackBot suggest <place> to add one.");
    return;
  }

  const sorted = [...today.suggestions].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }));
  const list = sorted.map((s, i) => `${i + 1}. ${s}`).join("\n");
  await (say as any)({
    text: `🍱 Today's lunch suggestions (deadline: ${today.deadline}): ${list}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🍱 Today's lunch suggestions* (deadline: ${today.deadline}):\n${list}`,
        },
      },
    ],
  });
}
