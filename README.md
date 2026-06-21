# 🖥️ Relevo — Frontend Web

Aplicación web de **Relevo**, un marketplace premium de adquisición y sucesión empresarial. Construida con **Angular 21**, diseñada con una experiencia de usuario moderna y una arquitectura escalable.

---

## 🚀 Stack Tecnológico

| Tecnología           | Uso                                                  |
| :------------------- | :--------------------------------------------------- |
| **Angular 21**       | Framework SPA con standalone components              |
| **TypeScript**       | Tipado estricto                                      |
| **Angular Signals**  | Reactividad moderna (`signal`, `computed`, `effect`) |
| **SSR**              | Server-Side Rendering con hidratación progresiva     |
| **Angular Material** | Componentes UI (CDK + Material)                      |
| **Socket.io Client** | WebSockets bidireccionales                           |
| **Firebase SDK**     | OAuth (Google/GitHub) + Push Notifications (FCM)     |
| **@ngx-translate**   | Internacionalización (CA, ES, EN)                    |
| **ngx-markdown**     | Renderizado de Markdown                              |
| **Vanilla CSS**      | Diseño custom premium                                |
| **Playwright**       | Tests E2E                                            |
| **Vitest**           | Tests unitarios                                      |

---

## 📂 Estructura del Proyecto

```
frontend-relevo/src/app/
├── app.config.ts            # Proveedores globales, interceptores HTTP funcionales
├── app.routes.ts            # Árbol de navegación con guards
├── core/                    # Singleton global
│   ├── guards/              # Control de acceso a rutas
│   │   ├── auth.guard.ts          # Requiere autenticación
│   │   └── admin.guard.ts         # Requiere rol ADMIN
│   ├── interceptors/        # Interceptores HTTP funcionales
│   │   ├── auth.interceptor.ts    # JWT auto-inject + silent refresh
│   │   └── error.interceptor.ts   # Toast de errores traducidos
│   ├── models/              # Interfaces TypeScript
│   └── services/            # Servicios de negocio
│       ├── auth.service.ts            # Login, OAuth, JWT, Pro status
│       ├── oferta.service.ts          # CRUD ofertas + recomendaciones
│       ├── solicitud.service.ts       # Solicitudes de acceso
│       ├── chat.service.ts            # WebSockets (Socket.io fuera de NgZone)
│       ├── fcm.service.ts            # Firebase Cloud Messaging
│       ├── payment.service.ts         # ← NUEVO: Stripe checkout
│       ├── monetization.service.ts    # ← NUEVO: Pro plan, créditos
│       ├── historial.service.ts       # ← NUEVO: Historial de cambios
│       ├── notification-history.service.ts
│       ├── notification.service.ts    # Toast notifications
│       ├── alerta.service.ts          # Alertas de búsqueda
│       ├── mentoring.service.ts       # Módulos formativos
│       ├── language.service.ts        # i18n (CA/ES/EN)
│       ├── theme.service.ts           # Dark/Light mode
│       ├── onboarding.service.ts      # Onboarding de nuevos usuarios
│       ├── analytics.service.ts       # Métricas y analítica
│       ├── usuario.service.ts         # Gestión de perfiles
│       └── confirm-dialog.service.ts  # Diálogos de confirmación
├── pages/                   # Vistas del enrutador
│   ├── landing/             # Home + Marketplace
│   ├── auth/                # Login + Registro + OAuth callback
│   ├── public/              # Contenido autenticado
│   │   ├── ofertas/               # Listado + detalle + creación de ofertas
│   │   ├── mis-ofertas/           # Ofertas propias (Owner)
│   │   ├── mis-solicitudes/       # Solicitudes enviadas (Interested)
│   │   ├── mis-favoritos/         # Ofertas guardadas
│   │   ├── mis-chats/             # Lista de conversaciones
│   │   ├── chat/                  # Sala de chat en tiempo real
│   │   ├── perfil/                # Perfil propio
│   │   ├── usuarios/             # Perfiles públicos
│   │   ├── mentoring/            # Módulos de formación
│   │   └── payments/             # ← NUEVO: Pago simulado + resultado
│   ├── admin/               # Panel de administración
│   │   ├── dashboard/
│   │   ├── usuarios/
│   │   ├── ofertas/
│   │   ├── solicitudes/
│   │   └── historial/            # ← NUEVO: Auditoría de cambios
│   └── legal/               # Aviso legal, términos, privacidad
└── shared/                  # Reutilizable
    ├── components/          # UI: selectores, diálogos, toast
    └── utils/               # Helpers y formateadores
```

