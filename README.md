# Proyecto FIS

## introduccion
Este archivo documentará el objetivo del proyecto, los requisitos y los pasos para instalarlo y ejecutarlo, además de la organización del equipo con Scrumban para la clase
de fundamentos de ing de software

La interfaz permite previsualizar colores en el suéter y elegir una talla S, M, L o XL. Las tarjetas muestran el suéter con el color elegido y las medidas de pecho, largo y brazo. El diseño se guarda en SQLite con el color y la talla confirmados.

La portada y el taller adaptan el diseño de Merry & Co. de Figma Make a HTML, CSS y JavaScript. El suéter se dibuja con SVG y se reutiliza sin librerías. La vista se adapta a computadora y celular. Regalos, decoración y otras personalizaciones aparecen como próximos lanzamientos.

## Ejecutar

Requiere Node.js 22.13 o superior. No usa Express ni dependencias externas.

Desde la carpeta del proyecto:

```sh
npm start
```

Abre http://localhost:3000. El servidor se ejecuta únicamente en tu computadora. Deténlo con `Ctrl+C`.

La página debe abrirse mediante el servidor, no directamente como archivo HTML ni con Live Server, porque consulta y guarda datos a través de la API local.

## Datos

Se usa `DB/tienda.db` y sus tablas `Colores`, `Usuarios`, `Tallas` y `Diseños`. La base es local y no se sube a GitHub; se crea automáticamente al iniciar si no existe. Los colores de la interfaz se agregan cuando faltan, sin modificar los nombres, valores ni estados de los registros existentes; solo se muestran los activos. Al abrir una base anterior se agrega `IdTalla` a `Diseños` y los registros previos conservan sus datos con la talla vacía.

Como todavía no hay inicio de sesión, al guardar se crea o reutiliza un usuario llamado `Usuario local` (`prototipo@localhost`). Así los nuevos diseños no se atribuyen a los usuarios ya registrados. Seleccionar otro color requiere confirmarlo antes de guardar. El mensaje de éxito aparece únicamente cuando SQLite confirma el guardado.

El taller muestra primero seis colores de la colección; el resto sigue disponible en **Ver más colores**. Los colores nuevos se agregan sin reemplazar los existentes, por lo que Rosa conserva el tono que ya tenga la base.

**Flujo:** abre **Diseña tu suéter**, elige el color y pulsa **Confirmar color**. Después elige una talla, pulsa **Confirmar talla** y guarda con **Guardar mi diseño**. Si cambias el color o la talla, vuelve a confirmar esa elección. Durante el guardado se bloquean los controles para evitar envíos repetidos. Después de guardar, una nueva operación requiere ambas confirmaciones.

La navegación usa enlaces como `/#customizer`, funciona con Atrás/Adelante y conserva la selección al volver a la portada. **Restablecer diseño** vuelve al primer color disponible. Las fuentes son del equipo y los gráficos están incluidos en el HTML: no se requieren React, Tailwind, Vite, instalaciones adicionales ni conexión a Internet para la interfaz.


