import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.request import urlopen

DATASET_URL = 'https://www.datos.gov.py/sites/default/files/DISTRITOS_PY_CNPV2022.geojson'
OUT_DIR = Path('municipalidades_sql_por_departamento')


def sql_literal(value: str) -> str:
    return value.replace("'", "''")


def normalize_text(value: str) -> str:
    return ' '.join(value.strip().split())


def normalize_name(props: dict) -> str:
    for key in ('DISTRITO', 'distrito', 'nombre', 'NOMBRE', 'name', 'NAME'):
        val = props.get(key)
        if isinstance(val, str) and val.strip():
            return normalize_text(val)
    raise ValueError(f'No se pudo encontrar el nombre del distrito en properties: {list(props.keys())}')


def normalize_department(props: dict) -> str:
    for key in ('DPTO', 'dpto', 'DEPARTAMENTO', 'departamento', 'Departamento', 'NOMBRE_DPTO', 'nombre_dpto'):
        val = props.get(key)
        if isinstance(val, str) and val.strip():
            return normalize_text(val)
    raise ValueError(f'No se pudo encontrar el departamento en properties: {list(props.keys())}')


def slugify(value: str) -> str:
    value = value.lower().strip()
    repl = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n'
    }
    for src, dst in repl.items():
        value = value.replace(src, dst)
    value = re.sub(r'[^a-z0-9]+', '_', value)
    value = re.sub(r'_+', '_', value).strip('_')
    return value or 'sin_nombre'


HEADER = """-- Generado automáticamente desde el GeoJSON oficial de distritos de Paraguay
-- Fuente: https://www.datos.gov.py/sites/default/files/DISTRITOS_PY_CNPV2022.geojson
-- Requiere PostGIS y pgcrypto en Supabase/PostgreSQL

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS municipalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  limites geometry(MultiPolygon, 4326),
  centro geography(Point, 4326),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE municipalidades
  ALTER COLUMN limites TYPE geometry(MultiPolygon, 4326)
  USING CASE
    WHEN limites IS NULL THEN NULL
    ELSE ST_Multi(ST_SetSRID(limites, 4326))
  END;

BEGIN;
"""

FOOTER = """
COMMIT;

CREATE INDEX IF NOT EXISTS idx_municipalidades_limites_gist
  ON municipalidades USING GIST (limites);

CREATE INDEX IF NOT EXISTS idx_municipalidades_centro_gist
  ON municipalidades USING GIST (centro);
"""


def build_insert(nombre: str, geom: dict) -> str:
    geom_json = json.dumps(geom, ensure_ascii=False, separators=(',', ':'))
    geom_sql = sql_literal(geom_json)
    name_sql = sql_literal(nombre)
    return f"""INSERT INTO municipalidades (nombre, limites, centro)
VALUES (
  '{name_sql}',
  ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{geom_sql}'), 4326)),
  ST_Centroid(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{geom_sql}'), 4326)))::geography
)
ON CONFLICT (nombre) DO UPDATE
SET limites = EXCLUDED.limites,
    centro = EXCLUDED.centro;\n"""


def write_sql_file(path: Path, statements: list[str]) -> None:
    path.write_text(HEADER + '\n'.join(statements) + FOOTER, encoding='utf-8')


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'Descargando GeoJSON oficial desde: {DATASET_URL}')
    with urlopen(DATASET_URL, timeout=180) as resp:
        data = json.load(resp)

    features = data.get('features', [])
    if not features:
        raise RuntimeError('El GeoJSON no contiene features')

    by_department = defaultdict(list)
    all_statements = []

    for feature in features:
        props = feature.get('properties') or {}
        geom = feature.get('geometry')
        if not geom:
            continue
        nombre = normalize_name(props)
        departamento = normalize_department(props)
        statement = build_insert(nombre, geom)
        by_department[departamento].append(statement)
        all_statements.append(statement)

    write_sql_file(out_dir / '00_todas_las_municipalidades.sql', all_statements)

    manifest_lines = ['Departamento | Archivo | Registros', '---|---|---']
    for departamento in sorted(by_department):
        filename = f"{slugify(departamento)}.sql"
        write_sql_file(out_dir / filename, by_department[departamento])
        manifest_lines.append(f"{departamento} | {filename} | {len(by_department[departamento])}")

    (out_dir / 'README.txt').write_text(
        'Archivos SQL generados por departamento para cargar municipalidades de Paraguay en Supabase.\n\n'
        + '\n'.join(manifest_lines)
        + '\n',
        encoding='utf-8'
    )

    print(f'OK. Carpeta generada: {out_dir.resolve()}')
    print(f'Departamentos generados: {len(by_department)}')
    print(f'Registros generados: {len(all_statements)}')


if __name__ == '__main__':
    main()
