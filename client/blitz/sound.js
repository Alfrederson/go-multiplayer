

/** @type{ Map<string,Audio>} */
const sounds = new Map()


async function LoadSound(path){
    let result
    if(result = sounds.get(path)){
        return result
    }
    result = new Audio(path)
}