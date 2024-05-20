import { buildOperationNodeForField } from "@graphql-toolkit/common";
import { DocumentNode, FragmentDefinitionNode } from "graphql";

type TransformedOptionKeys = keyof Pick<Options, "fragments">;
type IntegratedBuildOperationNodeForFieldArgs = "circularReferenceDepth";

export interface Options {
  fragments?: DocumentNode[];
  /**
   * Ignore pattern for resolving type unions. You must
   * ensure that, for cases where your pattern is a hit with a union,
   * that it matches `(unionMembers.length) - 1` elements. This is
   * to ensure that the utility can unambiguously resolve the final `1`.
   */
  noResolve?: string[];
  buildOperationNodeForFieldArgs?: Pick<
    Parameters<typeof buildOperationNodeForField>[0],
    IntegratedBuildOperationNodeForFieldArgs
  >;
}

export interface ValidatedOptions extends Omit<Options, TransformedOptionKeys> {
  fragments?: (Omit<DocumentNode, "definitions"> & {
    definitions: ReadonlyArray<FragmentDefinitionNode>;
  })[];
}

export interface ParsedOptions extends Omit<Options, TransformedOptionKeys> {
  fragments?: FragmentDefinitionNode[];
}
