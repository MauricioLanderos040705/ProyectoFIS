let colorElegido = null;
let colorConfirmado = null;
let guardando = false;
let coloresDisponibles = [];

const paleta = document.getElementById("paleta");
const coloresExtra = document.getElementById("colores-extra");
const confirmar = document.getElementById("confirmar");
const guardar = document.getElementById("guardar");
const restablecer = document.getElementById("restablecer");
const mensaje = document.getElementById("mensaje");
const sueter = document.getElementById("sueter");

// Los colores base siempre vienen de SQLite. Estos son detalles de presentación.
const coloresColeccion = ["Cereza", "Pino", "Nieve", "Noche", "Rosa", "Carbón"];


confirmar.onclick = confirmarColor;
guardar.onclick = guardarSweater;
restablecer.onclick = restablecerDiseno;
window.addEventListener("hashchange", mostrarVista);
mostrarVista();
cargarColores();

// Los enlaces y los botones Atrás/Adelante del navegador usan el mismo flujo.
function mostrarVista() {
    const enEditor = window.location.hash === "#customizer";
    document.getElementById("inicio").hidden = enEditor;
    document.getElementById("customizer").hidden = !enEditor;
    const enlace = document.getElementById("enlace-editor");
    enlace.classList.toggle("active", enEditor);
    if (enEditor) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");

    const destino = document.getElementById(window.location.hash.slice(1));
    requestAnimationFrame(function () {
        if (enEditor || !destino) window.scrollTo(0, 0);
        else destino.scrollIntoView();
    });
}

async function cargarColores() {
    try {
        const respuesta = await fetch("/api/colores");
        if (!respuesta.ok) throw new Error("No se pudieron cargar los colores.");
        coloresDisponibles = await respuesta.json();
        if (!coloresDisponibles.length) throw new Error("No hay colores disponibles.");

        coloresDisponibles.sort(function (a, b) {
            const ordenA = coloresColeccion.indexOf(a.nombre);
            const ordenB = coloresColeccion.indexOf(b.nombre);
            return (ordenA < 0 ? 99 : ordenA) - (ordenB < 0 ? 99 : ordenB);
        });
        coloresDisponibles.forEach(function (c, indice) {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "color-option";
            boton.dataset.id = c.id;
            boton.setAttribute("aria-label", "Elegir color " + c.nombre);
            boton.setAttribute("aria-pressed", "false");
            const muestra = document.createElement("span");
            muestra.style.backgroundColor = c.hex;
            muestra.setAttribute("aria-hidden", "true");
            boton.append(muestra, document.createTextNode(c.nombre));
            boton.onclick = function () { cambiarColor(c); };
            (indice < 6 ? paleta : coloresExtra).appendChild(boton);
        });
        document.getElementById("mas-colores").hidden = coloresDisponibles.length <= 6;
        cambiarColor(coloresDisponibles[0]);
    } catch (error) {
        document.getElementById("resultado").textContent = "Colores no disponibles";
        mostrarMensaje(error.message + " Recarga la página para volver a intentarlo.", true);
    }
}

function actualizarBotones() {
    confirmar.disabled = guardando || !colorElegido;
    guardar.disabled = guardando || !colorConfirmado;
    restablecer.disabled = guardando || !colorElegido;
    document.querySelectorAll(".color-option").forEach(function (boton) {
        boton.disabled = guardando;
    });
}

function mostrarMensaje(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.classList.toggle("is-error", error);
}

function cambiarColor(c) {
    if (guardando) return;
    if (colorElegido?.id !== c.id) colorConfirmado = null;
    colorElegido = c;
    sueter.style.setProperty("--sweater-color", c.hex);
    sueter.setAttribute("aria-label", "Vista previa del suéter en color " + c.nombre);  
    document.getElementById("resultado").textContent = c.nombre;
    document.querySelectorAll(".color-option").forEach(function (boton) {
        const activo = Number(boton.dataset.id) === c.id;
        boton.classList.toggle("selected", activo);
        boton.setAttribute("aria-pressed", String(activo));
    });
    mostrarMensaje(colorConfirmado ? "Color confirmado: " + c.nombre + ". Ya puedes guardar tu diseño." : "Confirma tu color para guardar el diseño.");
    actualizarBotones();
}

function confirmarColor() {
    if (!colorElegido || guardando) return;
    colorConfirmado = colorElegido;
    mostrarMensaje("Color confirmado: " + colorConfirmado.nombre + ". Ya puedes guardar tu diseño.");
    actualizarBotones();
}

function restablecerDiseno() {
    if (guardando || !coloresDisponibles.length) return;
    colorConfirmado = null;
    cambiarColor(coloresDisponibles[0]);
    document.getElementById("mas-colores").open = false;
}

async function guardarSweater() {
    if (!colorConfirmado || guardando) return;
    const color = colorConfirmado;
    guardando = true;
    actualizarBotones();
    mostrarMensaje("Guardando tu diseño…");
    try {
        const respuesta = await fetch("/api/disenos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idColor: color.id })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || "Inténtalo de nuevo.");
        colorConfirmado = null;
        mostrarMensaje("¡Tu diseño en " + color.nombre + " se guardó! Puedes elegir otro color o volver a la tienda.");
    } catch (error) {
        mostrarMensaje("No se guardó el diseño. " + error.message, true);
    } finally {
        guardando = false;
        actualizarBotones();
    }
}
