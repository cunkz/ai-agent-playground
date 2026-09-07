import { z } from "zod";
import type { ToolDefinition } from "../agent.js";

const TimeArgs = z.object({
  timezone: z.string().optional(),
});

type TimeArgs = z.infer<typeof TimeArgs>;

export const timeTool: ToolDefinition<TimeArgs> = {
  name: "getCurrentTime",
  description:
    "Get the current date and time. Optionally pass an IANA timezone (e.g. 'Asia/Jakarta'); " +
    "defaults to the system's local timezone if omitted.",
  parameters: {
    type: "object",
    properties: {
      timezone: { type: "string", description: "IANA timezone name, e.g. Asia/Jakarta" },
    },
    required: [],
  },
  schema: TimeArgs,
  execute: ({ timezone }) => {
    const now = new Date();
    try {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: timezone,
      }).format(now);
    } catch {
      throw new Error(`Unknown timezone: "${timezone}".`);
    }
  },
};
