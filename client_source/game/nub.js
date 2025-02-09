import { IB2D, Preload } from "../blitz/blitz"
import { GameState } from "../game_state"
import { constrain } from "./util"

let nubSprite

Preload(async b => {
  nubSprite = await b.LoadImage("nub.png")
})

const NUB_SIZE = 128

class Nub {
  dead = false
  x = 0
  y = 0
  dx = 0
  dy = 0
  length = NUB_SIZE * 0.25
  touch = -1
  radius = NUB_SIZE / 2
  justReleased = false
  releasedX = 0
  releasedY = 0
  holdX = 0
  holdY = 0
  constructor(_x, _y) {
    this.x = _x-NUB_SIZE/2
    this.y = _y-NUB_SIZE/2
  }
  getX() {
    // x = quão longe ele tá do centro.
    return Math.max(-32, Math.min(32,(this.dx)))/this.length
  }
  getY() {
    return Math.max(-32, Math.min(32,(this.dy)))/this.length
  }

  /** 
   * @param {IB2D} b - B2D
   * */
  renderUi(b) {
    b.SetScale(1, 1)
    let angulo = Math.atan2(-this.dy , this.dx)
    let length = constrain( Math.sqrt(this.dx*this.dx + this.dy*this.dy), 0, NUB_SIZE*0.25)

    b.DrawImage(nubSprite,
      this.x + Math.cos(angulo)*length,
      this.y - Math.sin(angulo)*length
    )
  }

  /**
   * 
   * @param {GameState} s 
   */
  update(s){
  }

  /**
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean}
   */
  touching(x, y) {
    return (x >= this.x && x <= this.x+NUB_SIZE) && 
           (y >= this.y && y <= this.y+NUB_SIZE)
  }
  held(){
    return this.touch !== -1
  }
  released() {
    let r = this.justReleased
    this.justReleased = false
    return r
  }
  move(x,y){
    this.dx = x - this.holdX
    this.dy = y - this.holdY
  }
  press(x,y, n){
    this.holdX = x
    this.holdY = y
    this.touch = n
  }
  release() {
    this.justReleased = true
    this.touch = -1
    this.releasedX = Math.max(-this.length, Math.min(this.dx, this.length)) / this.length
    this.releasedY = Math.max(-this.length, Math.min(this.dy, this.length)) / this.length
    this.dx = 0
    this.dy = 0
  }
}

export { Nub }