import { writable } from "svelte/store";

export const player_store = writable({
    status : {
        energy : 0,
        thirst : 0,
        hunger : 0,
        health : 0,
        balance: 0,
        equipped_id : 0,
    },
    bag : {
        max_weight : 0,
        current_weight : 0,
        max_item_count : 0,
        /** @type {string[]} */
        items : []
    }
})