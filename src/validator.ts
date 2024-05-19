import { getOptions } from "./config";
import {
  UnmatchedFragmentDefinitionError,
  UnspecifiedSelectionsError
} from "./errors/public";

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
  const options = getOptions();

  const pickedFragments = fieldPaths.flatMap((fp) =>
    fp.split(".").filter((p) => p.startsWith("__"))
  );

  if (!pickedFragments.length) {
    return;
  }

  if (!options.fragments) {
    throw new UnmatchedFragmentDefinitionError();
  }

  const loadedFragments = options.fragments.map((f) => f.name.value);

  if (!pickedFragments.some((pf) => loadedFragments.includes(pf.slice(2)))) {
    throw new UnmatchedFragmentDefinitionError();
  }
}
