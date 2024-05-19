import configManager from "./src/config";

export { default } from "./src/pick";

const initGQLPick: typeof configManager.init = (schema, options) => {
  configManager.init(schema, options);
};

const resetGQLPick: typeof configManager.reset = () => {
  configManager.reset();
};

export { initGQLPick, resetGQLPick };
