const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../data/store');
const { jwtSecret, jwtExpiresIn } = require('../config');
const AppError = require('../utils/AppError');

/**
 * Autentica a un usuario contra el almacén de datos y emite un token JWT de sesión.
 *
 * Verifica que las credenciales no estén vacías, busca el usuario por su nombre,
 * compara la contraseña contra el hash bcrypt almacenado y valida que la cuenta
 * esté activa. El token firmado incluye el `id` y el `rol` del usuario y expira
 * según la configuración `jwtExpiresIn` (8 horas por defecto).
 *
 * @function login
 * @param {string} usuario - Nombre de usuario registrado (p. ej. `vendedor1`).
 * @param {string} password - Contraseña en texto plano que se validará contra el hash bcrypt.
 * @returns {{token: string, usuario: {id: number, usuario: string, nombre: string, rol: string}}}
 *   Token JWT y perfil público del usuario autenticado (sin exponer la contraseña).
 * @throws {AppError} 400 Si `usuario` o `password` no se proporcionan.
 * @throws {AppError} 401 Si el usuario no existe o la contraseña es incorrecta.
 * @throws {AppError} 403 Si el usuario existe pero está inactivo (`activo === false`).
 * @example
 * const sesion = login('vendedor1', 'vende123');
 * // => { token: 'eyJhbGciOi...', usuario: { id: 2, usuario: 'vendedor1', nombre: 'Ana Pérez', rol: 'VENDEDOR' } }
 */
function login(usuario, password) {
  if (!usuario || !password) throw new AppError('Usuario y contraseña son obligatorios');

  const encontrado = getDb().usuarios.find((u) => u.usuario === usuario);
  if (!encontrado || !bcrypt.compareSync(password, encontrado.password)) {
    throw new AppError('Credenciales inválidas', 401);
  }
  if (!encontrado.activo) throw new AppError('Usuario inactivo', 403);

  const token = jwt.sign({ id: encontrado.id, rol: encontrado.rol }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, usuario: perfil(encontrado) };
}

function perfil(u) {
  return { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol };
}

function buscarPorId(id) {
  return getDb().usuarios.find((u) => u.id === id);
}

module.exports = { login, perfil, buscarPorId };
