import { z } from "zod";

const positiveMoney = z.string()
  .trim()
  .regex(/^(?!0+(?:\.0{1,4})?$)\d{1,14}(?:\.\d{1,4})?$/, "Enter a positive amount with up to 4 decimal places");

export const transactionFormSchema = z.object({
  accountId: z.string().min(1, "Choose an account"),
  amount: positiveMoney,
  categoryId: z.string(),
  convertedAmount: z.string(),
  description: z.string().trim().max(500, "Keep the note under 500 characters"),
  kind: z.enum(["expense", "income", "transfer"]),
  toAccountId: z.string(),
  transactionAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Choose a date and time"),
}).superRefine((values, context) => {
  if (values.kind === "transfer") {
    if (!values.toAccountId) {
      context.addIssue({ code: "custom", message: "Choose a receiving account", path: ["toAccountId"] });
    } else if (values.toAccountId === values.accountId) {
      context.addIssue({ code: "custom", message: "Choose two different accounts", path: ["toAccountId"] });
    }
  } else if (!values.categoryId) {
    context.addIssue({ code: "custom", message: "Choose a category", path: ["categoryId"] });
  }
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function validateConvertedAmount(value: string): string | null {
  const result = positiveMoney.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message ?? "Enter the converted amount";
}
