function on_load()
    Event.mapcast_message("umbral","você está no umbral! ")
    Event.sleep(4)
end

function on_talk()
    print("você está falando com um porco!")
end