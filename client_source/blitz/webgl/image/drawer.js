import { mat4 } from "gl-matrix"
import { initShaderProgram } from "../shader"
import { IWGLImage } from "../image"

// shaders pra desenhar imagem com escala e tal
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec2 vTextureCoord;
    void main(){
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
    }
`
const fsSource = `
    varying lowp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform lowp vec4 uDrawColor;
    void main(){
       gl_FragColor = uDrawColor * texture2D(uSampler,vTextureCoord);
    }
`
const modelViewMatrix = mat4.create()
/**
 * @param {WebGLRenderingContext} ctx 
 */
function initPositionBuffer(ctx){
    const positionBuffer = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER,positionBuffer)
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([
        0.5, 0.5,
        -0.5, 0.5,
        0.5, -0.5,
        -0.5, -0.5
    ]),ctx.STATIC_DRAW)
    return positionBuffer
}

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {*} buffers 
 * @param {import("../../webgl").WebGLProgramInfo} programInfo 
 * @param {number[]} uv
 */
function setTextureCoordAttribute(ctx,buffers,programInfo,uv){
    ctx.bindBuffer( ctx.ARRAY_BUFFER , buffers )
    ctx.bufferData(
        ctx.ARRAY_BUFFER,
        new Float32Array(uv),
        ctx.STATIC_DRAW
    )
    ctx.vertexAttribPointer(
        programInfo.attribLocations.textureCoord,
        2,
        ctx.FLOAT,
        false,
        0,
        0
    )
    ctx.enableVertexAttribArray( 
        programInfo.attribLocations.textureCoord
    )
}

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {*} buffers 
 * @param {import("../../webgl").WebGLProgramInfo} programInfo 
 */
function setPositionAttribute(ctx, buffers, programInfo){
    ctx.bindBuffer(
        ctx.ARRAY_BUFFER,
        buffers
    )
    ctx.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        2, // numComponents
        ctx.FLOAT,// type
        false ,// normalize
        0,     // stride
        0      // offset
    )
    ctx.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition
    )
}

let oldTexture
/**
 * 
 * @param {WebGLRenderingContext} ctx 
 * @param {IWGLImage} imageHandler 
 * @param {*} programInfo 
 * @param {number[]} color 
 * @param {number} rotation
 * @param {number} x 
 * @param {number} y 
 * @param {number} scaleX 
 * @param {number} scaleY
 */
function drawImage(
    ctx,
    imageHandler,
    programInfo,
    color,
    rotation,
    x,
    y,
    scaleX,
    scaleY
){

    // attribute vec4 aVertexPosition;
    // attribute vec2 aTextureCoord;

    // uniform mat4 uModelViewMatrix;
    // uniform mat4 uProjectionMatrix;
        
    mat4.identity(modelViewMatrix)
    // posição x-y
    mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        [(x + imageHandler.frameWidth/2),(y + imageHandler.frameHeight/2),0]
    )
    // escala
    mat4.scale(
        modelViewMatrix,
        modelViewMatrix,
        [imageHandler.frameWidth * scaleX,imageHandler.frameHeight * scaleY,1]
    )
    // rotação
    mat4.rotateZ(
        modelViewMatrix,
        modelViewMatrix,
        rotation,
    )
    if(imageHandler.texture !== oldTexture){
        ctx.bindTexture(ctx.TEXTURE_2D,imageHandler.texture)
        oldTexture=imageHandler.texture
    }
    ctx.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false, // transpose
        modelViewMatrix
    )
    ctx.uniform4fv(
        programInfo.uniformLocations.drawColor,
        color
    )
    ctx.uniform1i(programInfo.uniformLocations.uSampler,0)
    ctx.drawArrays(
        ctx.TRIANGLE_STRIP,
        0, // offset
        4  // vertexCount
    )
}

export class ImageDrawer {
    #shaderProgram
    #programInfo
    #positionBuffer
    #projectionMatrix
    #textureCoordinateBuffer
    #drawColor = [1,1,1,1]
    #rotation = 0
    #scale = [1,1]


    begin(ctx){
        ctx.useProgram( this.#shaderProgram )
        // projeção...
        ctx.uniformMatrix4fv(
            this.#programInfo.uniformLocations.projectionMatrix,
            false, // transpose,
            this.#projectionMatrix 
        )        

        // posição dos vértices...
        setPositionAttribute(
            ctx,
            this.#positionBuffer,
            this.#programInfo
        )

        // u-v...
        setTextureCoordAttribute(
            ctx,
            this.#textureCoordinateBuffer,
            this.#programInfo,[
                1,1,
                0,1,
                1,0,
                0,0
            ]            
        )         
    }

    getProgram(){
        return this.#shaderProgram
    }

    setRotation(rot){
        this.#rotation = rot
    }
    setScale(x,y){
        this.#scale[0] = x
        this.#scale[1] = y
    }

    constructor(ctx, width, height){
        // compila o shader maneiro
        this.#shaderProgram = initShaderProgram(ctx, vsSource, fsSource)

        // precisa disso pra poder definir os atributos
        ctx.useProgram(this.#shaderProgram)

        const ul = u  => ctx.getUniformLocation( this.#shaderProgram, u) 
        const al = a => ctx.getAttribLocation( this.#shaderProgram, a)

        // guarda a posição dos attribs e uniforms
        this.#programInfo = {
            program : this.#shaderProgram,
            attribLocations :{
                vertexPosition: al("aVertexPosition"),
                textureCoord: al("aTextureCoord")
            },
            uniformLocations: {
                projectionMatrix: ul("uProjectionMatrix"),
                modelViewMatrix: ul("uModelViewMatrix"),
                uSampler : ul("uSampler"),
                drawColor : ul("uDrawColor")
            }
        }        

        this.#projectionMatrix = mat4.create()
        mat4.ortho(this.#projectionMatrix,0,width,height,0,-500,500)

        this.#positionBuffer = initPositionBuffer(ctx)
        this.#textureCoordinateBuffer = ctx.createBuffer()
    }

    drawImage(ctx, imageHandler, x, y){
        // imagem sem frame...
        setTextureCoordAttribute(
            ctx,
            this.#textureCoordinateBuffer,
            this.#programInfo,[
                1,1,
                0,1,
                1,0,
                0,0
            ]            
        )
                
        drawImage(
            ctx,
            imageHandler,
            this.#programInfo,
            this.#drawColor,
            this.#rotation,
            x,
            y,
            this.#scale[0],
            this.#scale[1]
        )        
    }


    drawImageFrame(ctx, imageHandler, x,y, frame){
        const [u0,v0,u1,v1] = imageHandler.uvs[frame]
        // 1,1,
        // 0,1,
        // 1,0,
        // 0,0            
        setTextureCoordAttribute(
            ctx,
            this.#textureCoordinateBuffer,
            this.#programInfo,[
                u1,v1,
                u0,v1,
                u1,v0,
                u0,v0
            ]            
        )    

        drawImage(
            ctx,
            imageHandler,
            this.#programInfo,
            this.#drawColor,
            this.#rotation,
            x,
            y,
            this.#scale[0],
            this.#scale[1]
        )
    }

}