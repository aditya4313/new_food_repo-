# Food App — Full Project Guide (Charts + Explanation)

Yeh document tumhare **ReactFood** project ko start se end tak explain karta hai — architecture, files, data flow, aur charts ke saath. Interview prep ke liye [`INTERVIEW.md`](INTERVIEW.md) alag rakho; yahan focus **samajhna aur visualize karna** hai.

---

## 1. Project kya hai?

Ek **full-stack food ordering web app** jisme:

- User restaurant ki **menu list** dekhta hai
- Dishes **cart** mein add/remove karta hai
- **Checkout form** bhar ke order place karta hai
- Order **backend** par save hota hai (JSON file)

| Part | Technology | Port |
|------|------------|------|
| Frontend (UI) | React 19 + Vite | ~5173 |
| Backend (API) | Node.js + Express 4 | 3000 |
| Storage | JSON files on disk | — |

**Nahi hai is app mein:** login, payment gateway, React Router pages, order history screen, real database.

---

## 2. High-level architecture

```mermaid
flowchart TB
  subgraph browser [Browser]
    UI[React SPA]
    CartState[CartContext]
    ModalState[UserProgressContext]
    UI --> CartState
    UI --> ModalState
  end

  subgraph vite [Vite Dev Server]
    Bundle[src/ components bundled]
  end

  subgraph express [Express Server port 3000]
    API[app.js]
    Static[public/ images]
    API --> Static
  end

  subgraph disk [File System]
    MealsJSON[available-meals.json]
    OrdersJSON[orders.json]
  end

  UI -->|GET /meals POST /orders| API
  UI -->|GET /images/...| Static
  API --> MealsJSON
  API --> OrdersJSON
  vite --> UI
```

**Simple words:** Browser mein React chalta hai. API calls Express server par jaati hain. Server JSON files padhta/likhta hai. Images `public/` folder se aati hain.

---

## 3. Folder structure

```
foodapp/
├── index.html              # HTML shell + #root + #modal
├── package.json            # Frontend deps (React, Vite)
├── vite.config.js
├── src/
│   ├── main.jsx            # App entry
│   ├── App.jsx             # Providers + main layout
│   ├── index.css           # All styles
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Meals.jsx
│   │   ├── MealItem.jsx
│   │   ├── Cart.jsx
│   │   ├── CartItem.jsx
│   │   ├── Checkout.jsx
│   │   ├── Error.jsx
│   │   └── UI/             # Modal, Button, Input
│   ├── store/
│   │   ├── CartContext.jsx
│   │   └── UserProgressContext.jsx
│   ├── hooks/
│   │   └── useHttp.js
│   └── util/
│       └── formatting.js
└── backend/
    ├── app.js              # Entire API server
    ├── package.json
    └── data/
        ├── available-meals.json
        └── orders.json
```

---

## 4. Component tree (React)

```mermaid
flowchart TD
  Main[main.jsx StrictMode]
  App[App.jsx]

  subgraph providers [Context Providers]
    UPC[UserProgressContextProvider]
    CPC[CartContextProvider]
  end

  Header[Header]
  Meals[Meals]
  Cart[Cart]
  Checkout[Checkout]

  subgraph mealsChildren [Meals children]
    MealItem[MealItem x N]
  end

  subgraph cartChildren [Cart children]
    CartItem[CartItem x N]
    ModalCart[Modal]
  end

  subgraph checkoutChildren [Checkout children]
    ModalCheckout[Modal]
    Form[Form + Inputs]
    ErrorComp[Error]
  end

  Main --> App
  App --> UPC --> CPC
  CPC --> Header
  CPC --> Meals
  CPC --> Cart
  CPC --> Checkout
  Meals --> MealItem
  Cart --> ModalCart
  Cart --> CartItem
  Checkout --> ModalCheckout
  Checkout --> Form
  Checkout --> ErrorComp
```

Har box ek `.jsx` file hai. **Cart** aur **Checkout** hamesha mount rehte hain lekin modal `open` prop se dikhte/chupte hain.

---

## 5. User journey (step by step)

