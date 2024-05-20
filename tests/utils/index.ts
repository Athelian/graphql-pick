import { ASTNode, GraphQLSchema, graphql, print } from "graphql";
import { Maybe } from "graphql/jsutils/Maybe";

export function getResponse(
  schemaWithMocks: GraphQLSchema,
  ast: ASTNode,
  variableValues?: Maybe<{
    readonly [variable: string]: unknown;
  }>
) {
  return graphql({
    schema: schemaWithMocks,
    source: print(ast),
    variableValues
  });
}
