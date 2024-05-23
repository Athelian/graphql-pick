# graphql-pick

Build dynamic GraphQL queries from your schema using a list of paths e.g.
 `["path.to.field", "path.to.another.field"]`.

 Given the schema
```gql
# schema.graphql
type User {
  name: String!
}

type Query {
  currentUser: User!
}
```
Lookup `currentUser`'s name:
```js
// index.js
import { print } from "graphql"

const query = pick(["currentUser.name"])

console.log(print(query))

// output
"query currentUser_query {
  currentUser {
    name
  }
}"

```

## Motivation
There are times when you may not be able to predict you application's data requirements at build time. For example when it depends on a piece of state.

While you can construct query strings by hand, this method is error prone and cumbersome to maintain. Alternatively you could use [GraphQL directives](https://graphql.org/learn/queries/#directives), but for the complex cases, `graphql-pick` takes center stage. 

`graphql-pick` provides a robust method for query document generation. By traversing your schema, it guarantees that any output you generate is valid on the server.

## Usage

### Quick start

Assuming you have a schema of the form:

```gql
type User {
  name: String!
}

type Query {
  currentUser: User!
}
```
at the root of your application, initialize `graphql-pick`.

```js
import { initPick } from 'graphql-pick'

initPick(schema)
```

Then in your components, use `pick` to generate queries

```js
import pick from 'graphql-pick'

const query = pick(["currentUser.name"])
```

### With Fragments
If you wish to attach static fragment definitions to your queries, load them in during initialization.

```js
import { initPick } from 'graphql-pick'
import userNameFragment from './fragment.userNameFragment.graphql'

initPick(schema, { fragments: [userNameFragment] })
```
Then in your components, include the fragment name in your path.

```js
import pick, { wrapFragment } from 'graphql-pick'

// directly
const query = pick(["currentUser.__fragment_userNameFragment"])
// with utility
const theSameQuery = pick([`currentUser.${wrapFragment("userNameFragment")}`])
```

### With Aliases
```js
import pick, { wrapAlias } from 'graphql-pick'

// directly
const query = pick(["currentUser.__alias_fullname_name"])
// with utility
const theSameQuery = pick([`currentUser.${wrapAlias("fullname", "name")}`])
```

