# n8n-nodes-teepublic

Automation nodes for n8n that talk to the TeePublic seller portal with raw HTTP requests. The node forwards your browser cookie (and optional proxy) so you can synchronize orders, publish designs, and reconcile payouts without reverse-engineering the full API surface.

## Features

- **Cookie-based authentication** – Drop in the session cookie captured from the TeePublic seller dashboard; the node mirrors browser headers when talking to private endpoints.
- **Proxy aware** – Route every call through datacenter proxies or VPN gateways to emulate the network path that TeePublic expects.
- **Unified resources** – Orders, designs, and payouts live in one node so you can chain operations without juggling multiple credentials.
- **Custom endpoints** – Override the default REST path to replay any TeePublic network request directly from n8n.

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` (powered by `@n8n/node-cli`) builds the TeePublic node, launches n8n at `http://localhost:5678`, and hot-reloads on save.

## Configure credentials

1. Open **Credentials → New → TeePublic API** inside n8n.
2. Fill in:
   - **Base URL** – usually `https://www.teepublic.com`.
   - **Session Cookie** – copy the entire `Cookie` header (look for `_teepublic_session`) from an authenticated browser tab.
   - **Proxy** (optional) – e.g., `http://user:pass@proxy-host:8080`.
3. Reference the credential in your TeePublic node. Every HTTP request now carries the cookie + proxy config automatically.

## Resources & operations

| Resource | Operations | Notes |
| --- | --- | --- |
| Orders | List, Get, Sync/Upsert | Pull new orders, fetch a specific order, or push fulfillment/tracking payloads. |
| Designs | List, Get, Sync/Upsert | Manage design metadata (tags, visibility, availability) using the same payload structure as the seller UI. |
| Payouts | List, Get | Retrieve ledger entries or inspect a payout by ID for accounting workflows. |

Each operation exposes:

- `Additional Query Parameters` for filters like `status=pending` or `updated_after`.
- `Payload` editor (for sync) to send raw JSON exactly as TeePublic expects.
- `Custom Endpoint` override when you need an undocumented URL.
- `Raw Output` toggle to inspect the full HTTP response for debugging.

## Example workflow

1. **Cron** – run every hour.
2. **TeePublic (Orders → List)** – filter `status=pending`.
3. **Item Lists → Split in Batches** – iterate.
4. **HTTP Request (3PL)** – forward order data to your fulfillment partner.
5. **TeePublic (Orders → Sync)** – post tracking numbers back using the same cookie-authenticated session.

Because the node pipes HTTP traffic through your cookie + proxy, TeePublic treats the call like it originated from your seller dashboard—perfect for private endpoints used to manage orders, designs, and payouts.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Build, watch, and launch n8n with the TeePublic node loaded. |
| `npm run build` | Compile TypeScript to `dist/` for publishing. |
| `npm run build:watch` | Incremental TypeScript build loop. |
| `npm run lint` | Run the `@n8n/node-cli` ESLint preset. |
| `npm run lint:fix` | Fix lint errors when possible. |
| `npm run release` | Release flow powered by `n8n-node release` + `release-it`. |

## Roadmap

1. Map every TeePublic seller endpoint with ready-made payload templates.
2. Add webhook/polling helpers once TeePublic exposes official hooks.
3. Bundle advanced recipes (auto-relisting designs, payout alerts, bulk order exports).

## License

MIT – feel free to extend the nodes and publish improvements back to the community.
