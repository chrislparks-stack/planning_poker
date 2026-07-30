import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { ComponentProps } from "react";

type EmojiPickerProps = Omit<ComponentProps<typeof Picker>, "data">;

export default function LazyEmojiPicker(props: EmojiPickerProps) {
  return <Picker data={data} {...props} />;
}
