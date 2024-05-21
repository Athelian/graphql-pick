import {
  ALIAS_DELIMITER,
  PATH_SEPARATOR,
  TYPE_CONDITION_DELIMITER
} from "./config/constants.js";
import configManager from "./config/index.js";

import {
  wrapAliasPath,
  wrapFragmentPath,
  wrapTypeConditionPath
} from "./utils/index.js";

import pick from "./pick.js";

const init: typeof configManager.init = (schema, options) => {
  configManager.init(schema, options);
};

const reset: typeof configManager.reset = () => {
  configManager.reset();
};

export {
  ALIAS_DELIMITER,
  PATH_SEPARATOR,
  TYPE_CONDITION_DELIMITER,
  init as initPick,
  reset as resetPick,
  wrapAliasPath,
  wrapFragmentPath,
  wrapTypeConditionPath
};
export default pick;
