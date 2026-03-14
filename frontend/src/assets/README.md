# Assets

Esta carpeta contiene los recursos estáticos del proyecto.

## Imagen de Fondo del Login

Para que la imagen de fondo funcione correctamente:

1. **Guarda tu imagen aquí** con el nombre: `fondo_login.jpg`

   Ruta completa: `src/assets/fondo_login.jpg`

2. **Formatos soportados:**
   - `.jpg` o `.jpeg` (recomendado para fotos)
   - `.png` (recomendado para gráficos)
   - `.webp` (mejor compresión)

3. **Si usas otro formato:**

   Edita el import en `src/components/Login/Login.jsx` línea 5:
   ```javascript
   import fondoLogin from '../../assets/fondo_login.png'; // Cambia la extensión
   ```

4. **Recomendaciones:**
   - Resolución: Mínimo 1920x1080px
   - Tamaño de archivo: Menor a 500KB para mejor rendimiento
   - Orientación: Horizontal (landscape)

## Otras imágenes

Puedes guardar otros assets aquí y importarlos de la misma manera.
