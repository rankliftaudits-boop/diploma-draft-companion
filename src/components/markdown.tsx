import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TEXT_END, TEXT_START } from "@/lib/ai/prompts";

export function Markdown({ text }: { text: string }) {
  const cleaned = text.split(TEXT_START).join("\n\n---\n\n").split(TEXT_END).join("\n\n---\n\n");
  return (
    <div className="prose-rafeeq text-[15px]" dir="auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleaned}</ReactMarkdown>
    </div>
  );
}
