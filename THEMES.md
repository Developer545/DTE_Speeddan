# Guía de Temas - Modern Login App

Esta es una referencia visual de todos los temas disponibles en la aplicación.

## Temas Disponibles (10 Total)

### 1. 🌅 Sunset (Original)
**Paleta:** Púrpura profundo → Morado oscuro
**Acento:** Dorado brillante
**Fuente:** Poppins
**Estilo:** Elegante y cálido, perfecto para aplicaciones profesionales
```
Fondo: #667eea → #764ba2
Botón: #fbbf24 → #f59e0b
```

### 2. 🌊 Ocean (Original)
**Paleta:** Azul cielo → Turquesa
**Acento:** Verde esmeralda
**Fuente:** Inter
**Estilo:** Fresco y moderno, ideal para apps de productividad
```
Fondo: #0ea5e9 → #06b6d4
Botón: #10b981 → #059669
```

### 3. 🌙 Midnight (Original)
**Paleta:** Azul oscuro → Negro azulado
**Acento:** Violeta brillante
**Fuente:** Space Grotesk
**Estilo:** Oscuro y sofisticado, perfecto para modo nocturno
```
Fondo: #1e293b → #0f172a
Botón: #8b5cf6 → #7c3aed
```

### 4. 🌲 Forest (Original)
**Paleta:** Verde bosque → Verde profundo
**Acento:** Dorado cálido
**Fuente:** Outfit
**Estilo:** Natural y tranquilo, ideal para apps de bienestar
```
Fondo: #065f46 → #064e3b
Botón: #fbbf24 → #f59e0b
```

### 5. 🌹 Rose (Original)
**Paleta:** Rojo carmesí → Rojo vino
**Acento:** Rosa suave
**Fuente:** DM Sans
**Estilo:** Apasionado y energético, perfecto para apps sociales
```
Fondo: #be123c → #9f1239
Botón: #fb7185 → #f43f5e
```

---

### 6. 🌌 Aurora (NUEVO)
**Paleta:** Verde esmeralda → Azul eléctrico
**Acento:** Turquesa brillante
**Fuente:** Poppins
**Estilo:** Mágico y vibrante, inspirado en auroras boreales
```
Fondo: #10b981 → #3b82f6
Botón: #06d6a0 → #14b8a6
```

### 7. 🌋 Volcano (NUEVO)
**Paleta:** Rojo intenso → Naranja fuego
**Acento:** Dorado brillante
**Fuente:** Inter
**Estilo:** Enérgico y potente, ideal para apps de fitness/deportes
```
Fondo: #dc2626 → #ea580c
Botón: #f59e0b → #d97706
```

### 8. 💜 Lavender (NUEVO)
**Paleta:** Púrpura lavanda → Violeta suave
**Acento:** Lavanda claro
**Fuente:** Outfit
**Estilo:** Suave y relajante, perfecto para apps de meditación/wellness
```
Fondo: #a78bfa → #c084fc
Botón: #d8b4fe → #c084fc
```

### 9. ⚡ Neon (NUEVO)
**Paleta:** Rosa neón → Violeta vibrante
**Acento:** Cyan eléctrico
**Fuente:** Space Grotesk
**Estilo:** Futurista y audaz, ideal para apps tech/gaming
```
Fondo: #ec4899 → #8b5cf6
Botón: #06b6d4 → #0891b2
```

### 10. 👑 Gold (NUEVO)
**Paleta:** Dorado → Ámbar profundo
**Acento:** Amarillo dorado
**Fuente:** DM Sans
**Estilo:** Lujoso y premium, perfecto para apps de alto valor
```
Fondo: #d97706 → #b45309
Botón: #fbbf24 → #f59e0b
```

---

## Cómo Cambiar de Tema

### En tu código:
```jsx
<Login theme="aurora" {...props} />
```

### En la demo:
Haz clic en el botón "Tema: [nombre]" en la esquina superior derecha para ciclar entre todos los temas.

## Casos de Uso Recomendados

| Tipo de App | Temas Recomendados |
|-------------|-------------------|
| Apps Corporativas | Midnight, Ocean, Forest |
| Apps Sociales | Rose, Neon, Lavender |
| Apps de Finanzas | Gold, Midnight, Forest |
| Apps de Fitness | Volcano, Aurora, Rose |
| Apps de Meditación | Lavender, Forest, Ocean |
| Apps Tech/Gaming | Neon, Midnight, Volcano |
| Apps de Lujo | Gold, Rose, Sunset |
| Apps de Productividad | Ocean, Midnight, Forest |

## Personalización Avanzada

Todos los temas incluyen:
- ✅ Gradientes de fondo personalizados
- ✅ Efectos glassmorphism ajustados
- ✅ Colores de acento únicos
- ✅ Fuentes tipográficas específicas
- ✅ Estados hover/focus optimizados
- ✅ Transparencias balanceadas

Para crear tu propio tema, edita `src/components/Login/themes.js`
