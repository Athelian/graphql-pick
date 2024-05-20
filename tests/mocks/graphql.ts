import { addMocksToSchema } from "@graphql-tools/mock";
import { makeExecutableSchema } from "@graphql-tools/schema";

const typeDefs = `
  union OrganizationPayload = BadRequest | Forbidden | Organization

  type BadRequest {
    reason: String!
  }

  type Forbidden {
    reason: String!
  }

  type Organization {
    id: ID!
    name: String!
    users: [User]
  }

  type User {
    id: ID!
    name: String!
    age: Int
    organization: OrganizationPayload
    previousOrganization: OrganizationPayload
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
        age: 30,
        organization: {
          __typename: "Organization",
          id: "1",
          name: "Acme Inc.",
          users: [
            {
              id: "1",
              name: "John Doe",
              age: 30,
              organization: {
                __typename: "Organization",
                id: "1",
                name: "Acme Inc."
              }
            }
          ]
        },
        previousOrganization: {
          __typename: "Organization",
          id: "1",
          name: "Acme Inc."
        }
      };
    },
    users: () => {
      return [
        {
          id: "1",
          name: "John Doe",
          age: 30,
          organization: {
            __typename: "Organization",
            id: "1",
            name: "Acme Inc."
          }
        },
        {
          id: "2",
          name: "Jane Smith",
          age: 26,
          organization: {
            __typename: "Organization",
            id: "2",
            name: "Globex Corp."
          }
        }
      ];
    }
  },
  OrganizationPayload: {
    __resolveType(obj: any) {
      return "Organization";
    }
  }
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: [resolver],
  resolverValidationOptions: {
    requireResolversForResolveType: "error"
  }
});

const schemaWithMocks = addMocksToSchema({ schema, preserveResolvers: true });

export default schemaWithMocks;
