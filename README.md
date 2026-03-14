# Modern Login App

Aplicación de inicio de sesión moderna construida con React y Vite.

## Características

- **10 Temas Personalizables**: Sunset, Ocean, Midnight, Forest, Rose, Aurora, Volcano, Lavender, Neon, Gold
- **Diseño Glassmorphism**: Efectos visuales modernos
- **Validación de Formularios**: Validación en tiempo real
- **Autenticación Google**: Integración lista para OAuth
- **Responsive**: Diseño adaptable a todos los dispositivos
- **Animaciones Suaves**: Transiciones y efectos visuales

## Estructura del Proyecto

```
Componentes React news/
├── src/
│   ├── components/
│   │   └── Login/
│   │       ├── Login.jsx          # Componente principal de login
│   │       ├── themes.js          # Configuración de temas
│   │       ├── styles.css         # Estilos y animaciones
│   │       └── index.js           # Exportaciones
│   ├── App.jsx                    # Componente raíz
│   └── main.jsx                   # Punto de entrada
├── public/                        # Archivos estáticos
├── index.html                     # HTML base
├── vite.config.js                 # Configuración de Vite
└── package.json                   # Dependencias
```

## Instalación y Ejecución

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar en modo desarrollo
```bash
npm run dev
```

El proyecto se abrirá automáticamente en `http://localhost:3000`

### 3. Construir para producción
```bash
npm run build
```

### 4. Previsualizar build de producción
```bash
npm run preview
```

## Uso del Componente Login

```jsx
import Login from './components/Login';

function App() {
  const handleLogin = async (credentials) => {
    // Implementar lógica de autenticación
    console.log(credentials);
  };

  return (
    <Login
      theme="sunset"              // sunset | ocean | midnight | forest | rose | aurora | volcano | lavender | neon | gold
      onLogin={handleLogin}       // Callback de login
      onGoogleLogin={() => {}}    // Callback de Google OAuth
      onRegister={() => {}}       // Callback de registro
      brandName="Tu App"          // Nombre de tu aplicación
    />
  );
}
```

## Temas Disponibles

### Temas Originales
1. **sunset** - Púrpura profundo con acentos dorados
2. **ocean** - Azul cielo y turquesa brillante
3. **midnight** - Azul oscuro nocturno con violeta
4. **forest** - Verde esmeralda profundo con dorado
5. **rose** - Rojo carmesí con rosa suave

### Temas Nuevos
6. **aurora** - Verde esmeralda y azul eléctrico (estilo aurora boreal)
7. **volcano** - Rojo intenso y naranja fuego
8. **lavender** - Púrpura lavanda suave y luminoso
9. **neon** - Rosa neón y violeta vibrante con cyan
10. **gold** - Dorado elegante y ámbar cálido

## Personalización

### Modificar Temas

Edita `src/components/Login/themes.js` para personalizar colores, fuentes y estilos.

### Agregar Nuevos Temas

```javascript
// En src/components/Login/themes.js
export const themes = {
  // ... temas existentes
  custom: {
    bg: 'linear-gradient(135deg, #color1 0%, #color2 100%)',
    glass: 'rgba(255, 255, 255, 0.1)',
    // ... más configuración
  }
};
```

## Tecnologías

- **React 18** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **Lucide React** - Iconos modernos

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run preview` - Previsualiza build de producción
- `npm run lint` - Ejecuta linter (ESLint)

## Licencia

MIT

## Autor

Desarrollado con React y Vite
