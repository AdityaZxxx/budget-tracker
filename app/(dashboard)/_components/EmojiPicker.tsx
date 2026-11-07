"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface Props {
  theme: string | undefined;
  onEmojiSelect: (emoji: { native: string }) => void;
}

// The emoji dataset is half a megabyte, so it lives behind a dynamic import
// and only downloads when the icon picker is opened.
export default function EmojiPicker({ theme, onEmojiSelect }: Props) {
  return <Picker data={data} theme={theme} onEmojiSelect={onEmojiSelect} />;
}
