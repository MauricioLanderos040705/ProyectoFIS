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
            tallas: "/api/tallas",
            disenos: "/api/disenos"
        },
        hashEditor: "#customizer",
        coloresVisibles: 6           // cuántos colores se ven sin abrir "Ver más colores"
    };

    // Los colores base vienen de SQLite. Aquí se indica el orden de presentación.
    const ORDEN_COLORES = ["Cereza", "Pino", "Nieve", "Noche", "Rosa", "Carbón"];
    const MEDIDAS = { pecho: "Pecho", largo: "Largo", brazo: "Brazo" };

    // Todos los textos que ve el usuario, en un solo lugar.
    const TEXTOS = {
        cargando:        "Cargando colores…",
        sinOpciones:     "Opciones no disponibles",
        errorCarga:      "No se pudieron cargar los colores.",
        listaVacia:      "No hay colores disponibles.",
        errorTallas:     "No hay tallas disponibles.",
        reintentar:      " Recarga la página para volver a intentarlo.",
        errorGenerico:   "Inténtalo de nuevo.",
        pideConfirmar:   "Confirma el color y la talla para guardar tu diseño.",
        confirmarColor:  "Confirmar color",
        colorConfirmado: "Color confirmado",
        confirmarTalla:  "Confirmar talla",
        tallaConfirmada: "Talla confirmada",
        guardando:       "Guardando tu diseño…",
        guardado:        (nombre, talla) => "¡Tu diseño en " + nombre + ", talla " + talla + ", se guardó!",
        errorGuardar:    (detalle) => "No se guardó el diseño. " + detalle,
        etiquetaColor:   (nombre) => "Elegir color " + nombre,
        etiquetaTalla:   (talla) => talla.nombre + " (" + talla.id + ")",
        medidaTalla:     (nombre, valor) => nombre + ": " + valor + " cm",
        etiquetaSueter:  (nombre) => "Vista previa del suéter con venado en color " + nombre
    };

    /* ======================================================================
       2. ESTADO
       ====================================================================== */

    const state = {
        status: "loading",   // "loading" | "ready" | "error"
        colores: [],         // lista que llega del servidor
        elegido: null,       // color seleccionado (aún sin confirmar)
        confirmado: null,
        tallaElegida: null,
        tallaConfirmada: null,
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
        taller:           document.querySelector(".customizer-workspace"),
        paleta:           $("paleta"),
        coloresExtra:     $("colores-extra"),
        masColores:       $("mas-colores"),
        sueter:           $("sueter"),
        tallas:           $("tallas"),
        plantillaTalla:   $("plantilla-talla"),
        btnConfirmar:     $("confirmar"),
        btnConfirmarTalla: $("confirmar-talla"),
        textoConfirmarTalla: $("texto-confirmar-talla"),
        btnGuardar:       $("guardar"),
        btnRestablecer:   $("restablecer"),
        mensaje:          $("mensaje")
    };

    // Botones de color ya creados, por id de color: { id → <button> }
    const botonesColor = new Map();
    const radiosTalla = new Map();

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

    async function pedirTallas() {
        const respuesta = await fetch(CONFIG.endpoints.tallas);
        if (!respuesta.ok) throw new Error(TEXTOS.errorTallas);
        const tallas = await respuesta.json();
        if (!tallas.length) throw new Error(TEXTOS.errorTallas);
        return tallas;
    }

    async function enviarDiseno(idColor, idTalla) {
        const respuesta = await fetch(CONFIG.endpoints.disenos, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idColor, idTalla })
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
        renderTallas();
        renderAcciones();
        renderMensaje();
    }

    function renderTitulo() {
        if (state.status === "loading") dom.titulo.textContent = TEXTOS.cargando;
        else if (state.status === "error") dom.titulo.textContent = TEXTOS.sinOpciones;
        else dom.titulo.textContent = state.elegido.nombre;
    }

    function renderVistaPrevia() {
        const color = state.elegido;
        if (!color) return;
        dom.taller.style.setProperty("--sweater-color", color.hex);
        dom.sueter.setAttribute("aria-label", TEXTOS.etiquetaSueter(color.nombre));
    }

    function renderBotonesColor() {
        botonesColor.forEach(function (boton, id) {
            const activo = state.elegido !== null && state.elegido.id === id;
            boton.classList.toggle("selected", activo);
            boton.setAttribute("aria-pressed", String(activo));
            boton.disabled = state.guardando;
        });
    }

    function renderTallas() {
        radiosTalla.forEach(function (radio, id) {
            radio.checked = state.tallaElegida?.id === id;
            radio.disabled = state.guardando;
        });
    }

    function renderAcciones() {
        dom.btnConfirmar.disabled = state.guardando || !state.elegido || Boolean(state.confirmado);
        dom.btnConfirmar.textContent = state.confirmado ? TEXTOS.colorConfirmado : TEXTOS.confirmarColor;
        dom.btnConfirmar.classList.toggle("is-confirmed", Boolean(state.confirmado));
        dom.btnConfirmarTalla.disabled = state.guardando || !state.tallaElegida || Boolean(state.tallaConfirmada);
        dom.textoConfirmarTalla.textContent = state.tallaConfirmada ? TEXTOS.tallaConfirmada : TEXTOS.confirmarTalla;
        dom.btnConfirmarTalla.classList.toggle("is-confirmed", Boolean(state.tallaConfirmada));
        dom.btnGuardar.disabled = state.guardando || !state.confirmado || !state.tallaConfirmada;
        dom.btnRestablecer.disabled = state.guardando || !state.elegido;
    }

    function renderMensaje() {
        const faltaConfirmar = state.status === "ready" && (!state.confirmado || !state.tallaConfirmada);
        dom.mensaje.textContent = state.mensaje.texto || (faltaConfirmar ? TEXTOS.pideConfirmar : "");
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

    function construirTallas(tallas) {
        tallas.forEach(function (talla) {
            const tarjeta = dom.plantillaTalla.content.firstElementChild.cloneNode(true);
            const radio = tarjeta.querySelector(".size-input");
            const etiqueta = tarjeta.querySelector(".size-option");
            const nombre = tarjeta.querySelector(".size-option__name");
            const medidas = tarjeta.querySelector(".size-option__measurements");

            tarjeta.dataset.talla = talla.id;
            radio.id = "talla-" + talla.id;
            radio.value = talla.id;
            etiqueta.htmlFor = radio.id;
            nombre.id = radio.id + "-nombre";
            medidas.id = radio.id + "-medidas";
            radio.setAttribute("aria-labelledby", nombre.id);
            radio.setAttribute("aria-describedby", medidas.id);
            nombre.textContent = TEXTOS.etiquetaTalla(talla);
            for (const [clave, etiquetaMedida] of Object.entries(MEDIDAS)) {
                medidas.querySelector('[data-medida="' + clave + '"]').textContent =
                    TEXTOS.medidaTalla(etiquetaMedida, talla[clave]);
            }

            radio.addEventListener("change", () => elegirTalla(talla));
            radiosTalla.set(talla.id, radio);
            dom.tallas.appendChild(tarjeta);
        });
    }

    /* ======================================================================
       6. ACCIONES (lo que hace el usuario → cambian el estado)
       ====================================================================== */

    async function cargarOpciones() {
        try {
            const [colores, tallas] = await Promise.all([pedirColores(), pedirTallas()]);
            construirPaleta(colores);
            construirTallas(tallas);
            setState({ status: "ready", colores, elegido: colores[0] });
        } catch (error) {
            setState({
                status: "error",
                mensaje: aviso(error.message + TEXTOS.reintentar, true)
            });
        }
    }

    function elegirColor(color) {
        if (state.guardando || state.elegido?.id === color.id) return;
        setState({ elegido: color, confirmado: null, mensaje: aviso("") });
    }

    function confirmarColor() {
        if (!state.elegido || state.guardando) return;
        setState({ confirmado: state.elegido, mensaje: aviso("") });
    }

    function elegirTalla(talla) {
        if (state.guardando || state.tallaElegida?.id === talla.id) return;
        setState({ tallaElegida: talla, tallaConfirmada: null, mensaje: aviso("") });
    }

    function confirmarTalla() {
        if (!state.tallaElegida || state.guardando) return;
        setState({ tallaConfirmada: state.tallaElegida, mensaje: aviso("") });
    }

    function restablecerDiseno() {
        if (state.guardando || !state.colores.length) return;
        dom.masColores.open = false;
        setState({
            elegido: state.colores[0],
            confirmado: null,
            tallaElegida: null,
            tallaConfirmada: null,
            mensaje: aviso("")
        });
    }

    async function guardarDiseno() {
        if (!state.confirmado || !state.tallaConfirmada || state.guardando) return;
        const color = state.confirmado;
        const talla = state.tallaConfirmada;
        setState({ guardando: true, mensaje: aviso(TEXTOS.guardando) });
        try {
            await enviarDiseno(color.id, talla.id);
            setState({
                confirmado: null,
                tallaConfirmada: null,
                mensaje: aviso(TEXTOS.guardado(color.nombre, talla.id))
            });
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
        dom.btnConfirmarTalla.addEventListener("click", confirmarTalla);
        dom.btnGuardar.addEventListener("click", guardarDiseno);
        dom.btnRestablecer.addEventListener("click", restablecerDiseno);
        window.addEventListener("hashchange", mostrarVista);

        mostrarVista();
        render();
        cargarOpciones();
    }

    iniciar();
})();
