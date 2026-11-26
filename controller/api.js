const { listarColores, listarTallas, existeTalla, guardarDiseno } = require("../model/baseDatos");

function enviarJson(respuesta, estado, datos) {
    respuesta.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
    respuesta.end(JSON.stringify(datos));
}

async function atenderApi(peticion, respuesta, ruta) {
    if (ruta === "/api/colores" && peticion.method === "GET") {
        enviarJson(respuesta, 200, listarColores());
        return;
    }

    if (ruta === "/api/tallas" && peticion.method === "GET") {
        enviarJson(respuesta, 200, listarTallas());
        return;
    }

    if (ruta === "/api/disenos" && peticion.method === "POST") {
        let cuerpo = "";
        for await (const fragmento of peticion) {
            cuerpo += fragmento.toString();
            if (cuerpo.length > 16384) {
                enviarJson(respuesta, 413, { error: "La petición es demasiado grande." });
                return;
            }
        }

        let datos;
        try {
            datos = JSON.parse(cuerpo);
        } catch {
            enviarJson(respuesta, 400, { error: "Los datos enviados no son válidos." });
            return;
        }
        if (!Number.isSafeInteger(datos?.idColor) || datos.idColor <= 0) {
            enviarJson(respuesta, 400, { error: "Selecciona y confirma un color válido." });
            return;
        }
        const idTalla = datos.idTalla;
        if (idTalla !== undefined && (typeof idTalla !== "string" || !existeTalla(idTalla))) {
            enviarJson(respuesta, 400, { error: "Selecciona y confirma una talla válida." });
            return;
        }

        const diseno = guardarDiseno(datos.idColor, idTalla);
        if (!diseno) {
            enviarJson(respuesta, 400, { error: "El color no existe o no está disponible." });
            return;
        }
        enviarJson(respuesta, 201, diseno);
        return;
    }

    if (ruta === "/api/colores" || ruta === "/api/tallas" || ruta === "/api/disenos") {
        respuesta.setHeader("Allow", ruta === "/api/disenos" ? "POST" : "GET");
        enviarJson(respuesta, 405, { error: "Método no permitido." });
        return;
    }
    enviarJson(respuesta, 404, { error: "Ruta no encontrada." });
}

module.exports = { atenderApi };
