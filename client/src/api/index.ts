import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

import { TypedTypePolicies } from "@/api/apollo-helpers.generated.ts";
import { GRAPHQL_ENDPOINT, GRAPHQL_WS_ENDPOINT } from "@/settings";

export * from "./operations.generated";

const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_ENDPOINT
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

const typePolicies: TypedTypePolicies = {
  Room: {
    fields: {
      users: { merge: false },
      chatHistory: { merge: false }
    }
  },
  User: {
    // A user has independent vote, chat, reaction, and display-name state in
    // each room. Keeping users embedded prevents Apollo from merging two room
    // memberships that happen to share the same user UUID.
    keyFields: false
  }
};

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({ typePolicies })
});
