# API REST

Base URL: `http://<host>:<port>/api`

Por defecto en local: `http://localhost:3000/api`.

Toda la API va sobre HTTP plano (sin autenticación; está pensada para uso personal y despliegue en una red de confianza). Las peticiones pueden hacerse desde `curl`, JavaScript (`fetch`), Python (`requests`) o cualquier cliente HTTP. La API **no envía cabeceras CORS**: los navegadores bloquean lecturas desde otros orígenes, pero los clientes no-navegador funcionan sin cambios.

## Convenciones

### Códigos de estado

| Código | Significado |
|---|---|
| 200 | Operación exitosa con cuerpo de respuesta. |
| 201 | Recurso creado. Se devuelve el recurso en el cuerpo. |
| 400 | Cuerpo inválido (falla la validación Zod). El cuerpo devuelve un objeto `error` con código estable y mensaje. |
| 404 | Recurso no encontrado. El cuerpo devuelve `error.code = "ERR_NOT_FOUND"`. |
| 413 | Solo en `POST /api/import`: el cuerpo supera el límite de 5 MB. Devuelve `error.code = "ERR_IMPORT_TOO_LARGE"`. |
| 500 | Error inesperado del servidor. |

### Forma de las respuestas de error

Toda respuesta de error sigue esta forma estable:

```json
{
  "error": {
    "code": "ERR_REQUIRED_NAME",
    "message": "El nombre es obligatorio",
    "issues": [
      { "path": ["name"], "message": "El nombre es obligatorio", "code": "ERR_REQUIRED_NAME" }
    ]
  }
}
```

- `error.code` es **estable** y está pensado para integrarlo en tus traducciones o reglas (`ERR_REQUIRED_NAME`, `ERR_INVALID_URL`, …).
- `error.message` es un *fallback* legible en español (idioma de desarrollo original). El cliente web lo sobrescribe según el idioma activo.
- `error.issues` solo aparece en errores de validación (HTTP 400). Cada elemento menciona el campo (`path`), el mensaje y el código.

#### Códigos de error

| Código | Significado |
|---|---|
| `ERR_NOT_FOUND` | Recurso no encontrado (404). |
| `ERR_REQUIRED_NAME` | Falta el nombre del recurso. |
| `ERR_NAME_TOO_LONG` | Nombre demasiado largo. |
| `ERR_DESCRIPTION_TOO_LONG` | Descripción demasiado larga. |
| `ERR_NOTES_TOO_LONG` | Notas demasiado largas. |
| `ERR_INVALID_URL` | Enlace no es una URL válida. |
| `ERR_INVALID_DATE` | Fecha no tiene formato `YYYY-MM-DD`. |
| `ERR_INVALID_COLOR` | Color no es un hex de 6 dígitos. |
| `ERR_INVALID_CURRENCY` | Moneda no tiene 3 caracteres (ISO 4217). |
| `ERR_INVALID_PRIORITY` | Prioridad fuera del rango 0–3. |
| `ERR_INVALID_QUANTITY` | Cantidad no es positiva. |
| `ERR_STORE_TOO_LONG` | Nombre de tienda demasiado largo. |
| `ERR_UNIT_TOO_LONG` | Unidad demasiado larga. |
| `ERR_ICON_TOO_LONG` | Identificador de icono demasiado largo. |
| `ERR_PURCHASED_REQUIRED` | Falta el campo `purchased`. |
| `ERR_EMPTY_PATCH` | `PATCH` con cuerpo vacío. |
| `ERR_INVALID` | Error de validación genérico (no se pudo asociar a un código específico). |
| `ERR_INTERNAL` | Error inesperado del servidor (500). |

### snake_case vs camelCase

- **Cuerpos de entrada** (POST, PATCH): campos en **camelCase**. Ejemplos: `initialAmount`, `estimatedCost`, `actualCost`, `limitAmount`, `dueDate`.
- **Cuerpos de respuesta** (todas): campos en **snake_case** tal y como están en SQLite. Ejemplos: `initial_amount`, `estimated_cost`, `actual_cost`, `limit_amount`, `due_date`, `purchased_at`, `created_at`, `updated_at`.

### Tipos admitidos en entrada