```mermaid
flowchart LR
  A[Open App] --> B[Meals Load]
  B --> C[Browse Menu]
  C --> D[Add to Cart]
  D --> E{More items?}
  E -->|Yes| C
  E -->|No| F[Click Cart in Header]
  F --> G[Cart Modal]
  G --> H[+/- quantity]
  H --> I[Go to Checkout]
  I --> J[Fill Form]
  J --> K[Submit Order]
  K --> L{Valid?}
  L -->|No| M[Show Error]
  M --> J
  L -->|Yes| N[Success Modal]
  N --> O[Cart Cleared]
```

---

## 6. Complete request flow (technical)

```mermaid
sequenceDiagram
  participant U as User
  participant M as Meals.jsx
  participant H as useHttp
  participant E as Express
  participant F as JSON Files

  Note over U,F: Phase 1 - Load Menu
  U->>M: Page load
  M->>H: useHttp GET /meals
  H->>E: fetch localhost:3000/meals
  E->>F: read available-meals.json
  F-->>E: JSON string
  E-->>H: 200 array
  H-->>M: data + isLoading false
  M-->>U: Show meal cards

  Note over U,F: Phase 2 - Add to Cart (no API)
  U->>M: Click Add to Cart
  M->>M: CartContext addItem

  Note over U,F: Phase 3 - Place Order
  U->>M: Submit checkout form
  M->>H: sendRequest POST body
  H->>E: POST /orders
  E->>E: validate 1s delay
  E->>F: read orders.json push write
  E-->>H: 201 message
  H-->>M: data set
  M-->>U: Success modal
```

---

## 7. State management — do contexts

```mermaid
flowchart TB
  subgraph cartCtx [CartContext - useReducer]
    State["state: { items: [] }"]
    ADD[ADD_ITEM]
    REM[REMOVE_ITEM]
    CLR[CLEAR_CART]
    ADD --> State
    REM --> State
    CLR --> State
  end

  subgraph progressCtx [UserProgressContext - useState]
    Prog["progress: '' | 'cart' | 'checkout'"]
    showCart[showCart]
    showCheckout[showCheckout]
    hide[hideCart / hideCheckout]
    showCart --> Prog
    showCheckout --> Prog
    hide --> Prog
  end

  Header --> cartCtx
  Header --> progressCtx
  MealItem --> cartCtx
  Cart --> cartCtx
  Cart --> progressCtx
  Checkout --> cartCtx
  Checkout --> progressCtx
```

| Context | Storage | Purpose |
|---------|---------|---------|
| `CartContext` | `useReducer` | Cart items + quantity |
| `UserProgressContext` | `useState('')` | Kaun sa modal khula hai |

**Kyun alag?** Cart = **data**. Progress = **UI step**. Mix kar sakte the, alag rakhne se code clear rehta hai.

---

## 8. Cart reducer flow

```mermaid
flowchart TD
  Start[User action] --> A{Action type?}

  A -->|ADD_ITEM| B{Item id exists?}
  B -->|Yes| C[quantity + 1]
  B -->|No| D[Push new item qty 1]
  C --> E[New items array]
  D --> E

  A -->|REMOVE_ITEM| F{quantity > 1?}
  F -->|Yes| G[quantity - 1]
  F -->|No| H[Remove from array]
  G --> E
  H --> E

  A -->|CLEAR_CART| I[items = empty array]
  I --> E

  E --> R[Re-render consumers]
```

**File:** [`src/store/CartContext.jsx`](src/store/CartContext.jsx)

---

## 9. Modal system

```mermaid
flowchart LR
  subgraph html [index.html]
    Root["#root"]
    ModalDiv["#modal"]
  end

  subgraph react [React]
    AppContent[Header Meals Cart Checkout]
    Portal[createPortal dialog]
  end

  Root --> AppContent
  ModalDiv --> Portal
  Portal -->|open=true| Show[showModal]
  Portal -->|open=false| Hide[close]
```

- **`<dialog>`** — browser ka native modal (accessibility better)
- **`createPortal`** — modal HTML `#modal` div mein render, `#root` ke bahar
- **`UserProgressContext.progress`** — `Cart` aur `Checkout` alag modals, alag `open` condition

---

## 10. `useHttp` hook — API layer

```mermaid
flowchart TD
  Mount[Component mounts] --> Check{method GET or no config?}
  Check -->|Yes| Auto[sendRequest auto]
  Check -->|No| Wait[Wait for manual call]

  Auto --> Fetch[fetch url + config]
  Wait --> Manual[User calls sendRequest body]
  Manual --> Fetch

  Fetch --> Parse[response.json]
  Parse --> OK{response.ok?}
  OK -->|Yes| SetData[setData]
  OK -->|No| Throw[throw Error message]
  Throw --> SetErr[setError]
  SetData --> Done[isLoading false]
  SetErr --> Done
```

