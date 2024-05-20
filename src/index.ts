import configManager from "./config/index.js";

import pick from "./pick.js";

const init: typeof configManager.init = (schema, options) => {
  configManager.init(schema, options);
};

const reset: typeof configManager.reset = () => {
  configManager.reset();
};

export { init as initPick, reset as resetPick };
export default pick;
