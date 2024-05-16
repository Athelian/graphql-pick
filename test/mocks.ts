import { addMocksToSchema } from "@graphql-tools/mock";
import { makeExecutableSchema } from "@graphql-tools/schema";

// Fill this in with the schema string
const typeDefs = `
  union OrganizationPayload = Organization | BadRequest

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

// Make a GraphQL schema with no resolvers
const schema = makeExecutableSchema({ typeDefs });

// Create a new schema with mocks
const schemaWithMocks = addMocksToSchema({ schema });

export default schemaWithMocks;
