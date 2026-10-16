import * as categoryService from "../services/categoryService.js";
import { buildMasterDataRouter } from "./masterDataRouter.js";
import { nameBody } from "../validation/schemas.js";

export default buildMasterDataRouter({
  label: "Categories",
  bodySchema: nameBody,
  list: () => categoryService.getAllCategories(),
  create: (body) => categoryService.createCategory(body),
  update: (id, body) => categoryService.updateCategory(id, body),
  remove: (id) => categoryService.deleteCategory(id),
});
