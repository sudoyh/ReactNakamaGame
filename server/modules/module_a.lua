local nk = require("nakama");
local M = {}

OP_CODE_POSITION = 1
OP_CODE_INITIAL_DATA = 2
OP_CODE_PLAYER_SPAWN = 3

local function on_player_move(context, dispatcher, tick, state, message)
    local player = state.presences[message.sender.session_id]
    if player == nil then
        return
    end

    local ok, decode_data = pcall(nk.json_decode, message.data)
    if not ok then
        nk.session_disconnect(message.sender.session_id)
        return
    end

    player.info["position"] = decode_data.position;
    -- Broadcast to all players including the sender
    dispatcher.broadcast_message(OP_CODE_POSITION, message.data)
end

local function on_player_spawn(context, dispatcher, tick, state, message)
    local player = state.presences[message.sender.session_id]
    if player == nil then
        return
    end

    local ok, decode_data = pcall(nk.json_decode, message.data)
    if not ok then
        nk.session_disconnect(message.sender.session_id)
        return
    end

    player.info["position"] = decode_data.position;
    -- Broadcast to all players including the sender
    dispatcher.broadcast_message(OP_CODE_PLAYER_SPAWN, message.data)
end

function M.match_init(context, initial_state)
    local state = {
        presences = {},
        empty_ticks = 0
    }
    local tick_rate = 30
    local label = ""
    return state, tick_rate, label
end

function M.match_join_attempt(context, dispatcher, tick, state, presence, metadata)
    local acceptuser = true
    return state, acceptuser
end

function M.match_join(context, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        state.presences[presence.session_id] = presence
        state.presences[presence.session_id].info = {
            user_id = presence.user_id,
            position = { 0, 3, 0 }
        }
    end

    local player_infos = {}
    for _, p in pairs(state.presences) do
        table.insert(player_infos, p.info)
    end

    local player_init_data = {
        players = player_infos,
        tick = tick
    }

    -- Broadcast initial data to all players including new ones
    dispatcher.broadcast_message(OP_CODE_INITIAL_DATA, nk.json_encode(player_init_data))

    return state
end

function M.match_leave(context, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        state.presences[presence.session_id] = nil
    end
    return state
end

function M.match_loop(context, dispatcher, tick, state, messages)
    for _, message in ipairs(messages) do
        if (message.op_code == OP_CODE_POSITION) then
            local ok = pcall(on_player_move, context, dispatcher, tick, state, message)
            if not ok then
                nk.session_disconnect(message.sender.session_id)
            end
        end
        if (message.op_code == OP_CODE_PLAYER_SPAWN) then
            local ok = pcall(on_player_spawn, context, dispatcher, tick, state, message)
            if not ok then
                nk.session_disconnect(message.sender.session_id)
            end
        end
    end
    return state
end

function M.match_terminate(context, dispatcher, tick, state, grace_seconds)
    return state
end

function M.match_signal(context, dispatcher, tick, state, data)
    return state, data
end

return M
