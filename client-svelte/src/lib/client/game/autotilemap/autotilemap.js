import { IB2D, IImage, Preload } from "$lib/client/blitz/blitz"
import { TileMap2 } from "$lib/client/blitz/webgl/drawer/tilemap2"
import { SERVER_MAP_URL, SERVER_TILESET_URL } from "$lib/client/config"
import { GameState } from "$lib/client/game_state"
import { fetch_byte_buffer } from "../util"

// A gente podia desmontar o chipset e montar de novo
// para não precisar fazer essa loucura toda.

/**
 * Isso dá a posição (y*60 + x) em subtiles do subtile a
 * ex: 1,1 => vai ser o índice do subtile que ficaria em 8,8
 * @param {number} x
 * @param {number} y
 */
function chipset_pos(x,y){
    return y * 60 + x
}
// base
// aqui eu estou pegando esse tile
//  
//  o  o  o
//  o  o  o
//  o  X  o
//  o  o  o

const chipset_pos_base = [
    chipset_pos(0,4), // água 0
    chipset_pos(0,4), // água 1
    chipset_pos(0,4), // água 2
    chipset_pos(3,5), // anim 0
    chipset_pos(4,5), // anim 1
    chipset_pos(5,5), // anim 2
    chipset_pos(1,10), // autotile 0
    chipset_pos(4,10), // autotile 1
    chipset_pos(1,14), // autotile 2
    chipset_pos(4,14), // autotile 3
    chipset_pos(7,2), // autotile 4
    chipset_pos(10,2), // autotile 5
    chipset_pos(7,6), // autotile 6
    chipset_pos(10,6), // autotile 7
    chipset_pos(7,10), // autotile 8
    chipset_pos(10,10), // autotile 9
    chipset_pos(7,14), // autotile 10
    chipset_pos(10,14) // autotile 11
];
for(let tile_normal = 0; tile_normal < 96;tile_normal++){
    chipset_pos_base[18 + tile_normal] = chipset_pos(12+(tile_normal%6),(tile_normal/6)|0) 
}
for(let tile_normal = 0; tile_normal < 48;tile_normal++){
    chipset_pos_base[18+96 + tile_normal] = chipset_pos(20+(tile_normal%6),(tile_normal/6)|0)
}
/** @type {number[]} */
const chipset_pos_top = []
for(let tile_top = 0; tile_top < 48; tile_top++){
    chipset_pos_top[tile_top] = chipset_pos(18+(tile_top%6),8+(tile_top/6)|0)
}
for(let tile_top = 0; tile_top < 96; tile_top++){
    chipset_pos_top[tile_top+48] = chipset_pos(24+(tile_top%6),(tile_top/6)|0)
}


/** @param {number} tile_n */
function is_watertile(tile_n){
    return (tile_n >= 0) && (tile_n <= 2)
}

/**
 * @param {number} tile_n
 */
function is_autotile(tile_n){
    return (tile_n >= 6 && tile_n < 6+12)
}

// Coisa copiada e colada do editor
/**
 * checks if specific bits are set
 * @param {number} b
 * @param {number} mask
 */
function on(b,mask){
    return (b & mask) == mask
}
/**
 * checks if specific bits are off
 * @param {number} b 
 * @param {number} mask 
 * @returns 
 */
function off(b,mask){
    return (b & mask) == 0
}

// Esse são diferentes do algoritmo do editor 
// porque estou representando o tile inicial de
// jeitos diferentes!
// A explicação de como funciona está desenhada em um
// papel que a Caixa enviou.
/**
 * subtile a a partir de um bitmask
 * @param {number} b 
 * @returns {number}
 */
function subtile_a(b){
    if(on(b,LEFT|TOP) && off(b,TOP_LEFT))
        return 2 -4*60                        // meio de uma cruz
    const x = on(b,LEFT) ? on(b,RIGHT) ? 0 : 2 : -2  
    const y = on(b,TOP) ? on(b,BOTTOM) ? 0 : 2 : -2
    return x +y*60
}
/**
 * subtile b a partir de um bitmask
 * @param {number} b 
 * @returns {number}
 */