- **Importes** (`initialAmount`, `limitAmount`, `estimatedCost`, `actualCost`): número (`1200.50`), string numérica (`"1200.50"`), `null` para "sin valor" o ausente. Se redondean a 2 decimales.
- **Fechas** (`dueDate`): string con formato `YYYY-MM-DD` (se valida con regex).
- **Enlaces** (`link`): URL válida (https://...), máx. 500 caracteres. Vacío (`""`) se interpreta como `null`.
- **Booleanos** (`purchased`, `archived`): `true`/`false`, `0`/`1` o strings `"0"`/`"1"`/`"true"`/`"false"`.

### Eliminaciones en cascada

- Borrar un presupuesto elimina todas sus categorías y los artículos de esas categorías.
- Borrar una categoría elimina todos sus artículos.

## Endpoints

### Salud

#### `GET /api/health`

Devuelve el estado del servicio. Útil para sondeos o precondiciones.

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "service": "simple-budget" }
```

---

### Preferencias

Las preferencias del usuario viven en una tabla singleton `settings`. La primera lectura tras migrar la base devuelve los valores por defecto (`language: "es"`, `currency: "EUR"`, `onboarded: false`). El **onboarding** de la web las actualiza durante la primera ejecución y pueden ajustarse después desde la cabecera.

#### `GET /api/settings`

```bash
curl http://localhost:3000/api/settings
```

```json
{
  "language": "es",
  "currency": "EUR",
  "onboarded": false,
  "updatedAt": "2026-08-19T10:00:00.000Z"
}
```

#### `PATCH /api/settings`

Actualiza parcialmente. Envía solo los campos que cambian.

| Campo | Tipo | Notas |
|---|---|---|
| `language` | `"es" \| "en"` | Idioma de la UI. |
| `currency` | string (3) | Moneda por defecto para nuevos presupuestos (ISO 4217). |
| `onboarded` | boolean | `true` cuando el usuario ha pasado la pantalla de bienvenida. |

```bash
curl -X PATCH http://localhost:3000/api/settings \
  -H 'content-type: application/json' \
  -d '{"language":"en"}'
```

```json
{
  "language": "en",
  "currency": "EUR",
  "onboarded": false,
  "updatedAt": "2026-08-19T10:01:00.000Z"
}
```

---

### Presupuestos

#### `GET /api/budgets`

Lista todos los presupuestos, ordenados por `sort_order` y después por `created_at`. Por defecto incluye archivados.

#### `POST /api/budgets`

Crea un presupuesto.

Cuerpo (campos obligatorios con `*`):

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `name` * | string (1–120) | — | Nombre del presupuesto. |
| `description` | string | `""` | Máx. 1000 caracteres. |
| `initialAmount` | number \| null | `null` | Cifra inicial. `null` o `0` = presupuesto sin techo definido. |
| `currency` | string (3) | `"EUR"` | Código ISO 4217 (`EUR`, `USD`, `GBP`...). |
| `color` | string `#RRGGBB` | `"#6366f1"` | Hexadecimal, 6 dígitos. |
| `icon` | string (≤40) | `"wallet"` | Clave del set `web/src/lib/icons.ts`. |
| `sortOrder` | integer | al final | Posición en el orden de la lista. |

Respuesta `201`: el presupuesto recién creado.

#### `GET /api/budgets/:id`

Devuelve el **detalle completo** del presupuesto: sus categorías (con sus artículos y resumen) y el resumen global.

#### `PATCH /api/budgets/:id`

Actualiza uno o más campos. Acepta cualquier subconjunto del cuerpo de creación. Campos extra: `archived` (`true`/`false`) para ocultar el presupuesto.

#### `DELETE /api/budgets/:id`

Borra el presupuesto y **todo lo que contiene** en cascada. Responde `{ "ok": true }`.

#### `GET /api/budgets/:id/summary`

Solo el resumen global del presupuesto, sin las filas anidadas.

Campos del resumen:

| Campo | Tipo | Significado |
|---|---|---|
| `initialAmount` | number | Cifra inicial del presupuesto. |
| `spent` | number | Suma del coste real (o estimado si no hay real) de los artículos comprados. |
| `committed` | number | Suma de los costes estimados de los artículos pendientes. |
| `remaining` | number | `initialAmount − spent − committed`. Negativo si vas por encima. |
| `usedPct` | number (0–100+) | Porcentaje respecto a la cifra inicial. Puede pasar de 100. |
| `itemCount` | integer | Total de artículos (todos los estados). |
| `purchasedCount` | integer | Artículos comprados. |
| `pendingCount` | integer | Artículos pendientes. |
| `categoryCount` | integer | Categorías asociadas. |

