import { getOptions, getSchema } from "./config";

export default function assertValidPick(fieldPaths: string[]) {
  assertValidSelections(fieldPaths);
  assertValidPickedFragments(fieldPaths);
}

function assertValidSelections(fieldPaths: string[]) {
  if (!fieldPaths.length) {
    throw new Error();
  }
}

function assertValidPickedFragments(fieldPaths: string[]) {
  const schema = getSchema();
  const options = getOptions();

  const pickedFragments = fieldPaths.flatMap((fp) =>
    fp.split(".").filter((p) => p.startsWith("__"))
  );

  if (!pickedFragments.length) {
    return;
  }

  if (!options.fragments) {
    throw new Error();
  }

  const loadedFragments = options.fragments.map((f) => f.name.value);

  if (
    loadedFragments.some((lf) => pickedFragments.some((pf) => pf.includes(lf)))
  ) {
    throw new Error();
  }
}
