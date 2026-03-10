import { createToastController } from "./controller/createToastController";

export {
  createToastController,
  getToastControllerScope,
  subscribeToToastCommands,
} from "./controller/createToastController";
export { createToastController as createToastScope } from "./controller/createToastController";
export { createToastController as createScopedToast } from "./controller/createToastController";
export const toast = createToastController();
