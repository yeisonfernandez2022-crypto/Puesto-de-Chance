# 🎲 Puesto de Chance API

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-brightgreen?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-blue?logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?logo=jsonwebtokens&logoColor=white)
![Swagger](https://img.shields.io/badge/Docs-Swagger_UI-85EA2D?logo=swagger&logoColor=black)
![Jest](https://img.shields.io/badge/Tests-Jest%20%2B%20Supertest_20%2F20-c21325?logo=jest&logoColor=white)
![JavaScript](https://img.shields.io/badge/Language-JavaScript_(CommonJS)-f7df1e?logo=javascript&logoColor=black)

**Puesto de Chance API** es un servicio REST que digitaliza la operación de un puesto de chance: permite a los **vendedores** vender tiquetes de **Chance** y **Baloto**, consultarlos, anularlos y pagar premios, llevar el **resumen y cierre diario de caja**, y a los **administradores** crear sorteos y registrar sus resultados con **liquidación automática de premios**.

## ✨ Características

- 🔐 Autenticación con **JWT** (bcrypt para contraseñas) y control de acceso por roles (`ADMIN` / `VENDEDOR`).
- 🎫 Venta de tiquetes de **Chance** (1 a 5 apuestas, modalidad DIRECTO/COMBINADO) y **Baloto** (1 a 10 jugadas, con opción aleatoria).
- 📅 Gestión de sorteos con **cierre automático de ventas** 15 minutos antes del sorteo.
- 🏆 Registro del resultado oficial y **liquidación automática** de todos los tiquetes activos.
- ⏱️ **Anulación de tiquetes** solo dentro de la ventana configurada (10 min) y con motivo obligatorio.
- 💰 **Pago de premios** con control de doble pago y **caducidad** (365 días).
- 🧾 **Resumen y cierre diario de caja** con detección de sobrantes/faltantes.

## 📋 Prerrequisitos del sistema

| Requisito | Versión mínima | Verificación |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18.x o superior | `node --version` |
| npm | 9.x o superior (incluido con Node) | `npm --version` |
| Git (opcional) | 2.x | `git --version` |

> No se requiere base de datos: el proyecto usa un almacén de datos en memoria (`src/data/store.js`) precargado con usuarios y sorteos de ejemplo.

## 🛠️ Instalación local paso a paso

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd documentacionApi

# 2. Instalar las dependencias
npm install

# 3. Crear el archivo de variables de entorno a partir del ejemplo
#    Windows (PowerShell):
Copy-Item .env.example .env
#    Linux / macOS:
#    cp .env.example .env

# 4. Editar .env y asignar un JWT_SECRET propio (obligatorio en producción)

# 5. Iniciar en modo desarrollo (recarga automática con nodemon)
npm run dev

# 5.b Iniciar en modo producción
npm start
```

La API queda disponible en:

- 🌐 **API:** <http://localhost:3000/api/v1>
- 📚 **Documentación interactiva (Swagger UI):** <http://localhost:3000/api-docs>
- ❤️ **Health check:** <http://localhost:3000/health>

## 🔐 Variables de entorno (`.env.example`)

El archivo [`.env.example`](.env.example) sirve como plantilla; cópielo como `.env` y ajuste los valores. Todas tienen valor por defecto en `src/config/index.js`:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto HTTP del servidor | `3000` |
| `NODE_ENV` | Entorno: `development` / `production` / `test` | `development` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `cambiar-este-secreto` |
| `JWT_EXPIRES_IN` | Tiempo de vida del token | `8h` |
| `ZONA_HORARIA` | Zona horaria para ventas, caja y sorteos | `America/Bogota` |
| `MINUTOS_ANULACION` | Ventana para anular un tiquete tras la venta | `10` |
| `MINUTOS_CIERRE_VENTAS` | Minutos antes del sorteo en que se cierra la venta | `15` |
| `APUESTA_MIN_CHANCE` | Valor mínimo de cada apuesta de chance (COP) | `500` |
| `APUESTA_MAX_CHANCE` | Valor máximo de cada apuesta de chance (COP) | `50000` |
| `VALOR_BALOTO` | Valor fijo de cada jugada de Baloto (COP) | `5700` |
| `DIAS_CADUCIDAD_PREMIO` | Días para cobrar un premio antes de caducar | `365` |

### 👤 Usuarios precargados (seed)

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `vendedor1` | `vende123` | VENDEDOR |
| `vendedor2` | `vende456` | VENDEDOR |

## 📚 Documentación interactiva de la API

La especificación **OpenAPI 3.0** ([`docs/openapi.json`](docs/openapi.json)) se expone con **Swagger UI** en **`/api-docs`**, donde cada endpoint puede ejecutarse ("Try it out") directamente desde el navegador usando el token obtenido en `/auth/login`.

### Endpoints principales

| Método | Ruta | Descripción | Rol requerido |
|---|---|---|---|
| `GET` | `/health` | Verificación de salud | Público |
| `POST` | `/api/v1/auth/login` | Iniciar sesión (devuelve JWT) | Público |
| `GET` | `/api/v1/auth/perfil` | Perfil del usuario autenticado | Autenticado |
| `GET` | `/api/v1/sorteos` | Listar sorteos (`?tipo=&estado=`) | Autenticado |
| `GET` | `/api/v1/sorteos/:id` | Obtener un sorteo | Autenticado |
| `POST` | `/api/v1/sorteos` | Crear sorteo | ADMIN |
| `POST` | `/api/v1/sorteos/:id/resultado` | Registrar resultado y liquidar premios | ADMIN |
| `POST` | `/api/v1/tickets/chance` | Vender tiquete de Chance | VENDEDOR |
| `POST` | `/api/v1/tickets/baloto` | Vender tiquete de Baloto | VENDEDOR |
| `GET` | `/api/v1/tickets` | Listar tiquetes (`?fecha=&estado=`) | Autenticado |
| `GET` | `/api/v1/tickets/:codigo` | Consultar tiquete y ver si es ganador | Autenticado |
| `POST` | `/api/v1/tickets/:codigo/anular` | Anular tiquete (con motivo) | Dueño o ADMIN |
| `POST` | `/api/v1/tickets/:codigo/pagar` | Pagar premio de tiquete ganador | VENDEDOR |
| `GET` | `/api/v1/caja/resumen` | Resumen de caja del día | Autenticado |
| `POST` | `/api/v1/caja/cierre` | Cierre diario de caja | VENDEDOR |

### Ejemplo de uso (cURL)

```bash
# 1. Autenticarse
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"vendedor1","password":"vende123"}'
# => { "token": "eyJhbGciOi...", "usuario": { ... } }

# 2. Vender un tiquete de chance
curl -X POST http://localhost:3000/api/v1/tickets/chance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"sorteoId":1,"apuestas":[{"numero":"1234","valor":2000}]}'
# => { "codigo": "CH-XXXXXXXX", "estado": "ACTIVO", "total": 2000, ... }
```

## 🧪 Pruebas

```bash
# Ejecutar toda la suite (20 pruebas en 5 suites)
npm test
```

| Suite | Contenido |
|---|---|
| `tests/auth.test.js` | Login exitoso, credenciales inválidas, rutas protegidas |
| `tests/tickets.test.js` | Ventas chance/baloto, sorteo cerrado, roles, anulación, pago de premio |
| `tests/caja.test.js` | Resumen diario, cierre con faltante, creación de sorteos por ADMIN |
| `tests/chance.test.js` | Reglas de chance: tabla de pagos, combinado, validaciones |
| `tests/baloto.test.js` | Reglas de Baloto: jugadas aleatorias, repetidos, premios por aciertos |

## 🗂️ Estructura del proyecto

```
documentacionApi/
├── docs/
│   └── openapi.json          # Especificación OpenAPI 3.0 (Swagger)
├── src/
│   ├── app.js                # Configuración de Express + /api-docs
│   ├── server.js             # Punto de entrada
│   ├── config/               # Variables de entorno y constantes
│   ├── routes/               # Definición de rutas y permisos
│   ├── controllers/          # Controladores HTTP
│   ├── services/             # Lógica de negocio (auth, sorteos, tiquetes, caja)
│   ├── middlewares/          # Autenticación JWT y manejo de errores
│   ├── data/store.js         # Almacén de datos en memoria (seed)
│   └── utils/                # AppError y utilidades de fechas
├── tests/                    # Pruebas automatizadas (Jest + Supertest)
├── .env.example              # Plantilla de variables de entorno
└── package.json
```

## 📊 Matriz de Trazabilidad de Requisitos (RTM)

La siguiente matriz vincula formalmente las Historias de Usuario con su implementación y su prueba de calidad asociada, siguiendo la estructura base definida (`ID HU | Descripción Requisito | Módulo / Controlador | Caso de Prueba | Estado QA`).

| ID HU | Descripción Requisito | Módulo / Controlador | Caso de Prueba | Estado QA |
|---|---|---|---|---|
| HU-001 | Autenticación de usuarios y emisión de token JWT | `authController.js` / `authService.js` | `test_login_exitoso()` | Aprobado |
| HU-002 | Venta de tiquetes de Chance (1–5 apuestas) | `ticketController.js` / `ticketService.js` | `test_venta_chance()` | Aprobado |
| HU-003 | Venta de tiquetes de Baloto (1–10 jugadas) | `ticketController.js` / `balotoService.js` | `test_venta_baloto()` | Aprobado |
| HU-004 | Cierre automático de ventas antes del sorteo | `sorteoService.js` | `test_venta_sorteo_cerrado()` | Aprobado |
| HU-005 | Anulación de tiquetes dentro de la ventana permitida | `ticketController.js` / `ticketService.js` | `test_anulacion_ticket()` | Aprobado |
| HU-006 | Registro del resultado oficial y liquidación automática | `sorteoController.js` / `sorteoService.js` | `test_resultado_y_pago_premio()` | Aprobado |
| HU-007 | Pago de premios a ganadores sin doble pago | `ticketController.js` / `ticketService.js` | `test_resultado_y_pago_premio()` | Aprobado |
| HU-008 | Resumen y cierre diario de caja con control de faltantes | `cajaController.js` / `cajaService.js` | `test_cierre_caja_con_faltante()` | Aprobado |
| HU-009 | Gestión de sorteos (creación, solo administrador) | `sorteoController.js` / `sorteoService.js` | `test_admin_crea_sorteo()` | Aprobado |
| HU-010 | Control de acceso por roles (ADMIN / VENDEDOR) | `middlewares/auth.js` | `test_admin_no_vende()` | Aprobado |
| HU-011 | Cálculo de premios de Chance (directo y combinado) | `chanceService.js` | `test_premio_directo_4_cifras()` | Aprobado |
| HU-012 | Validación de jugadas de Baloto (manuales y aleatorias) | `balotoService.js` | `test_jugada_aleatoria_valida()` | Aprobado |
| HU-013 | Caducidad de premios no cobrados (365 días) | `ticketService.js` | *(sin prueba automatizada)* | Pendiente |

**Evidencia QA:** ejecución de `npm test` → 5 suites / **20 de 20 pruebas superadas** (verificado el 2026-11-12). La HU-013 queda **Pendiente** porque su regla está implementada (`pagarPremio`, error 410) pero aún no cuenta con caso de prueba automatizado.

> **Convención de la matriz:** *Caso de Prueba* corresponde al nombre real de la función `test()` en la suite Jest; *Estado QA* se actualiza con cada corrida de `npm test` (`Aprobado` = verde en CI, `Pendiente` = requiere caso de prueba).

---

Documentación interactiva generada con Swagger UI · Especificación OpenAPI 3.0 en [`docs/openapi.json`](docs/openapi.json)
