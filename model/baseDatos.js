const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const { mkdirSync } = require("node:fs");

const ruta = process.env.DB_PATH || path.join(__dirname, "../DB/tienda.db");
mkdirSync(path.dirname(ruta), { recursive: true });
const db = new DatabaseSync(ruta);
db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000");

// La columna de talla admite NULL para conservar los diseños anteriores.
db.exec(`
    CREATE TABLE IF NOT EXISTS Colores (
        IdColor INTEGER PRIMARY KEY AUTOINCREMENT,
        Nombre TEXT NOT NULL,
        Hex TEXT NOT NULL,
        Activo INTEGER NOT NULL DEFAULT 1 CHECK (Activo IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS Usuarios (
        IdUsuario INTEGER PRIMARY KEY AUTOINCREMENT,
        Nombre TEXT NOT NULL,
        Email TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Tallas (
        IdTalla TEXT PRIMARY KEY NOT NULL,
        Nombre TEXT NOT NULL,
        Pecho TEXT NOT NULL,
        Largo TEXT NOT NULL,
        Brazo TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "Diseños" (
        "IdDiseño" INTEGER PRIMARY KEY AUTOINCREMENT,
        IdUsuario INTEGER NOT NULL,
        IdColor INTEGER NOT NULL,
        FechaCreacion TEXT NOT NULL DEFAULT (datetime('now')),
        IdTalla TEXT REFERENCES Tallas(IdTalla),
        FOREIGN KEY (IdUsuario) REFERENCES Usuarios(IdUsuario),
        FOREIGN KEY (IdColor) REFERENCES Colores(IdColor)
    );
`);

db.exec("BEGIN IMMEDIATE");
try {
    const columnas = db.prepare('PRAGMA table_info("Diseños")').all();
    if (!columnas.some((columna) => columna.name === "IdTalla")) {
        db.exec('ALTER TABLE "Diseños" ADD COLUMN IdTalla TEXT REFERENCES Tallas(IdTalla)');
    }
    db.exec("COMMIT");
} catch (error) {
    db.exec("ROLLBACK");
    throw error;
}

const colores = [
    ["Cereza", "#A8242F"], ["Pino", "#1E5144"],
    ["Nieve", "#EDE7DB"], ["Noche", "#263650"],
    ["Carbón", "#272727"],
    ["Rojo", "#C62828"], ["Rojo oscuro", "#7F1D1D"],
    ["Rosa", "#F48FB1"], ["Fucsia", "#D81B60"],
    ["Naranja", "#EF6C00"], ["Dorado", "#D4A017"],
    ["Amarillo", "#FDD835"], ["Crema", "#FFF3D6"],
    ["Verde", "#176B3A"], ["Verde lima", "#7CB342"],
    ["Verde menta", "#80CBC4"], ["Turquesa", "#00897B"],
    ["Azul cielo", "#4FC3F7"], ["Azul", "#1565C0"],
    ["Azul marino", "#0D2B5E"], ["Morado", "#6A1B9A"],
    ["Lavanda", "#B39DDB"], ["Café", "#6D4C41"],
    ["Gris", "#78909C"], ["Blanco", "#FFFFFF"]
];
const insertarColor = db.prepare(`
    INSERT INTO Colores (Nombre, Hex)
    SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM Colores WHERE Nombre = ?)
`);
for (const [nombre, hex] of colores) {
    insertarColor.run(nombre, hex, nombre);
}

const tallas = [
    ["S", "Chica", "86–92", "62–64", "58–60"],
    ["M", "Mediana", "93–100", "65–67", "60–62"],
    ["L", "Grande", "101–108", "68–70", "62–64"],
    ["XL", "Extra grande", "109–116", "71–73", "64–66"]
];
const insertarTalla = db.prepare(`
    INSERT INTO Tallas (IdTalla, Nombre, Pecho, Largo, Brazo) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (IdTalla) DO NOTHING
`);
for (const talla of tallas) {
    insertarTalla.run(...talla);
}

function listarColores() {
    return db.prepare(`
        SELECT IdColor AS id, Nombre AS nombre, Hex AS hex
        FROM Colores WHERE Activo = 1 ORDER BY IdColor
    `).all();
}

function listarTallas() {
    return db.prepare(`
        SELECT IdTalla AS id, Nombre AS nombre, Pecho AS pecho, Largo AS largo, Brazo AS brazo
        FROM Tallas ORDER BY rowid
    `).all();
}

function existeTalla(idTalla) {
    return Boolean(db.prepare("SELECT 1 FROM Tallas WHERE IdTalla = ?").get(idTalla));
}

function guardarDiseno(idColor, idTalla = null) {
    const color = db.prepare("SELECT IdColor FROM Colores WHERE IdColor = ? AND Activo = 1").get(idColor);
    if (!color) return null;

    db.prepare("INSERT OR IGNORE INTO Usuarios (Nombre, Email) VALUES (?, ?)")
        .run("Usuario local", "prototipo@localhost");
    const usuario = db.prepare("SELECT IdUsuario FROM Usuarios WHERE Email = ?")
        .get("prototipo@localhost");
    const resultado = db.prepare('INSERT INTO "Diseños" (IdUsuario, IdColor, IdTalla) VALUES (?, ?, ?)')
        .run(usuario.IdUsuario, idColor, idTalla);
    const diseno = { id: Number(resultado.lastInsertRowid), idColor };
    if (idTalla !== null) diseno.idTalla = idTalla;
    return diseno;
}

module.exports = { listarColores, listarTallas, existeTalla, guardarDiseno };
