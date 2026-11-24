-- Opcional: la función crea esta tabla sola la primera vez.
CREATE TABLE IF NOT EXISTS resultados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo TEXT NOT NULL,
  equipo TEXT NOT NULL,
  escenario TEXT NOT NULL,
  puntaje INTEGER NOT NULL,
  material TEXT,
  calibre REAL,
  modelo TEXT,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resultados_grupo ON resultados (grupo, escenario, puntaje DESC);
