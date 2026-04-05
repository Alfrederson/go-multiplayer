<script>
    import { begin, user_store } from "$lib/client/game/fb/fb";

    import { onMount } from "svelte";
    import ListaLateral from "./ListaLateral.svelte";
    import Mochila from "./Mochila.svelte";
    import Login from "./Login.svelte";
    import MessageBox from "$lib/component/MessageBox.svelte";
    import Chat from "./Chat.svelte";

    onMount(()=>{
        begin()
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
{$user_store.determinado}
{#if $user_store.determinado}
    {#if $user_store.logado}
        <ListaLateral/>
        <Mochila/>
        <MessageBox></MessageBox>
    {:else}
        <Login/>
    {/if}
{/if}

<Chat></Chat>