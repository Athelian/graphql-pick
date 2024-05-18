import { addMocksToSchema } from "@graphql-tools/mock";
import { makeExecutableSchema } from "@graphql-tools/schema";

// Fill this in with the schema string
const typeDefs = `
  union OrganizationPayload = BadRequest | Organization

  type BadRequest {
    reason: String!
  }

  type Organization {
    id: ID!
    name: String!
  }

  type User {
    id: ID!
    name: String!
    age: Int
    organization: OrganizationPayload
  }

  type Query {
    user: User
    users: [User]
  }
`;

const resolver = {
  Query: {
    user: () => {
      return {
        id: "1",
        name: "John Doe",
        organization: {
          __typename: "Organization",
          id: "1",
          name: "Acme Inc."
        }
      };
    }
  },
  OrganizationPayload: {
    __resolveType(obj: any) {
      return "Organization";
    }
  }
};

// Make a GraphQL schema with no resolvers
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: [resolver],
  resolverValidationOptions: {
    requireResolversForResolveType: "error"
  }
});

// Create a new schema with mocks
const schemaWithMocks = addMocksToSchema({ schema, preserveResolvers: true });

export default schemaWithMocks;