---

## 📱 Páginas y Rutas

### Públicas (sin autenticación)

| Ruta                   | Componente         | Descripción                         |
| :--------------------- | :----------------- | :---------------------------------- |
| `/`                    | MarketplaceHome    | Explorador de ofertas con filtros   |
| `/como-funciona`       | Landing            | Página explicativa de la plataforma |
| `/login`               | Login              | Email + Password o OAuth            |
| `/register`            | Register           | Registro con selección de roles     |
| `/ofertas`             | OfertaList         | Listado público de ofertas          |
| `/aviso-legal`         | AvisoLegal         | Marco legal                         |
| `/terminos-servicio`   | TerminosServicio   | Términos y condiciones              |
| `/politica-privacidad` | PoliticaPrivacidad | RGPD                                |

### Autenticadas

| Ruta                   | Componente       | Descripción                           |
| :--------------------- | :--------------- | :------------------------------------ |
| `/ofertas/crear`       | OfertaCreate     | Formulario de nueva oferta (con pago) |
| `/ofertas/:id`         | OfertaDetalle    | Detalle + solicitud de acceso         |
| `/perfil`              | Perfil           | Perfil propio con edición             |
| `/chats`               | MisChats         | Lista de conversaciones activas       |
| `/chats/:chatId`       | Chat             | Sala de chat en tiempo real           |
| `/mis-solicitudes`     | MisSolicitudes   | Solicitudes enviadas + recibidas      |
| `/mis-ofertas`         | MisOfertas       | Ofertas publicadas por el owner       |
| `/mis-favoritos`       | MisFavoritos     | Ofertas guardadas                     |
| `/mentoring`           | Mentoring        | Módulos de formación (BUY/SELL)       |
| `/pago-simulado/:mode` | SimulatedPayment | **Flujo de pago Stripe simulado**     |
| `/pago/resultado`      | PaymentResult    | **Resultado del pago**                |
| `/usuarios`            | UsuariosList     | Directorio de perfiles públicos       |

### Admin

| Ruta                 | Componente    | Descripción                         |
| :------------------- | :------------ | :---------------------------------- |
| `/admin/dashboard`   | Dashboard     | Métricas generales                  |
| `/admin/usuarios`    | AdminUsuarios | CRUD de usuarios                    |
| `/admin/ofertas`     | OfertasAdmin  | Gestión de ofertas                  |
| `/admin/solicitudes` | Solicitudes   | Gestión de solicitudes              |
| `/admin/historial`   | Historial     | **Auditoría de cambios en ofertas** |

---

## 🔐 Autenticación y Seguridad

### OAuth con Firebase

```
1. Usuario pulsa "Iniciar con Google/GitHub"
2. Firebase SDK abre popup de autenticación
3. Firebase devuelve idToken
4. Frontend → POST /api/auth/firebase { idToken }
5. Backend verifica con Firebase Admin SDK
6. Backend crea/actualiza usuario en MongoDB
7. Backend devuelve accessToken + refreshToken
```

### Silent Refresh

El `authInterceptor` implementa renovación automática:

- Detecta `401 Unauthorized`
- Pausa peticiones paralelas con `BehaviorSubject`
- Ejecuta `POST /api/auth/refresh`
- Reinicia peticiones con el nuevo token
- Si falla → logout automático

### Señales Reactivas de Auth

```typescript
isLoggedIn = computed(() => !!this.currentUser());
isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN'));
isPro = computed(() => this.currentUser()?.proActive ?? false);
```

