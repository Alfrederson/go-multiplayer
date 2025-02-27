// isso vai ser um exporter custom para exportar mapa em formato binário pelo Tiled.
function OutputBuffer() {
    this.buffer = [];
    this.bytes = null;
    this.pointer = 0;
    this.length = 0;
}

OutputBuffer.Empty = function() {
    var m = new OutputBuffer();
    m.length = 0;
    m.buffer = [];
    return m;
};

OutputBuffer.prototype.put_i8 = function(number) {
    this.buffer.push(number & 0xFF);
    return this;
};

OutputBuffer.prototype.put_i16 = function(number) {
    this.buffer.push((number >> 8) & 0xFF);
    this.buffer.push(number & 0xFF);
    return this;
};

OutputBuffer.prototype.put_i32 = function(number) {
    this.buffer.push((number >> 24) & 0xFF);
    this.buffer.push((number >> 16) & 0xFF);
    this.buffer.push((number >> 8) & 0xFF);
    this.buffer.push(number & 0xFF);
    return this;
};

OutputBuffer.prototype.put_short_string = function(str) {
    var len = Math.min(255, str.length);
    this.put_i8(len);
    for (var i = 0; i < len; i++) {
        this.put_i8(str.charCodeAt(i));
    }
    return this;
};

OutputBuffer.prototype.construct = function() {
    console.log("gerando o array buffer...");
    
    const output = new ArrayBuffer(this.buffer.length);
    const outputView = new Uint8Array(output); // Create a view for manipulation

    for (let i = 0; i < this.buffer.length; i++) {
        outputView[i] = this.buffer[i]; // Copy values properly
    }

    return output;
};

OutputBuffer.prototype.constructRLE = function() {
    console.log("gerando o array buffer...");

    const input = this.buffer;
    const compressed = [];
    
    let i = 0;
    while (i < input.length) {
        let value = input[i];
        let count = 1;

        // Count consecutive occurrences of the same value (up to 65535)
        while (i + count < input.length && input[i + count] === value && count < 65535) {
            count++;
        }

        if (count >= 3) {
            // If the value is repeated 3+ times, store (value, count_low, count_high)
            compressed.push(value, count & 0xFF, (count >> 8) & 0xFF);
        } else {
            // Otherwise, store values as-is (uncompressed)
            for (let j = 0; j < count; j++) {
                compressed.push(value);
            }
        }

        i += count;
    }

    // Create an ArrayBuffer to store the compressed data
    const output = new ArrayBuffer(compressed.length);
    const outputView = new Uint8Array(output);

    // Copy compressed data into output buffer
    for (let j = 0; j < compressed.length; j++) {
        outputView[j] = compressed[j];
    }

    return output;
};




function write_map_to_file(map,filename,rle_enabled){
    const outputBuffer = OutputBuffer.Empty()
       
    outputBuffer.put_i16(map.layerCount)
    for (let i = 0; i < map.layerCount; ++i){
     let layer = map.layerAt(i);
     outputBuffer.put_short_string(layer.name)
     console.log(layer.name)
     if(layer.isObjectLayer){
         outputBuffer.put_i8(1)
     }else{
         outputBuffer.put_i8(0)
     }
     if (layer.isTileLayer){
         outputBuffer.put_i16(layer.width)
         outputBuffer.put_i16(layer.height)
         for(let y = 0; y < layer.height; ++y){
             for(let x = 0; x < layer.width; ++x){
                 outputBuffer.put_i16(layer.cellAt(x,y).tileId)
             }
         }
     }
    }
    const file = new BinaryFile(filename, BinaryFile.WriteOnly)
    if(rle_enabled){
        file.write(outputBuffer.constructRLE())
    }else{
        file.write(outputBuffer.construct())
    }
    file.commit()
}



tiled.registerMapFormat("binario",{
    name : "Mapa binário para o MMORPG",
    extension : "lmu",
    write: function(map,filename){
        return write_map_to_file(map,filename,false)
    }
})

tiled.registerMapFormat("binario + rle",{
    name : "Mapa binário para o MMORPG compactado com RLE",
    extension : "lmuz",
    write: function(map,filename){
        return write_map_to_file(map,filename,true)
    }
})