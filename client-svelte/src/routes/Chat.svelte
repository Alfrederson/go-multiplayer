<script>
    import { onMount } from "svelte";

    /** @type {string[]} */
    let debug_messages = $state([])
    /**
     * @param {string} message
     */
    function debug_message(message){
        debug_messages.push(message)
        if(debug_messages.length >= 10){
            debug_messages.shift()
        }
        debug_messages = debug_messages
        // setTimeout(()=>{
        //     debug_messages.shift()
        //     debug_messages = debug_messages
        // },1500)
    }
    /**
     * @param {string} message
     */
    function chat_message(message){
        debug_message(message)
    }

    onMount(()=>{
        window.addEventListener("debug_message", event =>{
            // @ts-ignore
            debug_message(event.detail)
        })
        window.addEventListener("chat_message",event =>{
            // @ts-ignore
            chat_message(event.detail)
        })
        return ()=>{

        }
    })

</script>
<div class="container-xs">
    {#if debug_messages.length > 0}
        <div class="card bg-dark" style="--bs-bg-opacity: .5;">
            <div class="card-body texto">
                {#each debug_messages as message}
                    {message}<br/>
                {/each}
            </div>
        </div>
    {/if}
</div>