---

### Categorías

#### `GET /api/budgets/:budgetId/categories`

Lista las categorías de un presupuesto (ordenadas).

#### `POST /api/budgets/:budgetId/categories`

Crea una categoría dentro de un presupuesto.

Cuerpo:

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `name` * | string (1–120) | — | |
| `description` | string | `""` | |
| `icon` | string (≤40) | `"package"` | |
| `color` | string `#RRGGBB` | `"#6366f1"` | |
| `limitAmount` | number \| null | `null` | Tope de gasto. `null` = sin tope. |
| `sortOrder` | integer | al final | |

Respuesta `201`: la categoría recién creada.

#### `GET /api/categories/:id`

Devuelve `{ category, items, summary }`. Útil para refrescar la vista de una sola categoría sin pedir el presupuesto entero.

#### `PATCH /api/categories/:id`

Actualiza uno o más campos. Acepta también `archived` (`true`/`false`).

#### `DELETE /api/categories/:id`

Borra la categoría **y todos sus artículos** en cascada. Responde `{ "ok": true }`.

---

### Artículos

#### `POST /api/categories/:categoryId/items`

Crea un artículo dentro de una categoría.

Cuerpo:

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `name` * | string (1–200) | — | |
| `description` | string | `""` | |
| `quantity` | number (>0) | `1` | |
| `unit` | string (≤20) \| null | `null` | p. ej. `"ud"`, `"kg"`, `"m"`. |
| `estimatedCost` | number \| null | `null` | |
| `actualCost` | number \| null | `null` | Coste real final. |
| `purchased` | boolean | `false` | Estado comprado/pendiente. |
| `priority` | int (0–3) | `0` | 0 = sin prioridad, 3 = máxima. |
| `store` | string (≤120) \| null | `null` | Tienda o comercio. |
| `link` | string URL \| null | `null` | Enlace al producto. Se valida que sea URL. |
| `dueDate` | string `YYYY-MM-DD` \| null | `null` | Fecha objetivo de compra. |
| `notes` | string | `""` | Notas libres. |
| `sortOrder` | integer | al final | |

Respuesta `201`: el artículo recién creado.

#### `GET /api/items/:id`

Devuelve el artículo con todas sus columnas (snake_case).

#### `PATCH /api/items/:id`

Actualiza uno o más campos. Acepta también `archived` (`true`/`false`).

#### `PATCH /api/items/:id/purchase`

Marca/desmarca el artículo como comprado.

Cuerpo:

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `purchased` * | boolean | — | `true` = comprado, `false` = pendiente. |
| `actualCost` | number \| null | sin cambio | Solo aplica si `purchased === true`. |
| `purchasedAt` | string \| null | ahora | Fecha/hora ISO (`"2026-08-18T12:00:00Z"`) en la que se compró. Si `purchased === false`, se limpia a `null`. |

Mejor práctica: usa este endpoint cuando completes una compra, porque registra la fecha automáticamente.

#### `DELETE /api/items/:id`

Borra el artículo. Responde `{ "ok": true }`.

---

### Export / Import

Estos dos endpoints mueven todos los datos del usuario (presupuestos → categorías → artículos) entre instancias. Pensados para hacer backups, sincronizar entre dispositivos o migrar de un contenedor a otro. La interfaz web los expone con dos botones en la cabecera: **Exportar** (descarga un `.json`) e **Importar** (abre un modal con preview y doble confirmación).

#### Formato del payload

El JSON es un objeto versionado y autodocumentado. Los campos usan el mismo `snake_case` que las respuestas de la API. Los IDs del payload se respetan al importar: un registro con un ID ya presente se reemplaza (no se duplica).

