import { z } from "zod";
import type { ToolDefinition } from "../agent.js";

const CalculatorArgs = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number(),
});

type CalculatorArgs = z.infer<typeof CalculatorArgs>;

export const calculatorTool: ToolDefinition<CalculatorArgs> = {
  name: "calculator",
  description: "Perform basic arithmetic (add, subtract, multiply, divide) between two numbers.",
  parameters: {
    type: "object",
    properties: {
      operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
      a: { type: "number" },
      b: { type: "number" },
    },
    required: ["operation", "a", "b"],
  },
  schema: CalculatorArgs,
  execute: ({ operation, a, b }) => {
    switch (operation) {
      case "add":
        return String(a + b);
      case "subtract":
        return String(a - b);
      case "multiply":
        return String(a * b);
      case "divide":
        if (b === 0) {
          throw new Error("Division by zero is not allowed.");
        }
        return String(a / b);
    }
  },
};
