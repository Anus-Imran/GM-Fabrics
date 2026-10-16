import * as expenseService from "../services/expenseService.js";
import { buildMasterDataRouter } from "./masterDataRouter.js";
import { nameBody } from "../validation/schemas.js";

export default buildMasterDataRouter({
  label: "Expense categories",
  bodySchema: nameBody,
  list: () => expenseService.getAllExpenseCategories(),
  create: (body) => expenseService.createExpenseCategory(body.name),
  update: (id, body) => expenseService.updateExpenseCategory(id, body.name),
  remove: (id) => expenseService.deleteExpenseCategory(id),
});
