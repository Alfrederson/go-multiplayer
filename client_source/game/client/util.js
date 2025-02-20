/**
 * @param {number} num
 * @param {Uint8Array} buffer
 * @param {number} where
 */
export function put_int8(num,buffer,where){
    buffer[where] = num & 0xFF
}
/**
 * @param {number} num
 * @param {Uint8Array} buffer
 * @param {number} where
 */
export function put_int16(num,buffer,where){
    buffer[where] = (num>>8) & 0xFF
    buffer[where+1] = (num) & 0xFF
}
/**
 * @param {number} num
 * @param {Uint8Array} buffer
 * @param {number} where
 */
export function put_int32(num,buffer,where){
    buffer[where] = (num >> 24) & 0xFF;
    buffer[where+1] = (num >> 16) & 0xFF;       
    buffer[where+2] = (num >> 8) & 0xFF;       
    buffer[where+3] = num & 0xFF;  
}
/**
 * @param {Uint8Array} buffer
 * @param {number} position
 */

export function get_int8(buffer,position){
    return buffer[position]
}
/**
 * @param {Uint8Array} buffer
 * @param {number} position
 */
export function get_int16(buffer,position){
    return (buffer[position] << 8) | (buffer[position+1])
}

/**
 * @param {Uint8Array} buffer
 * @param {number} position
 */
export function get_int32(buffer,position){
    // __ __ __ __
    //  ^
    //  position
    return buffer[position+3] | (buffer[position+2] << 8) | (buffer[position+1] << 16) | (buffer[position] << 24)
}



