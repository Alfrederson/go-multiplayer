import { IB2D, Preload } from "../blitz/blitz"
import { TileMap } from "../blitz/webgl/drawer/tilemap"
import { GameState } from "../game_state"
import { constrain, rectsIntersect } from "./util"

import { SERVER_MAP_URL, SERVER_URL } from "../config"

import { Sensor } from "./sensor/sensor"

/**
 * @type {import("../blitz/blitz").IImage}
 */
let tileset


const TILE_WIDTH = 16
const TILE_HEIGHT = 16

Preload(async b => {
    tileset = await b.LoadAnimImage("grayscale.png",TILE_WIDTH,TILE_HEIGHT)
})

class Portal extends Sensor {
    /** @type {string} */
    to_map = ""
    /** @type {string} */
    to_zone = ""
}

/**
 * @typedef {Object} TiledObjectProperties
 * @property {string} name
 * @property {string} type
 * @property {any} value
 */

/**
 * @typedef {Object} Zone
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 *  @typedef {Object} TiledObject
 *  @property {number} x
 *  @property {number} y
 *  @property {number} height
 *  @property {number} width
 *  @property {"zone"|"portal"} type
 *  @property {string} name
 *  @property {number} id
 *  @property {TiledObjectProperties[]} [properties] 
 *  */  
class GameMap {
    loaded = false

    layers_raw = [
        [[0]]
    ]

    /** @type {TileMap[]} */
    layers = []

    /** @type {Portal[]} */
    sensors = []

    /** @type {Map<string,Zone>} */
    zones = new Map()

    /**
     * @param {string} from
     */
    Load(from){
        this.tiles = from.split("\n").map(
            line => line.split("").map(
                letra => letra == " " ? 0 : parseInt(letra)
            )
        )
        this.width = this.tiles[0].length
        this.height = this.tiles.length
    }

    /**
     * @param {import("./interfaces").ICollider} target
     */
    activateSensors(target){
        this.sensors.forEach( sensor => sensor.target = target )
    }

    /**
     * encontra um lugar dentro de uma zona para o objeto thing, que tem um tamanho
     * específico. 
     * @param {[number,number]} thing 
     * @param {string} zone_name 
     * @returns {[number,number]}
     */
    pickPlaceInZone(thing,zone_name){
        const zone = this.zones.get(zone_name)
        if(!zone){
            throw "zona "+zone_name+" não existe"
        }
        return [(zone.x + zone.width/2) , (zone.y + zone.height/2)]
    }

    /**
     * @param {{ [x: string]: number; layers: any; }} tiled
     */
    fromTiled(tiled){
        let thisTile = 0
        this.width = tiled["width"]
        this.height = tiled["height"]
        if(!this.layers){
            this.layers = Array.from({length:3})
        }
        this.sensors = []
        this.zones.clear()

        for(const layer of tiled.layers){
            thisTile = 0
            switch(layer.name.toLowerCase()){
                case "inferior":{
                    this.layers_raw[0] = Array.from({length:this.height}, x=> Array.from({length: this.width}, x=> layer.data[thisTile++]))
                }break;
                case "superior":{
                    this.layers_raw[1] = Array.from({length:this.height}, x=> Array.from({length: this.width}, x=> layer.data[thisTile++]))
                }break;
                case "colisão":{
                    this.layers_raw[2] = Array.from({length:this.height}, x=> Array.from({length: this.width}, x=> layer.data[thisTile++]))
                }break;
                case "coisas":{
                    console.log("carregando coisas do mapa...")                    
                    layer.objects.forEach((/** @type { TiledObject } */ coisa)  =>{
                        switch(coisa.type){
                            case "portal" :{
                                const sensor = new Portal({
                                    x : coisa.x,
                                    y : coisa.y,
                                    width : coisa.width,
                                    height : coisa.height,
                                })
                                if(coisa.properties){
                                    coisa.properties.forEach( p =>{
                                        if(Object.hasOwn(sensor,p.name)){
                                            Object.defineProperty(sensor,p.name,p)
                                        }
                                    })
                                }
                                this.sensors.push(sensor)
                            };break;
                            case "zone" : {
                                this.zones.set(coisa.name,{
                                    x : coisa.x,
                                    y : coisa.y,
                                    width : coisa.width,
                                    height : coisa.height
                                })
                            };break
                        }
                    })
                }break;
            }
        }

        for(let i = 0; i < 2; i++){
            if(!this.layers[i]){
                console.log("[GameMap] creating new TileMap")
                this.layers[i] = new TileMap(this.layers_raw[i])
            }else{
                console.log("[GameMap] just updating tiles!")
                this.layers[i].updateTiles( this.layers_raw[i])
            }
        }
    }

    /**
     * @param {string} map_name
     */
    async loadFromServer(map_name){
        console.log("[GameMap] loading map ",map_name)

        this.loaded = false
        let result = await fetch(SERVER_MAP_URL + map_name + ".json")
        if (result.status !== 200){
            throw "não consegui carregar esse mapa"
        }
        const data = await result.json()
        this.fromTiled(data)
        this.loaded = true
    }

    width = 1
    height = 1

    renders = 0
    /**
     * @param {IB2D} b 
     * @param {GameState} s
     */

    drawingWeird = true
    /**
     * layer deve ser só 0 ou 1
     * @param {IB2D} b 
     * @param {GameState} s 
     * @param {number} layer 
     */
    render (b,s, layer){
        if(!this.layers[layer]){
            return
        }
        b.DrawTilemap(this.layers[layer], tileset, -Math.floor(s.screen.cameraX), -Math.floor(s.screen.cameraY))
    }

    /**
     * retorna o número do tile com o qual um objeto colide, ou -1 caso não colida.
     * @param {import("./interfaces").ICollider} obj - é um retângulo representado como array [x,y,w,h] 
     * @param {number[]} out - é uma array que recebe a intersecção, caso haja , no formato [x,y,w,h]
     * @param {number} filtro - uma combinação de filtros (SOLIDO, BEIRA, etc)
     */
    objectCollides(obj, out, filtro){
        let rect = [0,0,0,0]
        obj.getRect(rect)

        // 0 = x
        // 1 = y
        // 2 = w
        // 3 = h
        // testar só os tiles próximos...
        let fromX = (rect[0] - rect[2]/2)/TILE_WIDTH
        let toX   = (rect[0] + rect[2]/2)/TILE_WIDTH
        let fromY = (rect[1] - rect[3]/2)/TILE_HEIGHT
        let toY   = (rect[1] + rect[3]/2)/TILE_HEIGHT

        fromX = constrain(fromX-2, 0, this.width)|0
        toX = constrain(toX+2, 0, this.width)|0
        fromY = constrain(fromY-2, 0, this.height)|0
        toY = constrain(toY+2,0, this.height)|0

        // testa os tiles...
        for(let x = fromX; x < toX; x++){
            for(let y = fromY; y < toY; y++){
                if(this.layers_raw[2][y][x]){
                    const tileRect = [x*TILE_WIDTH,y*TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT]
                    if( rectsIntersect(tileRect, rect, out) )
                        return this.layers_raw[0][y][x]
                }
            }
        }
        return -1
    }
}


export {
    GameMap,
}