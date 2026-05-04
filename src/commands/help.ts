export default async function handleHelp({
  say,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  await say(
    [
      "🍱 *LunchBot Commands:*",
      "begin - start the lunch poll for the day",
      "suggest <place> - add a lunch place to today's poll",
      "suggestiondeadline <time> - set the suggestion deadline (default 11:00 AM EST)",
      "remove <place> - remove a suggestion from today's poll",
      "list - show today's lunch suggestions",
      "help - show this message",
    ].join("\n")
  );
}
