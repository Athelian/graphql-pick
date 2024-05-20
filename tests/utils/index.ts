import { GraphQLSchema, graphql } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";

export function getResponse(
  schemaWithMocks: GraphQLSchema,
  ast: any,
  variableValues?: Maybe<{
    readonly [variable: string]: unknown;
  }>
) {
  return graphql({
    schema: schemaWithMocks,
    source: ast,
    variableValues
  });
}
