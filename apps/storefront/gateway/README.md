# storefront-gateway

The Apollo Federation Gateway for the **storefront** product, created
automatically the first time one of storefront's GraphQL services is
generated with `--product=storefront --gateway=new`.

Composes every registered subgraph (see `src/subgraphs.json`, edited by
`nx g graphql-service ... --product=storefront --gateway=new|existing` —
never by hand) into one supergraph via `IntrospectAndCompose`. Each
subgraph's URL can be overridden at runtime via `<SUBGRAPH_NAME>_SERVICE_URL`
env vars without a rebuild — see `src/subgraphs.ts`.

Scoped to this product only — a service belonging to a different product
has its own separate gateway, never this one.

`nx serve storefront-gateway`
