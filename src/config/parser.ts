import { FragmentDefinitionNode, Kind } from "graphql";
import { Options, ParsedOptions } from "./types";

export function parseOptions(options: Options): ParsedOptions {
  return {
    ...options,
    fragments: options.fragments ? parseFragments(options.fragments) : undefined
  };
}

function parseFragments(fragments: NonNullable<Options["fragments"]>) {
  return fragments.flatMap((f) =>
    f.definitions.filter((d): d is FragmentDefinitionNode => {
      return d.kind === Kind.FRAGMENT_DEFINITION;
    })
  );
}
