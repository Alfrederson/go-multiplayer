import { IB2D, Preload } from "$lib/client/blitz/blitz"
import { TileMap2 } from "$lib/client/blitz/webgl/drawer/tilemap2"
import { SERVER_MAP_URL, SERVER_URL } from "$lib/client/config"
import { GameState } from "$lib/client/game_state"
import { ByteReader } from "../byte_reader/byte_reader"

function chipset_pos(x,y){
    return y * 60 + x
}
// base
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


const TILE_WIDTH = 16
const TILE_HEIGHT = 16

Preload(async b => {
    tileset = await b.LoadAnimImage("exterior.png",TILE_WIDTH,TILE_HEIGHT)
    // tileset = await b.LoadAnimImage("grayscale.png",TILE_WIDTH,TILE_HEIGHT)
})


export class AutoTilemap {
    loaded=true
    width = 20
    height = 15

    // na verdade a gente tem 3 layers
    // abaixo do jogador -> nivel jogador -> acima jogador
    /** @type {TileMap2?} */
    baseLayer = null
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
     * 
     * @param {string} mapname 
     */
    async loadFromServer(mapname){

        const result = await fetch(SERVER_MAP_URL+mapname)
        if(result.status !== 200){
            throw "mapa não encontrado, bro"
        }
        const bytes = await result.arrayBuffer()

        const reader = new ByteReader(bytes)
        const tileset_name = reader.readShortStr()

        const width = reader.readUint16()
        const height = reader.readUint16()

        this.width = width
        this.height = height

        const base_map = array_2d(width,height)
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
                    base_map[row][col]
                    reader.readUint8()
                    // map.bitmasks[row][col] = reader.readUint8()
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

        if(!this.baseLayer){
            const real_map = array_2d(real_width,real_height)
            for(let y = 0; y < height; y++){
                for(let x = 0; x < width; x++){
                    const t = base_map[y][x]*2
                    real_map[y*2][x*2] = 1 + t
                    real_map[y*2][x*2+1] = 2 + t
                    real_map[y*2+1][x*2] = 61 + t
                    real_map[y*2+1][x*2+1] = 62 + t
                }
            }
            this.baseLayer = new TileMap2(real_map)
        }
        if(!this.topLayer){
            const real_top = array_2d(real_width,real_height)
            for(let y = 0; y < height; y++){
                for(let x = 0; x < width; x++){
                    const t = top_map[y][x]*2
                    real_top[y*2][x*2] = 1 + t
                    real_top[y*2][x*2+1] = 2 + t
                    real_top[y*2+1][x*2] = 61 + t
                    real_top[y*2+1][x*2+1] = 62 + t
                }
            }
            this.topLayer = new TileMap2(real_top)
        }

    }

    objectCollides(){
        return -1
    }
}