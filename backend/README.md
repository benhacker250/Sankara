# Forma API

The API stores products and orders in `backend/data/store.json` and creates the
initial collection on first start. Product prices are recalculated on the
server when a customer sends an order; the browser cannot set order totals.

## Run locally

Use Node.js 20.12 or newer. The server loads a local `.env` file automatically.
The workspace includes a
   private, gitignored `.env` with the requested studio account. To change it,
   edit `.env`; use `.env.example` as a reference for the supported settings.
   Set a long, random JWT secret for deployments and keep the file private.
2. Run `npm run dev` from the `backend` directory. The API listens on port 3001
   by default.
3. Run `npm run dev` from `frontend`. The storefront expects the API at
   `http://localhost:3001`; set `VITE_API_URL` to override it.

`ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` are required. The admin
session uses a signed token that expires after eight hours. Product creation,
editing, deletion, order listing, and order approval are protected by
administrator authorization. Customers can submit orders for review, but only
an authenticated administrator can approve them.

Checkout requires the customer's name, email, country or region, and town or
city. The selected location is stored with the order and shown in the admin
order approvals.

The authenticated admin studio also includes a read-only order report with
approval and approved-revenue summaries. Admins can print the report from the
Reports tab.

The Reports tab also manages inventory. Existing products without a stock
count start at zero and remain unavailable for checkout until stock is
recorded. Admins can record stock-in and stock-out movements with a reason;
successful customer orders automatically deduct stock and are recorded as
stock-out movements. The report displays current stock and movement history.

Set `STORE_FILE` to use a different JSON file for the store data.
