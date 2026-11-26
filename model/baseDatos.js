const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const { mkdirSync } = require("node:fs");

const ruta = process.env.DB_PATH || path.join(__dirname, "../DB/tienda.db");
mkdirSync(path.dirname(ruta), { recursive: true });
const db = new DatabaseSync(ruta);
db.exec("PRAGMA foreign_keys = ON");

// Se conserva la estructura de la base de datos existente.
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
    CREATE TABLE IF NOT EXISTS "Diseños" (
        "IdDiseño" INTEGER PRIMARY KEY AUTOINCREMENT,
        IdUsuario INTEGER NOT NULL,
        IdColor INTEGER NOT NULL,
        FechaCreacion TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (IdUsuario) REFERENCES Usuarios(IdUsuario),
        FOREIGN KEY (IdColor) REFERENCES Colores(IdColor)
    );
`);

// Los mismos colores de la interfaz; los registros existentes no se modifican.
const colores = [
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

function listarColores() {
    return db.prepare(`
        SELECT IdColor AS id, Nombre AS nombre, Hex AS hex
        FROM Colores WHERE Activo = 1 ORDER BY IdColor
    `).all();
}

function guardarDiseno(idColor) {
    const color = db.prepare("SELECT IdColor FROM Colores WHERE IdColor = ? AND Activo = 1").get(idColor);
    if (!color) return null;

    // El prototipo no tiene inicio de sesión. Sus guardados usan un usuario local
    // propio para no atribuir los diseños a otro usuario existente.
    db.prepare("INSERT OR IGNORE INTO Usuarios (Nombre, Email) VALUES (?, ?)")
        .run("Usuario local", "prototipo@localhost");
    const usuario = db.prepare("SELECT IdUsuario FROM Usuarios WHERE Email = ?")
        .get("prototipo@localhost");
    // Se indica la hora local también al insertar porque las bases existentes
    // pueden conservar el valor predeterminado anterior en UTC.
    const resultado = db.prepare(`
        INSERT INTO "Diseños" (IdUsuario, IdColor, FechaCreacion)
        VALUES (?, ?, datetime('now', 'localtime'))
    `).run(usuario.IdUsuario, idColor);
    return { id: Number(resultado.lastInsertRowid), idColor };
}

module.exports = { listarColores, guardarDiseno };