```json
{
  "format": "simple-budget/export",
  "version": 1,
  "exportedAt": "2026-08-19T12:34:56.000Z",
  "schemaVersion": 1,
  "app": "simple-budget",
  "budgets": [
    {
      "id": "…",
      "name": "Casa",
      "description": "…",
      "initial_amount": 15000,
      "currency": "EUR",
      "color": "#3c7a53",
      "icon": "home",
      "archived": 0,
      "sort_order": 0,
      "created_at": "…",
      "updated_at": "…",
      "categories": [
        {
          "id": "…",
          "budget_id": "…",
          "name": "Cocina",
          "description": "…",
          "icon": "chef-hat",
          "color": "#f59e0b",
          "limit_amount": 4000,
          "archived": 0,
          "sort_order": 0,
          "created_at": "…",
          "updated_at": "…",
          "items": [
            {
              "id": "…",
              "category_id": "…",
              "name": "Sartén",
              "description": "…",
              "quantity": 1,
              "unit": "ud",
              "estimated_cost": 45,
              "actual_cost": 38,
              "purchased": 1,
              "purchased_at": "…",
              "priority": 1,
              "store": null,
              "link": null,
              "due_date": null,
              "notes": "",
              "sort_order": 0,
              "created_at": "…",
              "updated_at": "…"
            }
          ]
        }
      ]
    }
  ]
}
```

| Campo de cabecera | Tipo | Significado |
|---|---|---|
| `format` | `"simple-budget/export"` | Marcador que identifica el archivo. Cualquier otro valor → 400. |
| `version` | `1` | Versión del esquema del payload. Permite migraciones futuras. |
| `exportedAt` | string ISO | Cuándo se generó el archivo (servidor). |
| `schemaVersion` | number | Versionado de la BD (`PRAGMA user_version` en SQLite). |
| `app` | `"simple-budget"` | Identificador de la aplicación. |

#### `GET /api/export`

Devuelve el payload completo en `application/json`, con `Content-Disposition: attachment` para que el navegador lo descargue directamente con nombre `simple-budget-YYYY-MM-DDTHH-MM-SS.json`.

```bash
curl -OJ http://localhost:3000/api/export
# Guarda: simple-budget-2026-08-19T12-34-56Z.json
```

#### `POST /api/import`

Recibe el mismo payload (validado con Zod). La importación es **atómica** — se ejecuta dentro de una transacción: o entran todos los registros o no entra ninguno.

Modo único: **fusionar + reemplazar mismos IDs**. Concretamente, `INSERT OR REPLACE` por fila: si el ID no existe, se añade; si ya existe, se sustituyen sus campos. Esto permite reimportar el mismo archivo dos veces sin duplicar y migrar de una instancia a otra manteniendo las referencias (`budget_id`, `category_id`).

| Código | Significado |
|---|---|
| 200 | Importación exitosa. Devuelve `{ "imported": { "budgets": N, "categories": M, "items": K } }`. |
| 400 | Payload inválido (Zod falla). El cuerpo indica qué campo no cumple. |

```bash
# Backup → instancia nueva
curl http://localhost:3000/api/export -o backup.json
# Mueves backup.json a la otra instancia…
curl -X POST http://localhost:3001/api/import \
  -H 'content-type: application/json' \
  --data @backup.json
# { "imported": { "budgets": 3, "categories": 11, "items": 42 } }
```

---

## Ejemplos completos

### Flujo en `curl`

```bash
# 1) Crear presupuesto
BUDGET=$(curl -s -X POST http://localhost:3000/api/budgets \
  -H 'content-type: application/json' \
  -d '{"name":"Casa","initialAmount":15000,"currency":"EUR","color":"#3c7a53"}' \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')

# 2) Crear categoría con tope
CATEGORY=$(curl -s -X POST "http://localhost:3000/api/budgets/$BUDGET/categories" \
  -H 'content-type: application/json' \
  -d '{"name":"Cocina","limitAmount":4000,"icon":"chef-hat","color":"#f59e0b"}' \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')

# 3) Crear artículos (uno comprado, uno pendiente, otro completado con coste real)
ITEM=$(curl -s -X POST "http://localhost:3000/api/categories/$CATEGORY/items" \
  -H 'content-type: application/json' \
  -d '{"name":"Placa de inducción","estimatedCost":549,"priority":3}' \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')

curl -s -X POST "http://localhost:3000/api/categories/$CATEGORY/items" \
  -H 'content-type: application/json' \
  -d '{"name":"Horno","estimatedCost":380,"quantity":1,"unit":"ud"}'

curl -s -X POST "http://localhost:3000/api/categories/$CATEGORY/items" \
  -H 'content-type: application/json' \
  -d '{"name":"Sartén","estimatedCost":45,"actualCost":38,"purchased":true}'

# 4) Marcar la placa como comprada con coste real
curl -s -X PATCH "http://localhost:3000/api/items/$ITEM/purchase" \
  -H 'content-type: application/json' \
  -d '{"purchased":true,"actualCost":529}'

# 5) Ver el resumen global
curl -s "http://localhost:3000/api/budgets/$BUDGET/summary" | jq

# 6) Ver el detalle completo (categorías + artículos + resumen)
curl -s "http://localhost:3000/api/budgets/$BUDGET" | jq
```

