import {
  FRAGMENT_DELIMITER,
  PATH_SEPARATOR,
  TYPE_CONDITION_DELIMITER
} from "../config/constants";

export function splitPath(path: string) {
  return path.split(PATH_SEPARATOR);
}

export function splitPaths(paths: string[]) {
  return paths.map(splitPath);
}

export function isTypeConditionPath(path: string) {
  return path.startsWith(TYPE_CONDITION_DELIMITER);
}

export function hasTypeConditionPath(paths: string[]) {
  return paths.some(isTypeConditionPath);
}

export function parseTypeConditionPath(path: string) {
  return path.slice(TYPE_CONDITION_DELIMITER.length);
}

export function getTypeConditionPath(path: string) {
  return isTypeConditionPath(path) ? parseTypeConditionPath(path) : null;
}

export function getTypeConditionPaths(paths: string[]) {
  return paths.filter(isTypeConditionPath).map(parseTypeConditionPath);
}

export function isFragmentPath(path: string) {
  return path.startsWith(FRAGMENT_DELIMITER);
}

export function hasFragmentPath(paths: string[]) {
  return paths.some(isFragmentPath);
}

export function parseFragmentPath(path: string) {
  return path.slice(FRAGMENT_DELIMITER.length);
}

export function getSomeFragmentPath(paths: string[]) {
  return getFragmentPaths(paths)[0];
}

export function getFragmentPaths(paths: string[]) {
  return paths.filter(isFragmentPath).map(parseFragmentPath);
}
