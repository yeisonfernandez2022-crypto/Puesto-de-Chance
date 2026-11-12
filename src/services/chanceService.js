const AppError = require('../utils/AppError');
const { apuestaMinChance, apuestaMaxChance } = require('../config');

const TABLA_PAGOS = { 4: 4500, 3: 400, 2: 50, 1: 5 };
const MODALIDADES = ['DIRECTO', 'COMBINADO'];

function permutaciones(numero) {
  if (numero.length <= 1) return new Set([numero]);
  const resultado = new Set();
  [...numero].forEach((digito, i) => {
    const resto = numero.slice(0, i) + numero.slice(i + 1);
    permutaciones(resto).forEach((p) => resultado.add(digito + p));
  });
  return resultado;
}

function validarApuesta(apuesta) {
  const { numero, modalidad = 'DIRECTO', valor } = apuesta || {};

  if (typeof numero !== 'string' || !/^\d{1,4}$/.test(numero)) {
    throw new AppError('El número debe tener entre 1 y 4 dígitos');
  }
  if (!MODALIDADES.includes(modalidad)) {
    throw new AppError(`Modalidad inválida: ${modalidad}`);
  }
  if (modalidad === 'COMBINADO' && numero.length < 3) {
    throw new AppError('La modalidad COMBINADO solo aplica para 3 o 4 cifras');
  }
  if (modalidad === 'COMBINADO' && permutaciones(numero).size === 1) {
    throw new AppError('Un número con todas las cifras iguales no se puede combinar');
  }
  if (!Number.isInteger(valor) || valor < apuestaMinChance || valor > apuestaMaxChance) {
    throw new AppError(`El valor debe estar entre ${apuestaMinChance} y ${apuestaMaxChance}`);
  }
  if (valor % 100 !== 0) {
    throw new AppError('El valor debe ser múltiplo de 100');
  }

  return { numero, cifras: numero.length, modalidad, valor };
}

/**
 * Calcula el premio de una apuesta de chance según su modalidad y el número de cifras.
 *
 * Compara la apuesta contra las últimas cifras del resultado oficial usando la
 * tabla de pagos (4 cifras ×4500, 3 ×400, 2 ×50, 1 ×5). En modalidad DIRECTO el
 * número jugado debe coincidir exactamente; en COMBINADO basta con que las
 * últimas cifras del resultado aparezcan en cualquier orden y el premio se
 * divide entre la cantidad de permutaciones únicas del número jugado.
 *
 * @function calcularPremio
 * @param {{numero: string, cifras: number, modalidad: ('DIRECTO'|'COMBINADO'), valor: number}} apuesta
 *   Apuesta previamente validada con `validarApuesta`.
 * @param {string} resultado - Número ganador oficial del sorteo (4 dígitos).
 * @returns {number} Premio en pesos colombianos (0 si la apuesta no gana).
 * @example
 * const apuesta = validarApuesta({ numero: '123', modalidad: 'COMBINADO', valor: 600 });
 * calcularPremio(apuesta, '9321'); // => 40000 (400 × 600 / 6 permutaciones)
 */
function calcularPremio(apuesta, resultado) {
  const ganador = resultado.slice(-apuesta.cifras);
  const factor = TABLA_PAGOS[apuesta.cifras];

  if (apuesta.modalidad === 'DIRECTO') {
    return apuesta.numero === ganador ? apuesta.valor * factor : 0;
  }

  const combinaciones = permutaciones(apuesta.numero);
  if (!combinaciones.has(ganador)) return 0;
  return Math.floor((apuesta.valor * factor) / combinaciones.size);
}

function validarResultado(resultado) {
  if (typeof resultado !== 'string' || !/^\d{4}$/.test(resultado)) {
    throw new AppError('El resultado de chance debe ser un número de 4 dígitos');
  }
  return resultado;
}

module.exports = { validarApuesta, calcularPremio, validarResultado, permutaciones, TABLA_PAGOS };
