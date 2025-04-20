/**
 * @typedef {Object} IRectangle
 * @property {number} x - posição x.
 * @property {number} y - posição y.
 * @property {number} width - Largura da coisa
 * @property {number} height - Altura da coisa
 */

/**
 * ICollider é uma coisa que é capaz de fornecer um retângulo de 
 * colisão para checagem;
 * @typedef {Object} ICollider
 * @property {function(number[]):void} getRect
 */

export default {}