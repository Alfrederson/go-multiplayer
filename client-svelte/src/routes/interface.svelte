<script>
    import { onMount } from "svelte";
    import ListaLateral from "./ListaLateral.svelte";
    import Mochila from "./Mochila.svelte";

    /** @type {string[]} */
    let debug_messages = $state([])
    /**
     * @param {string} message
     */
    function debug_message(message){
        debug_messages.push(message)
        debug_messages = debug_messages
        setTimeout(()=>{
            debug_messages.shift()
            debug_messages = debug_messages
        },1500)
    }
    /**
     * @param {string} message
     */
    function chat_message(message){
        debug_messages.push(message)
        debug_messages = debug_messages
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
    })

</script>
<style>
    .texto {
        font-family:'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
        font-weight: bold;
        color:chartreuse;
        text-shadow: 3px 3px 0px black;
    }
</style>
<ListaLateral/>
<Mochila/>
<div class="container-fluid container-sm mt-3">
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
