<script>

    import { logar as login_firebase } from "$lib/client/game/fb/fb";
    import { player_store } from "$lib/client/game/player/player.store";
    import { interface_store } from "$lib/interface.store";

    function logar(){
        login_firebase()
    }

    function abrir_mochila(){
        interface_store.update( i =>{
            i.mochila_aberta = true
            return i
        })
    }

</script>
<style>
    .gauge {
        background-color: rgba(0,0,0,0.5);
        color:yellow;
        text-shadow: 2px 2px 0 rgba(0,0,0,1);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        white-space: nowrap;
        text-align:left;
        user-select: none;
    }
    .icone {
        width: 2em;
        display: inline-block;
        text-align: center;
    }
</style>
<div class="d-flex flex-column flex-shrink-0 bg-none" style="width: 4.5rem; z-index:10; position: fixed;">
    <div style="height:4.5rem"></div>
    <ul class="nav nav-pills nav-flush flex-column mb-auto text-center gap-2" style="font-weight:bold; color:white;">
        <!-- <li>
            <a href="#" class="nav-link gauge" onclick={logar}>
                <span class="icone">👤</span>
            </a>
        </li> -->
        <li>
            <span class="nav-link gauge">
                <span class="icone">💲</span>{$player_store.status.balance}
            </span>
        </li>
        <li>
            <span class="nav-link gauge">
                <span class="icone">💗</span>{$player_store.status.health} &percnt;
            </span>
        </li>        
        <li>
            <span class="nav-link gauge">
                <span class="icone">🛌</span>{$player_store.status.energy} &percnt;
            </span>
        </li>
        <li>
            <span class="nav-link gauge">
                <span class="icone">🍽</span>{$player_store.status.hunger} &percnt;
            </span>
        </li>
        <li>
            <span class="nav-link gauge">
                <span class="icone">💧</span>{$player_store.status.thirst} &percnt;
            </span>
        </li>
        <li class="nav-item">
            <button class="nav-link gauge" onclick={abrir_mochila}>
                <span class="icone">🎒</span>{$player_store.bag.items.length} &sol; {$player_store.bag.max_item_count}
            </button>
        </li>  
    </ul>
</div>
