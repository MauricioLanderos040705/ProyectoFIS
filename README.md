# Proyecto FIS

## introduccion
Este archivo documentará el objetivo del proyecto, los requisitos y los pasos para instalarlo y ejecutarlo, además de la organización del equipo con Scrumban para la clase
de fundamentos de ing de software

La interfaz actual permite listar colores, seleccionar uno para previsualizarlo en un suéter, confirmar la elección y guardar el diseño en SQLite. Para cambiar la elección, selecciona otro color de la misma paleta y vuelve a confirmarlo.

## Ejecutar

Requiere Node.js 22.13 o superior. No usa Express ni dependencias externas.

Desde la carpeta del proyecto:

```sh
npm start
```

Abre http://localhost:3000. El servidor se ejecuta únicamente en tu computadora. Deténlo con `Ctrl+C`.

La página debe abrirse mediante el servidor, no directamente como archivo HTML ni con Live Server, porque consulta y guarda datos a través de la API local.

## Datos

Se usa `DB/tienda.db` y sus tablas `Colores`, `Usuarios` y `Diseños`. La base es local y no se sube a GitHub; se crea automáticamente al iniciar si no existe. Los colores de la interfaz se agregan cuando faltan, sin modificar los nombres, valores ni estados de los registros existentes; solo se muestran los activos.

Como todavía no hay inicio de sesión, al guardar se crea o reutiliza un usuario llamado `Usuario local` (`prototipo@localhost`). Así los nuevos diseños no se atribuyen a los usuarios ya registrados. Seleccionar otro color requiere confirmarlo antes de guardar. El mensaje de éxito aparece únicamente cuando SQLite confirma el guardado.