function subtile_b(b){
    if(on(b,RIGHT|TOP) && off(b,TOP_RIGHT))
        return 2 -4*60 // meio da cruz
    const x = on(b,RIGHT) ? on(b,LEFT) ? 0 : -2 :  2
    const y = on(b,TOP) ? on(b,BOTTOM) ? 0 :  2 : -2
    return x +y*60
}
/**
 * subtile c a partir de um bitmask
 * @param {number} b 
 * @returns {number}
 */
function subtile_c(b){
    if(on(b,RIGHT|BOTTOM) && off(b,BOTTOM_RIGHT))
        return 2 -4*60
    const x = on(b,RIGHT) ? on(b,LEFT) ? 0 : -2 :  2
    const y = on(b,BOTTOM) ? on(b,TOP) ? 0 : -2 :  2
    return x +y*60
}
/**
 * subtile d a partir de um bitmask
 * @param {number} b 
 * @returns {number}
 */
function subtile_d(b){
    if(on(b,LEFT|BOTTOM) && off(b,BOTTOM_LEFT))
        return 2 -4*60
    const x = on(b,LEFT) ? (on(b,RIGHT)   ? 0 : 2) : -2 
    const y = on(b,BOTTOM)   ? on(b,TOP) ? 0 :  -2 : 2
    return x +y*60
}



/**
 * cria uma array 2D. duplicado do código do editor.
 * considerar mover tudo para uma só biblioteca!
 * @param {number} width 
 * @param {number} height 
 * @returns 
 */
function array_2d(width,height){
    return Array.from({length:height}, row => {
        return Array.from({length:width}, col => 0)
    })
}
/**
 * @type {import("../../blitz/blitz").IImage}
 */
let tileset

const B0 = 0b0000_0001,
      B1 = 0b0000_0010, 
      B2 = 0b0000_0100,
      B3 = 0b0000_1000,
      B4 = 0b0001_0000,
      B5 = 0b0010_0000,
      B6 = 0b0100_0000,
      B7 = 0b1000_0000

const TOP_LEFT = B0,
      TOP = B1,
      TOP_RIGHT = B2,
      RIGHT = B3,
      BOTTOM_RIGHT = B4,
      BOTTOM = B5,
      BOTTOM_LEFT = B6,
      LEFT = B7

const TILE_WIDTH = 16
const TILE_HEIGHT = 16

// complicado, bicho...
// a gente pode carregar todos os tilesets que já existem no bucket?
// a gente pode usar esse b pra carregar os tilesets em runtime?

/** @type {IB2D} */
let b2d
Preload(async b => {
    b2d = b
    tileset = await b.LoadAnimImage("exterior.png",TILE_WIDTH,TILE_HEIGHT)
    // tileset = await b.LoadAnimImage("grayscale.png",TILE_WIDTH,TILE_HEIGHT)
})

// export class Tileset{
//     /** @type {HTMLImageElement|null} */
//     image = null
//     name = ""
//     image_path = ""
//     /** @type {number[]} */
//     tile_info = []

//     // p = passability (0 = o, 1 = x, 2 = *, 3 = [])
//     // p p e c d b c _
//     /**
//      * @param {string} name
//      */
//     constructor(name){
//         // 162 = tiles no layer 0
//         // 144 = tiles no layer 1
//         this.name = name
//         this.tile_info = Array.from({length:MAX_TILE_INDEX}, x => 0)
//     }

//     /**
//      * @param {number} tile
//      * @param {number} passability
//      */
//     setPassability(tile,passability){
//         if(passability < 0 || passability > 3){
//             throw new Error("passabilidade deve estar entre 0 e 3")
//         }
//         if(tile < 0 || tile >= 162+144){
//             throw new Error("tile "+tile+" não está entre 0 e "+(MAX_TILE_INDEX))
//         }
//         if(passability==3 && tile < 7 || tile > 18){
//             throw new Error("passabilidade "+passability+" não é válida para o tile "+tile)
//         }
//         this.tile_info[tile] |= ((passability & 0x11) << 6)
//     }
//     /**
//      * @param {number} tile
//      */
//     getPassability(tile){
//         return (this.tile_info[tile] >> 6) & (0x11)
//     }
//     /**
//      * @param {number} tile
//      */
//     cyclePassabilityUp(tile){
//         let passability = this.getPassability(tile)
//         passability++
//         if(tile >= 7 && tile <= 18){
//             if(passability == 4){
//                 passability = 0
//             }
//         }else{
//             if(passability == 3){
//                 passability = 0
//             }
//         }
//         this.setPassability(tile,passability)
//     }
//     /**
//      * @param {number} tile
//      */
//     cyclePassabilityDown(tile){
//         let passability = this.getPassability(tile)
//         passability--
//         if(passability<0){
//             if(tile >= 7 && tile <= 18){
//                 passability = 3
//             }else{
//                 passability = 2
//             }
//         }
//         this.setPassability(tile,passability)
//     }

