export type MessageBlock =
  | { type: "heading"; level: 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "bullets"; items: string[] }
  | { type: "actions"; items: string[] }
  | { type: "code"; content: string }
  | { type: "insight"; title: string; body: string }
  | { type: "warning"; title: string; body: string }
  | { type: "opportunity"; title: string; body: string };

type Segment = { type: "text"; content: string } | { type: "code"; content: string };

const CALLOUT_PATTERNS: {
  type: "insight" | "warning" | "opportunity";
  regex: RegExp;
}[] = [
  {
    type: "insight",
    regex:
      /^\*\*(insight|key insight|recommendation|creativeiq insight|strategic insight)\*\*:?\s*(.*)$/i,
  },
  {
    type: "warning",
    regex: /^\*\*(warning|risk|blocker|conversion blocker|creative risk)\*\*:?\s*(.*)$/i,
  },
  {
    type: "opportunity",
    regex: /^\*\*(opportunity|improvement|quick win|leverage point)\*\*:?\s*(.*)$/i,
  },
];

function splitSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const parts = content.split(/```/);

  parts.forEach((part, index) => {
    if (!part) return;
    if (index % 2 === 1) {
      const code = part.replace(/^\w*\n/, "").trim();
      if (code) segments.push({ type: "code", content: code });
    } else {
      segments.push({ type: "text", content: part });
    }
  });

  return segments.length ? segments : [{ type: "text", content }];
}

function parseTextBlock(text: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const lines = text.split("\n");
  let bulletBuffer: string[] = [];
  let actionBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    const joined = paragraphBuffer.join(" ").trim();
    if (joined) blocks.push({ type: "paragraph", content: joined });
    paragraphBuffer = [];
  };

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    blocks.push({ type: "bullets", items: [...bulletBuffer] });
    bulletBuffer = [];
  };

  const flushActions = () => {
    if (!actionBuffer.length) return;
    blocks.push({ type: "actions", items: [...actionBuffer] });
    actionBuffer = [];
  };

  const flushLists = () => {
    flushBullets();
    flushActions();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushLists();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushLists();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 2 | 3,
        content: headingMatch[2].replace(/\*\*/g, ""),
      });
      continue;
    }

    let calloutMatched = false;
    for (const { type, regex } of CALLOUT_PATTERNS) {
      const match = trimmed.match(regex);
      if (match) {
        flushParagraph();
        flushLists();
        const title = match[1];
        const body = match[2]?.trim() || "";
        blocks.push({ type, title, body });
        calloutMatched = true;
        break;
      }
    }
    if (calloutMatched) continue;

    const actionMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (actionMatch) {
      flushParagraph();
      flushBullets();
      actionBuffer.push(actionMatch[1]);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
    if (bulletMatch) {
      flushParagraph();
      flushActions();
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }

    flushLists();
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  flushLists();
  return blocks;
}

export function parseMessageContent(content: string): MessageBlock[] {
  const segments = splitSegments(content);
  const blocks: MessageBlock[] = [];

  for (const segment of segments) {
    if (segment.type === "code") {
      blocks.push({ type: "code", content: segment.content });
    } else {
      blocks.push(...parseTextBlock(segment.content));
    }
  }

  return blocks.length ? blocks : [{ type: "paragraph", content }];
}
