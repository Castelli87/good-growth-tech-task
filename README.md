# Good Growth — Technical Task

## A Note Before I Start

I genuinely enjoyed this challenge. For me, the ability to debug confidently inside an unfamiliar codebase is one of the most valuable day-to-day engineering skills — it reduces dependency on others, accelerates onboarding, and builds a much clearer mental model of how a system actually works. This task was a good exercise in exactly that.

---

## Overview

This repository contains my investigation and implementation for the Good Growth technical challenge, based on the Wickes paint product listing page.

The task had two parts:
1. Identify which parts of the page are rendered server-side (SSR) vs client-side (CSR)
2. Add "Add to Basket" buttons to product cards that don't have them, using the existing Wickes cart system

---

## Part 1 — SSR vs CSR Investigation

The Wickes page uses a mix of SSR and CSR — a common pattern for performance and SEO. Server-rendered content arrives as fully-formed HTML, which means it's indexable and fast to paint. Client-rendered content loads after JavaScript runs, which allows for dynamic, personalised, or third-party data.

I used three techniques to separate the two:

**1. Network tab → DOC filter**
Filtering by `Doc` in the Network tab shows only the initial HTML document sent by the server. I used `Cmd+F` to search for specific strings (e.g. product titles) inside that document. If the text is there, it's SSR. If it's absent, it's loaded later by JavaScript.

**2. Elements panel vs View Source**
`View Source` (`Cmd+U`) shows the raw server response. The Elements panel shows the live DOM after JS runs. Anything present in Elements but absent in View Source is CSR.

**3. Disabling JavaScript**
Turning off JS in DevTools and reloading confirms what survives without a JS runtime — that content is purely SSR.

### Key Finding — Reviews are loaded from a third-party API

The review section was one of the clearest CSR examples. After page load, the browser fires a `GET` request to an external PowerReviews endpoint:

```
GET https://display.powerreviews.com/m/213541/l/en_GB/product/106981/reviews
    ?apikey=1b35c653-d908-40da-8502-29826432b7c8&_noconfig=true
```

This returns a JSON payload with ratings, review text, images, and metadata. The client then renders the review component from that data. None of this content exists in the initial HTML — the skeleton loader for the star ratings was the visual confirmation before I even opened the Network tab.

---

## Part 2 — Basket API

I triggered an "Add to Basket" on an existing Wickes product detail page while watching the Network tab filtered to `Fetch/XHR`. The outgoing request revealed the endpoint.

| Property | Value |
|---|---|
| Endpoint | `POST /cart/add` |
| Auth mechanism | CSRF token (required on every POST) |

### Request payload

```
productCodePost=106981
qty=1
targetProductCode=106981
CSRFToken=<token>
```

### CSRF token

The token is embedded in the page DOM as either a hidden `<input name="CSRFToken">` or a `<meta name="CSRFToken">`. It must be read from the live page and sent with every POST:

```js
const csrfToken =
  document.querySelector('input[name="CSRFToken"]')?.value ||
  document.querySelector('meta[name="CSRFToken"]')?.content;
```

### Response

The server returns a JSON object. The key field is `cartPopupHtml` — a pre-rendered HTML string for the mini basket drawer — which became central to the final implementation.

---

## Part 3 — Adding New Functionality

**Target page:** [wickes.co.uk — Wall & Ceiling Emulsion Paint listing](https://www.wickes.co.uk/Products/Painting+Decorating/Interior-Paint/Wall+Ceiling-Emulsion-Paint/c/1001115)

Before writing any code, I inspected the HTML structure of the product cards. Each card has a `data-product-code` attribute on the root element — the product SKU is already in the DOM, ready to use directly in the POST request.

### How I got to the final solution

**v1** — Injected a button, wired up the CSRF token, posted to `/cart/add`. The product was added but the basket drawer didn't open and the header counter didn't update.

**v2** — Tried fetching `/cart/enhancedMiniCart/SUBTOTAL/` after a successful add to refresh the count. It worked for some products but not all, so I ruled it out as unreliable.

**v3 (final)** — While inspecting the browser console after a native add-to-basket on the PDP, I found a `Wick` object on the global `window`:

```js
Wick.MiniBasketSlider.showProductAddedToCartSlider(data.cartPopupHtml)
```

This is Wickes' own internal function. It takes the `cartPopupHtml` from the API response and triggers the native slide-out basket drawer — identical to what happens when you click Add to Basket on a product page. No custom UI needed.

See [`script/AddingNewFunctionality.js`](script/AddingNewFunctionality.js) for the full implementation.

---

## Repository Structure

```
good-growth-tech-task/
├── README.md
├── script/
│   └── AddingNewFunctionality.js
└── assets/
    ├── SSR-CSR differences .jpg
    ├── URL SSR .jpg
    ├── Wickes-add-to-cart.jpg
    ├── Wickes-add-to-cart-payload.jpg
    ├── Wickes-skeleton-review.png
    ├── add-to-cart-response.jpg
    ├── reviews-response.jpg
    └── wickes-SSR-explanation.png
```
