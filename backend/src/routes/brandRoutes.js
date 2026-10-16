import * as brandService from "../services/brandService.js";
import { buildMasterDataRouter } from "./masterDataRouter.js";
import { brandBody } from "../validation/schemas.js";

export default buildMasterDataRouter({
  label: "Brands",
  bodySchema: brandBody,
  list: () => brandService.getAllBrands(),
  create: (body) => brandService.createBrand(body),
  update: (id, body) => brandService.updateBrand(id, body),
  remove: (id) => brandService.deleteBrand(id),
});
