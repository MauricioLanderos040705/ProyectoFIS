const http = require("node:http");
const path = require("node:path");
const { readFile } = require("node:fs/promises");
const { atenderApi } = require("./controller/api");

const archivos = {
    "/": ["views/index.html", "text/html; charset=utf-8"],
    "/views/index.html": ["views/index.html", "text/html; charset=utf-8"],
    "/controller/app.js": ["controller/app.js", "text/javascript; charset=utf-8"],
    "/resources/styles/estilos.css": ["resources/styles/estilos.css", "text/css; charset=utf-8"]
};

const servidor = http.createServer(async function (peticion, respuesta) {
    try {
        const ruta = new URL(peticion.url, "http://localhost").pathname;
        if (ruta.startsWith("/api/")) {
            await atenderApi(peticion, respuesta, ruta);
            return;
        }

        const archivo = Object.hasOwn(archivos, ruta) ? archivos[ruta] : null;
        if (!archivo) {
            respuesta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            respuesta.end("Archivo no encontrado.");
            return;
        }
        if (peticion.method !== "GET" && peticion.method !== "HEAD") {
            respuesta.writeHead(405, { Allow: "GET, HEAD" });
            respuesta.end();
            return;
        }

        const contenido = await readFile(path.join(__dirname, archivo[0]));
        respuesta.writeHead(200, { "Content-Type": archivo[1] });
        respuesta.end(peticion.method === "HEAD" ? undefined : contenido);
    } catch (error) {
        console.error(error);
        respuesta.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        respuesta.end(JSON.stringify({ error: "No se pudo completar la operación." }));
    }
});

if (require.main === module) {
    servidor.listen(process.env.PORT || 3000, "127.0.0.1", function () {
        console.log("Abre http://localhost:" + servidor.address().port);
    });
}

module.exports = servidor;
