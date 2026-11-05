import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().finite().positive().max(1_000_000_000),
  category: z.string().trim().min(1).max(40),
  date: z.iso.datetime(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().max(240).default(""),
});

export const categories = [
  "Food",
  "Salary",
  "Utilities",
  "Entertainment",
  "Transport",
  "Shopping",
  "Health",
  "Housing",
  "Other",
] as const;
