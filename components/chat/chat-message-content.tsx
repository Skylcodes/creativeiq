"use client";

import type { ReactNode } from "react";
import { parseMessageContent } from "@/lib/chat/parse-message";
import { ChatActionItems } from "./cards/chat-action-items";
import { ChatCalloutCard } from "./cards/chat-callout-card";
import { ChatCodeBlock } from "./cards/chat-code-block";
import { ChatInsightCard } from "./cards/chat-insight-card";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderBullets(items: string[], key: string) {
  return (
    <ul key={key} className="space-y-2 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-secondary">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent/50" />
          <span>{renderInline(item)}</span>
        </li>
      ))}
    </ul>
  );
}

type ChatMessageContentProps = {
  content: string;
  animate?: boolean;
};

export function ChatMessageContent({ content, animate = true }: ChatMessageContentProps) {
  const blocks = parseMessageContent(content);
  let blockIndex = 0;

  const elements: ReactNode[] = blocks.map((block, i) => {
    const delayIndex = animate ? blockIndex++ : 0;

    switch (block.type) {
      case "heading":
        return (
          <h3
            key={i}
            className={`font-display font-semibold text-text-primary ${
              block.level === 2 ? "text-base" : "text-sm"
            } ${i > 0 ? "mt-5 pt-1" : ""}`}
          >
            {block.content}
          </h3>
        );

      case "paragraph":
        return (
          <p key={i} className="text-sm leading-[1.7] text-text-secondary">
            {renderInline(block.content)}
          </p>
        );

      case "bullets":
        return renderBullets(block.items, `bullets-${i}`);

      case "actions":
        return (
          <ChatActionItems key={i} items={block.items} index={delayIndex} />
        );

      case "code":
        return <ChatCodeBlock key={i} content={block.content} />;

      case "insight":
        return (
          <ChatInsightCard
            key={i}
            title={block.title}
            body={block.body}
            index={delayIndex}
          />
        );

      case "warning":
        return (
          <ChatCalloutCard
            key={i}
            variant="warning"
            title={block.title}
            body={block.body}
            index={delayIndex}
          />
        );

      case "opportunity":
        return (
          <ChatCalloutCard
            key={i}
            variant="opportunity"
            title={block.title}
            body={block.body}
            index={delayIndex}
          />
        );

      default:
        return null;
    }
  });

  return <div className="space-y-3">{elements}</div>;
}