---

## 🔔 Notificaciones Push (Firebase Cloud Messaging)

- **Service Worker**: `firebase-messaging-sw.js` para notificaciones en background
- **Foreground**: Toast integrado con `NotificationService` en `fcm.service.ts`
- **Lazy loading**: Firebase SDK se importa dinámicamente para no penalizar el bundle
- **Smart routing**: Click en notificación navega a la ruta relevante
- **Duplicity control**: No muestra toast si el usuario ya está en el chat activo
- **Preferencias**: El usuario controla qué categorías de notificaciones recibe

---

## 🌐 Internacionalización (i18n)

| Idioma  | Archivo               | Código |
| :------ | :-------------------- | :----- |
| Catalán | `public/i18n/ca.json` | `ca`   |
| Español | `public/i18n/es.json` | `es`   |
| Inglés  | `public/i18n/en.json` | `en`   |

- Sincronización bidireccional: `localStorage` (inmediato) + `PATCH` al backend (persistente)
- Detección del idioma del navegador como fallback

---

## 🎨 Tema (Dark / Light Mode)

- Detección automática de `prefers-color-scheme` del sistema
- Toggle manual con `ThemeService`
- Clase CSS `.dark-mode` en `document.body` vía `Renderer2`
- Persistido en `localStorage` + base de datos

---

## ⚡ Rendimiento WebSockets

El `ChatService` optimiza el rendimiento de Socket.io en Angular:

```typescript
// Instanciar fuera de NgZone para evitar detección de cambios innecesaria
this.ngZone.runOutsideAngular(() => {
  this.socket = io(url, options);
});

// Solo re-entrar a la zona Angular en eventos relevantes
this.socket.on('new_message', (data) => {
  this.ngZone.run(() => this.messages.update(...));
});
```

---

## 🛠️ Desarrollo Local

### Requisitos Previos

- Node.js 24+
- Backend corriendo en `localhost:4000`

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd frontend-relevo

# Instalar dependencias
npm ci

# Iniciar servidor de desarrollo
ng serve
```

La aplicación estará disponible en `http://localhost:4200`.

### Comandos

| Comando                    | Descripción                           |
| :------------------------- | :------------------------------------ |
| `ng serve`                 | Servidor de desarrollo con hot-reload |
| `npm run build`            | Build de producción (`dist/`)         |
| `npm run validate`         | Format check + Lint                   |
| `npm run format`           | Auto-format con Prettier              |
| `ng lint`                  | Análisis estático del código          |
| `npm run test:e2e`         | Tests E2E con Playwright              |
| `npm run test:e2e:ui`      | Tests E2E con interfaz visual         |
| `npm run test:e2e:codegen` | Generar tests con grabadora           |

---

## 🧪 Testing

### Tests E2E (Playwright)

```
e2e/
├── auth.setup.ts          # Autenticación automatizada
├── login.spec.ts          # Flujo de login
├── navigation.spec.ts     # Navegación entre páginas
├── offers.spec.ts         # CRUD de ofertas
└── deal-flow.spec.ts      # Flujo completo: oferta → solicitud → chat → cierre
```

```bash
# Ejecutar todos los tests
npx playwright test

# Modo interactivo
npx playwright test --ui
```

---

## 🐳 Docker

### Build de Producción (Multi-stage)

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
# npm ci → ng build --configuration=production

# Stage 2: Runner (Angular SSR)
FROM node:24-alpine
# CMD node dist/mini-spa/server/server.mjs
```

```bash
docker build -t relevo-frontend .
docker run -p 4300:4300 relevo-frontend
```

---

## 🔄 CI/CD (GitHub Actions)

| Workflow | Trigger                         | Acciones                                                    |
| :------- | :------------------------------ | :---------------------------------------------------------- |
| **CI**   | Push a `dev`, PR a `dev`/`main` | Lint + Format + Build                                       |
| **CD**   | Merge a `main`                  | Docker build → Push a Docker Hub → SSH deploy vía Tailscale |
