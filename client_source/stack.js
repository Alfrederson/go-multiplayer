/**
 * @class 
 * @template T
 */
export default class {

    top = 0
    /**
     * @type {any[]}
     */
    stuff = []

    constructor(capacity){
        this.stuff = Array.from({length:capacity})
    }
    
    /**
     * Adds something to the top of the stack.
     * @param {T} thing
     */
    push(thing){
        this.stuff[this.top] = thing
        this.top++
    }

    /**
     * Removes something from the top of the stack.
     * @returns {T}
     */
    pop(){
        let thing = this.stuff[this.top]
        this.stuff[this.top] = undefined
        this.top--
        return thing
    }


    /**
     * Vê objeto na posição i da pilha
     * @param {number} i 
     * @returns {T}
     */
    at(i){
        return this.stuff[i]
    }

    /**
     * sets the item at i to undefined
     * @param {number} i 
     */
    forget(i){
        this.stuff[i] = undefined
    }

    reset(){
        this.top = 0
        this.stuff[0] = undefined
    }

    [Symbol.iterator](){
        return{
            pointer: 0,
            data : this.stuff,
            length: this.top,
            next(){
                if(this.pointer < this.length ){
                    return{
                        index: this.pointer,
                        value: this.data[this.pointer++],
                        done: false
                    }
                }else{
                    return { done: true }
                }
            }
        }
    }

}