import { ASTNode, GraphQLSchema, graphql, print } from "graphql";

export function getResponse(schemaWithMocks: GraphQLSchema, ast: ASTNode) {
  return graphql({
    schema: schemaWithMocks,
    source: print(ast)
  });
}
