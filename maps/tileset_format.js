// function OutputBuffer() {
//     this.buffer = [];
//     this.bytes = null;
//     this.pointer = 0;
//     this.length = 0;
// }

// OutputBuffer.Empty = function() {
//     var m = new OutputBuffer();
//     m.length = 0;
//     m.buffer = [];
//     return m;
// };

// OutputBuffer.prototype.put_i8 = function(number) {
//     this.buffer.push(number & 0xFF);
//     return this;
// };

// OutputBuffer.prototype.put_i16 = function(number) {
//     this.buffer.push((number >> 8) & 0xFF);
//     this.buffer.push(number & 0xFF);
//     return this;
// };

// OutputBuffer.prototype.put_i32 = function(number) {
//     this.buffer.push((number >> 24) & 0xFF);
//     this.buffer.push((number >> 16) & 0xFF);
//     this.buffer.push((number >> 8) & 0xFF);
//     this.buffer.push(number & 0xFF);
//     return this;
// };

// OutputBuffer.prototype.put_short_string = function(str) {
//     var len = Math.min(255, str.length);
//     this.put_i8(len);
//     for (var i = 0; i < len; i++) {
//         this.put_i8(str.charCodeAt(i));
//     }
//     return this;
// };

// OutputBuffer.prototype.construct = function() {
//     return new ArrayBuffer(this.buffer);
// };



const customMapFormat = {
    // name : "Mapa binário para o MMORPG",
    // extension : ".lmu",

    // write: function(map,filename){
    //    const outputBuffer = OutputBuffer.Empty()
       
    //    outputBuffer.put_i16(map.layerCount)
    //    for (let i = 0; i < map.layerCount; ++i){
    //     let layer = map.layerAt(i);
    //     if (layer.isTileLayer){
    //         outputBuffer.put_i16(layer.width)
    //         outputBuffer.put_i16(layer.height)
    //         for(let y = 0; y < layer.height; ++y){
    //             for(let x = 0; x < layer.width; ++x){
    //                 outputBuffer.put_i16(layer.cellAt(x,y).tileId)
    //             }
    //         }
    //     }
    //    }
    //    const file = new BinaryFile(filename, BinaryFile.WriteOnly)
    //    file.Write(outputBuffer.construct())
    // }
}

tiled.registerMapFormat("binario",customMapFormat)