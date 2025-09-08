'use client'

import { useMemo } from "react";

const Prompt = ({ onChange }: { onChange: (val: string) => void }) => {
  const placeholder = useMemo(() => {
    const promptPlaceholderList = [
      "Give me something faster",
      "Give me something slower",
      "Give me something more upbeat",
      "Give me something more mellow",
      "Give me something more energetic",
      "Give me something more chill",
      "Give me something more intense",
      "Give me something more relaxing",
      "Give me something more exciting",
    ];
    const randomIndex = Math.floor(Math.random() * promptPlaceholderList.length);
    const finalText = "\"" + promptPlaceholderList[randomIndex] + "\"";
    return finalText;
  }, []);

  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="transition px-8 py-2.5 w-[50vh] h-[3.5rem] bg-gradient-to-b from-theme-bg-card-lighter via-theme-bg-card-accent to-theme-bg-card hover:bg-theme-bg-card-lighter text-theme-text-primary rounded-full text-sm focus:outline-none focus:ring-2"
    />
  );
};

export default Prompt;
