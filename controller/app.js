let colorElegido = null;
let colorConfirmado = null;
let colorInicial = null;
let ultimoGuardado = null;
let guardando = false;
let colorModelo = null;
const paleta = document.getElementById("paleta");
const confirmar = document.getElementById("confirmar");
const guardar = document.getElementById("guardar");
const mensaje = document.getElementById("mensaje");
const cancelar = document.getElementById("cancelar");
const modelo = document.getElementById("modelo");
const botones = new Map();

confirmar.onclick = confirmarColor;
guardar.onclick = guardarSweater;
cancelar.onclick = cancelarSeleccion;
modelo?.addEventListener("load", function () { pintarModelo(colorModelo); });
cargarColores();

async function cargarColores() {
    try {
        const respuesta = await fetch("/api/colores");
        if (!respuesta.ok) throw new Error("No se pudieron cargar los colores.");
        const colores = await respuesta.json();
        if (!colores.length) throw new Error("No hay colores disponibles.");

        colores.forEach(function (c, indice) {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "color";
            boton.style.backgroundColor = c.hex;
            boton.title = c.nombre;
            boton.setAttribute("aria-label", c.nombre);
            boton.onclick = function () { cambiarColor(c, boton); };
            paleta.appendChild(boton);
            botones.set(c.id, boton);
            if (indice === 0) {
                colorInicial = c;
                cambiarColor(c, boton);
            }
        });
        confirmar.disabled = false;
    } catch (error) {
        document.getElementById("resultado").textContent = "Colores no disponibles";
        mensaje.textContent = error.message;
    }
}

function cambiarColor(c, boton) {
    if (colorElegido?.id !== c.id) {
        colorConfirmado = null;
        guardar.disabled = true;
    }
    colorElegido = c;
    document.getElementById("sueter").style.fill = c.hex;
    document.getElementById("resultado").textContent = "Color seleccionado: " + c.nombre;
    document.querySelectorAll(".color").forEach(function (b) {
        b.classList.remove("activo");
    });
    boton.classList.add("activo");
    mensaje.textContent = "";
    pintarModelo(c.hex);
    actualizarCancelar();
}

// Aplica el color al modelo 3D (si ya cargó; si no, se aplica al cargar).
function pintarModelo(hex) {
    colorModelo = hex;
    const materiales = modelo?.model?.materials;
    if (!hex || !materiales || !materiales.length) return;
    const rgba = [1, 3, 5].map(function (i) {
        return Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2);
    });
    materiales[0].pbrMetallicRoughness.setBaseColorFactor(rgba.concat(1));
}

// Color al que se regresa al cancelar: el último guardado o, si no hay, el inicial.
function colorBase() {
    return ultimoGuardado || colorInicial;
}

// Hay algo que deshacer: un color distinto al base, o un color confirmado sin guardar.
function hayPendiente() {
    const base = colorBase();
    if (!base || !colorElegido) return false;
    const confirmadoSinGuardar = colorConfirmado && colorConfirmado.id !== (ultimoGuardado && ultimoGuardado.id);
    return colorElegido.id !== base.id || Boolean(confirmadoSinGuardar);
}

function actualizarCancelar() {
    cancelar.disabled = guardando || !hayPendiente();
}

// Deshace la selección y la confirmación pendientes: no se guarda ni se envía nada al servidor.
function cancelarSeleccion() {
    if (guardando || !hayPendiente()) return;
    const base = colorBase();
    cambiarColor(base, botones.get(base.id));
    colorConfirmado = ultimoGuardado;
    guardar.disabled = !ultimoGuardado;
    actualizarCancelar();
    mensaje.textContent = ultimoGuardado
        ? "Cancelado. Se regresó al color guardado: " + base.nombre
        : "Cancelado. No se guardó ningún cambio.";
}

function confirmarColor() {
    if (!colorElegido) return;
    colorConfirmado = colorElegido;
    guardar.disabled = false;
    mensaje.textContent = "Color confirmado: " + colorConfirmado.nombre;
    actualizarCancelar();
}

async function guardarSweater() {
    if (!colorConfirmado || guardar.disabled) return;
    const color = colorConfirmado;
    guardar.disabled = true;
    confirmar.disabled = true;
    guardando = true;
    actualizarCancelar();
    mensaje.textContent = "Guardando sweater...";
    try {
        const respuesta = await fetch("/api/disenos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idColor: color.id })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || "No se pudo guardar el sweater.");
        ultimoGuardado = color;
        mensaje.textContent = "¡Sweater guardado en " + color.nombre + "! ";
    } catch (error) {
        mensaje.textContent = "No se guardó el sweater. " + error.message;
    } finally {
        guardar.disabled = !colorConfirmado;
        confirmar.disabled = false;
        guardando = false;
        actualizarCancelar();
    }
}
