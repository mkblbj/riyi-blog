export interface TextClipboard {
  writeText(text: string): Promise<void>;
}

export async function copyText(
  text: string,
  clipboard: TextClipboard | undefined,
): Promise<"copied" | "manual"> {
  if (!clipboard) return "manual";

  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "manual";
  }
}
