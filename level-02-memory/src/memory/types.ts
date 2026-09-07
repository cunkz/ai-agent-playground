import { z } from "zod";

export const MemoryCategory = z.enum([
  "preference",
  "project_fact",
  "conversation_fact",
  "task_state",
  "technical_knowledge",
]);
export type MemoryCategory = z.infer<typeof MemoryCategory>;

export interface Memory {
  id: string;
  userId: string;
  category: MemoryCategory;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// This project has no authentication system. A single fixed user id keeps
// the memory model realistic (every row still has a user_id) without
// building auth just to demonstrate persistence.
export const DEFAULT_USER_ID = "local-user";