//     /**
//      * @param {string} path
//      */
//     setImagePath(path){
//         this.image_path=path
//     }

//     to_bytes(){
//         const buffer = []

        
//         buffer.push(...short_string(this.name))
//         buffer.push(...short_string(this.image_path))
//         for(let t of this.tile_info){
//             buffer.push(t & 0xFF)
//         }
//         return Uint8Array.from(buffer)
//     }

//     /**
//      * Gera um tileset de uma sequência de bytes
//      * @param {ArrayBuffer} bytes
//      */
//     static from_bytes(bytes){
//         let byte_reader = new ByteReader(bytes)
//         const name = byte_reader.readShortStr()
//         const image_path = byte_reader.readShortStr()
//         const result = new Tileset(name)
//         result.setImagePath(image_path)
//         let index = 0
//         while(!byte_reader.finished){
//             result.tile_info[index++] = byte_reader.readUint8()
//             if(index > MAX_TILE_INDEX){
//                 throw new Error("arquivo comprido demais")
//             }
//         }
//         if(index < MAX_TILE_INDEX-1){
//             throw new Error("arquivo curto demais")
//         }
//         return result
//     }
// }

export const MAX_TILE_INDEX = 162 + 144

export class Tileset {
    /** @type {IImage | null} */
    image = null
    /** @type {number[]} */
    tile_info = []
}

export class TilesetLoader {
    static tilesets = new Map()

    /**
     * carrega um tileset asyncmente...
     * @param {string} tileset_name 
     * @returns 
     */
    static async load_tileset(tileset_name) {
        const existing_tileset = this.tilesets.get(tileset_name)
        if(existing_tileset){
            return existing_tileset
        }
        const reader = await fetch_byte_buffer(SERVER_TILESET_URL+tileset_name)
        const result = new Tileset()
        const name = reader.readShortStr()
        const image_path = reader.readShortStr()

        this.tilesets.set(tileset_name,result)

        console.log("carregando tileset ",name," imagem ",image_path)

        b2d.LoadAnimImage(image_path,TILE_WIDTH,TILE_HEIGHT).then( image =>{
            console.log("imagem carregada")
            result.image = image
        })

        let index = 0
        while(!reader.finished){
            result.tile_info[index++] = reader.readUint8()
            if(index > MAX_TILE_INDEX){
                throw new Error("arquivo comprido demais")
            }
        }
        if(index < MAX_TILE_INDEX-1){
            throw new Error("arquivo curto demais")
        }

        return result        
    }
}


export class AutoTilemap {
    loaded=true
    width = 20
    height = 15

    // na verdade a gente tem 3 layers
    // abaixo do jogador -> nivel jogador -> acima jogador
    /** @type {TileMap2?} */
    baseLayer = null
    /** @type {TileMap2?} */
    midLayer = null
    /** @type {TileMap2?} */
    topLayer = null

    /**
     * desenha a layer base
     * @param {IB2D} b 
     * @param {GameState} s 
     */
    renderBaseLayer(b,s){        
        if(!this.baseLayer){
            return
        }
        b.DrawTilemap(this.baseLayer, tileset, -Math.floor(s.screen.cameraX), -Math.floor(s.screen.cameraY))
    }

    /**
     * desenha a layer top
     * @param {IB2D} b 
     * @param {GameState} s 
     */
    renderTopLayer(b,s){
        if(!this.topLayer){
            return
        }
        b.DrawTilemap(this.topLayer, tileset, -Math.floor(s.screen.cameraX), -Math.floor(s.screen.cameraY))
    }