| Used in | URL | Method | Auto fetch? |
|---------|-----|--------|-------------|
| `Meals.jsx` | `/meals` | GET | Yes |
| `Checkout.jsx` | `/orders` | POST | No — form submit par |

**File:** [`src/hooks/useHttp.js`](src/hooks/useHttp.js)

---

## 11. Backend architecture

```mermaid
flowchart TD
  Req[Incoming Request] --> MW1[bodyParser.json]
  MW1 --> MW2[CORS headers middleware]
  MW2 --> Static{Static file?}
  Static -->|Yes| Pub[express.static public]
  Static -->|No| Route{Path?}

  Route -->|GET /meals| G1[Read available-meals.json]
  G1 --> Res1[res.json meals]

  Route -->|POST /orders| P1[Parse req.body.order]
  P1 --> P2[setTimeout 1s]
  P2 --> P3{Validate order + customer}
  P3 -->|Fail| Err400[400 + message]
  P3 -->|OK| P4[Add random id]
  P4 --> P5[Read orders.json push write]
  P5 --> Res201[201 Order created]

  Route -->|Other| NotFound[404 or OPTIONS 200]
```

**File:** [`backend/app.js`](backend/app.js) — poora server ek file mein.

---

## 12. API reference (quick)

### GET `/meals`

| | |
|--|--|
| **Response** | `200` — array of meal objects |
| **Source** | `backend/data/available-meals.json` |

**Meal object example:**
```json
{
  "id": "m1",
  "name": "Mac & Cheese",
  "price": "8.99",
  "description": "...",
  "image": "images/mac-and-cheese.jpg"
}
```

### POST `/orders`

| | |
|--|--|
| **Body** | `{ "order": { "items": [...], "customer": {...} } }` |
| **Success** | `201` — `{ "message": "Order created!" }` |
| **Errors** | `400` — missing items or customer fields |

**Saved order shape:**
```json
{
  "id": "877.051...",
  "items": [ { "id": "m1", "quantity": 2, ... } ],
  "customer": {
    "name": "...",
    "email": "...",
    "street": "...",
    "postal-code": "...",
    "city": "..."
  }
}
```

---

## 13. Checkout flow (detailed)

```mermaid
sequenceDiagram
  participant Form as Checkout Form
  participant Action as checkoutAction
  participant Hook as useHttp
  participant API as POST /orders
  participant Cart as CartContext

  Form->>Action: useActionState on submit
  Action->>Action: FormData to customer object
  Action->>Hook: sendRequest JSON order
  Hook->>API: POST body
  API-->>Hook: 201 or 400
  alt Success
    Hook-->>Form: data set
    Form-->>Form: Show Success Modal
    Form->>Cart: clearCart on Okay
  else Error
    Hook-->>Form: error message
    Form-->>Form: Show Error component
  end
```

**Important:** Form field `id` values (`name`, `email`, `postal-code`, etc.) backend validation se **match** hone chahiye.

---

## 14. File-by-file explanation

### Frontend core

| File | Kya karta hai |
|------|----------------|
| [`main.jsx`](src/main.jsx) | React app `#root` par mount, `StrictMode`, CSS import |
| [`App.jsx`](src/App.jsx) | Dono providers wrap karke 4 main components render |
| [`index.css`](src/index.css) | Dark theme, grid layout, modal/button styles |

### Components

| File | Kya karta hai |
|------|----------------|
| [`Header.jsx`](src/components/Header.jsx) | Logo, title, **Cart (N)** button — total quantity sum |
| [`Meals.jsx`](src/components/Meals.jsx) | API se meals fetch, loading/error, list render |
| [`MealItem.jsx`](src/components/MealItem.jsx) | Card: image, price, description, **Add to Cart** |
| [`Cart.jsx`](src/components/Cart.jsx) | Cart modal, items list, total, Go to Checkout |
| [`CartItem.jsx`](src/components/CartItem.jsx) | Single line: name, qty × price, +/− buttons |
| [`Checkout.jsx`](src/components/Checkout.jsx) | Form, POST order, success/error UI |
| [`Error.jsx`](src/components/Error.jsx) | Red error box with title + message |
| [`Modal.jsx`](src/components/UI/Modal.jsx) | Portal + `<dialog>` |
| [`Button.jsx`](src/components/UI/Button.jsx) | Reusable button |
| [`Input.jsx`](src/components/UI/Input.jsx) | Label + input, `name={id}` for FormData |

