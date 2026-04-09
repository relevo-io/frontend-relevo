# Relevo Frontend

Este es el frontend de **Relevo**, un Marketplace de adquisición y sucesión de empresas. Construido con **Angular 21**, enfocado en una experiencia de usuario premium, seguridad robusta y una arquitectura escalable.

## 🚀 Tecnologías Principales

*   **Angular 21**: Uso de **Signals** para la gestión de estado reactivo.
*   **Vanilla CSS**: Diseño custom premium sin dependencias de frameworks de utilidades.
*   **JWT Auth**: Sistema de autenticación completo con Guards y Roles.
*   **Aesthetics**: Glassmorphism, tipografías modernas (Manrope/Inter) y micro-animaciones.

## 📂 Organización del Proyecto

Siguiendo las mejores prácticas de Angular, el proyecto se divide en tres pilares fundamentales dentro de `src/app`:

### 1. `core/` (El cerebro)
Contiene todo lo que es global y único en la aplicación.
*   **`guards/`**: Porteros de rutas (`authGuard`, `adminGuard`).
*   **`interceptors/`**: Lógica de red (añadir JWT a las peticiones).
*   **`models/`**: Definiciones de interfaces (Usuario, Oferta, Auth).
*   **`services/`**: Lógica de negocio y comunicación con el Backend.
*   **`layout/`**: Estructuras globales (Navbar, Footer, Layouts).

### 2. `pages/` (Las vistas)
Organizado por "mundos" o contextos de usuario:
*   **`landing/`**: Página principal de alto impacto para marketing.
*   **`auth/`**: Flujos de Login y Registro.
*   **`admin/`**: Panel de control privado para la gestión de la plataforma.
*   **`public/`**: Marketplace, listado de ofertas y perfiles públicos.

### 3. `shared/` (Piezas reutilizables)
Componentes que se usan en múltiples sitios (botones custom, diálogos, estados de carga).

---

## 🛠️ Desarrollo

### Servidor de Desarrollo
Para levantar el proyecto localmente:
```bash
ng serve
```
La aplicación estará disponible en `http://localhost:4200`.

### Comandos Útiles
*   **Build**: `ng build` (Genera la carpeta `dist/` optimizada).
*   **Test**: `ng test` (Ejecuta las pruebas unitarias con Vitest).
*   **Lint**: `ng lint` (Asegura la calidad del código).

---

## 🔐 Seguridad y Roles
La aplicación distingue entre tres roles principales:
1.  **ADMIN**: Acceso total al Backoffice.
2.  **OWNER**: Usuarios que quieren vender su negocio.
3.  **INTERESTED**: Usuarios que buscan comprar oportunidades.

Los **Guards** aseguran que un usuario no pueda saltar de un contexto a otro sin los permisos adecuados.