    /**
     * @param {string} mapname 
     */
    async loadFromServer(mapname){
        const reader = await fetch_byte_buffer(SERVER_MAP_URL+mapname)

        const tileset_name = reader.readShortStr()

        const tileset = await TilesetLoader.load_tileset(tileset_name)

        const width = reader.readUint16()
        const height = reader.readUint16()

        this.width = width
        this.height = height

        const base_map = array_2d(width,height)
        const base_bitmasks = array_2d(width,height)
        const base_autotiles = array_2d(width,height)
        const top_map = array_2d(width,height)


        // const tileset = new Tileset(tileset_name)
        //const map = new AutoTilemap(width,height)
        //map.set_tileset(tileset)

        for(let row = 0; row < height; row++){
            for(let col=0;col< width; col++){
                // TODO: ver se é um tile válido aqui
                const tile = reader.readUint8()
                if(tile > 0 && chipset_pos_base[tile]){
                    base_map[row][col] = chipset_pos_base[tile]
                }
                //map.layer0[row][col] = tile
                if(is_watertile(tile) || is_autotile(tile)){
                    base_bitmasks[row][col] = reader.readUint8()
                    base_autotiles[row][col] = 1
                }
            }
        }

        // TODO: não é para ser assim não!
        // regen_subtiles refaz os bitmasks de todos os tiles
        // map.regen_subtiles(0,0,map.width,map.height)
        for(let row = 0; row < height; row++){
            for(let col =0; col < width; col++){
                // TODO: ver se o tile é válido aqui     
                const tile = reader.readUint8()
                if(chipset_pos_top[tile]){
                    top_map[row][col] = chipset_pos_top[tile]
                }           
                // map.layer1[row][col] = reader.readUint8()
            }
        }
        const real_height = height*2
        const real_width = width*2


        // no rpg maker a gente tem layer base e top
        // mas na runtime, um tile que está na layer top pode ser
        // desenhado antes de os jogadores serem desenhados, então
        // na verdade a gente faz 3 layers
        // e tem tiles na layer base que também podem aparecer na layer top

        const real_base = array_2d(real_width,real_height)

        // a gente precisa disso porque tem aquele tipo de passabilidade
        // que é um quadrado
        const real_mid = array_2d(real_width,real_height)
        const real_top = array_2d(real_width,real_height)

        for(let y=0;y<height;y++){
            for(let x=0;x<width;x++){
                const tile_base = base_map[y][x]
                const bitmask_base = base_bitmasks[y][x]

                // o que a gente faz aqui agora?
                const tile_top = base_map[y][x]

                real_base[y*2][x*2]     = 1 + tile_base*2
                real_base[y*2][x*2+1]   = 2 + tile_base*2
                real_base[y*2+1][x*2+1] = 62 + tile_base*2
                real_base[y*2+1][x*2]   = 61 + tile_base*2

                if(base_autotiles[y][x]==1){
                    real_base[y*2][x*2] += subtile_a(bitmask_base)
                    real_base[y*2][x*2+1] += subtile_b(bitmask_base)
                    real_base[y*2+1][x*2+1] += subtile_c(bitmask_base)
                    real_base[y*2+1][x*2] += subtile_d(bitmask_base)
                }
            }
        }

        this.baseLayer = new TileMap2(real_base)
        this.midLayer = new TileMap2(real_mid)
        this.topLayer = new TileMap2(real_top)

        // if(!this.baseLayer){
        //     const real_map = array_2d(real_width,real_height)
        //     for(let y = 0; y < height; y++){
        //         for(let x = 0; x < width; x++){
        //             const t = base_map[y][x]*2
        //             real_map[y*2][x*2] = 1 + t
        //             real_map[y*2][x*2+1] = 2 + t
        //             real_map[y*2+1][x*2] = 61 + t
        //             real_map[y*2+1][x*2+1] = 62 + t
        //         }
        //     }
        //     this.baseLayer = new TileMap2(real_map)
        // }

        // if(!this.topLayer){
        //     const real_top = array_2d(real_width,real_height)
        //     for(let y = 0; y < height; y++){
        //         for(let x = 0; x < width; x++){
        //             const t = top_map[y][x]*2
        //             real_top[y*2][x*2] = 1 + t
        //             real_top[y*2][x*2+1] = 2 + t
        //             real_top[y*2+1][x*2] = 61 + t
        //             real_top[y*2+1][x*2+1] = 62 + t
        //         }
        //     }
        //     this.topLayer = new TileMap2(real_top)
        // }

    }

    objectCollides(){
        return -1
    }
}