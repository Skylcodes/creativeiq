"use client";

import { useState } from "react";

export function useReportChat() {
  const [chatOpen, setChatOpen] = useState(false);
  return { chatOpen, setChatOpen };
}
