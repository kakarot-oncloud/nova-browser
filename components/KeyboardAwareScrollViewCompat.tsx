import { Platform, ScrollView, ScrollViewProps } from "react-native";
import React from "react";

type Props = ScrollViewProps & { keyboardShouldPersistTaps?: "always" | "never" | "handled" };

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  return (
    <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
      {children}
    </ScrollView>
  );
}
