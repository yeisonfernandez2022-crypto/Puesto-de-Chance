<div align="center">

```text
  ┌─────────────────────────────────────────────────┐
  │    P U E S T O   D E   C H A N C E   ·   API    │
  │     Tiquetes · Sorteos · Premios · Caja         │
  └─────────────────────────────────────────────────┘
```

### Documentación técnica del proyecto — v1.0.0

![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/auth-JWT-d63aff?style=flat-square)
![Swagger](https://img.shields.io/badge/openapi-3.0-85EA2D?style=flat-square&logo=swagger&logoColor=black)
![Jest](https://img.shields.io/badge/jest-20%2F20%20tests-c21325?style=flat-square&logo=jest&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-CommonJS-f7df1e?style=flat-square&logo=javascript&logoColor=black)

[Instalación](#instalación) · [Configuración](#configuración) · [API](#api) · [Pruebas](#pruebas) · [Historias de Usuario](#historias-de-usuario) · [RTM](#matriz-de-trazabilidad-rtm)

</div>

---

## Acerca de

**Puesto de Chance API** es un servicio REST que digitaliza la operación diaria de un puesto de chance y Baloto. Los **vendedores** venden tiquetes, consultan su caja y pagan premios; los **administradores** crean sorteos y registran sus resultados. Cuando un sorteo se juega, el sistema liquida automáticamente el premio de cada tiquete activo.

La autenticación se resuelve con **JWT + bcrypt** y cada ruta aplica control de acceso por rol (`ADMIN` / `VENDEDOR`). La capa de datos es un almacén **en memoria** precargado con usuarios y sorteos de ejemplo, pensado para practicar documentación y pruebas sin instalar una base de datos.

### Capacidades del sistema

- Autenticación con token y control de acceso por roles.
- Venta de tiquetes de **Chance** (1–5 apuestas, modalidad DIRECTO/COMBINADO) y **Baloto** (1–10 jugadas, con opción aleatoria).
- Cierre automático de ventas 15 minutos antes de cada sorteo.
- Registro del resultado oficial y **liquidación automática** de premios.
- Anulación de tiquetes con ventana de 10 minutos y motivo obligatorio.
- Pago de premios con bloqueo de doble pago y caducidad a 365 días.
- Resumen y cierre diario de caja con detección de sobrantes y faltantes.

---

## Instalación

### Prerrequisitos del sistema

| Requisito | Versión | Comprobación |
|---|---|---|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | `npm --version` |
| Git | opcional | `git --version` |

### Puesta en marcha

```bash
# 1 · Clonar el repositorio
git clone https://github.com/yeisonfernandez2022-crypto/Puesto-de-Chance.git
cd Puesto-de-Chance

# 2 · Instalar dependencias
npm install

# 3 · Crear el archivo de variables de entorno a partir del ejemplo
cp .env.example .env           # Windows PowerShell: Copy-Item .env.example .env

# 4 · Levantar el servidor
npm run dev                    # modo desarrollo (nodemon, recarga automática)
npm start                      # modo producción
```

| Servicio | URL |
|---|---|
| Documentación interactiva (Swagger UI) | <http://localhost:3000/api-docs> |
| API base | <http://localhost:3000/api/v1/...> |
| Health check | <http://localhost:3000/health> |

> **Nota:** `/api/v1` a secas no expone recursos; es solo el prefijo de las rutas. Use Swagger UI para explorarlas.

<details>
<summary><strong>Usuarios precargados para probar</strong></summary>

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `vendedor1` | `vende123` | VENDEDOR |
| `vendedor2` | `vende456` | VENDEDOR |

</details>

---

## Configuración

La plantilla de variables de entorno está en [`.env.example`](.env.example). Cópiela como `.env` y ajuste lo necesario; todas las variables tienen valor por defecto en `src/config/index.js`.

| Variable | Descripción | Defecto |
|---|---|---|
| `PORT` | Puerto HTTP del servidor | `3000` |
| `NODE_ENV` | Entorno: `development` / `production` / `test` | `development` |
| `JWT_SECRET` | Secreto de firma de tokens JWT | `cambiar-este-secreto` |
| `JWT_EXPIRES_IN` | Tiempo de vida del token | `8h` |
| `ZONA_HORARIA` | Zona horaria de ventas, caja y sorteos | `America/Bogota` |
| `MINUTOS_ANULACION` | Ventana para anular un tiquete tras la venta | `10` |
| `MINUTOS_CIERRE_VENTAS` | Minutos antes del sorteo en que se cierra la venta | `15` |
| `APUESTA_MIN_CHANCE` | Valor mínimo de apuesta de chance (COP) | `500` |
| `APUESTA_MAX_CHANCE` | Valor máximo de apuesta de chance (COP) | `50000` |
| `VALOR_BALOTO` | Valor de cada jugada de Baloto (COP) | `5700` |
| `DIAS_CADUCIDAD_PREMIO` | Días para cobrar un premio antes de caducar | `365` |

---

## API

La especificación **OpenAPI 3.0** ([`docs/openapi.json`](docs/openapi.json)) se expone con **Swagger UI** en **`/api-docs`**: cada endpoint tiene sus schemas, ejemplos y el botón *Try it out* para ejecutarse desde el navegador. Para autorizar, obtenga el token en `POST /auth/login` y péguelo en el botón **Authorize**.

### Endpoints principales

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| `GET` | `/health` | Salud del servicio | Público |
| `POST` | `/api/v1/auth/login` | Login, entrega el JWT | Público |
| `GET` | `/api/v1/auth/perfil` | Perfil del usuario del token | Autenticado |
| `GET` / `POST` | `/api/v1/sorteos` | Listar / crear sorteos | Autenticado / ADMIN |
| `POST` | `/api/v1/sorteos/:id/resultado` | Registrar resultado y liquidar | ADMIN |
| `POST` | `/api/v1/tickets/chance` | Vender tiquete de chance | VENDEDOR |
| `POST` | `/api/v1/tickets/baloto` | Vender tiquete de Baloto | VENDEDOR |
| `GET` | `/api/v1/tickets` · `/tickets/:codigo` | Listar / consultar tiquetes | Autenticado |
| `POST` | `/api/v1/tickets/:codigo/anular` | Anular tiquete con motivo | Dueño o ADMIN |
| `POST` | `/api/v1/tickets/:codigo/pagar` | Pagar premio ganador | VENDEDOR |
| `GET` | `/api/v1/caja/resumen` | Resumen de caja del día | Autenticado |
| `POST` | `/api/v1/caja/cierre` | Cierre diario de caja | VENDEDOR |

<details>
<summary><strong>Ejemplo rápido con cURL</strong></summary>

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"vendedor1","password":"vende123"}'

# Vender un chance
curl -X POST http://localhost:3000/api/v1/tickets/chance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"sorteoId":1,"apuestas":[{"numero":"1234","valor":2000}]}'
```

</details>

---

## Pruebas

```bash
npm test    # 5 suites · 20 pruebas · todas en verde
```

<details>
<summary><strong>Detalle de las suites</strong></summary>

| Suite | Verifica |
|---|---|
| `tests/auth.test.js` | Login, credenciales inválidas, rutas protegidas |
| `tests/tickets.test.js` | Ventas chance/baloto, sorteo cerrado, roles, anulación, pago |
| `tests/caja.test.js` | Resumen diario, cierre con faltante, creación de sorteos |
| `tests/chance.test.js` | Tabla de pagos, combinado por permutaciones, validaciones |
| `tests/baloto.test.js` | Jugadas aleatorias, números repetidos, premios por aciertos |

</details>

---

## Historias de Usuario

Cada historia está documentada de forma individual en [`docs/`](docs/), con su narrativa, criterios de aceptación, implementación y prueba de calidad:

| HU | Archivo | HU | Archivo |
|---|---|---|---|
| 001 · Autenticación JWT | [docs/HU-001.md](docs/HU-001.md) | 008 · Cierre de caja | [docs/HU-008.md](docs/HU-008.md) |
| 002 · Venta de chance | [docs/HU-002.md](docs/HU-002.md) | 009 · Gestión de sorteos | [docs/HU-009.md](docs/HU-009.md) |
| 003 · Venta de Baloto | [docs/HU-003.md](docs/HU-003.md) | 010 · Acceso por roles | [docs/HU-010.md](docs/HU-010.md) |
| 004 · Cierre de ventas | [docs/HU-004.md](docs/HU-004.md) | 011 · Premios de chance | [docs/HU-011.md](docs/HU-011.md) |
| 005 · Anulación de tiquetes | [docs/HU-005.md](docs/HU-005.md) | 012 · Jugadas de Baloto | [docs/HU-012.md](docs/HU-012.md) |
| 006 · Resultado y liquidación | [docs/HU-006.md](docs/HU-006.md) | 013 · Caducidad de premios | [docs/HU-013.md](docs/HU-013.md) |
| 007 · Pago de premios | [docs/HU-007.md](docs/HU-007.md) | | |

---

## Matriz de Trazabilidad (RTM)

Vinculación formal entre Historias de Usuario, implementación y pruebas, con la estructura base definida en el taller (`ID HU | Descripción Requisito | Módulo / Controlador | Caso de Prueba | Estado QA`):

| ID HU | Descripción Requisito | Módulo / Controlador | Caso de Prueba | Estado QA |
|---|---|---|---|---|
| [HU-001](docs/HU-001.md) | Autenticación y emisión de token JWT | `authController.js` / `authService.js` | `test_login_exitoso()` | Aprobado |
| [HU-002](docs/HU-002.md) | Venta de tiquetes de Chance | `ticketController.js` / `ticketService.js` | `test_venta_chance()` | Aprobado |
| [HU-003](docs/HU-003.md) | Venta de tiquetes de Baloto | `ticketController.js` / `balotoService.js` | `test_venta_baloto()` | Aprobado |
| [HU-004](docs/HU-004.md) | Cierre automático de ventas antes del sorteo | `sorteoService.js` | `test_venta_sorteo_cerrado()` | Aprobado |
| [HU-005](docs/HU-005.md) | Anulación de tiquetes en ventana permitida | `ticketController.js` / `ticketService.js` | `test_anulacion_ticket()` | Aprobado |
| [HU-006](docs/HU-006.md) | Resultado oficial y liquidación automática | `sorteoController.js` / `sorteoService.js` | `test_resultado_y_pago_premio()` | Aprobado |
| [HU-007](docs/HU-007.md) | Pago de premios sin doble pago | `ticketController.js` / `ticketService.js` | `test_resultado_y_pago_premio()` | Aprobado |
| [HU-008](docs/HU-008.md) | Resumen y cierre diario de caja | `cajaController.js` / `cajaService.js` | `test_cierre_caja_con_faltante()` | Aprobado |
| [HU-009](docs/HU-009.md) | Gestión de sorteos (solo administrador) | `sorteoController.js` / `sorteoService.js` | `test_admin_crea_sorteo()` | Aprobado |
| [HU-010](docs/HU-010.md) | Control de acceso por roles | `middlewares/auth.js` | `test_admin_no_vende()` | Aprobado |
| [HU-011](docs/HU-011.md) | Cálculo de premios de chance | `chanceService.js` | `test_premio_directo_4_cifras()` | Aprobado |
| [HU-012](docs/HU-012.md) | Validación de jugadas de Baloto | `balotoService.js` | `test_jugada_aleatoria_valida()` | Aprobado |
| [HU-013](docs/HU-013.md) | Caducidad de premios (365 días) | `ticketService.js` | *(sin prueba automatizada)* | **Pendiente** |

**Evidencia QA:** `npm test` → 5 suites / 20 de 20 pruebas superadas (verificado el 2026-11-12). HU-013 permanece **Pendiente**: la regla está implementada (`pagarPremio`, error 410) pero aún no tiene caso de prueba automatizado.

---

<div align="center">

<details>
<summary><strong>Estructura del repositorio</strong></summary>

```text
Puesto-de-Chance/
├── docs/                    # OpenAPI + HU-001..HU-013 (una por archivo)
├── src/
│   ├── app.js               # Express + Swagger UI en /api-docs
│   ├── server.js            # Punto de entrada
│   ├── config/              # Variables de entorno y constantes
│   ├── routes/              # Rutas y permisos por rol
│   ├── controllers/         # Controladores HTTP
│   ├── services/            # Lógica de negocio
│   ├── middlewares/         # JWT, roles y manejo de errores
│   ├── data/                # Almacén en memoria (seed)
│   └── utils/               # AppError y utilidades de fechas
├── tests/                   # Jest + Supertest (5 suites, 20 pruebas)
├── .env.example             # Plantilla de variables de entorno
└── README.md
```

</details>

<br>

**Puesto de Chance API** — proyecto académico de documentación de software · 2026

</div>
