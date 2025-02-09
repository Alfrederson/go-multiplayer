import { IB2D, Preload } from "../blitz/blitz"
import { GameState } from "../game_state"
import { constrain, rectsIntersect } from "./util"



let tileset


const TILE_WIDTH = 32
const TILE_HEIGHT = 32

Preload(async b => {
    tileset = await b.LoadAnimImage("tiles.png",TILE_WIDTH,TILE_HEIGHT)
})
  
class TileMap {
    tiles= [[0]]

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
        this.tiles = Array.from( {length:this.height}, x => Array.from( {length: this.width }, x => {
            return tiled["layers"][0]["data"][thisTile++]
        }))
    }

    width = 1
    height = 1
    /**
     * @param {IB2D} b 
     * @param {GameState} s
     */
    render (b,s){
        let fromX = Math.floor(s.screen.cameraX / TILE_WIDTH)
        let toX = fromX + Math.ceil(s.screen.width / TILE_WIDTH)
        let fromY = Math.floor(s.screen.cameraY / TILE_WIDTH)
        let toY = fromY + Math.ceil(s.screen.height / TILE_HEIGHT)

        fromX = constrain(fromX,0,this.width)
        toX = constrain(toX+1,0,this.width)
        fromY = constrain(fromY,0,this.height)
        toY = constrain(toY+1,0,this.height)

        b.SetScale( 1 ,1)
        b.SetColor(1,1,1,1)
        b.SetAngle(0)        

        for(let y = fromY; y < toY; y++){
            for(let x = fromX; x < toX; x++){
                if(this.tiles[y][x])
//                if(!(tileInfo[this.tiles[y][x]] & INVISIVEL)){
                    b.DrawImageFrame(
                        tileset,
                        x*TILE_WIDTH,
                        y*TILE_HEIGHT,
                        this.tiles[y][x]-1
                      )
//                }
            }
        }
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
//                if(!(tileInfo[this.tiles[y][x]] & filtro))
//                    continue
                // esse tile...
                const tileRect = [x*TILE_WIDTH,y*TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT]
                // checa se colide...
                if( rectsIntersect(tileRect, rect, out) )
                    return this.tiles[y][x]
            }
        }
        return -1
    }
}


export {
    TileMap,
//    tileInfo,
//    BEIRA as FILTRO_BEIRA,
//    SOLIDO as FILTRO_SOLIDO
}