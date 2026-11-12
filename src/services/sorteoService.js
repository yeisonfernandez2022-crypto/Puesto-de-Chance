const { getDb, nextId } = require('../data/store');
const AppError = require('../utils/AppError');
const chance = require('./chanceService');
const baloto = require('./balotoService');
const { minutosCierreVentas } = require('../config');
const { minutosEntre } = require('../utils/fechas');

const TIPOS = ['CHANCE', 'BALOTO'];

function listar({ tipo, estado } = {}) {
  return getDb().sorteos.filter((s) => (!tipo || s.tipo === tipo) && (!estado || s.estado === estado));
}

function obtener(id) {
  const sorteo = getDb().sorteos.find((s) => s.id === Number(id));
  if (!sorteo) throw new AppError('Sorteo no encontrado', 404);
  return sorteo;
}

function crear({ tipo, nombre, fecha, acumulado = 0 }) {
  if (!TIPOS.includes(tipo)) throw new AppError('Tipo de sorteo inválido');
  if (!nombre) throw new AppError('El nombre es obligatorio');
  if (!fecha || Number.isNaN(Date.parse(fecha))) throw new AppError('Fecha inválida');
  if (new Date(fecha) <= new Date()) throw new AppError('La fecha del sorteo debe ser futura');

  const sorteo = {
    id: nextId('sorteos'),
    tipo,
    nombre,
    fecha: new Date(fecha).toISOString(),
    estado: 'ABIERTO',
    resultado: null,
    acumulado: tipo === 'BALOTO' ? acumulado : 0,
  };
  getDb().sorteos.push(sorteo);
  return sorteo;
}

function verificarVentaPermitida(sorteo, tipoEsperado) {
  if (sorteo.tipo !== tipoEsperado) throw new AppError(`El sorteo no es de tipo ${tipoEsperado}`);
  if (sorteo.estado !== 'ABIERTO') throw new AppError('El sorteo no está abierto para ventas', 409);
  if (minutosEntre(new Date(), sorteo.fecha) < minutosCierreVentas) {
    throw new AppError('Las ventas para este sorteo ya cerraron', 409);
  }
}

/**
 * Registra el resultado oficial de un sorteo y liquida automáticamente los tiquetes activos.
 *
 * Valida que el sorteo no tenga ya un resultado registrado. Para CHANCE exige
 * un número de 4 dígitos; para BALOTO valida una jugada completa (5 números +
 * superbalota). Marca el sorteo como `JUGADO`, guarda la fecha del resultado y
 * calcula el premio de cada apuesta/jugada de todos los tiquetes ACTIVOS del
 * sorteo, dejando el valor líquido en la propiedad `premio` de cada tiquete.
 *
 * @function registrarResultado
 * @param {number} id - Identificador del sorteo.
 * @param {string|{numeros: number[], superbalota: number}} resultado - Número de 4
 *   dígitos (CHANCE) u objeto jugada (BALOTO) según el tipo de sorteo.
 * @returns {Object} Sorteo actualizado con `estado: 'JUGADO'`, `resultado` y `jugadoEn`.
 * @throws {AppError} 404 Si el sorteo no existe.
 * @throws {AppError} 409 Si el sorteo ya tiene resultado registrado.
 * @throws {AppError} 400 Si el formato del resultado es inválido para el tipo de sorteo.
 */
function registrarResultado(id, resultado) {
  const sorteo = obtener(id);
  if (sorteo.estado === 'JUGADO') throw new AppError('El sorteo ya tiene resultado', 409);

  sorteo.resultado = sorteo.tipo === 'CHANCE'
    ? chance.validarResultado(resultado)
    : baloto.validarJugada(resultado);
  sorteo.estado = 'JUGADO';
  sorteo.jugadoEn = new Date().toISOString();

  getDb().tickets
    .filter((t) => t.sorteoId === sorteo.id && t.estado === 'ACTIVO')
    .forEach((t) => liquidarTicket(t, sorteo));

  return sorteo;
}

function liquidarTicket(ticket, sorteo) {
  if (sorteo.tipo === 'CHANCE') {
    ticket.apuestas.forEach((a) => { a.premio = chance.calcularPremio(a, sorteo.resultado); });
    ticket.premio = ticket.apuestas.reduce((s, a) => s + a.premio, 0);
  } else {
    ticket.jugadas.forEach((j) => { j.premio = baloto.calcularPremio(j, sorteo.resultado, sorteo.acumulado); });
    ticket.premio = ticket.jugadas.reduce((s, j) => s + j.premio, 0);
  }
}

module.exports = { listar, obtener, crear, registrarResultado, verificarVentaPermitida };
