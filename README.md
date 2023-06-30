# README

This is a proof of concept (POC) of code sharing in Redwood projects.
This is based on the work done by all the great developers at [Snaplet](https://www.snaplet.dev/).

Code sharing means what it says, but it doesn't hurt to be a little more specific.
By code sharing, I mean having code that can be shared between the api and web sides.
Right now, Redwood has no opnion on how this is done nor does it have any facilities to make it happen.

This POC relies on several 1) preview and 2) experimental features to make it happen:
- Vite for the web side (preview) and [Vite Node](https://www.npmjs.com/package/vite-node) for the api side (very experimental)
- The server file (experimental)
- ESM in Redwood projects (very experimental)

First, some caveats:
- I haven't tried deploying this; I'm not even sure how the shared code should be built.

Without belabouring it too much, this is more-or-less the way it works:

- This project is on the v6 canary; it may not work with earlier versions
- Code that's meant to be shared goes into a package in the `packages` directory. For example, this repo has a package called `@jtoar/sdk` in the `packages/sdk` directory.
  - The project-level package.json needs to be configured to recognize this new directory as a workspace:

    ```json
    // package.json
    // ...
    "workspaces": {
      "packages": [
        "api",
        "web",
        "packages/*" // 👈
      ]
    },
    // ...
    ```

- The sides that want to use the code from the shared package (which should be both the api and web sides) should list the package as a dependency in their workspace using [yarn's workspace resolution](https://yarnpkg.com/features/workspaces#workspace-ranges-workspace):

  ```json
  // api/package.json
  // ...
  "dependencies": {
    "@jtoar/sdk": "workspace:*", // 👈
    // ...
  }
  // ...
  ```

  ```json
  // web/package.json
  // ...
  "dependencies": {
    "@jtoar/sdk": "workspace:*", // 👈
    // ...
  },
  // ...
  ```

- Vite and TS config files are configured to understand a custom import condition, "development", which points straight to a TS file. This lets the api and web side import from the shared-code package without it having to be built, making for a super slick DX. (When it works.)
- The package containing shared code must list the "development" exports first—it's imperative that it's first:

  ```json
  // packages/sdk/package.json
  // ...
  "exports": {
    ".": {
      "development": "./src/index.ts", 👈 Must come first
      "require": "./dist/index.js",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  ```

  > Vite has a list of "allowed conditions" and will match the first condition that is in the allowed list
  >
  > Source: https://vitejs.dev/config/shared-options.html#resolve-conditions.

- The api side dev server must be started using vite-node, like this:

  ```
  vite-node --watch api/src/server.mts
  ```

- The server file must be ESM for hot reloading to work:

  ```ts
  if (import.meta.hot) {
    import.meta.hot.on("vite:beforeFullReload", async () => {
      await fastify.close()
    });
  }
  ```
