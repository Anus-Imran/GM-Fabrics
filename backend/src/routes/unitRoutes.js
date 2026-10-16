import * as unitService from "../services/unitService.js";
import { buildMasterDataRouter } from "./masterDataRouter.js";
import { unitBody } from "../validation/schemas.js";

export default buildMasterDataRouter({
  label: "Units",
  bodySchema: unitBody,
  list: () => unitService.getAllUnits(),
  create: (body) => unitService.createUnit(body),
  update: (id, body) => unitService.updateUnit(id, body),
  remove: (id) => unitService.deleteUnit(id),
});
