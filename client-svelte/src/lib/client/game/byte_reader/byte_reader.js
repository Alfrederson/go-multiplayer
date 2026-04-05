/**
 * Coisinha para ler uint8, uint16, uint32, etc de um ArrayBuffer.
 * Copi-colado do editor. Considerar a possibilidade de transformar isso em uma biblioteca!
 */
export class ByteReader {
  /**
     * @param {ArrayBuffer} arrayBuffer
     */
  constructor(arrayBuffer) {
    this.view = new DataView(arrayBuffer);
    this.offset = 0;
  }

  get finished(){
    return this.offset == this.view.byteLength
  }

  readUint8() {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readUint16(littleEndian = false) {
    const value = this.view.getUint16(this.offset, littleEndian);
    this.offset += 2;
    return value;
  }

  readUint32(littleEndian = false) {
    const value = this.view.getUint32(this.offset, littleEndian);
    this.offset += 4;
    return value;
  }

  readShortStr(){
    const length = this.readUint8()
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);    
  }
}