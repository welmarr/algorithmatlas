"use client";
import { createContext } from "react";
import type { SemanticRole } from "@sim/domain";
export const PresentationContext = createContext<{
  labels: { entityId: string; label: string; role: SemanticRole }[];
  durationMs: number;
  animate: boolean;
  previousSlots?: Record<string, string>;
}>({ labels: [], durationMs: 400, animate: true });
