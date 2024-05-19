import configManager from "./config";
import {
  UnmatchedFragmentDefinitionError,
  UnspecifiedSelectionsError
} from "./errors/public";
import { getFragmentPaths } from "./utils";

export default function assertValidPick(fieldPaths: string[]) {
  assertValidSelections(fieldPaths);
  assertValidPickedFragments(fieldPaths);
}

function assertValidSelections(fieldPaths: string[]) {
  if (!fieldPaths.length) {
    throw new UnspecifiedSelectionsError();
  }
}

function assertValidPickedFragments(fieldPaths: string[]) {
  const options = configManager.getOptions();

  const fragmentPaths = getFragmentPaths(fieldPaths).flat();

  if (!fragmentPaths.length) {
    return;
  }

  if (!options.fragments) {
    throw new UnmatchedFragmentDefinitionError();
  }

  const configuredFragments = options.fragments.map((f) => f.name.value);
  if (!fragmentPaths.some((pf) => configuredFragments.includes(pf))) {
    throw new UnmatchedFragmentDefinitionError();
  }
}
