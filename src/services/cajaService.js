const { getDb, nextId } = require('../data/store');
const AppError = require('../utils/AppError');
const { fechaLocal } = require('../utils/fechas');

function resumen(vendedorId, fecha = fechaLocal()) {
  const db = getDb();
  const delDia = (iso) => fechaLocal(iso) === fecha;

  const tickets = db.tickets.filter((t) => t.vendedorId === vendedorId && delDia(t.creadoEn));
  const validos = tickets.filter((t) => t.estado !== 'ANULADO');
  const pagos = db.pagos.filter((p) => p.usuarioId === vendedorId && delDia(p.fecha));

  const totalVendido = validos.reduce((s, t) => s + t.total, 0);
  const totalPagado = pagos.reduce((s, p) => s + p.valor, 0);

  return {
    vendedorId,
    fecha,
    tiquetesVendidos: validos.length,
    tiquetesAnulados: tickets.length - validos.length,
    ventasChance: validos.filter((t) => t.tipo === 'CHANCE').reduce((s, t) => s + t.total, 0),
    ventasBaloto: validos.filter((t) => t.tipo === 'BALOTO').reduce((s, t) => s + t.total, 0),
    totalVendido,
    premiosPagados: pagos.length,
    totalPagado,
    saldoEsperado: totalVendido - totalPagado,
    cerrada: db.cierres.some((c) => c.vendedorId === vendedorId && c.fecha === fecha),
  };
}

/**
 * Cierra la caja del día de un vendedor y verifica el cuadre contra el efectivo.
 *
 * Calcula el resumen del día (ventas válidas, tiquetes anulados, premios pagados
 * y saldo esperado), rechaza cierres duplicados para la misma fecha y compara el
 * efectivo reportado con el saldo esperado para determinar si la caja quedó
 * `CUADRADA`, con `SOBRANTE` o con `FALTANTE`, registrando la diferencia.
 *
 * @function cerrar
 * @param {number} vendedorId - Identificador del vendedor dueño de la caja.
 * @param {Object} datos - Datos del cierre.
 * @param {number} datos.efectivoReportado - Efectivo contado en caja (entero ≥ 0).
 * @param {string} [datos.fecha] - Fecha del cierre en formato `YYYY-MM-DD`;
 *   por defecto el día actual en la zona horaria configurada.
 * @returns {Object} Cierre registrado con el resumen del día, `efectivoReportado`,
 *   `diferencia` y `estado` (`CUADRADA` | `SOBRANTE` | `FALTANTE`).
 * @throws {AppError} 400 Si `efectivoReportado` no es un entero positivo.
 * @throws {AppError} 409 Si la caja de ese día ya fue cerrada.
 */
function cerrar(vendedorId, { efectivoReportado, fecha = fechaLocal() }) {
  if (!Number.isInteger(efectivoReportado) || efectivoReportado < 0) {
    throw new AppError('El efectivo reportado debe ser un entero positivo');
  }
  const r = resumen(vendedorId, fecha);
  if (r.cerrada) throw new AppError('La caja de ese día ya fue cerrada', 409);

  const diferencia = efectivoReportado - r.saldoEsperado;
  const cierre = {
    id: nextId('cierres'),
    ...r,
    cerrada: true,
    efectivoReportado,
    diferencia,
    estado: diferencia === 0 ? 'CUADRADA' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE',
    creadoEn: new Date().toISOString(),
  };
  getDb().cierres.push(cierre);
  return cierre;
}

module.exports = { resumen, cerrar };
