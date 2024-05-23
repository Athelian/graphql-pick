import { DocumentNode, FragmentDefinitionNode } from "graphql";

type TransformedOptionKeys = keyof Pick<Options, "fragments">;

export interface Options {
  fragments?: DocumentNode[];
}

export interface ValidatedOptions extends Omit<Options, TransformedOptionKeys> {
  fragments?: (Omit<DocumentNode, "definitions"> & {
    definitions: ReadonlyArray<FragmentDefinitionNode>;
  })[];
}

export interface ParsedOptions extends Omit<Options, TransformedOptionKeys> {
  fragments?: FragmentDefinitionNode[];
}
