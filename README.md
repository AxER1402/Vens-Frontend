# Sistema Clínico Vascular — Frontend

Interfaz web del Sistema Clínico Vascular. Diseño para escritorio (1440px), minimalista con personalidad visual usando tipografía expresiva y micro-animaciones.

## Stack de tecnologías

| Tecnología            | Versión | Descripción                                      |
|-----------------------|---------|--------------------------------------------------|
| Node.js               | ≥ 18    | Entorno de ejecución                             |
| React                 | 19      | Librería de interfaz de usuario                  |
| Vite                  | 6       | Bundler y servidor de desarrollo                 |
| React Router DOM      | 7       | Enrutamiento del lado del cliente                |
| Tailwind CSS          | 4       | Utilidades de estilo (requerido por shadcn/ui)   |
| shadcn/ui             | 4       | Componentes accesibles basados en Radix UI       |
| Geist Variable        | —       | Fuente principal (sans-serif)                    |
| Fraunces              | —       | Fuente display para títulos y cifras dramáticas  |

## Pantallas

| Ruta               | Pantalla             |
|--------------------|----------------------|
| `/login`           | Inicio de sesión     |
| `/dashboard`       | Dashboard            |
| `/pacientes`       | Gestión de Pacientes |
| `/citas`           | Gestión de Citas     |
| `/historia-clinica`| Historia Clínica     |
| `/reportes`        | Reportes             |

## Cómo ejecutar

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

Corre en `http://localhost:5173` por defecto.

## Paleta de colores

| Nombre    | RGB                  | Hex       |
|-----------|----------------------|-----------|
| Primary   | rgb(147, 134, 140)   | `#93868C` |
| Secondary | rgb(238, 167, 191)   | `#EEA7BF` |
| Light     | rgb(250, 226, 236)   | `#FAE2EC` |
