export async function handleAppMention({ say }: { say: (text: string) => Promise<unknown> }) {
  await say("🍱 *Lunchbot* — lunch suggestion bot");
}
