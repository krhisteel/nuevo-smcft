// Datos iniciales: usuarios de prueba (los mismos del botón "Acceso rápido"
// del login) y un catálogo básico de categorías arancelarias.
import bcrypt from 'bcryptjs'

const users = [
  { rut: '11111111-1', nombre: 'Administrador SMCFT', email: 'admin@aduana.cl', password: 'admin123', rol: 'ADMINISTRADOR' },
  { rut: '22222222-2', nombre: 'Fiscalizador SMCFT', email: 'fiscal@aduana.cl', password: 'fiscal123', rol: 'FISCALIZADOR' },
  { rut: '33333333-3', nombre: 'Viajero SMCFT', email: 'viajero@aduana.cl', password: 'viajero123', rol: 'VIAJERO' },
]

const categories = [
  { nombre: 'Electrónica', descripcion: 'Equipos y dispositivos electrónicos', requiere: true, limite: 500 },
  { nombre: 'Alimentos', descripcion: 'Productos de origen animal o vegetal (control SAG)', requiere: true, limite: 100 },
  { nombre: 'Vestuario', descripcion: 'Ropa y calzado de uso personal', requiere: false, limite: 1000 },
  { nombre: 'Efectos personales', descripcion: 'Artículos de uso personal del viajero', requiere: false, limite: null },
]

export async function seed(query) {
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM users')
  if (total === 0) {
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10)
      await query(
        `INSERT INTO users (rut, nombre, email, password, rol, activo)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [u.rut, u.nombre, u.email, hash, u.rol],
      )
    }
  }

  const [{ total: cats }] = await query('SELECT COUNT(*) AS total FROM item_categories')
  if (cats === 0) {
    for (const c of categories) {
      await query(
        `INSERT INTO item_categories (nombre, descripcion, requiere_declaracion, limite_valor_usd)
         VALUES ($1, $2, $3, $4)`,
        [c.nombre, c.descripcion, c.requiere, c.limite],
      )
    }
  }
}
