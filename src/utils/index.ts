import {
  ALIAS_DELIMITER,
  ALIAS_MATCHER,
  FRAGMENT_DELIMITER,
  PATH_SEPARATOR,
  TYPE_CONDITION_DELIMITER
} from "../config/constants.js";

//
export function splitPath(path: string) {
  return path.split(PATH_SEPARATOR);
}

export function splitPaths(paths: string[]) {
  return paths.map(splitPath);
}

//
export function isAliasPath(path: string) {
  return path.startsWith(TYPE_CONDITION_DELIMITER);
}

export function hasAliasPath(paths: string[]) {
  return paths.some(isTypeConditionPath);
}

export function normalizeAliasPath(path: string) {
  return path.replace(ALIAS_MATCHER, "");
}

export function parseAliasPath(path: string) {
  return path.match(ALIAS_MATCHER)?.[1];
}

export function wrapAliasPath(alias: string, field: string) {
  return `${ALIAS_DELIMITER}${alias}_${field}`;
}

export function getAliasPaths(paths: string[]) {
  return paths.filter(isAliasPath).map(parseAliasPath);
}

//
export function isTypeConditionPath(path: string) {
  return path.startsWith(TYPE_CONDITION_DELIMITER);
}

export function hasTypeConditionPath(paths: string[]) {
  return paths.some(isTypeConditionPath);
}

export function parseTypeConditionPath(path: string) {
  return path.slice(TYPE_CONDITION_DELIMITER.length);
}

export function wrapTypeConditionPath(type: string) {
  return `${TYPE_CONDITION_DELIMITER}${type}`;
}

export function getTypeConditionPaths(paths: string[]) {
  return paths.filter(isTypeConditionPath).map(parseTypeConditionPath);
}

//
export function isFragmentPath(path: string) {
  return path.startsWith(FRAGMENT_DELIMITER);
}

export function hasFragmentPath(paths: string[]) {
  return paths.some(isFragmentPath);
}

export function parseFragmentPath(path: string) {
  return path.slice(FRAGMENT_DELIMITER.length);
}

export function wrapFragmentPath(fragment: string) {
  return `${FRAGMENT_DELIMITER}${fragment}`;
}

export function getFragmentPaths(paths: string[]) {
  return paths.filter(isFragmentPath).map(parseFragmentPath);
}
