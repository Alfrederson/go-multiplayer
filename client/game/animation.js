
const ANIMATION_CYCLE = 0
const ANIMATION_PING_PONG = 1

class Animation{
    type=ANIMATION_CYCLE
    frameDelay=0
    frameCount=0
    baseFrame=0

    currentFrameDelay=0
    currentFrame=0
    currentDir=1

    constructor({frameDelay, frameCount, type, baseFrame}){
        this.baseFrame = baseFrame
        this.type = type
        this.frameDelay = frameDelay
        this.frameCount = frameCount
        this.currentFrameDelay = frameDelay
    }

    /**
     * @param {number} frameDelay
     * @param {number} frameCount
     * @param {number} type
     * @param {number} baseFrame
     */
    change(frameDelay, frameCount, type, baseFrame){
        this.currentFrame = 0
        this.baseFrame = baseFrame
        this.type = type
        this.frameDelay = frameDelay
        this.frameCount = frameCount
        this.currentFrameDelay = frameDelay
    }

    // isso tem que ter um deltatime pra ficar direito no celular...
    update(){
        if(--this.currentFrameDelay == 0){
            this.currentFrameDelay = this.frameDelay            
            this.currentFrame += this.currentDir

            if(this.currentFrame == -1 || this.currentFrame == this.frameCount){
                if(this.type == ANIMATION_CYCLE){
                    this.currentFrame -= this.frameCount*this.currentDir
                }else{
                    this.currentDir *= -1
                    this.currentFrame += this.currentDir
                }
            }
        }
    }

    get frame(){
        return this.currentFrame + this.baseFrame
    }
}

export {
    Animation,
    ANIMATION_CYCLE,
    ANIMATION_PING_PONG
}