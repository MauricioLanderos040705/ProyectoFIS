/* ==========================================================================
   My Ugly Sweater · personalizador de suéter

   Cómo está organizado este archivo:
     1. Configuración  → constantes y textos (lo primero que tocarás)
     2. Estado         → una sola fuente de verdad
     3. DOM            → referencias a los elementos de la página
     4. API            → llamadas al servidor (sin tocar el DOM)
     5. Render         → pinta la pantalla a partir del estado
     6. Acciones       → lo que hace el usuario (cambian el estado)
     7. Navegación     → vista tienda / vista personalizador
     8. Inicio

   Regla de oro: las acciones cambian el estado con setState() y render()
   se encarga de actualizar la pantalla. Nunca modifiques el DOM desde
   una acción.
   ========================================================================== */
(function () {
    "use strict";

    /* ======================================================================
       1. CONFIGURACIÓN
       ====================================================================== */

    const CONFIG = {
        endpoints: {
            colores: "/api/colores",
            disenos: "/api/disenos"
        },
        hashEditor: "#customizer",
        coloresVisibles: 6,          // cuántos colores se ven sin abrir "Ver más colores"
        acentoPorDefecto: "#F5D7A3",
        transparenciaFondo: "24"     // alfa hexadecimal del fondo de la vista previa
    };

    // Los colores base vienen de SQLite. Esto es solo presentación:
    // el orden en que se muestran y el color de acento de cada uno.
    const ORDEN_COLORES = ["Cereza", "Pino", "Nieve", "Noche", "Rosa", "Carbón"];

    const ACENTOS = {
        "Cereza": "#F5D7A3",
        "Pino":   "#F0C75E",
        "Nieve":  "#A8242F",
        "Noche":  "#E8B955",
        "Rosa":   "#6C1C2B",
        "Carbón": "#F2D7A0"
    };

    // Todos los textos que ve el usuario, en un solo lugar.
    const TEXTOS = {
        cargando:        "Cargando colores…",
        sinColores:      "Colores no disponibles",
        errorCarga:      "No se pudieron cargar los colores.",
        listaVacia:      "No hay colores disponibles.",
        reintentar:      " Recarga la página para volver a intentarlo.",
        errorGenerico:   "Inténtalo de nuevo.",
        pideConfirmar:   "Confirma tu color para guardar el diseño.",
        guardando:       "Guardando tu diseño…",
        confirmado:      (nombre) => "Color confirmado: " + nombre + ". Ya puedes guardar tu diseño.",
        guardado:        (nombre) => "¡Tu diseño en " + nombre + " se guardó! Puedes elegir otro color o volver a la tienda.",
        errorGuardar:    (detalle) => "No se guardó el diseño. " + detalle,
        etiquetaColor:   (nombre) => "Elegir color " + nombre,
        etiquetaSueter:  (nombre) => "Vista previa del suéter en color " + nombre
    };

    /* ======================================================================
       2. ESTADO
       ====================================================================== */

    const state = {
        status: "loading",   // "loading" | "ready" | "error"
        colores: [],         // lista que llega del servidor
        elegido: null,       // color seleccionado (aún sin confirmar)
        confirmado: null,    // color confirmado, listo para guardar
        guardando: false,
        mensaje: { texto: "", esError: false }
    };

    function setState(cambios) {
        Object.assign(state, cambios);
        render();
    }

    const aviso = (texto, esError = false) => ({ texto, esError });

    /* ======================================================================
       3. DOM
       ====================================================================== */

    const $ = (id) => document.getElementById(id);

    const dom = {
        vistaTienda:      $("inicio"),
        vistaEditor:      $("customizer"),
        enlaceEditor:     $("enlace-editor"),
        titulo:           $("resultado"),
        paleta:           $("paleta"),
        coloresExtra:     $("colores-extra"),
        masColores:       $("mas-colores"),
        fondoPreview:     $("fondo-preview"),
        sueter:           $("sueter"),
        btnConfirmar:     $("confirmar"),
        btnGuardar:       $("guardar"),
        btnRestablecer:   $("restablecer"),
        mensaje:          $("mensaje")
    };

    // Botones de color ya creados, por id de color: { id → <button> }
    const botonesColor = new Map();

    /* ======================================================================
       4. API (solo habla con el servidor, no toca la pantalla)
       ====================================================================== */

    function ordenarColores(colores) {
        const posicion = (c) => {
            const i = ORDEN_COLORES.indexOf(c.nombre);
            return i < 0 ? 99 : i;
        };
        return [...colores].sort((a, b) => posicion(a) - posicion(b));
    }

    async function pedirColores() {
        const respuesta = await fetch(CONFIG.endpoints.colores);
        if (!respuesta.ok) throw new Error(TEXTOS.errorCarga);
        const colores = await respuesta.json();
        if (!colores.length) throw new Error(TEXTOS.listaVacia);
        return ordenarColores(colores);
    }

    async function enviarDiseno(idColor) {
        const respuesta = await fetch(CONFIG.endpoints.disenos, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idColor })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || TEXTOS.errorGenerico);
        return datos;
    }

    /* ======================================================================
       5. RENDER (el estado entra, la pantalla sale)
       ====================================================================== */

    function render() {
        renderTitulo();
        renderVistaPrevia();
        renderBotonesColor();
        renderAcciones();
        renderMensaje();
    }

    function renderTitulo() {
        if (state.status === "loading") dom.titulo.textContent = TEXTOS.cargando;
        else if (state.status === "error") dom.titulo.textContent = TEXTOS.sinColores;
        else dom.titulo.textContent = state.elegido.nombre;
    }

    function renderVistaPrevia() {
        const color = state.elegido;
        if (!color) return;
        const acento = acentoDe(color);
        dom.sueter.style.setProperty("--sweater-color", color.hex);
        dom.sueter.style.setProperty("--sweater-accent", acento);
        dom.sueter.setAttribute("aria-label", TEXTOS.etiquetaSueter(color.nombre));
        dom.fondoPreview.style.backgroundColor = acento + CONFIG.transparenciaFondo;
    }

    function renderBotonesColor() {
        botonesColor.forEach(function (boton, id) {
            const activo = state.elegido !== null && state.elegido.id === id;
            boton.classList.toggle("selected", activo);
            boton.setAttribute("aria-pressed", String(activo));
            boton.disabled = state.guardando;
        });
    }

    function renderAcciones() {
        dom.btnConfirmar.disabled = state.guardando || !state.elegido;
        dom.btnGuardar.disabled = state.guardando || !state.confirmado;
        dom.btnRestablecer.disabled = state.guardando || !state.elegido;
    }

    function renderMensaje() {
        dom.mensaje.textContent = state.mensaje.texto;
        dom.mensaje.classList.toggle("is-error", state.mensaje.esError);
    }

    /* Se ejecuta una sola vez, cuando llegan los colores. */
    function construirPaleta(colores) {
        colores.forEach(function (color, indice) {
            const boton = crearBotonColor(color);
            botonesColor.set(color.id, boton);
            const destino = indice < CONFIG.coloresVisibles ? dom.paleta : dom.coloresExtra;
            destino.appendChild(boton);
        });
        dom.masColores.hidden = colores.length <= CONFIG.coloresVisibles;
    }

    function crearBotonColor(color) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "color-option";
        boton.dataset.id = color.id;
        boton.setAttribute("aria-label", TEXTOS.etiquetaColor(color.nombre));
        boton.setAttribute("aria-pressed", "false");

        const muestra = document.createElement("span");
        muestra.style.backgroundColor = color.hex;
        muestra.setAttribute("aria-hidden", "true");

        boton.append(muestra, document.createTextNode(color.nombre));
        boton.addEventListener("click", () => elegirColor(color));
        return boton;
    }

    function acentoDe(color) {
        return ACENTOS[color.nombre] || CONFIG.acentoPorDefecto;
    }

    /* ======================================================================
       6. ACCIONES (lo que hace el usuario → cambian el estado)
       ====================================================================== */

    async function cargarColores() {
        try {
            const colores = await pedirColores();
            construirPaleta(colores);
            state.colores = colores;
            state.status = "ready";
            elegirColor(colores[0]);
        } catch (error) {
            setState({
                status: "error",
                mensaje: aviso(error.message + TEXTOS.reintentar, true)
            });
        }
    }

    function elegirColor(color) {
        if (state.guardando) return;
        const cambioDeColor = !state.elegido || state.elegido.id !== color.id;
        const confirmado = cambioDeColor ? null : state.confirmado;
        setState({
            elegido: color,
            confirmado,
            mensaje: aviso(confirmado ? TEXTOS.confirmado(color.nombre) : TEXTOS.pideConfirmar)
        });
    }

    function confirmarColor() {
        if (!state.elegido || state.guardando) return;
        setState({
            confirmado: state.elegido,
            mensaje: aviso(TEXTOS.confirmado(state.elegido.nombre))
        });
    }

    function restablecerDiseno() {
        if (state.guardando || !state.colores.length) return;
        state.confirmado = null;
        dom.masColores.open = false;
        elegirColor(state.colores[0]);
    }

    async function guardarDiseno() {
        if (!state.confirmado || state.guardando) return;
        const color = state.confirmado;
        setState({ guardando: true, mensaje: aviso(TEXTOS.guardando) });
        try {
            await enviarDiseno(color.id);
            setState({ confirmado: null, mensaje: aviso(TEXTOS.guardado(color.nombre)) });
        } catch (error) {
            setState({ mensaje: aviso(TEXTOS.errorGuardar(error.message), true) });
        } finally {
            setState({ guardando: false });
        }
    }

    /* ======================================================================
       7. NAVEGACIÓN
       Tienda y personalizador son dos vistas dentro de la misma página.
       La URL decide cuál se ve, así Atrás/Adelante funcionan solos.
       ====================================================================== */

    function mostrarVista() {
        const hash = window.location.hash;
        const enEditor = hash === CONFIG.hashEditor;

        dom.vistaTienda.hidden = enEditor;
        dom.vistaEditor.hidden = !enEditor;
        dom.enlaceEditor.classList.toggle("active", enEditor);
        if (enEditor) dom.enlaceEditor.setAttribute("aria-current", "page");
        else dom.enlaceEditor.removeAttribute("aria-current");

        // Si el hash apunta a una sección de la tienda, bajamos hasta ella.
        const destino = $(hash.slice(1));
        requestAnimationFrame(function () {
            if (enEditor || !destino) window.scrollTo(0, 0);
            else destino.scrollIntoView();
        });
    }

    /* ======================================================================
       8. INICIO
       ====================================================================== */

    function iniciar() {
        dom.btnConfirmar.addEventListener("click", confirmarColor);
        dom.btnGuardar.addEventListener("click", guardarDiseno);
        dom.btnRestablecer.addEventListener("click", restablecerDiseno);
        window.addEventListener("hashchange", mostrarVista);

        mostrarVista();
        render();
        cargarColores();
    }

    iniciar();
})();
