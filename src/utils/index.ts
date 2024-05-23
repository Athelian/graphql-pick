import {
  ALIAS_DELIMITER,
  ALIAS_MATCHER,
  FRAGMENT_DELIMITER,
  PATH_SEPARATOR
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
  return path.startsWith(ALIAS_DELIMITER);
}

export function hasAliasPath(paths: string[]) {
  return paths.some(isAliasPath);
}

export function parseAliasPath(path: string) {
  return path.match(ALIAS_MATCHER)?.[1];
}

export function wrapAliasPath(alias: string, field: string) {
  return `${ALIAS_DELIMITER}${alias}_${field}`;
}

export function normalizeAliasPath(path: string) {
  return path.replace(ALIAS_MATCHER, "");
}

export function getAliasPaths(paths: string[]) {
  return paths.filter(isAliasPath).map(parseAliasPath);
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
