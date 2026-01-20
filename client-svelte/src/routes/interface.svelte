<script>
    import { begin, user_store } from "$lib/client/game/fb/fb";

    import { onMount } from "svelte";
    import ListaLateral from "./ListaLateral.svelte";
    import Mochila from "./Mochila.svelte";
    import Login from "./Login.svelte";

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
        begin()
        window.addEventListener("debug_message", event =>{
            // @ts-ignore
            debug_message(event.detail)
        })
        window.addEventListener("chat_message",event =>{
            // @ts-ignore
            chat_message(event.detail)
        })
        const original_log = console.log
        const original_error = console.error

        console.log = function(msg,params){
            original_log(msg,params)
            debug_message(msg)
        }

        console.error = function(msg,params){
            original_error(msg,params)
            debug_message("E:"+msg)
        }
        return ()=>{
            console.log = original_log
            console.error = original_error
        }
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

{#if $user_store.determinado}
    {#if $user_store.logado}
        <ListaLateral/>
        <Mochila/>
    {:else}
        <Login/>
    {/if}
{/if}

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
