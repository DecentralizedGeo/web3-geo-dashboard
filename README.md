[![web3GeoDashboardDeploy](https://github.com/easierdata/web3-geo-dashboard/actions/workflows/main_branch.yml/badge.svg)](https://github.com/easierdata/web3-geo-dashboard/actions/workflows/main_branch.yml)
![Formatting](https://img.shields.io/badge/formatting-prettier-56b3b4.svg)
![Linting](https://img.shields.io/badge/linting-eslint-4c32bf.svg)
![UnitTesting](https://img.shields.io/badge/unit%20testing-vitest-ffce27.svg)
[![License](https://img.shields.io/:license-mit-blue.svg?style=flat-square)](https://badges.mit-license.org)

## Web3 Geospatial Dashboard

This project renders spatial geometry defined by GeoJSON assets and Web3 enriched STAC APIs. By default, The EASIER Data Initiative has opened up a STAC API with Landsat 9 metadata loaded. The motivation behind this project is to showcase how decentralized technology such as IPFS and Filecoin can cultivate an open ecosystem for data exploration and management. Coupled with other tools that complement this dashboard such as the chrome extension and IPFS-STAC, the suite of tools offer effortless integration to Python programs and other applications within the IPFS ecosystem.

> ⚠️ To achieve full functionality of this project, proper configuration of an IPFS Node and the complementary chrome extension is required.

## Useful Links

|                                   Name                                    | Description                                                       |
| :-----------------------------------------------------------------------: | ----------------------------------------------------------------- |
|        [Kubo RPC API](https://docs.ipfs.tech/reference/kubo/rpc/)         | Documentation for the API opened by IPFS nodes running Kubo       |
| [IPFS Desktop Installation](https://docs.ipfs.tech/install/ipfs-desktop/) | Installation for IPFS Desktop, to easily spin up an IPFS node     |
|  [Web3 Geo Extension](https://github.com/easierdata/web3-geo-extension)   | Repository of complementary dashboard chrome extension (REQUIRED) |
| [Web3 Dashboard API](https://github.com/easierdata/easier-dashboard-api)  | Repository of API that serves IPFS metadata                       |
|                    [VEDA Integration](./docs/veda.md)                     | Walkthrough of exporting NASA VEDA Frontmatter                    |

## Node Configuration

In order to properly fetch metadata from IPFS such as the number of nodes that have a CID pinned as well as other interactions, you must have a properly configured IPFS node. To accept requests from the dashboard, update the `Access-Control-Allow-Origin` array under `HTTPHeaders` under `API`. For local development, add `http://127.0.0.1`, alternatively, you can accept requests from everywhere with `*` (this poses a security risk, do it at your own discretion)

## Prerequisites

An access token is needed to access the Mapbox web service resources with scope permissions enabled for `styles:tiles` and `styles:read`.

1. Create a `.env` file in the project root with the following variables:

```shell
VITE_MAPBOX_TOKEN=<access token>
```

> NOTE: Details on creating tokens can be found [here](https://docs.mapbox.com/api/accounts/tokens/).

## Developing

Once you've cloned the project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```shell
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```shell
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Contributing

### Step 1

- **Option 1**

  - 🍴 Fork this repo!

- **Option 2**

  - 👯 Clone to your local machine using:
    `https://github.com/easierdata/web3-geo-dashboard.git`

### Step 2

- **HACK AWAY!** 🔨🔨🔨

### Step 3

- 🔃 Create a new pull request using:
  `<a href="https://github.com/easierdata/web3-geo-dashboard/compare" rel="noopener noreferrer" target="_blank">`
  `https://github.com/easierdata/web3-geo-dashboard/compare</a>`.

## Pre-commit Hooks

When running `npm install` the `prepare` script runs to install husky pre-commit hooks into `./husky/pre-commit`. Currently the hook automatically formats the code using prettier, then checks the code for linting issues. If there is a linting issue, it doesn't try to fix it. Instead, the commit fails with an error message.

If you want to make sure the pre-commit hooks are working, do the following

1. Stage some badly linted/formatted code
2. run `npx lint-staged`
   If there were only formatting issues, the hook will format your code and silently add it to the commit. If there were linting issues, the commit should fail.

## Testing and Coverage

Tests are located in `/test` and are using Vitetest. Please write at least one test per component. This way, we can do broad refactorings and find out very quickly what is broken.

```shell
npm run test
npm run coverage
```

## Runtime Requirements

For the optimal user experience, please download and configure the [complementary chrome extension](https://github.com/easierdata/web3-geo-extension) and configure it to point to your node.
