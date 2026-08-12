# gateway

The Apollo Federation Gateway, created automatically the first time a
GraphQL service is generated with `--gateway=new`.

Composes every registered subgraph (see `src/subgraphs.json`, edited by
`nx g graphql-service ... --gateway=new|existing` — never by hand) into one
supergraph via `IntrospectAndCompose`. Each subgraph's URL can be
overridden at runtime via `<SUBGRAPH_NAME>_SERVICE_URL` env vars without a
rebuild — see `src/subgraphs.ts`.

`nx serve gateway`
