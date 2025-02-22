import { IB2D, Preload } from "../blitz/blitz"
import { TileMap } from "../blitz/webgl/drawer/tilemap"
import { GameState } from "../game_state"
import { constrain, rectsIntersect } from "./util"

import { SERVER_MAP_URL, SERVER_URL } from "../config"


let tileset


const TILE_WIDTH = 16
const TILE_HEIGHT = 16

Preload(async b => {
    tileset = await b.LoadAnimImage("grayscale.png",TILE_WIDTH,TILE_HEIGHT)
})
  
class GameMap {

    layers_raw = [
        [[0]]
    ]

    layers = []

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

    FromTiled(tiled){
        let thisTile = 0
        this.width = tiled["width"]
        this.height = tiled["height"]
        this.layers = Array.from({length:3})
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

                }break;
            }
        }
        for(let i = 0; i < 2; i++){
            if(!this.layers[i]){
                this.layers[i] = new TileMap(this.layers_raw[i])
            }else{
                this.layers[i].updateTiles( this.layers_raw[i])
            }
        }
    }

    async LoadFromServer(map_name){
        let result = await fetch(SERVER_MAP_URL + map_name + ".json")
        if (result.status !== 200){
            throw "não consegui carregar esse mapa"
        }
        const data = await result.json()
        this.FromTiled(data)
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