### State & utilities

| File | Kya karta hai |
|------|----------------|
| [`CartContext.jsx`](src/store/CartContext.jsx) | Cart reducer + Provider |
| [`UserProgressContext.jsx`](src/store/UserProgressContext.jsx) | Modal open/close state |
| [`useHttp.js`](src/hooks/useHttp.js) | fetch wrapper |
| [`formatting.js`](src/util/formatting.js) | USD currency formatter |

### Backend

| File | Kya karta hai |
|------|----------------|
| [`app.js`](backend/app.js) | Express server, CORS, routes, validation |
| [`available-meals.json`](backend/data/available-meals.json) | 20 meals — menu source |
| [`orders.json`](backend/data/orders.json) | Saare placed orders ka log |

---

## 15. Data flow summary (ek diagram)

```mermaid
flowchart LR
  subgraph fe [Frontend]
    UI2[UI Components]
    CC[CartContext]
    HC[useHttp]
    UI2 <--> CC
    UI2 --> HC
  end

  subgraph be [Backend]
    EX[Express]
    MJ[meals.json]
    OJ[orders.json]
    EX <--> MJ
    EX <--> OJ
  end

  HC <-->|REST JSON| EX
```

| Data | Direction | When |
|------|-----------|------|
| Meals list | Backend → Frontend | App load |
| Cart items | Memory only | Add/remove — no API |
| Order | Frontend → Backend | Checkout submit |
| Images | Backend static | Each meal card |

---

## 16. CORS — kyun zaroori hai

```mermaid
flowchart LR
  FE["Frontend origin localhost:5173"]
  BE["Backend origin localhost:3000"]

  FE -->|Browser blocks without CORS| X[Blocked]
  FE -->|With Access-Control-Allow-Origin| BE
```

Browser **different ports** ko different origins maanta hai. Express middleware har response par headers set karta hai taaki frontend `fetch` kar sake.

---

## 17. Kaise run karein

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm start
```
Server: `http://localhost:3000`

**Terminal 2 — Frontend:**
```bash
npm install
npm run dev
```
App: `http://localhost:5173` (Vite default)

Dono ek saath chalne chahiye warna meals load nahi hongi.

---

## 18. Production vs current (honest picture)

```mermaid
quadrantChart
  title App maturity
  x-axis Low --> High
  y-axis Low --> High
  quadrant-1 Production ready
  quadrant-2 Good demo
  quadrant-3 Learning project
  quadrant-4 Needs rework
  CurrentApp: [0.35, 0.55]
  WithDB: [0.7, 0.75]
  WithAuth: [0.85, 0.8]
```

| Area | Abhi | Production mein |
|------|------|-------------------|
| Data | JSON files | PostgreSQL / MongoDB |
| Auth | None | JWT / sessions |
| Config | Hardcoded URLs | `.env` variables |
| Orders | Write-only | List, track, cancel APIs |
| Validation | Basic | Schema (Zod), server price check |
| Deploy | Local only | Vercel + Railway etc. |

---

## 19. Future improvements (roadmap)

```mermaid
flowchart TD
  Now[Current App] --> S1[Add .env API URL]
  S1 --> S2[Database for orders]
  S2 --> S3[React Router pages]
  S3 --> S4[Auth + user orders]
  S4 --> S5[Payment + admin panel]
```

---

## 20. Cheat sheet — yaad rakhne wali lines

1. **2 servers** — Vite (UI) + Express (API)  
2. **2 contexts** — Cart data + modal progress  
3. **2 APIs** — GET meals, POST orders  
4. **2 JSON files** — menu + orders  
5. **Cart** server par tab touch hota hai jab order submit ho  
6. **Modals** = `<dialog>` + portal + `UserProgressContext`  
7. **Custom hook** `useHttp` = fetch + loading + error  

---

## Related docs

- **[INTERVIEW.md](INTERVIEW.md)** — 70+ interview Q&A (short answers)
- **[README.md](README.md)** — default Vite readme

---

*Last updated for project structure: React 19, Vite 4, Express 4, JSON storage.*
