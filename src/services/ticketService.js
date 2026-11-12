const crypto = require('crypto');
const { getDb, nextId } = require('../data/store');
const AppError = require('../utils/AppError');
const chance = require('./chanceService');
const baloto = require('./balotoService');
const sorteos = require('./sorteoService');
const { valorBaloto, minutosAnulacion, diasCaducidadPremio } = require('../config');
const { minutosEntre, diasEntre } = require('../utils/fechas');

function generarCodigo(tipo) {
  const prefijo = tipo === 'CHANCE' ? 'CH' : 'BL';
  return `${prefijo}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function guardar(ticket) {
  getDb().tickets.push(ticket);
  return ticket;
}

/**
 * Registra la venta de un tiquete de Chance para un sorteo abierto.
 *
 * Valida que el sorteo exista, sea de tipo CHANCE, esté abierto y aún acepte
 * ventas (las ventas se cierran `minutosCierreVentas` antes del sorteo), que el
 * tiquete contenga entre 1 y 5 apuestas y que cada apuesta cumpla las reglas de
 * chance (1 a 4 dígitos, modalidad DIRECTO o COMBINADO, valor dentro de los
 * límites configurados y múltiplo de 100). El tiquete se crea con código único
 * con prefijo `CH-` y estado ACTIVO.
 *
 * @function venderChance
 * @param {{id: number, rol: string}} vendedor - Usuario autenticado que realiza la venta.
 * @param {Object} datos - Cuerpo de la solicitud de venta.
 * @param {number} datos.sorteoId - Identificador del sorteo de tipo CHANCE.
 * @param {Array<{numero: string, valor: number, modalidad?: string}>} datos.apuestas
 *   Entre 1 y 5 apuestas del tiquete.
 * @param {string} [datos.cliente] - Nombre opcional del cliente.
 * @returns {Object} Tiquete creado con `codigo`, `apuestas` validadas, `total`
 *   y `estado: 'ACTIVO'`.
 * @throws {AppError} 404 Si el sorteo no existe.
 * @throws {AppError} 409 Si el sorteo no está abierto o las ventas ya cerraron.
 * @throws {AppError} 400 Si las apuestas no cumplen las reglas de cantidad o formato.
 * @example
 * venderChance(vendedor, { sorteoId: 1, apuestas: [{ numero: '1234', valor: 2000 }] });
 */
function venderChance(vendedor, { sorteoId, apuestas, cliente }) {
  const sorteo = sorteos.obtener(sorteoId);
  sorteos.verificarVentaPermitida(sorteo, 'CHANCE');

  if (!Array.isArray(apuestas) || apuestas.length === 0 || apuestas.length > 5) {
    throw new AppError('Un tiquete de chance debe tener entre 1 y 5 apuestas');
  }
  const validas = apuestas.map(chance.validarApuesta);

  return guardar({
    id: nextId('tickets'),
    codigo: generarCodigo('CHANCE'),
    tipo: 'CHANCE',
    sorteoId: sorteo.id,
    vendedorId: vendedor.id,
    cliente: cliente || null,
    apuestas: validas,
    total: validas.reduce((s, a) => s + a.valor, 0),
    estado: 'ACTIVO',
    premio: null,
    creadoEn: new Date().toISOString(),
  });
}

function venderBaloto(vendedor, { sorteoId, jugadas, cliente }) {
  const sorteo = sorteos.obtener(sorteoId);
  sorteos.verificarVentaPermitida(sorteo, 'BALOTO');

  if (!Array.isArray(jugadas) || jugadas.length === 0 || jugadas.length > 10) {
    throw new AppError('Un tiquete de Baloto debe tener entre 1 y 10 jugadas');
  }
  const validas = jugadas.map(baloto.validarJugada);

  return guardar({
    id: nextId('tickets'),
    codigo: generarCodigo('BALOTO'),
    tipo: 'BALOTO',
    sorteoId: sorteo.id,
    vendedorId: vendedor.id,
    cliente: cliente || null,
    jugadas: validas,
    total: validas.length * valorBaloto,
    estado: 'ACTIVO',
    premio: null,
    creadoEn: new Date().toISOString(),
  });
}

function buscar(codigo) {
  const ticket = getDb().tickets.find((t) => t.codigo === codigo);
  if (!ticket) throw new AppError('Tiquete no encontrado', 404);
  return ticket;
}

function listar(usuario, { fecha, estado } = {}) {
  return getDb().tickets.filter((t) =>
    (usuario.rol === 'ADMIN' || t.vendedorId === usuario.id) &&
    (!estado || t.estado === estado) &&
    (!fecha || t.creadoEn.startsWith(fecha)));
}

function consultar(codigo) {
  const ticket = buscar(codigo);
  const sorteo = sorteos.obtener(ticket.sorteoId);
  return {
    ...ticket,
    sorteo: { id: sorteo.id, nombre: sorteo.nombre, fecha: sorteo.fecha, estado: sorteo.estado, resultado: sorteo.resultado },
    ganador: sorteo.estado === 'JUGADO' ? ticket.premio > 0 : null,
  };
}

/**
 * Anula un tiquete activo dejando constancia del motivo y del usuario responsable.
 *
 * Aplica las políticas de anulación: solo el vendedor dueño del tiquete (o un
 * ADMIN) puede anularlo, el tiquete debe estar ACTIVO, el sorteo no puede estar
 * ya jugado y, para los vendedores, debe hacerse dentro de los `minutosAnulacion`
 * (10 por defecto) posteriores a la venta. La anulación queda registrada con
 * usuario, motivo y fecha.
 *
 * @function anular
 * @param {string} codigo - Código único del tiquete (p. ej. `CH-1A2B3C4D`).
 * @param {{id: number, rol: string}} usuario - Usuario que solicita la anulación.
 * @param {string} motivo - Justificación obligatoria de la anulación.
 * @returns {Object} Tiquete actualizado con `estado: 'ANULADO'` y los datos de la anulación.
 * @throws {AppError} 404 Si el tiquete no existe.
 * @throws {AppError} 403 Si el tiquete pertenece a otro vendedor.
 * @throws {AppError} 409 Si el tiquete no está activo, el sorteo ya se jugó o
 *   venció la ventana de tiempo permitida para anular.
 */
function anular(codigo, usuario, motivo) {
  const ticket = buscar(codigo);

  if (usuario.rol !== 'ADMIN' && ticket.vendedorId !== usuario.id) {
    throw new AppError('No puede anular tiquetes de otro vendedor', 403);
  }
  if (ticket.estado !== 'ACTIVO') throw new AppError(`El tiquete está ${ticket.estado}`, 409);
  if (sorteos.obtener(ticket.sorteoId).estado === 'JUGADO') {
    throw new AppError('No se puede anular un tiquete de un sorteo jugado', 409);
  }
  if (usuario.rol !== 'ADMIN' && minutosEntre(ticket.creadoEn) > minutosAnulacion) {
    throw new AppError(`Solo se puede anular dentro de los ${minutosAnulacion} minutos siguientes a la venta`, 409);
  }
  if (!motivo) throw new AppError('Debe indicar el motivo de anulación');

  ticket.estado = 'ANULADO';
  ticket.anulacion = { usuarioId: usuario.id, motivo, fecha: new Date().toISOString() };
  return ticket;
}

/**
 * Paga el premio de un tiquete ganador y registra el movimiento de caja.
 *
 * El pago solo procede si el sorteo ya fue jugado, el tiquete está ACTIVO y
 * tiene un premio líquido mayor que cero. Si el premio no se cobra dentro de
 * `diasCaducidadPremio` (365 días por defecto), el tiquete pasa a estado
 * CADUCADO y se rechaza el pago con error 410. El pago queda registrado con su
 * valor, fecha y usuario que lo entregó, y el tiquete pasa a estado PAGADO.
 *
 * @function pagarPremio
 * @param {string} codigo - Código único del tiquete ganador.
 * @param {{id: number}} usuario - Usuario (vendedor) que realiza el pago del premio.
 * @returns {Object} Registro del pago con la forma
 *   `{id, ticketId, codigo, usuarioId, valor, fecha}`.
 * @throws {AppError} 404 Si el tiquete no existe.
 * @throws {AppError} 409 Si el sorteo no se ha jugado, el tiquete no tiene
 *   premio, ya fue pagado o no está ACTIVO.
 * @throws {AppError} 410 Si el premio ya caducó.
 */
function pagarPremio(codigo, usuario) {
  const ticket = buscar(codigo);
  const sorteo = sorteos.obtener(ticket.sorteoId);

  if (sorteo.estado !== 'JUGADO') throw new AppError('El sorteo aún no se ha jugado', 409);
  if (ticket.estado === 'PAGADO') throw new AppError('El premio ya fue pagado', 409);
  if (ticket.estado !== 'ACTIVO') throw new AppError(`El tiquete está ${ticket.estado}`, 409);
  if (!ticket.premio) throw new AppError('El tiquete no tiene premio', 409);
  if (diasEntre(sorteo.jugadoEn) > diasCaducidadPremio) {
    ticket.estado = 'CADUCADO';
    throw new AppError('El premio está caducado', 410);
  }

  const pago = {
    id: nextId('pagos'),
    ticketId: ticket.id,
    codigo: ticket.codigo,
    usuarioId: usuario.id,
    valor: ticket.premio,
    fecha: new Date().toISOString(),
  };
  getDb().pagos.push(pago);
  ticket.estado = 'PAGADO';
  return pago;
}

module.exports = { venderChance, venderBaloto, consultar, listar, anular, pagarPremio };