### Flujo en JavaScript (fetch)

```js
const BASE = "http://localhost:3000/api";

// 1) Crear presupuesto
const budget = await fetch(`${BASE}/budgets`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Casa",
    initialAmount: 15000,
    currency: "EUR",
  }),
}).then((r) => r.json());

// 2) Crear categoría con tope
const category = await fetch(`${BASE}/budgets/${budget.id}/categories`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Cocina",
    limitAmount: 4000,
  }),
}).then((r) => r.json());

// 3) Crear artículo
const item = await fetch(`${BASE}/categories/${category.id}/items`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Placa de inducción",
    estimatedCost: 549,
    priority: 3,
  }),
}).then((r) => r.json());

// 4) Marcarlo como comprado con coste real
await fetch(`${BASE}/items/${item.id}/purchase`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ purchased: true, actualCost: 529 }),
});

// 5) Pedir el detalle completo
const detail = await fetch(`${BASE}/budgets/${budget.id}`).then((r) => r.json());
console.log(detail.summary); // { spent, committed, remaining, usedPct, ... }
```

### Flujo en Python (requests)

```python
import requests

BASE = "http://localhost:3000/api"

# 1) Crear presupuesto
budget = requests.post(
    f"{BASE}/budgets",
    json={"name": "Casa", "initialAmount": 15000, "currency": "EUR"},
).json()
budget_id = budget["id"]

# 2) Crear categoría
category = requests.post(
    f"{BASE}/budgets/{budget_id}/categories",
    json={"name": "Cocina", "limitAmount": 4000},
).json()
category_id = category["id"]

# 3) Crear artículo
item = requests.post(
    f"{BASE}/categories/{category_id}/items",
    json={"name": "Placa de inducción", "estimatedCost": 549, "priority": 3},
).json()
item_id = item["id"]

# 4) Marcarlo comprado
requests.patch(
    f"{BASE}/items/{item_id}/purchase",
    json={"purchased": True, "actualCost": 529},
)

# 5) Resumen del presupuesto
summary = requests.get(f"{BASE}/budgets/{budget_id}/summary").json()
print(summary)
```

### Manejo de errores

```bash
# Validación que falla: nombre obligatorio
curl -s -X POST http://localhost:3000/api/budgets \
  -H 'content-type: application/json' \
  -d '{"initialAmount":1000}' | jq
# {
#   "error": {
#     "code": "ERR_REQUIRED_NAME",
#     "message": "El nombre es obligatorio",
#     "issues": [{ "path": ["name"], "code": "ERR_REQUIRED_NAME", "message": "El nombre es obligatorio" }]
#   }
# }

# Recurso inexistente
curl -s http://localhost:3000/api/budgets/no-existe | jq
# {
#   "error": {
#     "code": "ERR_NOT_FOUND",
#     "message": "Presupuesto no encontrado"
#   }
# }
```

### Consultas frecuentes

```bash
# ¿Cuánto llevo gastado y cuánto me queda?
curl -s http://localhost:3000/api/budgets/$BUDGET/summary | jq

# ¿Qué categorías están cerca del tope?
curl -s http://localhost:3000/api/budgets/$BUDGET | jq '
  .categories[]
  | select(.summary.limit != null and .summary.usedPct >= 80)
  | { name, usedPct: .summary.usedPct, spent: .summary.spent, limit: .summary.limit }
'

# ¿Qué artículos sigo sin comprar y son caros?
curl -s http://localhost:3000/api/budgets/$BUDGET | jq '
  [.categories[].items[] | select(.purchased == 0 and .estimated_cost > 200)]
  | sort_by(-.estimated_cost)
  | .[] | { name, estimated_cost, priority }
'
```

### Cargar datos de demostración

El servidor incluye un script opcional que siembra la base con datos sintéticos (presupuesto "Casa" con varias categorías y artículos), solo si la BD está vacía:

```bash
bun run db:seed
```
