import { DocumentNode, FragmentDefinitionNode } from "graphql";

type ParsedOptionKeys = keyof Pick<Options, "fragments">;

export interface Options {
  fragments?: DocumentNode[];
  /**
   * Ignore pattern for resolving type unions. You must
   * ensure that, for cases where your pattern is a hit with a union,
   * that it matches `(unionMembers.length) - 1` elements. This is
   * to ensure that the utility can unambiguously resolve the final `1`.
   */
  noResolve?: string[];
}

export interface ParsedOptions extends Omit<Options, ParsedOptionKeys> {
  fragments?: FragmentDefinitionNode[];
}
